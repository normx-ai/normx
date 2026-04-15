#!/usr/bin/env node
// ===================== INGESTION DES KNOWLEDGE BASES DANS QDRANT =====================
// Usage: node server/scripts/ingestKB.js [--reset]
//
// Ingère les 3 sources dans la collection "normx_kb" :
//   1. knowledge-base/syscohada_fonctionnement_comptes.json  (articles KB existants)
//   2. knowledge-base/sycebnl_complet_2000_2179.json         (articles SYCEBNL)
//   3. server/data/fonctionnement_comptes_syscohada.json      (comptes enrichis RAG)

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { embed, embedBatch, ensureCollection, upsertPoints, qdrant } = require('../qdrant');

const COLLECTION = 'normx_kb';

// Logger aligne sur server/logger.ts : meme winston, meme format, memes
// fichiers de rotation. On ne fait pas require('../logger.ts') directement
// car ce script est du JavaScript pur et ne passe pas par ts-node lors
// d'une execution autonome (`node server/scripts/ingestKB.js`).
const isProduction = process.env.NODE_ENV === 'production';
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: { service: 'normx', context: 'ingest-kb' },
  format: isProduction
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
          const ctx = context ? `[${context}] ` : '';
          const metaStr = Object.keys(meta).filter(k => k !== 'service').length
            ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(meta).filter(([k]) => k !== 'service')))
            : '';
          if (stack) return `${timestamp} ${level} ${ctx}${message}\n${stack}${metaStr}`;
          return `${timestamp} ${level} ${ctx}${message}${metaStr}`;
        })
      ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
  ],
});

// -------------------- Chargement des sources --------------------

function loadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error(`Erreur chargement ${filePath}`, { error: err.message });
    return null;
  }
}

// -------------------- Préparation des documents --------------------

// Certains fichiers de la KB utilisent des formats alternatifs :
// - Cadre conceptuel : sections[] → sous_sections[] → (texte, titre, numero)
// - Definitions : termes[] → (terme, definition)
// Cette fonction normalise le contenu du fichier vers un tableau d'articles
// plat que prepareKBArticles peut ingerer.
function extractArticlesFromKB(kb, parentTitle = '') {
  if (!kb || typeof kb !== 'object') return [];

  // Format standard : { articles: [...] }
  if (Array.isArray(kb.articles)) return kb.articles;

  // Format definitions : { termes: [{ terme, definition }] }
  if (Array.isArray(kb.termes)) {
    return kb.termes.map((t, i) => ({
      numero: t.terme || String(i + 1),
      titre: t.terme || '',
      texte: [t.definition || ''],
      chapitre: parentTitle || kb.meta?.partie || '',
    }));
  }

  // Format cadre conceptuel : sections[] → sous_sections[] → (numero, titre, texte)
  // On descend recursivement en aplatissant les feuilles (sous_sections avec texte).
  const out = [];
  const walk = (nodes, ancestryTitle) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const currentTitle = ancestryTitle
        ? `${ancestryTitle} — ${node.titre || ''}`
        : (node.titre || '');
      if (Array.isArray(node.sous_sections) && node.sous_sections.length > 0) {
        walk(node.sous_sections, currentTitle);
      } else if (node.texte || node.contenu) {
        out.push({
          numero: node.numero || '',
          titre: node.titre || '',
          texte: node.texte,
          contenu: node.contenu,
          mots_cles: node.mots_cles || [],
          chapitre: ancestryTitle || kb.meta?.partie || '',
        });
      }
    }
  };

  if (Array.isArray(kb.sections)) {
    walk(kb.sections, parentTitle || kb.meta?.partie || '');
  } else if (Array.isArray(kb)) {
    return kb;
  }

  return out;
}

function prepareKBArticles(articles, source) {
  // KB classique : { numero, titre, texte[], mots_cles[], statut }
  // KB fonctionnement : { numero, titre, contenu, fonctionnement{credit[], debit[]}, exclusions[], controles[] }
  // AUDCIF : { numero, titre, chapitre, texte[] }
  return articles.map((a, i) => {
    const texteStr = Array.isArray(a.texte) ? a.texte.join('\n') : (a.texte || '');
    const motsCles = (a.mots_cles || []).join(', ');

    // Construire le texte enrichi pour embedding
    let fullText = `${a.titre || ''}\n`;
    if (a.chapitre) fullText += `${a.chapitre}\n`;
    if (motsCles) fullText += `${motsCles}\n`;
    if (a.contenu) fullText += `Contenu: ${a.contenu}\n`;
    if (texteStr) fullText += texteStr + '\n';
    if (a.fonctionnement) {
      if (Array.isArray(a.fonctionnement.credit)) {
        fullText += 'CREDIT: ' + a.fonctionnement.credit.join('; ') + '\n';
      }
      if (Array.isArray(a.fonctionnement.debit)) {
        fullText += 'DEBIT: ' + a.fonctionnement.debit.join('; ') + '\n';
      }
    }
    if (Array.isArray(a.exclusions) && a.exclusions.length > 0) {
      fullText += 'EXCLUSIONS: ' + a.exclusions.map(e => typeof e === 'string' ? e : `${e.ne_pas_enregistrer} → ${e.utiliser}`).join('; ') + '\n';
    }

    const embeddingText = fullText.substring(0, 2000);

    return {
      id: `${source}_${a.numero || i}`,
      text: embeddingText,
      payload: {
        source,
        numero: a.numero || '',
        titre: a.titre || '',
        chapitre: a.chapitre || '',
        texte: (a.contenu || texteStr).substring(0, 2000),
        contenu: a.contenu || '',
        fonctionnement: a.fonctionnement || null,
        exclusions: a.exclusions || [],
        controles: a.controles || [],
        sens: a.sens || '',
        mots_cles: a.mots_cles || [],
        statut: a.statut || 'actif',
        type: a.fonctionnement ? 'fonctionnement_compte' : 'article_kb',
      },
    };
  });
}

function prepareEnrichedAccounts(accounts) {
  // Comptes enrichis : { numero, libelle, classe, contenu, commentaires, fonctionnement, ... }
  return accounts
    .filter(a => a.contenu) // Seulement les comptes enrichis
    .map((a, i) => {
      // Construire un texte riche pour l'embedding
      let text = `Compte ${a.numero} — ${a.libelle}\n`;
      text += `Contenu: ${a.contenu}\n`;
      if (a.commentaires) text += `Commentaires: ${a.commentaires}\n`;
      if (a.fonctionnement && typeof a.fonctionnement === 'object') {
        if (Array.isArray(a.fonctionnement.credit)) {
          text += 'Credit: ' + a.fonctionnement.credit.map(c => c.operation || c).join('; ') + '\n';
        }
        if (Array.isArray(a.fonctionnement.debit)) {
          text += 'Debit: ' + a.fonctionnement.debit.map(d => d.operation || d).join('; ') + '\n';
        }
      }
      if (a.exclusions && a.exclusions.length > 0) {
        text += 'Exclusions: ' + a.exclusions.join('; ') + '\n';
      }
      if (a.controle && a.controle.length > 0) {
        text += 'Controle: ' + a.controle.join('; ') + '\n';
      }

      const embeddingText = text.substring(0, 2000);

      return {
        id: `enriched_${a.numero}`,
        text: embeddingText,
        payload: {
          source: 'syscohada_enriched',
          numero: a.numero,
          titre: `Compte ${a.numero} — ${a.libelle}`,
          texte: text.substring(0, 2000),
          classe: a.classe,
          libelle: a.libelle,
          solde_normal: a.solde_normal || '',
          contreparties: a.contreparties || [],
          mots_cles: [
            `classe ${a.classe}`,
            `compte ${a.numero}`,
            a.libelle,
            a.solde_normal || '',
          ].filter(Boolean),
          type: 'compte_enrichi',
        },
      };
    });
}

// -------------------- Génération d'IDs stables --------------------

function stringToId(str) {
  // Qdrant veut des int ou uuid — on utilise un hash simple → entier positif
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) || 1;
}

// -------------------- Main --------------------

async function main() {
  const doReset = process.argv.includes('--reset');

  logger.info('=== Ingestion Knowledge Base dans Qdrant ===');

  // 1. Créer/reset la collection
  if (doReset) {
    try {
      await qdrant.deleteCollection(COLLECTION);
      logger.info(`Collection "${COLLECTION}" supprimee`);
    } catch (_) {}
  }
  await ensureCollection(COLLECTION);

  // 2. Charger les sources
  const kbDir = path.join(__dirname, '..', '..', 'knowledge-base');
  const dataDir = path.join(__dirname, '..', 'data');

  const sources = [];

  // Source 1: SYSCOHADA KB
  const syscohadaKB = loadJSON(path.join(kbDir, 'syscohada_fonctionnement_comptes.json'));
  if (syscohadaKB) {
    const articles = syscohadaKB.articles || syscohadaKB;
    const docs = prepareKBArticles(articles, 'syscohada');
    sources.push(...docs);
    logger.info(`SYSCOHADA KB: ${docs.length} articles`);
  }

  // Source 2: SYCEBNL KB
  const sycebnlKB = loadJSON(path.join(kbDir, 'sycebnl_complet_2000_2179.json'));
  if (sycebnlKB) {
    const articles = sycebnlKB.articles || sycebnlKB;
    const docs = prepareKBArticles(articles, 'sycebnl');
    sources.push(...docs);
    logger.info(`SYCEBNL KB: ${docs.length} articles`);
  }

  // Source 3: SMT KB
  const smtKB = loadJSON(path.join(kbDir, 'smt_complet.json'));
  if (smtKB) {
    const articles = smtKB.articles || smtKB;
    const docs = prepareKBArticles(articles, 'smt');
    sources.push(...docs);
    logger.info(`SMT KB: ${docs.length} articles`);
  }

  // Source 4: SIG KB
  const sigKB = loadJSON(path.join(kbDir, 'sig_complet.json'));
  if (sigKB) {
    const articles = sigKB.articles || sigKB;
    const docs = prepareKBArticles(articles, 'sig');
    sources.push(...docs);
    logger.info(`SIG KB: ${docs.length} articles`);
  }

  // Source 6: Fonctionnement des comptes — Classe 1
  const fonctC1KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe1.json'));
  if (fonctC1KB) {
    const articles = fonctC1KB.articles || fonctC1KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe1');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 1: ${docs.length} articles`);
  }

  // Source 7: Fonctionnement des comptes — Classe 2
  const fonctC2KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe2.json'));
  if (fonctC2KB) {
    const articles = fonctC2KB.articles || fonctC2KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe2');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 2: ${docs.length} articles`);
  }

  // Source 8: Fonctionnement des comptes — Classe 3
  const fonctC3KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe3.json'));
  if (fonctC3KB) {
    const articles = fonctC3KB.articles || fonctC3KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe3');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 3: ${docs.length} articles`);
  }

  // Source 9: Fonctionnement des comptes — Classe 4
  const fonctC4KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe4.json'));
  if (fonctC4KB) {
    const articles = fonctC4KB.articles || fonctC4KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe4');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 4: ${docs.length} articles`);
  }

  // Source 9: Fonctionnement des comptes — Classe 5
  const fonctC5KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe5.json'));
  if (fonctC5KB) {
    const articles = fonctC5KB.articles || fonctC5KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe5');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 5: ${docs.length} articles`);
  }

  // Source 10: Fonctionnement des comptes — Classe 6
  const fonctC6KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe6.json'));
  if (fonctC6KB) {
    const articles = fonctC6KB.articles || fonctC6KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe6');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 6: ${docs.length} articles`);
  }

  // Source 11: Fonctionnement des comptes — Classe 7
  const fonctC7KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe7.json'));
  if (fonctC7KB) {
    const articles = fonctC7KB.articles || fonctC7KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe7');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 7: ${docs.length} articles`);
  }

  // Source 12: Fonctionnement des comptes — Classe 8
  const fonctC8KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe8.json'));
  if (fonctC8KB) {
    const articles = fonctC8KB.articles || fonctC8KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe8');
    sources.push(...docs);
    logger.info(`Fonctionnement Comptes Classe 8: ${docs.length} articles`);
  }

  // Source 13: Ressources Durables (Chapitre 6)
  const resDurKB = loadJSON(path.join(kbDir, 'ressources_durables_chapitre_6.json'));
  if (resDurKB) {
    const articles = resDurKB.articles || resDurKB;
    const docs = prepareKBArticles(articles, 'ressources_durables');
    sources.push(...docs);
    logger.info(`Ressources Durables KB: ${docs.length} articles`);
  }

  // Sources 14+ : AUDCIF (Journal Officiel OHADA), cadre conceptuel SYSCOHADA,
  // chapitres thematiques et sources complementaires. Boucle compacte pour
  // eviter de multiplier les blocs if/loadJSON/push identiques.
  const additionalSources = [
    // Acte uniforme relatif au droit comptable et a l'information financiere
    { file: 'audcif_articles.json', label: 'audcif', title: 'AUDCIF (Journal Officiel OHADA)' },

    // Cadre conceptuel SYSCOHADA (principes comptables fondamentaux)
    { file: 'syscohada_cadre_conceptuel_chap1_2.json', label: 'cadre_conceptuel_ch1_2', title: 'Cadre conceptuel SYSCOHADA ch.1-2' },
    { file: 'syscohada_cadre_conceptuel_chap3.json', label: 'cadre_conceptuel_ch3', title: 'Cadre conceptuel SYSCOHADA ch.3' },
    { file: 'syscohada_cadre_conceptuel_chap4.json', label: 'cadre_conceptuel_ch4', title: 'Cadre conceptuel SYSCOHADA ch.4' },
    { file: 'syscohada_cadre_conceptuel_chap5.json', label: 'cadre_conceptuel_ch5', title: 'Cadre conceptuel SYSCOHADA ch.5' },
    { file: 'syscohada_cadre_conceptuel_chap7.json', label: 'cadre_conceptuel_ch7', title: 'Cadre conceptuel SYSCOHADA ch.7' },

    // Chapitres thematiques SYSCOHADA (rules d'evaluation et de presentation)
    { file: 'syscohada_ops_chap1.json', label: 'syscohada_ops_ch1', title: 'SYSCOHADA ch.1 operations' },
    { file: 'syscohada_chapitre7_amortissements.json', label: 'syscohada_ch7_amort', title: 'SYSCOHADA ch.7 amortissements' },
    { file: 'syscohada_chapitre8_provisions_depreciations.json', label: 'syscohada_ch8_prov', title: 'SYSCOHADA ch.8 provisions/depreciations' },
    { file: 'syscohada_chapitre10_produits.json', label: 'syscohada_ch10_prod', title: 'SYSCOHADA ch.10 produits' },
    { file: 'syscohada_chapitre12_tiers_chapitre13_gie.json', label: 'syscohada_ch12_13_tiers_gie', title: 'SYSCOHADA ch.12-13 tiers et GIE' },
    { file: 'syscohada_definitions_termes_chap6.json', label: 'syscohada_ch6_defs', title: 'SYSCOHADA ch.6 definitions' },

    // Soldes intermediaires de gestion et tableau flux de tresorerie
    { file: 'sig_chapitre_11.json', label: 'sig_ch11', title: 'SIG chapitre 11' },
    { file: 'tft_formules.json', label: 'tft_formules', title: 'TFT formules' },

    // SYCEBNL — cadre conceptuel et dispositions specifiques associations/OSBL
    { file: 'sycebnl_partie1_definitions_cadre_conceptuel.json', label: 'sycebnl_p1_cadre', title: 'SYCEBNL partie 1 cadre conceptuel' },
    { file: 'sycebnl_partie3_operations_specifiques.json', label: 'sycebnl_p3_ops', title: 'SYCEBNL partie 3 operations specifiques' },
    { file: 'sycebnl_partie4_etats_financiers_tft.json', label: 'sycebnl_p4_etats', title: 'SYCEBNL partie 4 etats financiers et TFT' },
  ];

  for (const src of additionalSources) {
    const kb = loadJSON(path.join(kbDir, src.file));
    if (!kb) {
      logger.warn(`Source introuvable: ${src.file}`);
      continue;
    }
    // Normalise formats alternatifs (sections/sous_sections, termes, etc.)
    // vers un tableau d'articles plat exploitable par prepareKBArticles.
    const articles = extractArticlesFromKB(kb);
    if (articles.length === 0) {
      logger.warn(`Aucun article extrait: ${src.file}`, { raison: 'format inconnu' });
      continue;
    }
    const docs = prepareKBArticles(articles, src.label);
    sources.push(...docs);
    logger.info(`${src.title}: ${docs.length} articles`);
  }

  // Source 5: Comptes enrichis (RAG)
  const enriched = loadJSON(path.join(dataDir, 'fonctionnement_comptes_syscohada.json'));
  if (enriched) {
    const accounts = Array.isArray(enriched) ? enriched : [];
    const docs = prepareEnrichedAccounts(accounts);
    sources.push(...docs);
    logger.info(`Comptes enrichis: ${docs.length} comptes`);
  }

  logger.info(`Total: ${sources.length} documents a vectoriser`);

  if (sources.length === 0) {
    logger.warn('Aucun document a ingerer.');
    return;
  }

  // 3. Générer les embeddings
  logger.info('Generation des embeddings (premiere execution = telechargement du modele)...');
  const texts = sources.map(s => s.text);
  const vectors = await embedBatch(texts);

  // 4. Préparer les points Qdrant
  const usedIds = new Set();
  const points = sources.map((s, i) => {
    let id = stringToId(s.id);
    // Éviter les collisions
    while (usedIds.has(id)) id++;
    usedIds.add(id);
    return {
      id,
      vector: vectors[i],
      payload: s.payload,
    };
  });

  // 5. Upsert dans Qdrant (avec retry)
  logger.info('Upsert dans Qdrant...');
  // Attendre que la collection soit bien prête
  await new Promise(r => setTimeout(r, 1000));

  const BATCH = 10;
  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH);
    let retries = 3;
    while (retries > 0) {
      try {
        await qdrant.upsert(COLLECTION, { points: batch, wait: true });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        logger.warn(`Retry upsert batch ${i}`, { restants: retries });
        await new Promise(r => setTimeout(r, 500));
      }
    }
    if ((i + BATCH) % 50 === 0) {
      logger.info(`Upsert: ${Math.min(i + BATCH, points.length)}/${points.length}`);
    }
  }
  logger.info(`Upsert termine: ${points.length} points`);

  // 6. Vérification
  const info = await qdrant.getCollection(COLLECTION);
  logger.info(`Collection "${COLLECTION}": ${info.points_count} points indexes`);
  logger.info('Ingestion terminee avec succes');
}

main().catch(err => {
  logger.error('Erreur fatale', { error: err instanceof Error ? err.stack || err.message : String(err) });
  process.exit(1);
});

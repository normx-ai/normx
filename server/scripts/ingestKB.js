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
const { embed, embedBatch, ensureCollection, upsertPoints, qdrant } = require('../qdrant');

const COLLECTION = 'normx_kb';

// -------------------- Chargement des sources --------------------

function loadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Erreur chargement ${filePath}: ${err.message}`);
    return null;
  }
}

// -------------------- Préparation des documents --------------------

function prepareKBArticles(articles, source) {
  // KB classique : { numero, titre, texte[], mots_cles[], statut }
  // KB fonctionnement : { numero, titre, contenu, fonctionnement{credit[], debit[]}, exclusions[], controles[] }
  return articles.map((a, i) => {
    const texteStr = Array.isArray(a.texte) ? a.texte.join('\n') : (a.texte || '');
    const motsCles = (a.mots_cles || []).join(', ');

    // Construire le texte enrichi pour embedding
    let fullText = `${a.titre || ''}\n${motsCles}\n`;
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

  console.log('=== Ingestion Knowledge Base dans Qdrant ===\n');

  // 1. Créer/reset la collection
  if (doReset) {
    try {
      await qdrant.deleteCollection(COLLECTION);
      console.log(`Collection "${COLLECTION}" supprimee`);
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
    console.log(`SYSCOHADA KB: ${docs.length} articles`);
  }

  // Source 2: SYCEBNL KB
  const sycebnlKB = loadJSON(path.join(kbDir, 'sycebnl_complet_2000_2179.json'));
  if (sycebnlKB) {
    const articles = sycebnlKB.articles || sycebnlKB;
    const docs = prepareKBArticles(articles, 'sycebnl');
    sources.push(...docs);
    console.log(`SYCEBNL KB: ${docs.length} articles`);
  }

  // Source 3: SMT KB
  const smtKB = loadJSON(path.join(kbDir, 'smt_complet.json'));
  if (smtKB) {
    const articles = smtKB.articles || smtKB;
    const docs = prepareKBArticles(articles, 'smt');
    sources.push(...docs);
    console.log(`SMT KB: ${docs.length} articles`);
  }

  // Source 4: SIG KB
  const sigKB = loadJSON(path.join(kbDir, 'sig_complet.json'));
  if (sigKB) {
    const articles = sigKB.articles || sigKB;
    const docs = prepareKBArticles(articles, 'sig');
    sources.push(...docs);
    console.log(`SIG KB: ${docs.length} articles`);
  }

  // Source 6: Fonctionnement des comptes — Classe 1
  const fonctC1KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe1.json'));
  if (fonctC1KB) {
    const articles = fonctC1KB.articles || fonctC1KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe1');
    sources.push(...docs);
    console.log(`Fonctionnement Comptes Classe 1: ${docs.length} articles`);
  }

  // Source 7: Fonctionnement des comptes — Classe 2
  const fonctC2KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe2.json'));
  if (fonctC2KB) {
    const articles = fonctC2KB.articles || fonctC2KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe2');
    sources.push(...docs);
    console.log(`Fonctionnement Comptes Classe 2: ${docs.length} articles`);
  }

  // Source 8: Fonctionnement des comptes — Classe 3
  const fonctC3KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe3.json'));
  if (fonctC3KB) {
    const articles = fonctC3KB.articles || fonctC3KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe3');
    sources.push(...docs);
    console.log(`Fonctionnement Comptes Classe 3: ${docs.length} articles`);
  }

  // Source 9: Fonctionnement des comptes — Classe 4
  const fonctC4KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe4.json'));
  if (fonctC4KB) {
    const articles = fonctC4KB.articles || fonctC4KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe4');
    sources.push(...docs);
    console.log(`Fonctionnement Comptes Classe 4: ${docs.length} articles`);
  }

  // Source 9: Fonctionnement des comptes — Classe 5
  const fonctC5KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe5.json'));
  if (fonctC5KB) {
    const articles = fonctC5KB.articles || fonctC5KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe5');
    sources.push(...docs);
    console.log(`Fonctionnement Comptes Classe 5: ${docs.length} articles`);
  }

  // Source 10: Fonctionnement des comptes — Classe 6
  const fonctC6KB = loadJSON(path.join(kbDir, 'fonctionnement_comptes_classe6.json'));
  if (fonctC6KB) {
    const articles = fonctC6KB.articles || fonctC6KB;
    const docs = prepareKBArticles(articles, 'fonctionnement_classe6');
    sources.push(...docs);
    console.log(`Fonctionnement Comptes Classe 6: ${docs.length} articles`);
  }

  // Source 11: Ressources Durables (Chapitre 6)
  const resDurKB = loadJSON(path.join(kbDir, 'ressources_durables_chapitre_6.json'));
  if (resDurKB) {
    const articles = resDurKB.articles || resDurKB;
    const docs = prepareKBArticles(articles, 'ressources_durables');
    sources.push(...docs);
    console.log(`Ressources Durables KB: ${docs.length} articles`);
  }

  // Source 5: Comptes enrichis (RAG)
  const enriched = loadJSON(path.join(dataDir, 'fonctionnement_comptes_syscohada.json'));
  if (enriched) {
    const accounts = Array.isArray(enriched) ? enriched : [];
    const docs = prepareEnrichedAccounts(accounts);
    sources.push(...docs);
    console.log(`Comptes enrichis: ${docs.length} comptes`);
  }

  console.log(`\nTotal: ${sources.length} documents a vectoriser\n`);

  if (sources.length === 0) {
    console.log('Aucun document a ingerer.');
    return;
  }

  // 3. Générer les embeddings
  console.log('Generation des embeddings (premiere execution = telechargement du modele)...\n');
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
  console.log('Upsert dans Qdrant...');
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
        console.log(`Retry upsert batch ${i}... (${retries} restants)`);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    if ((i + BATCH) % 50 === 0) {
      console.log(`Upsert: ${Math.min(i + BATCH, points.length)}/${points.length}`);
    }
  }
  console.log(`Upsert termine: ${points.length} points`);

  // 6. Vérification
  const info = await qdrant.getCollection(COLLECTION);
  console.log(`\nCollection "${COLLECTION}": ${info.points_count} points indexes`);
  console.log('Ingestion terminee avec succes !');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});

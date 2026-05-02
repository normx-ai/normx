/**
 * Service OCR Import — NormX
 * Extraction de donnees de factures via Claude Vision
 * et mapping automatique vers les comptes SYSCOHADA.
 */

import Anthropic from '@anthropic-ai/sdk';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import logger from '../logger';
import { getAnthropicClient } from '../utils/anthropic.client';

function getClient(): Anthropic {
  return getAnthropicClient();
}

// ============ TYPES ============

export interface FactureLigne {
  description: string;
  montant_ht: number;
  taux_tva: number;
  montant_tva: number;
  montant_ttc: number;
}

export interface FactureExtraite {
  type_document: 'facture_achat' | 'facture_vente' | 'avoir' | 'recu' | 'autre';
  fournisseur: string;
  client: string;
  date_facture: string;
  numero_facture: string;
  lignes: FactureLigne[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  // Retenue a la Source (RAS) appliquee par le client. Diminue le net a payer
  // au fournisseur, va au credit du compte 4424 (Etat, retenues a reverser).
  retenue_source: number;
  taux_retenue_source: number;
  net_a_payer: number;
  devise: string;
  notes: string;
}

export interface EcritureLigneSuggestion {
  numero_compte: string;
  libelle_compte: string;
  debit: number;
  credit: number;
  tiers_id: number | null;
}

export interface TiersSuggestion {
  id: number;
  nom: string;
  code_tiers: string;
  type: string;
  compte_comptable: string;
}

export interface OCRImportResult {
  extracted: FactureExtraite;
  ecriture: {
    journal: string;
    date_ecriture: string;
    numero_piece: string;
    libelle: string;
    lignes: EcritureLigneSuggestion[];
  };
  tiers_suggestions: TiersSuggestion[];
  confidence: 'high' | 'medium' | 'low';
}

// ============ CLAUDE VISION ============

const EXTRACTION_PROMPT = `Tu es un assistant d'extraction de donnees comptables pour le referentiel SYSCOHADA (espace OHADA, devise FCFA).

Analyse ce document (facture, recu, avoir) et retourne les informations extraites au format JSON strict.

Regles :
- Les montants sont en FCFA (pas de decimales, arrondis a l'entier)
- Les dates sont au format YYYY-MM-DD
- Si un champ n'est pas visible, mets une chaine vide ou 0
- Determine le type : facture_achat (on recoit une facture), facture_vente (on emet), avoir, recu, autre
- Pour chaque ligne de la facture, extrais la description, le montant HT, le taux TVA, le montant TVA, le montant TTC
- Si la TVA n'est pas detaillee par ligne, applique le taux global a chaque ligne
- IMPORTANT : detecte la Retenue a la Source (RAS / Retenue / Withholding tax / IRPP) si presente.
  En zone CEMAC/Congo elle apparait souvent sous "Retenue", "RAS", "BIC RAS", "Retenue 5%/10%/15%".
  Elle est deduite du net a payer. Renseigne 'retenue_source' (montant), 'taux_retenue_source' (taux %),
  et 'net_a_payer' (montant effectivement du au fournisseur apres retenue). Si pas de RAS, mets 0.

Retourne UNIQUEMENT le JSON suivant (pas de texte avant/apres) :
{
  "type_document": "facture_achat" | "facture_vente" | "avoir" | "recu" | "autre",
  "fournisseur": "nom du fournisseur",
  "client": "nom du client",
  "date_facture": "YYYY-MM-DD",
  "numero_facture": "numero",
  "lignes": [
    { "description": "...", "montant_ht": 0, "taux_tva": 18, "montant_tva": 0, "montant_ttc": 0 }
  ],
  "total_ht": 0,
  "total_tva": 0,
  "total_ttc": 0,
  "retenue_source": 0,
  "taux_retenue_source": 0,
  "net_a_payer": 0,
  "devise": "XAF",
  "notes": "observations eventuelles",
  "confidence": "high" | "medium" | "low"
}`;

export async function extractFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<{ extracted: FactureExtraite; confidence: 'high' | 'medium' | 'low' }> {
  const client = getClient();
  const base64 = fileBuffer.toString('base64');

  const isPDF = mimeType === 'application/pdf';

  const content: Anthropic.Messages.ContentBlockParam[] = isPDF
    ? [
        {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 },
        },
        { type: 'text' as const, text: 'Analyse ce document comptable et extrais les donnees.' },
      ]
    : [
        {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 },
        },
        { type: 'text' as const, text: 'Analyse ce document comptable et extrais les donnees.' },
      ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: EXTRACTION_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Pas de reponse texte de Claude Vision');
  }

  // Claude peut wrap le JSON dans des balises markdown ou ajouter du texte
  // autour malgre le prompt strict. On extrait le bloc JSON tolerant :
  // 1. Fence markdown ```json ... ``` ou ``` ... ```
  // 2. Sinon premier { jusqu'au } correspondant.
  const raw = textBlock.text.trim();
  let jsonStr = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      jsonStr = raw.slice(start, end + 1);
    }
  }

  let parsed: FactureExtraite & { confidence?: string };
  try {
    parsed = JSON.parse(jsonStr) as FactureExtraite & { confidence?: string };
  } catch (parseErr) {
    logger.warn('OCR Import : JSON parse echec. Reponse brute Claude: %s', raw.slice(0, 500));
    throw new Error('JSON invalide de Claude Vision : ' + (parseErr instanceof Error ? parseErr.message : String(parseErr)));
  }
  const confidence = (parsed.confidence as 'high' | 'medium' | 'low') || 'medium';

  return {
    extracted: {
      type_document: parsed.type_document || 'autre',
      fournisseur: parsed.fournisseur || '',
      client: parsed.client || '',
      date_facture: parsed.date_facture || '',
      numero_facture: parsed.numero_facture || '',
      lignes: parsed.lignes || [],
      total_ht: parsed.total_ht || 0,
      total_tva: parsed.total_tva || 0,
      total_ttc: parsed.total_ttc || 0,
      retenue_source: parsed.retenue_source || 0,
      taux_retenue_source: parsed.taux_retenue_source || 0,
      net_a_payer: parsed.net_a_payer || 0,
      devise: parsed.devise || 'XAF',
      notes: parsed.notes || '',
    },
    confidence,
  };
}

// ============ MAPPING SYSCOHADA ============

function classifyPurchaseAccount(description: string): { numero: string; libelle: string } {
  const desc = description.toLowerCase();
  if (desc.includes('service') || desc.includes('prestation') || desc.includes('conseil') || desc.includes('honoraire'))
    return { numero: '604000', libelle: 'Achats de prestations de services' };
  if (desc.includes('transport') || desc.includes('livraison') || desc.includes('fret'))
    return { numero: '612000', libelle: 'Transports sur achats' };
  if (desc.includes('fourniture') || desc.includes('bureau') || desc.includes('papier'))
    return { numero: '605000', libelle: 'Autres achats' };
  if (desc.includes('loyer') || desc.includes('bail') || desc.includes('location'))
    return { numero: '622000', libelle: 'Locations et charges locatives' };
  if (desc.includes('electricite') || desc.includes('eau') || desc.includes('energie'))
    return { numero: '605100', libelle: 'Fournitures non stockables (eau, electricite)' };
  if (desc.includes('telephone') || desc.includes('internet') || desc.includes('telecom'))
    return { numero: '628000', libelle: 'Frais de telecommunication' };
  if (desc.includes('assurance'))
    return { numero: '625000', libelle: 'Primes d\'assurance' };
  if (desc.includes('entretien') || desc.includes('reparation') || desc.includes('maintenance'))
    return { numero: '624000', libelle: 'Entretien, reparations et maintenance' };
  // Par defaut : achats de marchandises
  return { numero: '601000', libelle: 'Achats de marchandises' };
}

function classifySaleAccount(description: string): { numero: string; libelle: string } {
  const desc = description.toLowerCase();
  if (desc.includes('service') || desc.includes('prestation') || desc.includes('conseil'))
    return { numero: '706000', libelle: 'Services vendus' };
  if (desc.includes('travaux'))
    return { numero: '705000', libelle: 'Travaux factures' };
  return { numero: '701000', libelle: 'Ventes de marchandises' };
}

export async function mapToSYSCOHADA(
  extracted: FactureExtraite,
  schema: string,
): Promise<{
  ecriture: OCRImportResult['ecriture'];
  tiers_suggestions: TiersSuggestion[];
}> {
  const s = getValidatedSchemaName(schema);
  const isAchat = extracted.type_document === 'facture_achat' || extracted.type_document === 'recu';
  const isVente = extracted.type_document === 'facture_vente';

  // Chercher le tiers dans la base
  const tiersNom = isAchat ? extracted.fournisseur : extracted.client;
  let tiersSuggestions: TiersSuggestion[] = [];
  if (tiersNom) {
    try {
      const tiersResult = await pool.query(
        `SELECT id, nom, code_tiers, type, compte_comptable FROM "${s}".tiers WHERE nom ILIKE $1 ORDER BY nom LIMIT 5`,
        ['%' + tiersNom + '%']
      );
      tiersSuggestions = tiersResult.rows;
    } catch {
      // Table tiers peut ne pas exister dans un schema etats
    }
  }

  const tiersId = tiersSuggestions.length > 0 ? tiersSuggestions[0].id : null;
  const tiersCompte = tiersSuggestions.length > 0 && tiersSuggestions[0].compte_comptable
    ? tiersSuggestions[0].compte_comptable
    : isAchat ? '401000' : '411000';

  // Construire les lignes d'ecriture
  const lignes: EcritureLigneSuggestion[] = [];

  if (isAchat) {
    // Lignes d'achat (debit)
    for (const l of extracted.lignes) {
      const compte = classifyPurchaseAccount(l.description);
      lignes.push({
        numero_compte: compte.numero,
        libelle_compte: compte.libelle,
        debit: l.montant_ht,
        credit: 0,
        tiers_id: null,
      });
    }
    // TVA deductible (debit)
    if (extracted.total_tva > 0) {
      lignes.push({
        numero_compte: '445100',
        libelle_compte: 'TVA recuperable sur achats',
        debit: extracted.total_tva,
        credit: 0,
        tiers_id: null,
      });
    }
    // Retenue a la source (credit) — diminue le net a payer au fournisseur
    const ras = extracted.retenue_source || 0;
    if (ras > 0) {
      lignes.push({
        numero_compte: '442400',
        libelle_compte: 'Etat, retenues a la source a reverser',
        debit: 0,
        credit: ras,
        tiers_id: null,
      });
    }
    // Fournisseur (credit) — TTC moins RAS retenue
    const netFournisseur = extracted.total_ttc - ras;
    lignes.push({
      numero_compte: tiersCompte,
      libelle_compte: 'Fournisseur ' + (tiersNom || ''),
      debit: 0,
      credit: netFournisseur,
      tiers_id: tiersId,
    });
  } else if (isVente) {
    const ras = extracted.retenue_source || 0;
    // Client (debit) — TTC moins RAS prelevee par le client (creance reduite)
    lignes.push({
      numero_compte: tiersCompte,
      libelle_compte: 'Client ' + (tiersNom || ''),
      debit: extracted.total_ttc - ras,
      credit: 0,
      tiers_id: tiersId,
    });
    // Retenue a la source subie (debit) — creance sur l'Etat (a recuperer en credit IS)
    if (ras > 0) {
      lignes.push({
        numero_compte: '447300',
        libelle_compte: 'Etat, retenues a la source subies',
        debit: ras,
        credit: 0,
        tiers_id: null,
      });
    }
    // Lignes de vente (credit)
    for (const l of extracted.lignes) {
      const compte = classifySaleAccount(l.description);
      lignes.push({
        numero_compte: compte.numero,
        libelle_compte: compte.libelle,
        debit: 0,
        credit: l.montant_ht,
        tiers_id: null,
      });
    }
    // TVA collectee (credit)
    if (extracted.total_tva > 0) {
      lignes.push({
        numero_compte: '443100',
        libelle_compte: 'TVA facturee sur ventes',
        debit: 0,
        credit: extracted.total_tva,
        tiers_id: null,
      });
    }
  } else {
    // Document non identifie : une seule ligne generique
    lignes.push({
      numero_compte: '471000',
      libelle_compte: 'Compte d\'attente',
      debit: extracted.total_ttc,
      credit: 0,
      tiers_id: null,
    });
    lignes.push({
      numero_compte: '401000',
      libelle_compte: 'Fournisseur',
      debit: 0,
      credit: extracted.total_ttc,
      tiers_id: null,
    });
  }

  const journal = isAchat ? 'ACH' : isVente ? 'VTE' : 'OD';
  const libelle = isAchat
    ? `Achat ${tiersNom || ''} ${extracted.numero_facture || ''}`.trim()
    : isVente
      ? `Vente ${tiersNom || ''} ${extracted.numero_facture || ''}`.trim()
      : `Document ${extracted.numero_facture || ''}`.trim();

  return {
    ecriture: {
      journal,
      date_ecriture: extracted.date_facture || new Date().toISOString().slice(0, 10),
      numero_piece: extracted.numero_facture || '',
      libelle,
      lignes,
    },
    tiers_suggestions: tiersSuggestions,
  };
}

// ============ FONCTION PRINCIPALE ============

export async function processDocument(
  fileBuffer: Buffer,
  mimeType: string,
  schema: string,
): Promise<OCRImportResult> {
  logger.info('OCR Import : extraction en cours (type=%s, taille=%d)', mimeType, fileBuffer.length);

  const { extracted, confidence } = await extractFromDocument(fileBuffer, mimeType);
  logger.info('OCR Import : extraction terminee (type=%s, fournisseur=%s, total=%d)',
    extracted.type_document, extracted.fournisseur || extracted.client, extracted.total_ttc);

  const { ecriture, tiers_suggestions } = await mapToSYSCOHADA(extracted, schema);

  return { extracted, ecriture, tiers_suggestions, confidence };
}

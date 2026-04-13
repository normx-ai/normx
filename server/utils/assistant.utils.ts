// ===================== ASSISTANT UTILITIES =====================

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

export const COMMON_RULES =
  'Regles :\n'
  + '- Reponds toujours en francais.\n'
  + '- N\'utilise JAMAIS de markdown (pas de **, ##, *, ``). Texte brut uniquement.\n'
  + '- Ecris de facon professionnelle, structuree et claire.\n'
  + '- Base tes reponses sur les articles fournis dans la base de connaissance.\n'
  + '- Cite les references (numeros de comptes, articles) quand tu references le referentiel.\n'
  + '- Si la question depasse la base de connaissance, indique-le.\n'
  + '- Pour les ecritures comptables : Debit: [compte - libelle] / Credit: [compte - libelle] avec montants.\n'
  + '- Si l\'utilisateur te demande de retenir ou memoriser quelque chose, reponds en confirmant et inclus dans ta reponse la balise [MEMORISER: cle | valeur] pour chaque element a retenir.\n'
  + '- Si l\'utilisateur demande ce que tu sais sur lui, consulte la memoire utilisateur ci-dessus.';

export function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/##\s?/g, '').replace(/`{1,3}/g, '');
}

export function generateTitle(message: string): string {
  const clean = message.replace(/[?!.]/g, '').trim();
  if (clean.length <= 50) return clean;
  return clean.substring(0, 47) + '...';
}

export function detectAgent(message: string, typeActivite: string | undefined): string {
  const msg = message.toLowerCase();

  // Explicit type from frontend
  if (typeActivite === 'smt') return 'smt';
  if (typeActivite === 'projet_developpement') return 'projet';

  // Revision keywords
  const revisionTerms = ['revision', 'reviser', 'controle des comptes', 'anomalie', 'ecart',
    'regularisation', 'rapprochement', 'cut-off', 'cloture', 'ajustement',
    'commissaire', 'audit', 'verification', 'balance n-1', 'balance n',
    'cycle de revision', 'confirmation des tiers', 'circularisation'];
  if (revisionTerms.some(t => msg.includes(t))) return 'revision';

  // SMT keywords
  const smtTerms = ['smt', 'systeme minimal', 'tresorerie minimale', 'journal de tresorerie',
    'tres petite entite', 'comptabilite de tresorerie', 'recettes depenses',
    'creances impayees', 'dettes a payer', 'inventaire extra-comptable',
    'seuil 60 millions', 'seuil 40 millions', 'seuil 30 millions'];
  if (smtTerms.some(t => msg.includes(t))) return 'smt';

  // SYCEBNL keywords
  const sycebnlTerms = ['sycebnl', 'but non lucratif', 'association', 'ong', 'fondation',
    'parti politique', 'syndicat', 'projet de developpement', 'bailleur',
    'fonds affectes', 'fonds d\'administration'];
  if (sycebnlTerms.some(t => msg.includes(t))) return 'sycebnl';

  // SYSCOHADA keywords (default for accounting questions)
  const syscohadaTerms = ['syscohada', 'plan comptable', 'compte 1', 'compte 2', 'compte 3',
    'compte 4', 'compte 5', 'compte 6', 'compte 7', 'compte 8', 'compte 9',
    'ecriture comptable', 'fonctionnement du compte', 'classe 1', 'classe 2',
    'classe 3', 'classe 4', 'classe 5', 'classe 6', 'classe 7', 'classe 8',
    'immobilisation', 'amortissement', 'provision', 'tresorerie', 'fournisseur',
    'client', 'tva', 'capital', 'emprunt', 'stock', 'vente', 'achat',
    'charge', 'produit', 'resultat', 'bilan', 'hao', 'cession'];
  if (syscohadaTerms.some(t => msg.includes(t))) return 'syscohada';

  // Default: SYSCOHADA for general accounting, SYCEBNL if entity type suggests it
  if (typeActivite && ['association', 'ong', 'fondation', 'parti_politique', 'syndicat'].includes(typeActivite)) {
    return 'sycebnl';
  }

  return 'syscohada';
}

/**
 * Redaction des donnees personnelles identifiables (PII) avant envoi
 * a un fournisseur LLM externe (Anthropic).
 *
 * PORTEE LIMITEE : redacte uniquement les identifiants structures (SIRET,
 * SIREN, emails, IBAN, telephones, RIB). Ne redacte PAS les noms de
 * personnes/societes (necessite NER) ni les adresses postales.
 *
 * Si le tenant a activé `settings.allow_external_llm = true`, le message
 * est envoye tel quel (consentement explicite tracé en audit_log).
 *
 * Format de remplacement : `[REDACTED:TYPE]` — comprehensible par le LLM
 * pour qu'il puisse formuler une reponse intelligente sans connaitre la
 * valeur originale.
 */

export type PiiType = 'SIRET' | 'SIREN' | 'EMAIL' | 'IBAN' | 'PHONE' | 'RIB';

export interface RedactionResult {
  text: string;
  redactions: { type: PiiType; count: number }[];
}

interface PatternDef {
  type: PiiType;
  // Regex avec word boundaries pour eviter de redacter du contenu noye dans
  // d'autres chaines (ex: id technique 14 chiffres dans une URL).
  pattern: RegExp;
  // Filtrage post-match : valider une checksum / format strict (optionnel).
  validate?: (match: string) => boolean;
}

// Validation Luhn pour SIRET (14 chiffres) et SIREN (9 chiffres) — evite les
// faux positifs sur des suites numeriques quelconques (ex: numero de facture).
function isLuhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const PATTERNS: PatternDef[] = [
  {
    type: 'IBAN',
    // FR puis 25 caracteres alphanum (simplifie ; couvre la plupart des cas FR/EU)
    pattern: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){4,7}\b/g,
  },
  {
    type: 'SIRET',
    pattern: /\b\d{14}\b/g,
    validate: isLuhnValid,
  },
  {
    type: 'SIREN',
    pattern: /\b\d{9}\b/g,
    validate: isLuhnValid,
  },
  {
    type: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    type: 'PHONE',
    // Strict : exige soit prefixe '+' (international), soit au moins 2
    // separateurs (espace/point/tiret) entre groupes — evite de matcher
    // une suite arbitraire de chiffres (SIRET non-Luhn, code, ID...).
    //   +33 6 12 34 56 78 / +242 06 123 4567 / 01.02.03.04.05 / 06-12-34-56-78
    pattern: /(?:\+\d{1,3}[\s.-]?(?:\d{1,4}[\s.-]?){2,5}\d{2,4}|(?:\d{1,4}[\s.-]){3,5}\d{2,4})/g,
    validate: (m) => {
      const digits = m.replace(/\D/g, '').length;
      return digits >= 8 && digits <= 15;
    },
  },
  {
    type: 'RIB',
    // RIB FR : 23 chiffres + cle 2 = 25 (avec ou sans espaces)
    // Pattern simplifie : 5 + 5 + 11 + 2 chiffres
    pattern: /\b\d{5}[\s-]?\d{5}[\s-]?\d{11}[\s-]?\d{2}\b/g,
  },
];

export function redactPii(text: string): RedactionResult {
  if (!text) return { text, redactions: [] };

  let out = text;
  const counts = new Map<PiiType, number>();

  for (const def of PATTERNS) {
    out = out.replace(def.pattern, (match) => {
      if (def.validate && !def.validate(match)) return match;
      counts.set(def.type, (counts.get(def.type) ?? 0) + 1);
      return `[REDACTED:${def.type}]`;
    });
  }

  return {
    text: out,
    redactions: Array.from(counts.entries()).map(([type, count]) => ({ type, count })),
  };
}

/**
 * Pour les memoires/historiques : applique redactPii sur chaque champ texte.
 */
export function redactMemoryEntries(
  entries: { cle: string; valeur: string }[],
): { cle: string; valeur: string }[] {
  return entries.map((e) => ({
    cle: redactPii(e.cle).text,
    valeur: redactPii(e.valeur).text,
  }));
}

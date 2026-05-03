import { redactPii, redactMemoryEntries } from '../services/assistant.redact';

describe('redactPii', () => {
  test('email simple', () => {
    const r = redactPii('Contact : alice@acme.com');
    expect(r.text).toBe('Contact : [REDACTED:EMAIL]');
    expect(r.redactions).toEqual([{ type: 'EMAIL', count: 1 }]);
  });

  test('plusieurs emails dans un meme texte', () => {
    const r = redactPii('a@x.fr et b@y.com');
    expect(r.text).toBe('[REDACTED:EMAIL] et [REDACTED:EMAIL]');
    expect(r.redactions).toEqual([{ type: 'EMAIL', count: 2 }]);
  });

  test('SIRET valide (Luhn) redacte', () => {
    // SIRET valide : 73282932000074 (Luhn OK)
    const r = redactPii('SIRET : 73282932000074 fin');
    expect(r.text).toContain('[REDACTED:SIRET]');
  });

  test('SIRET invalide (Luhn KO) NON redacte', () => {
    // 14 chiffres mais Luhn KO : 12345678901234
    const r = redactPii('Reference 12345678901234');
    expect(r.text).toBe('Reference 12345678901234');
    expect(r.redactions.find((x) => x.type === 'SIRET')).toBeUndefined();
  });

  test('SIREN valide redacte', () => {
    // SIREN valide : 732829320 (Luhn OK)
    const r = redactPii('Societe SIREN 732829320');
    expect(r.text).toContain('[REDACTED:SIREN]');
  });

  test('IBAN FR', () => {
    const r = redactPii('IBAN FR76 1741 8000 0100 0120 8529 342 enfin');
    expect(r.text).toContain('[REDACTED:IBAN]');
    expect(r.redactions.find((x) => x.type === 'IBAN')?.count).toBe(1);
  });

  test('telephone international', () => {
    const r = redactPii('Tel +33 6 12 34 56 78');
    expect(r.text).toContain('[REDACTED:PHONE]');
  });

  test('chaine vide retourne stable', () => {
    expect(redactPii('').text).toBe('');
    expect(redactPii('').redactions).toEqual([]);
  });

  test('texte sans PII : pas de modification', () => {
    const t = 'Calcule le solde du compte 411 sur l exercice 2025';
    expect(redactPii(t).text).toBe(t);
    expect(redactPii(t).redactions).toEqual([]);
  });

  test('combinaison email + SIRET valide', () => {
    // SIRET valide Luhn : 73282932000074
    const r = redactPii('Client : alice@x.com SIRET 73282932000074');
    expect(r.text).toContain('[REDACTED:EMAIL]');
    expect(r.text).toContain('[REDACTED:SIRET]');
  });
});

describe('redactMemoryEntries', () => {
  test('redacte cle ET valeur', () => {
    const out = redactMemoryEntries([
      { cle: 'contact_principal', valeur: 'a@x.com' },
      { cle: 'email_alt', valeur: 'b@y.fr' },
    ]);
    expect(out[0].valeur).toBe('[REDACTED:EMAIL]');
    expect(out[1].valeur).toBe('[REDACTED:EMAIL]');
  });

  test('preserve les entrees sans PII', () => {
    const out = redactMemoryEntries([{ cle: 'agence', valeur: 'Brazzaville' }]);
    expect(out).toEqual([{ cle: 'agence', valeur: 'Brazzaville' }]);
  });
});

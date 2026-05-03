import { api, withQuery } from '../apiEndpoints';

describe('withQuery', () => {
  it('retourne la base seule si aucun parametre', () => {
    expect(withQuery('/api/foo')).toBe('/api/foo');
    expect(withQuery('/api/foo', {})).toBe('/api/foo');
  });

  it('ignore les valeurs null, undefined ou vides', () => {
    expect(withQuery('/api/foo', { a: null, b: undefined, c: '' })).toBe('/api/foo');
  });

  it('serialise les valeurs definies', () => {
    expect(withQuery('/api/foo', { a: 1, b: 'x' })).toBe('/api/foo?a=1&b=x');
  });

  it('encode les caracteres speciaux', () => {
    expect(withQuery('/api/foo', { q: 'a b&c' })).toBe('/api/foo?q=a+b%26c');
  });

  it('melange valeurs definies et vides', () => {
    expect(withQuery('/api/foo', { a: 1, b: '', c: 'x' })).toBe('/api/foo?a=1&c=x');
  });
});

describe('api.auth', () => {
  it('expose les endpoints statiques', () => {
    expect(api.auth.me).toBe('/api/auth/me');
    expect(api.auth.refresh).toBe('/api/auth/refresh');
    expect(api.auth.logout).toBe('/api/auth/logout');
    expect(api.auth.callback).toBe('/api/auth/callback');
  });
});

describe('api.tenant', () => {
  it('expose les endpoints statiques', () => {
    expect(api.tenant.me).toBe('/api/tenant/me');
    expect(api.tenant.setup).toBe('/api/tenant/setup');
    expect(api.tenant.exercice).toBe('/api/tenant/exercice');
  });
});

describe('api.entites', () => {
  it('construit les URLs', () => {
    expect(api.entites.list).toBe('/api/entites');
    expect(api.entites.byId(42)).toBe('/api/entites/42');
  });
});

describe('api.journaux', () => {
  it('construit les URLs', () => {
    expect(api.journaux.list).toBe('/api/journaux');
    expect(api.journaux.byId(7)).toBe('/api/journaux/7');
  });
});

describe('api.tiers', () => {
  it('construit les URLs', () => {
    expect(api.tiers.root).toBe('/api/tiers');
    expect(api.tiers.byEntite(3)).toBe('/api/tiers/3');
    expect(api.tiers.byId(5)).toBe('/api/tiers/5');
  });
});

describe('api.planComptable', () => {
  it('encode le referentiel et le search', () => {
    expect(api.planComptable.byReferentiel('SYSCOHADA')).toBe(
      '/api/plan-comptable?referentiel=SYSCOHADA',
    );
    expect(api.planComptable.search('40 1')).toBe('/api/plan-comptable?search=40%201');
  });
});

describe('api.comptesCustom', () => {
  it('construit les URLs', () => {
    expect(api.comptesCustom.list).toBe('/api/comptes-custom');
    expect(api.comptesCustom.planFusionne).toBe('/api/comptes-custom/plan-fusionne');
    expect(api.comptesCustom.byId(12)).toBe('/api/comptes-custom/12');
  });
});

describe('api.balance', () => {
  it('construit les URLs', () => {
    expect(api.balance.base).toBe('/api/balance');
    expect(api.balance.import).toBe('/api/balance/import');
    expect(api.balance.byId(4)).toBe('/api/balance/4');
    expect(api.balance.byExercice(1, 2, 'N')).toBe('/api/balance/1/2/N');
    expect(api.balance.byExercice(1, 2, 'N-1')).toBe('/api/balance/1/2/N-1');
    expect(api.balance.statut(9)).toBe('/api/balance/statut/9');
    expect(api.balance.ligne(11)).toBe('/api/balance/ligne/11');
    expect(api.balance.revision(11)).toBe('/api/balance/revision/11');
    expect(api.balance.exercice).toBe('/api/balance/exercice');
    expect(api.balance.exerciceById(6)).toBe('/api/balance/exercices/6');
    expect(api.balance.exercicesByEntite(8)).toBe('/api/balance/exercices/8');
    expect(api.balance.cloturerExercice(3)).toBe('/api/balance/exercice/3/cloturer');
    expect(api.balance.rouvrirExercice(3)).toBe('/api/balance/exercice/3/rouvrir');
  });
});

describe('api.ecritures', () => {
  it('construit les URLs de base', () => {
    expect(api.ecritures.root).toBe('/api/ecritures');
    expect(api.ecritures.byId(100)).toBe('/api/ecritures/100');
    expect(api.ecritures.valider).toBe('/api/ecritures/valider');
    expect(api.ecritures.devalider).toBe('/api/ecritures/devalider');
  });

  it('construit la liste avec et sans query', () => {
    expect(api.ecritures.list(1, 2)).toBe('/api/ecritures/1/2');
    expect(api.ecritures.list(1, 2, { journal: 'AC', q: '' })).toBe('/api/ecritures/1/2?journal=AC');
  });

  it('construit les URLs balance et grand livre', () => {
    expect(api.ecritures.balance(1, 2)).toBe('/api/ecritures/balance/1/2');
    expect(api.ecritures.balanceBase).toBe('/api/ecritures/balance');
    expect(api.ecritures.balanceTiers(1, 2)).toBe('/api/ecritures/balance-tiers/1/2');
    expect(api.ecritures.comptes(1, 2)).toBe('/api/ecritures/comptes/1/2');
    expect(api.ecritures.grandLivre(1, 2, { compte: '401' })).toBe(
      '/api/ecritures/grand-livre/1/2?compte=401',
    );
    expect(api.ecritures.grandLivreTiers(1, 2)).toBe('/api/ecritures/grand-livre-tiers/1/2');
  });

  it('construit les URLs de lettrage', () => {
    expect(api.ecritures.lettrage.lettrer).toBe('/api/ecritures/lettrage/lettrer');
    expect(api.ecritures.lettrage.delettrer).toBe('/api/ecritures/lettrage/delettrer');
    expect(api.ecritures.lettrage.tiers(1, 2, { type: 'client' })).toBe(
      '/api/ecritures/lettrage/tiers/1/2?type=client',
    );
    expect(api.ecritures.lettrage.ecritures(1, 2, 5)).toBe(
      '/api/ecritures/lettrage/ecritures/1/2/5',
    );
  });

  it('construit les URLs de rapports', () => {
    expect(api.ecritures.rapports.balanceAgee(1, 2)).toBe(
      '/api/ecritures/rapports/balance-agee/1/2',
    );
    expect(api.ecritures.rapports.balanceAgee(1, 2, { typeTiers: 'client' })).toBe(
      '/api/ecritures/rapports/balance-agee/1/2?typeTiers=client',
    );
    expect(api.ecritures.rapports.comparatif(1, 2)).toBe('/api/ecritures/rapports/comparatif/1/2');
    expect(api.ecritures.rapports.echeancier(1, 2)).toBe('/api/ecritures/rapports/echeancier/1/2');
    expect(api.ecritures.rapports.tresorerie(1, 2)).toBe('/api/ecritures/rapports/tresorerie/1/2');
    expect(api.ecritures.rapports.journalCentralisateur(1, 2)).toBe(
      '/api/ecritures/rapports/journal-centralisateur/1/2',
    );
    expect(api.ecritures.rapports.repartitionCharges(1, 2)).toBe(
      '/api/ecritures/rapports/repartition-charges/1/2',
    );
    expect(api.ecritures.rapports.tableauBord(1, 2)).toBe(
      '/api/ecritures/rapports/tableau-bord/1/2',
    );
  });
});

describe('api.notifications', () => {
  it('construit les URLs', () => {
    expect(api.notifications.byUser(7)).toBe('/api/notifications/7');
    expect(api.notifications.unreadCount(7)).toBe('/api/notifications/7/unread-count');
    expect(api.notifications.readAll(7)).toBe('/api/notifications/read-all/7');
    expect(api.notifications.byId(22)).toBe('/api/notifications/22');
    expect(api.notifications.read(22)).toBe('/api/notifications/22/read');
  });
});

describe('api.assistant', () => {
  it('construit les URLs', () => {
    expect(api.assistant.chat).toBe('/api/assistant/chat');
    expect(api.assistant.fonctionnementComptes).toBe('/api/assistant/fonctionnement-comptes');
    // Plus de :userId dans l'URL — le serveur deduit du JWT (cf migration 012)
    expect(api.assistant.conversations).toBe('/api/assistant/conversations');
    expect(api.assistant.conversationById(100)).toBe('/api/assistant/conversations/100');
    expect(api.assistant.conversationMessages(100)).toBe('/api/assistant/conversations/100/messages');
    expect(api.assistant.memory).toBe('/api/assistant/memory');
    expect(api.assistant.memoryById(55)).toBe('/api/assistant/memory/55');
  });
});

describe('api.ocrImport', () => {
  it('expose les endpoints statiques', () => {
    expect(api.ocrImport.extract).toBe('/api/ocr-import/extract');
  });
});

// Barrel : regroupe les modules du service ecritures.
// Les implementations sont reparties dans ./ecritures/ par responsabilite :
//   - crud       : creation / update / suppression / validation
//   - grand-livre : liste paginee des lignes validees
//   - balance    : balance derivee des ecritures
//   - tiers      : grand livre tiers + balance tiers
//   - stats      : compteurs globaux (cache 60s)
//   - rapports   : journal central, balance agee, tresorerie, repartition,
//                  comparatif N/N-1, tableau de bord, echeancier
//   - lettrage   : listage tiers / ecritures, lettrer / delettrer

export * from './ecritures/crud';
export * from './ecritures/grand-livre';
export * from './ecritures/balance';
export * from './ecritures/tiers';
export * from './ecritures/stats';
export * from './ecritures/rapports';
export * from './ecritures/lettrage';

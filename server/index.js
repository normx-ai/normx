const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/.env' });
const logger = require('./logger');

const authRoutes = require('./routes/auth').default;
const balanceRoutes = require('./routes/balance').default;
const assistantRoutes = require('./routes/assistant').default;
const planComptableRoutes = require('./routes/planComptable').default;
const ecrituresRoutes = require('./routes/ecritures').default;
const tiersRoutes = require('./routes/tiers').default;
const entitesRoutes = require('./routes/entites').default;
const tvaRoutes = require('./routes/tva').default;
const paieRoutes = require('./routes/paie').default;
const workflowRoutes = require('./routes/workflow').default;
const rubriquesRoutes = require('./routes/rubriques').default;
const notificationsRoutes = require('./routes/notifications').default;
const permissionsRoutes = require('./routes/permissions').default;

// Middleware auth + tenant
const { authenticateToken } = require('./middleware/auth');
const { tenantMiddleware } = require('./middleware/tenant.middleware');
const { switchClientMiddleware } = require('./middleware/tenant.guards');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes publiques (pas de tenant)
app.use('/api', authRoutes);

// Middleware chaine : auth → tenant → switch client
const tenantChain = [authenticateToken, tenantMiddleware, switchClientMiddleware];

// Routes protegees (tenant requis)
app.use('/api/balance', ...tenantChain, balanceRoutes);
app.use('/api/assistant', ...tenantChain, assistantRoutes);
app.use('/api/plan-comptable', ...tenantChain, planComptableRoutes);
app.use('/api/ecritures', ...tenantChain, ecrituresRoutes);
app.use('/api/tiers', ...tenantChain, tiersRoutes);
app.use('/api/entites', ...tenantChain, entitesRoutes);
app.use('/api/tva', ...tenantChain, tvaRoutes);
app.use('/api/paie', ...tenantChain, paieRoutes);
app.use('/api/paie/workflow', ...tenantChain, workflowRoutes);
app.use('/api/paie/rubriques', ...tenantChain, rubriquesRoutes);
app.use('/api/notifications', ...tenantChain, notificationsRoutes);
app.use('/api/revision', ...tenantChain, require('./routes/revision').default);
app.use('/api/permissions', ...tenantChain, permissionsRoutes);

// 404 handler — JSON au lieu de HTML
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvee' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Erreur serveur : %s', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

const PORT = 5002;
app.listen(PORT, () => {
  logger.info(`Normx - Serveur demarre sur http://localhost:${PORT}`);
});

const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/.env' });
const logger = require('./logger');

const authRoutes = require('./routes/auth');
const balanceRoutes = require('./routes/balance');
const assistantRoutes = require('./routes/assistant');
const planComptableRoutes = require('./routes/planComptable');
const ecrituresRoutes = require('./routes/ecritures');
const tiersRoutes = require('./routes/tiers');
const entitesRoutes = require('./routes/entites');
const tvaRoutes = require('./routes/tva');
const paieRoutes = require('./routes/paie');
const notificationsRoutes = require('./routes/notifications');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', authRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/plan-comptable', planComptableRoutes);
app.use('/api/ecritures', ecrituresRoutes);
app.use('/api/tiers', tiersRoutes);
app.use('/api/entites', entitesRoutes);
app.use('/api/tva', tvaRoutes);
app.use('/api/paie', paieRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/revision', require('./routes/revision'));

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

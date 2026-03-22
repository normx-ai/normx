const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const planSycebnl = require(path.join(__dirname, '..', 'data', 'plan_comptable_sycebnl.json'));

// Chargement SYSCOHADA (lazy, au premier appel)
let planSyscohada = null;
function getPlanSyscohada() {
  if (!planSyscohada) {
    const filePath = path.join(__dirname, '..', 'data', 'plan_comptable_syscohada.json');
    if (fs.existsSync(filePath)) {
      planSyscohada = require(filePath);
    } else {
      planSyscohada = [];
    }
  }
  return planSyscohada;
}

function getPlan(referentiel) {
  if (referentiel === 'syscohada') return getPlanSyscohada();
  return planSycebnl;
}

// GET /api/plan-comptable — liste complète ou filtrée
// ?referentiel=syscohada|sycebnl (defaut: sycebnl)
router.get('/', (req, res) => {
  const { classe, search, referentiel } = req.query;
  let result = getPlan(referentiel);

  if (classe) {
    result = result.filter(c => c.classe === parseInt(classe, 10));
  }

  if (search) {
    const term = search.toLowerCase();
    result = result.filter(c =>
      c.numero.startsWith(term) || c.libelle.toLowerCase().includes(term)
    );
  }

  res.json(result);
});

// GET /api/plan-comptable/:numero — un compte spécifique
// ?referentiel=syscohada|sycebnl (defaut: sycebnl)
router.get('/:numero', (req, res) => {
  const plan = getPlan(req.query.referentiel);
  const compte = plan.find(c => c.numero === req.params.numero);
  if (!compte) {
    return res.status(404).json({ error: 'Compte non trouvé' });
  }
  res.json(compte);
});

module.exports = router;

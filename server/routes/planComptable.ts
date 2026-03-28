import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

interface CompteComptable {
  numero: string;
  libelle: string;
  classe: number;
}

const planSycebnl: CompteComptable[] = require(path.join(__dirname, '..', 'data', 'plan_comptable_sycebnl.json'));

// Chargement SYSCOHADA (lazy, au premier appel)
let planSyscohada: CompteComptable[] | null = null;
function getPlanSyscohada(): CompteComptable[] {
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

function getPlan(referentiel: string | undefined): CompteComptable[] {
  if (referentiel === 'syscohada') return getPlanSyscohada();
  return planSycebnl;
}

const router = express.Router();

// GET /api/plan-comptable — liste complete ou filtree
// ?referentiel=syscohada|sycebnl (defaut: sycebnl)
router.get('/', (req: Request, res: Response) => {
  const { classe, search, referentiel } = req.query;
  let result = getPlan(referentiel as string | undefined);

  if (classe) {
    result = result.filter((c: CompteComptable) => c.classe === parseInt(classe as string, 10));
  }

  if (search) {
    const term = (search as string).toLowerCase();
    result = result.filter((c: CompteComptable) =>
      c.numero.startsWith(term) || c.libelle.toLowerCase().includes(term)
    );
  }

  res.json(result);
});

// GET /api/plan-comptable/:numero — un compte specifique
// ?referentiel=syscohada|sycebnl (defaut: sycebnl)
router.get('/:numero', (req: Request, res: Response) => {
  const plan = getPlan(req.query.referentiel as string | undefined);
  const compte = plan.find((c: CompteComptable) => c.numero === req.params.numero);
  if (!compte) {
    return res.status(404).json({ error: 'Compte non trouve' });
  }
  res.json(compte);
});

export default router;

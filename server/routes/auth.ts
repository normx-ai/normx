import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import logger from '../logger';

const router = express.Router();

function getErrorMessage(err: { message?: string } | null): string {
  if (err && typeof err === 'object' && 'message' in err) return err.message || 'Erreur inconnue';
  return String(err);
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface EntiteRow {
  id: number;
  nom: string;
  type_activite: string;
  offre: string;
  modules: string[];
  sigle: string;
  adresse: string;
  nif: string;
  telephone: string;
  email: string;
  created_at: string;
}

interface UserRow {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: string;
  cabinet_id: number;
  cabinet_nom: string;
  otp_code: string | null;
  is_verified: boolean;
}

// Inscription (cree cabinet + premiere entite + user admin)
router.post('/register', async (req: Request, res: Response) => {
  const { nom, prenom, email, password, telephone, entite, cabinet_name, type_compte, type_activite, offre, modules: reqModules } = req.body;

  if (!nom || !prenom || !email || !password || !entite || !type_activite) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent etre remplis.' });
  }

  const validTypes = ['association', 'ordre_professionnel', 'projet_developpement', 'smt', 'entreprise'];
  if (!validTypes.includes(type_activite)) {
    return res.status(400).json({ error: "Type d'activite invalide." });
  }

  const validOffres = ['comptabilite', 'etats'];
  const offreValue = validOffres.includes(offre) ? offre : 'comptabilite';

  // Modules : utiliser ceux envoyes par le frontend, sinon fallback sur l'offre
  const validModules = ['compta', 'etats', 'paie'];
  let modules: string[];
  if (Array.isArray(reqModules) && reqModules.length > 0) {
    modules = reqModules.filter((m: string) => validModules.includes(m));
    if (modules.length === 0) modules = ['compta'];
  } else {
    modules = offreValue === 'comptabilite' ? ['compta'] : ['etats'];
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Un compte avec cet e-mail existe deja.' });
    }

    // Creer le cabinet
    const cabinetNom = (type_compte === 'cabinet' && cabinet_name) ? cabinet_name : entite;
    const cabinetResult = await pool.query(
      'INSERT INTO cabinets (nom) VALUES ($1) RETURNING id, nom',
      [cabinetNom]
    );
    const cabinetId: number = cabinetResult.rows[0].id;

    // Creer la premiere entite/dossier
    const entiteResult = await pool.query(
      'INSERT INTO entites (cabinet_id, nom, type_activite, offre, modules) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cabinetId, entite, type_activite, offreValue, modules]
    );
    const entiteRow: EntiteRow = entiteResult.rows[0];

    // Creer l'utilisateur admin
    const otpCode = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (nom, prenom, email, password, telephone, role, cabinet_id, otp_code, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, nom, prenom, email, role',
      [nom, prenom, email, hashedPassword, telephone || null, 'administrateur', cabinetId, otpCode, false]
    );

    res.status(201).json({
      message: 'Compte cree. Veuillez verifier votre identite.',
      user: {
        ...userResult.rows[0],
        cabinet_id: cabinetId,
        cabinet_nom: cabinetResult.rows[0].nom,
        entite: entiteRow.nom,
        entite_id: entiteRow.id,
        type_activite: entiteRow.type_activite,
        offre: entiteRow.offre,
        modules: entiteRow.modules,
        sigle: '', adresse: '', nif: '',
      },
      entite: entiteRow,
      otp: otpCode,
    });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Verifier OTP
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'E-mail et code requis.' });

  try {
    const result = await pool.query('SELECT id, otp_code FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouve.' });

    const user: { id: number; otp_code: string | null } = result.rows[0];
    if (user.otp_code !== code) return res.status(401).json({ error: 'Code incorrect.' });

    await pool.query('UPDATE users SET is_verified = true, otp_code = NULL WHERE id = $1', [user.id]);
    res.json({ message: 'Identite verifiee avec succes.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Connexion
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-mail et mot de passe requis.' });

  try {
    const result = await pool.query(
      `SELECT u.*, c.nom AS cabinet_nom
       FROM users u LEFT JOIN cabinets c ON u.cabinet_id = c.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });

    const user: UserRow = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });

    const otpCode = generateOTP();
    await pool.query('UPDATE users SET otp_code = $1 WHERE id = $2', [otpCode, user.id]);

    // Recuperer toutes les entites du cabinet
    const entitesResult = await pool.query(
      'SELECT id, nom, type_activite, offre, modules, sigle, adresse, nif, telephone, email, created_at FROM entites WHERE cabinet_id = $1 AND actif = true ORDER BY nom',
      [user.cabinet_id]
    );
    const entites: EntiteRow[] = entitesResult.rows;
    const firstEntite: Partial<EntiteRow> = entites[0] || {};

    res.json({
      message: 'Connexion reussie.',
      user: {
        id: user.id, nom: user.nom, prenom: user.prenom, email: user.email,
        role: user.role,
        cabinet_id: user.cabinet_id,
        cabinet_nom: user.cabinet_nom,
        entite: firstEntite.nom || '',
        entite_id: firstEntite.id || 0,
        type_activite: firstEntite.type_activite || 'entreprise',
        offre: firstEntite.offre || 'comptabilite',
        modules: firstEntite.modules || ['compta', 'etats', 'paie'],
        sigle: firstEntite.sigle || '',
        adresse: firstEntite.adresse || '',
        nif: firstEntite.nif || '',
      },
      entites: entites,
      otp: otpCode,
    });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Lister les entites d'un cabinet
router.get('/entites/cabinet/:cabinetId', async (req: Request, res: Response) => {
  const { cabinetId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM entites WHERE cabinet_id = $1 AND actif = true ORDER BY nom',
      [cabinetId]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Creer un nouveau dossier/entite dans un cabinet
router.post('/entites', async (req: Request, res: Response) => {
  const { cabinet_id, nom, type_activite, offre, modules, sigle, adresse, nif, telephone, email } = req.body;
  if (!cabinet_id || !nom || !type_activite) {
    return res.status(400).json({ error: 'cabinet_id, nom et type_activite requis.' });
  }

  const mods: string[] = modules || ['compta', 'etats', 'paie'];

  try {
    const result = await pool.query(
      'INSERT INTO entites (cabinet_id, nom, type_activite, offre, modules, sigle, adresse, nif, telephone, email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [cabinet_id, nom, type_activite, offre || 'comptabilite', mods, sigle || null, adresse || null, nif || null, telephone || null, email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier une entite
router.put('/entites/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nom, type_activite, offre, modules, sigle, adresse, nif, telephone, email, data } = req.body;
  try {
    const result = await pool.query(
      `UPDATE entites SET nom=COALESCE($1,nom), type_activite=COALESCE($2,type_activite), offre=COALESCE($3,offre),
       modules=COALESCE($4,modules), sigle=COALESCE($5,sigle), adresse=COALESCE($6,adresse), nif=COALESCE($7,nif),
       telephone=COALESCE($8,telephone), email=COALESCE($9,email),
       data = COALESCE(data, '{}'::jsonb) || COALESCE($11::jsonb, '{}'::jsonb)
       WHERE id=$10 RETURNING *`,
      [nom, type_activite, offre, modules, sigle, adresse, nif, telephone, email, id, data ? JSON.stringify(data) : null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entite non trouvee.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Desactiver une entite
router.delete('/entites/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE entites SET actif = false WHERE id = $1', [id]);
    res.json({ message: 'Entite desactivee.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Renvoyer OTP
router.post('/send-otp-email', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail requis.' });

  try {
    const result = await pool.query('SELECT id, prenom, otp_code FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouve.' });

    const user: { id: number; prenom: string; otp_code: string | null } = result.rows[0];
    const code = user.otp_code || generateOTP();

    if (!user.otp_code) {
      await pool.query('UPDATE users SET otp_code = $1 WHERE id = $2', [code, user.id]);
    }

    res.json({ message: 'Code envoye par e-mail.', devCode: code });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;

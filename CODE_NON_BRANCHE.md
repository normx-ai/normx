# Code non branche — NORMX

Date : 2026-04-06

Fichiers presents dans le projet mais pas encore utilises en production. Conserves car ils implementent des fonctionnalites prevues.

---

## Frontend

### src/paie/data/saisieElementsData.ts (50 lignes)
Categories pour la saisie des elements variables de paie (primes, absences, heures supplementaires, avantages, retenues). Sera utilise quand la saisie mensuelle des elements variables sera implementee dans le module paie.

### src/paie/data/workflow.ts (159 lignes)
Workflow de validation des bulletins de paie : brouillon → valide → verrouille. Fonctions de gestion des statuts, cloture de periode mensuelle, cumuls annuels. Conforme CGI 2026. Sera branche quand le cycle de validation des bulletins sera actif.

### src/paie/components/BulletinPaie.tsx
Composant d'affichage du bulletin de paie (en-tete, lignes gains/cotisations/indemnites, pied de page). Utilise BulletinHeader, BulletinLignes, BulletinFooter. Sera branche quand le calcul et l'affichage des bulletins seront actifs.

---

## Backend

### server/middleware/audit.ts
Middleware d'audit automatique. Insere une ligne dans `audit_log` a chaque requete reussie (action, module, entite, IP, details). Fonctionne en factory : `auditMiddleware('compta', 'ecritures')`. Sera branche sur les routes sensibles pour renforcer la tracabilite.

### server/middleware/permissions.middleware.ts (42 lignes)
Middleware RBAC granulaire par action. Verifie dans `permissions_modules` si l'utilisateur a le droit (lire/creer/modifier/supprimer) sur un module donne. Actuellement le controle d'acces passe par `requireModule` (acces au module entier). Ce middleware sera branche quand on voudra differencier lecture seule vs edition par utilisateur.

### server/routes/rapprochement.ts + server/services/rapprochement.service.ts
Rapprochement bancaire : import de releves (PDF/CSV/Excel), matching automatique avec les ecritures comptables, sauvegarde de l'etat de rapprochement. Supporte les banques Congo (BGFI, LCB, UBA, Ecobank, Societe Generale, BSCA). La route existe mais n'est pas enregistree dans index.ts. Sera branche quand le module rapprochement sera active.

---

## Packages npm installes mais pas importes

### nodemailer
Envoi d'emails. Prevu pour les notifications par email (declarations sociales, alertes cloture, etc.). Les variables SMTP sont deja configurees dans .env.production (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).

### react-router-dom
Routing SPA. L'application utilise actuellement un systeme d'onglets (activeTab) au lieu du routing URL. Pourrait etre utile si on passe a un systeme de navigation par URL.

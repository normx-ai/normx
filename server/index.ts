import express, { Request, Response, NextFunction } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import logger from "./logger";
import pool from "./db";
import { isHttpError } from "./errors";
import { validateEnvAtBoot } from "./config/env";

// Fail-fast au boot : variables d'env invalides => crash avec message clair.
try {
  validateEnvAtBoot();
} catch (err) {
  logger.error('Boot abandonne : %s', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

dotenv.config({ path: path.join(__dirname, ".env") });

import balanceRoutes from "./routes/balance";
import assistantRoutes from "./routes/assistant";
import planComptableRoutes from "./routes/planComptable";
import ecrituresRoutes from "./routes/ecritures";
import tiersRoutes from "./routes/tiers";
import entitesRoutes from "./routes/entites";
import journauxRoutes from "./routes/journaux";
import comptesCustomRoutes from "./routes/comptesCustom";
import resultatFiscalRoutes from "./routes/resultatFiscal";
import notificationsRoutes from "./routes/notifications";
import permissionsRoutes from "./routes/permissions";
import ocrImportRoutes from "./routes/ocr-import";
import authRoutes from "./routes/auth";

import tenantRoutes from "./routes/tenant";
import { authenticateToken } from "./middleware/auth";
import { requireSubscription } from "./middleware/subscription.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { switchClientMiddleware } from "./middleware/tenant.guards";
import { requireTenantSchema } from "./middleware/requireTenantSchema";
import { requireModule, requireAnyModule } from "./middleware/moduleGuard";
import { csrfProtection } from "./middleware/csrf";

const app = express();

// Trust proxy (Nginx reverse proxy envoie X-Forwarded-For)
app.set('trust proxy', 1);

// Compression gzip/brotli
app.use(compression());

// Securite : headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.KEYCLOAK_URL || 'http://localhost:8080'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Securite : CORS
// Refuser explicitement les wildcards : '*' avec credentials est invalide et
// tout fallback permissif est une erreur de configuration, pas un defaut voulu.
const allowedOrigins = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"]
).map((o) => o.trim()).filter(Boolean);
if (allowedOrigins.some((o) => o === '*' || o.includes('*'))) {
  throw new Error('ALLOWED_ORIGINS ne doit pas contenir de wildcard (*). Lister explicitement chaque origin.');
}
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Platform", "X-Mobile-Timestamp", "X-Mobile-Signature", "X-Client-Slug", "X-XSRF-TOKEN"],
}));

// Rate limiting global (toutes les routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requetes, reessayez plus tard.' },
});

// Rate limiting strict pour auth/sensitive
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, reessayez dans 1 heure.' },
});

// Rate limiting pour assistant IA (couteux)
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: process.env.NODE_ENV === 'production' ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requetes IA atteinte, reessayez plus tard.' },
});

// Rate limiting pour routes de donnees (anti-exfiltration)
const dataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requetes de donnees, reessayez dans 1 minute.' },
});

app.use(globalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(csrfProtection);

// Servir le frontend React build avec cache
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true,
  setHeaders: (res, filePath) => {
    // Les fichiers avec hash dans le nom (ex: main.a1b2c3.js) peuvent etre caches longtemps
    // index.html ne doit pas etre cache (pour forcer le rechargement des assets)
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// Routes auth (pas de middleware - publiques)
app.use("/api/auth", sensitiveLimiter, authRoutes);

// Routes tenant (auth + subscription, pas de tenant middleware car le tenant peut ne pas exister)
app.use("/api/tenant", authenticateToken, requireSubscription('normx'), tenantRoutes);

// Swagger UI (dev/staging uniquement)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });
}

// Middleware chaine : auth → subscription → tenant → switch client → garde schema
const tenantChain = [
  authenticateToken,
  requireSubscription('normx'),
  tenantMiddleware,
  switchClientMiddleware,
  requireTenantSchema,
];

// Routes protegees (tenant requis)
// Le cabinet peut travailler sur ses propres donnees OU celles d'un client (via X-Client-Slug)
app.use("/api/entites", ...tenantChain, entitesRoutes);
app.use("/api/notifications", ...tenantChain, notificationsRoutes);
app.use("/api/permissions", ...tenantChain, permissionsRoutes);

// Routes de donnees
app.use("/api/balance", ...tenantChain, dataLimiter, requireAnyModule('compta', 'etats'), balanceRoutes);
app.use("/api/assistant", ...tenantChain, chatLimiter, assistantRoutes);

// Module COMPTA
app.use("/api/ocr-import", ...tenantChain, requireModule('compta'), chatLimiter, ocrImportRoutes);
app.use("/api/ecritures", ...tenantChain, dataLimiter, requireModule('compta'), ecrituresRoutes);
app.use("/api/plan-comptable", ...tenantChain, dataLimiter, requireAnyModule('compta', 'etats'), planComptableRoutes);
app.use("/api/tiers", ...tenantChain, dataLimiter, requireModule('compta'), tiersRoutes);
app.use("/api/journaux", ...tenantChain, dataLimiter, requireModule('compta'), journauxRoutes);
app.use("/api/comptes-custom", ...tenantChain, dataLimiter, requireAnyModule('compta', 'etats'), comptesCustomRoutes);
app.use("/api/resultat-fiscal", ...tenantChain, dataLimiter, requireAnyModule('compta', 'etats'), resultatFiscalRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service OK
 *       503:
 *         description: Service degrade
 */
// Health check (verifie DB)
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "normx" });
  } catch (err) {
    logger.error("Health check DB failed: " + (err instanceof Error ? err.message : String(err)));
    res.status(503).json({ status: "degraded", service: "normx", db: "unreachable" });
  }
});

// SPA fallback (dev uniquement — en prod nginx sert le frontend)
if (process.env.NODE_ENV !== "production") {
  app.get("/{*path}", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route non trouvee" });
});

// Error handler central : map HttpError -> { error, code, details? }, fallback 500.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (isHttpError(err)) {
    // Erreurs metier attendues : log warn (pas d'alerte), serialise proprement.
    logger.warn(
      '[%s %s] %s (%d %s)',
      req.method,
      req.path,
      err.message,
      err.status,
      err.code,
    );
    const body: { error: string; code: string; details?: unknown } = {
      error: err.message,
      code: err.code,
    };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.status).json(body);
    return;
  }
  // Erreurs imprevues : log full stack, response generique.
  logger.error(
    `[${req.method} ${req.path}] Erreur serveur : ${err.message}\n${err.stack}`,
  );
  res.status(500).json({ error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' });
});

// Avertissement cle Anthropic : les routes IA (chat, OCR) retourneront 503
// a l'utilisation si la cle manque, mais le reste du serveur fonctionne.
if (!process.env.ANTHROPIC_API_KEY) {
  logger.warn('ANTHROPIC_API_KEY absent : les fonctions IA (chat assistant, OCR) retourneront 503.');
}

// Migration auto au boot (opt-in via AUTO_MIGRATE_TENANTS=true).
// Utilise pour environnements dev / staging ; en prod preferer un job CI dedie.
async function maybeAutoMigrate(): Promise<void> {
  if (process.env.AUTO_MIGRATE_TENANTS !== 'true') return;
  try {
    const { applyAllTenantMigrations } = await import('./scripts/applyTenantMigrations');
    await applyAllTenantMigrations();
  } catch (err) {
    logger.error(
      'Migration auto au boot a echoue : %s',
      err instanceof Error ? err.message : String(err),
    );
  }
}

const PORT = parseInt(process.env.PORT || "5002");
const server = app.listen(PORT, async () => {
  logger.info(`NORMX Finance - Serveur demarre sur http://localhost:${PORT}`);
  await maybeAutoMigrate();
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} recu, arret gracieux...`);
  server.close(async () => {
    try { await pool.end(); } catch { /* ignore */ }
    logger.info("Serveur arrete proprement.");
    process.exit(0);
  });
  setTimeout(() => { process.exit(1); }, 10000);
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import logger from "./logger";
import pool from "./db";

dotenv.config({ path: path.join(__dirname, ".env") });

import balanceRoutes from "./routes/balance";
import assistantRoutes from "./routes/assistant";
import planComptableRoutes from "./routes/planComptable";
import ecrituresRoutes from "./routes/ecritures";
import tiersRoutes from "./routes/tiers";
import entitesRoutes from "./routes/entites";
import tvaRoutes from "./routes/tva";
import paieRoutes from "./routes/paie";
import workflowRoutes from "./routes/workflow";
import rubriquesRoutes from "./routes/rubriques";
import notificationsRoutes from "./routes/notifications";
import permissionsRoutes from "./routes/permissions";
import revisionRoutes from "./routes/revision";
import authRoutes from "./routes/auth";

import tenantRoutes from "./routes/tenant";
import { authenticateToken } from "./middleware/auth";
import { requireSubscription } from "./middleware/subscription.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { switchClientMiddleware } from "./middleware/tenant.guards";

const app = express();

// Securite : headers HTTP
app.use(helmet({ contentSecurityPolicy: false }));

// Securite : CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Securite : rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Servir le frontend React build
app.use(express.static(path.join(__dirname, "public")));

// Routes auth (pas de middleware - publiques)
app.use("/api/auth", authRoutes);

// Routes tenant (auth + subscription, pas de tenant middleware car le tenant peut ne pas exister)
app.use("/api/tenant", authenticateToken, requireSubscription('normx'), tenantRoutes);

// Middleware chaine : auth → subscription → tenant → switch client
const tenantChain = [authenticateToken, requireSubscription('normx'), tenantMiddleware, switchClientMiddleware];

// Routes protegees (tenant requis)
app.use("/api/balance", ...tenantChain, balanceRoutes);
app.use("/api/assistant", ...tenantChain, assistantRoutes);
app.use("/api/plan-comptable", ...tenantChain, planComptableRoutes);
app.use("/api/ecritures", ...tenantChain, ecrituresRoutes);
app.use("/api/tiers", ...tenantChain, tiersRoutes);
app.use("/api/entites", ...tenantChain, entitesRoutes);
app.use("/api/tva", ...tenantChain, tvaRoutes);
app.use("/api/paie", ...tenantChain, paieRoutes);
app.use("/api/paie/workflow", ...tenantChain, workflowRoutes);
app.use("/api/paie/rubriques", ...tenantChain, rubriquesRoutes);
app.use("/api/notifications", ...tenantChain, notificationsRoutes);
app.use("/api/revision", ...tenantChain, revisionRoutes);
app.use("/api/permissions", ...tenantChain, permissionsRoutes);

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

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Erreur serveur : ${err.message}\n${err.stack}`);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

const PORT = parseInt(process.env.PORT || "5002");
const server = app.listen(PORT, () => {
  logger.info(`Normx - Serveur demarre sur http://localhost:${PORT}`);
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

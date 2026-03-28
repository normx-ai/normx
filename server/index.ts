import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import logger from "./logger";

dotenv.config({ path: path.join(__dirname, ".env") });

import authRoutes from "./routes/auth";
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

import { authenticateToken } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { switchClientMiddleware } from "./middleware/tenant.guards";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Servir le frontend React build
app.use(express.static(path.join(__dirname, "public")));

// Routes publiques (pas de tenant)
app.use("/api", authRoutes);

// Middleware chaine : auth → tenant → switch client
const tenantChain = [authenticateToken, tenantMiddleware, switchClientMiddleware];

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

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "normx" });
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
  logger.error("Erreur serveur : %s", err.message);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

const PORT = parseInt(process.env.PORT || "5002");
app.listen(PORT, () => {
  logger.info(`Normx - Serveur demarre sur http://localhost:${PORT}`);
});

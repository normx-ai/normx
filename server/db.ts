import { Pool, types } from "pg";
import logger from "./logger";

types.setTypeParser(1082, (val: string) => val);

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5434"),
      database: process.env.DB_NAME || "normx_db",
      user: process.env.DB_USER || "normx_etats",
      password: process.env.DB_PASSWORD || "normx_etats_2026",
    });

pool.on("error", (err: Error) => {
  logger.error("Erreur PostgreSQL : %s", err.message);
});

export default pool;

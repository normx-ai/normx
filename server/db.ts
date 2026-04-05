import { Pool, types } from "pg";
import logger from "./logger";

types.setTypeParser(1082, (val: string) => val);

const poolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ...poolConfig })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5434"),
      database: process.env.DB_NAME || "normx_db",
      user: process.env.DB_USER || "normx_etats",
      password: process.env.DB_PASSWORD,
      ...poolConfig,
    });

pool.on("error", (err: Error) => {
  logger.error("Erreur PostgreSQL : %s", err.message);
});

export default pool;

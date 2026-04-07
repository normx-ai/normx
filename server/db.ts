import { Pool, types } from "pg";
import logger from "./logger";

types.setTypeParser(1082, (val: string) => val);

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,                    // Kill queries > 30s
  idle_in_transaction_session_timeout: 10000,   // Kill idle transactions > 10s
  ...(isProduction && {
    ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
  }),
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

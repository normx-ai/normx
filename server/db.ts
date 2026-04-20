import { Pool, types } from "pg";
import logger from "./logger";

types.setTypeParser(1082, (val: string) => val);

const isProduction = process.env.NODE_ENV === 'production';

// SSL : active uniquement si DB_SSL=true (ex: PG distant avec certificat)
// Par defaut desactive pour le cas Docker reseau interne (host normx-db)
// ou le trafic ne sort jamais de l'hote.
const sslEnabled = process.env.DB_SSL === 'true';

// Garde-fou : si NODE_ENV=production et qu'on pointe vers un host non-local
// non-Docker (donc probablement un PG distant sur Internet), loguer un warning
// pour forcer une decision explicite sur DB_SSL.
if (isProduction && !sslEnabled) {
  const host = (() =>  {
    try {
      if (process.env.DATABASE_URL) return new URL(process.env.DATABASE_URL).hostname;
    } catch { /* URL mal formee: ignore */ }
    return process.env.DB_HOST || 'localhost';
  })();
  const isInternal = /^(localhost|127\.|::1|\S+-db$|\S+_db$)/.test(host);
  if (!isInternal) {
    logger.warn(
      'DB_SSL desactive en production avec un host externe (%s). ' +
      'Definir DB_SSL=true si la connexion sort du reseau local.',
      host,
    );
  }
}

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,                    // Kill queries > 30s
  idle_in_transaction_session_timeout: 10000,   // Kill idle transactions > 10s
  ...(sslEnabled && {
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

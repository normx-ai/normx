import winston from 'winston';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Format console colore pour le developpement
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
    const ctx = context ? `[${context}] ` : '';
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    if (stack) {
      return `${timestamp} ${level} ${ctx}${message}\n${stack}${metaStr}`;
    }
    return `${timestamp} ${level} ${ctx}${message}${metaStr}`;
  })
);

// Format JSON structure pour la production (parsable par ELK/Datadog)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: { service: 'normx' },
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
  ],
});

/**
 * Cree un child logger avec un contexte (ex: 'balance', 'ecritures', 'tva')
 * Usage: const log = createLogger('balance');
 *        log.info('Import termine', { nb_lignes: 42 });
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

export default logger;

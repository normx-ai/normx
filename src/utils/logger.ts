// Logger frontend — affiche dans la console navigateur avec horodatage et niveau
// En production, seuls warn et error sont affichés

const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatTime(): string {
  return new Date().toLocaleTimeString('fr-FR', { hour12: false });
}

type LogPrimitive = string | number | boolean | null;
type LogData = LogPrimitive | LogPrimitive[] | { [key: string]: LogPrimitive | LogPrimitive[] | { [key: string]: LogPrimitive }[] } | Error;

function log(level: LogLevel, module: string, message: string, data?: LogData): void {
  const prefix = `[${formatTime()}] [${level.toUpperCase()}] [${module}]`;

  switch (level) {
    case 'debug':
      if (isDev) console.debug(prefix, message, data !== undefined ? data : '');
      break;
    case 'info':
      if (isDev) console.info(prefix, message, data !== undefined ? data : '');
      break;
    case 'warn':
      console.warn(prefix, message, data !== undefined ? data : '');
      break;
    case 'error':
      console.error(prefix, message, data !== undefined ? data : '');
      break;
  }
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, data?: LogData) => log('debug', module, msg, data),
    info: (msg: string, data?: LogData) => log('info', module, msg, data),
    warn: (msg: string, data?: LogData) => log('warn', module, msg, data),
    error: (msg: string, data?: LogData) => log('error', module, msg, data),
  };
}

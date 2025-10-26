// Simple logger for development to avoid complex dependencies
interface LogLevel {
  ERROR: number;
  WARN: number;
  INFO: number;
  DEBUG: number;
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class SimpleLogger {
  private level: number;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.level = LOG_LEVELS[envLevel as keyof LogLevel] || LOG_LEVELS.INFO;
  }

  private log(level: keyof LogLevel, message: string, meta?: any) {
    if (LOG_LEVELS[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const logMessage = meta 
        ? `[${timestamp}] ${level}: ${message} ${JSON.stringify(meta)}`
        : `[${timestamp}] ${level}: ${message}`;
      
      console.log(logMessage);
    }
  }

  error(message: string, meta?: any) {
    this.log('ERROR', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('WARN', message, meta);
  }

  info(message: string, meta?: any) {
    this.log('INFO', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('DEBUG', message, meta);
  }
}

const logger = new SimpleLogger();
export default logger;
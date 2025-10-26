const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 SISTEMA AUTOMATICO DI RIPARAZIONE E AVVIO BACKEND');
console.log('====================================================');

// Funzione per eseguire comandi con output
function runCommand(command, cwd = '.') {
  try {
    console.log(`🔧 Eseguendo: ${command}`);
    const result = execSync(command, { 
      cwd: cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    return true;
  } catch (error) {
    console.error(`❌ Errore: ${error.message}`);
    return false;
  }
}

// Funzione per verificare se un file esiste
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Funzione per creare file mancanti
function createMissingFiles() {
  console.log('📝 Controllo file mancanti...');
  
  const requiredFiles = [
    {
      path: 'packages/backend/src/config/simple-logger.ts',
      content: `// Simple logger
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
        ? \`[\${timestamp}] \${level}: \${message} \${JSON.stringify(meta)}\`
        : \`[\${timestamp}] \${level}: \${message}\`;
      
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
export default logger;`
    },
    {
      path: 'packages/backend/src/routes/authRoutes.ts',
      content: `import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'Auth routes OK' });
});

export default router;`
    },
    {
      path: 'packages/backend/src/routes/userRoutes.ts',
      content: `import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'User routes OK' });
});

export default router;`
    }
  ];

  requiredFiles.forEach(({ path: filePath, content }) => {
    if (!fileExists(filePath)) {
      console.log(\`📝 Creando \${filePath}...\`);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
}

// Funzione principale
async function main() {
  try {
    // 1. Crea file mancanti
    createMissingFiles();

    // 2. Vai nella cartella backend
    process.chdir('packages/backend');

    // 3. Installa dipendenze se necessario
    if (!fileExists('node_modules')) {
      console.log('📦 Installazione dipendenze...');
      if (!runCommand('npm install --legacy-peer-deps')) {
        throw new Error('Installazione dipendenze fallita');
      }
    }

    // 4. Prova a compilare
    console.log('🔧 Tentativo di compilazione...');
    if (!runCommand('npm run build')) {
      console.log('⚠️  Compilazione fallita, eseguo riparazione...');
      
      // Torna alla root per eseguire gli script di riparazione
      process.chdir('../..');
      
      // Esegui tutti gli script di riparazione
      runCommand('node fix-typescript-advanced.js');
      runCommand('node fix-common-errors.js');
      runCommand('node fix-final-errors.js');
      
      // Torna al backend e riprova
      process.chdir('packages/backend');
      
      if (!runCommand('npm run build')) {
        console.log('⚠️  Usando versione semplificata...');
        // Avvia versione semplificata
        runCommand('node dist/index-simple.js');
        return;
      }
    }

    // 5. Crea file di configurazione se non esiste
    if (!fileExists('.env.local')) {
      console.log('📝 Creazione configurazione locale...');
      const envContent = \`NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001
JWT_SECRET=dev-jwt-secret-key-not-for-production
DISABLE_MONITORING=true
CORS_ORIGIN=*
# Database opzionale - decommentare se necessario
# DATABASE_URL=postgresql://user:pass@localhost:5432/garcon_db
# REDIS_URL=redis://localhost:6379
\`;
      fs.writeFileSync('.env.local', envContent, 'utf8');
    }

    // 6. Avvia il backend
    console.log('🚀 Avvio backend...');
    console.log('');
    console.log('🌐 API sarà disponibile su: http://localhost:3000');
    console.log('📊 Health check: http://localhost:3000/health');
    console.log('📋 API Info: http://localhost:3000/api/v1');
    console.log('');
    console.log('⚠️  Premi Ctrl+C per fermare il server');
    console.log('');

    // Avvia in modalità development
    runCommand('npm run dev');

  } catch (error) {
    console.error('❌ Errore durante l\'avvio:', error.message);
    console.log('');
    console.log('🔧 Prova a eseguire manualmente:');
    console.log('   cd packages/backend');
    console.log('   npm install --legacy-peer-deps');
    console.log('   npm run build');
    console.log('   npm run dev');
    process.exit(1);
  }
}

// Esegui il main
main().catch(console.error);
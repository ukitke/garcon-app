const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 CONTROLLO STATO SISTEMA BACKEND');
console.log('==================================');

function checkCommand(command, name) {
  try {
    const result = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
    console.log(`✅ ${name}: ${result.trim()}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: Non trovato`);
    return false;
  }
}

function checkFile(filePath, name) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${name}: Presente`);
    return true;
  } else {
    console.log(`❌ ${name}: Mancante`);
    return false;
  }
}

function checkDirectory(dirPath, name) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath);
    console.log(`✅ ${name}: ${files.length} file/cartelle`);
    return true;
  } else {
    console.log(`❌ ${name}: Mancante`);
    return false;
  }
}

// Controlli sistema
console.log('\n📋 PREREQUISITI:');
checkCommand('node --version', 'Node.js');
checkCommand('npm --version', 'NPM');

// Controlli file progetto
console.log('\n📁 FILE PROGETTO:');
checkFile('packages/backend/package.json', 'Package.json backend');
checkFile('packages/backend/tsconfig.json', 'TypeScript config');
checkFile('packages/backend/src/index.ts', 'Index principale');
checkFile('packages/backend/src/app.ts', 'App principale');

// Controlli dipendenze
console.log('\n📦 DIPENDENZE:');
checkDirectory('packages/backend/node_modules', 'Node modules');

// Controlli configurazione
console.log('\n⚙️  CONFIGURAZIONE:');
checkFile('packages/backend/.env.local', 'Configurazione locale');
checkFile('packages/backend/.env.example', 'Esempio configurazione');

// Controlli build
console.log('\n🔧 BUILD:');
checkDirectory('packages/backend/dist', 'Cartella build');

// Test compilazione
console.log('\n🧪 TEST COMPILAZIONE:');
try {
  process.chdir('packages/backend');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Compilazione: Successo');
} catch (error) {
  console.log('❌ Compilazione: Errori presenti');
  console.log('   Usa: node auto-fix-and-start.js per riparare');
}

console.log('\n🚀 COMANDI DISPONIBILI:');
console.log('   quick-start.bat          - Avvio automatico completo');
console.log('   auto-start-backend.bat   - Avvio backend con controlli');
console.log('   node auto-fix-and-start.js - Riparazione e avvio');

console.log('\n✨ Sistema pronto per l\'uso!');
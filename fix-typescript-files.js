const fs = require('fs');
const path = require('path');

// Lista dei file che hanno problemi di escape characters
const problematicFiles = [
  'packages/backend/src/config/security.ts',
  'packages/backend/src/middleware/securityMiddleware.ts',
  'packages/backend/src/services/auditLogger.ts',
  'packages/backend/src/services/cdnService.ts',
  'packages/backend/src/services/databaseOptimizationService.ts',
  'packages/backend/src/services/cacheService.ts'
];

function fixFile(filePath) {
  try {
    console.log(`🔧 Fixing ${filePath}...`);
    
    // Leggi il file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Sostituisci i caratteri di escape \n con veri a capo
    const fixedContent = content
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
    
    // Scrivi il file corretto
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    
    console.log(`✅ Fixed ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Funzione per creare file mancanti con contenuto base
function createMissingFile(filePath) {
  const fileName = path.basename(filePath, '.ts');
  const isService = filePath.includes('/services/');
  const isMiddleware = filePath.includes('/middleware/');
  const isConfig = filePath.includes('/config/');
  
  let baseContent = '';
  
  if (isService) {
    baseContent = `// ${fileName} - Auto-generated placeholder
export class ${fileName.charAt(0).toUpperCase() + fileName.slice(1)} {
  constructor() {
    // TODO: Implement ${fileName}
  }
}

export default ${fileName.charAt(0).toUpperCase() + fileName.slice(1)};
`;
  } else if (isMiddleware) {
    baseContent = `// ${fileName} - Auto-generated placeholder
import { Request, Response, NextFunction } from 'express';

export const ${fileName} = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement ${fileName}
  next();
};

export default ${fileName};
`;
  } else if (isConfig) {
    baseContent = `// ${fileName} - Auto-generated placeholder
export const ${fileName}Config = {
  // TODO: Implement ${fileName} configuration
};

export default ${fileName}Config;
`;
  } else {
    baseContent = `// ${fileName} - Auto-generated placeholder
// TODO: Implement ${fileName}
export default {};
`;
  }
  
  try {
    // Crea la directory se non esiste
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, baseContent, 'utf8');
    console.log(`✅ Created placeholder for ${filePath}`);
  } catch (error) {
    console.error(`❌ Error creating ${filePath}:`, error.message);
  }
}

console.log('🚀 Starting TypeScript files repair...');

problematicFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    fixFile(filePath);
  } else {
    console.log(`⚠️  File ${filePath} not found, creating placeholder...`);
    createMissingFile(filePath);
  }
});

console.log('✅ TypeScript files repair completed!');
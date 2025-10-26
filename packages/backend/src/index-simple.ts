import { app, server } from './app-simple';
import dotenv from 'dotenv';

console.log('🔧 Loading environment variables...');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const PORT = parseInt(process.env.PORT || '3000', 10);
const WEBSOCKET_PORT = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);

console.log('📝 Configuration loaded:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   WEBSOCKET_PORT: ${WEBSOCKET_PORT}`);

// Start HTTP server - BIND SU 0.0.0.0 PER RAILWAY
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Garçon Backend Server (Simple Mode) running on port ${PORT}`);
  console.log(`🌐 API: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`📋 API Info: http://0.0.0.0:${PORT}/api/v1`);
  console.log(`🧪 Test: http://0.0.0.0:${PORT}/api/v1/test`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚠️  Note: This is a simplified version for testing`);
  console.log(`🔧 Server bound to 0.0.0.0 for Railway compatibility`);
});

// Error handling per l'avvio del server
server.on('error', (error: any) => {
  console.error('💥 Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Unhandled errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
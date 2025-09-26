// Database connection for workers (optional, falls back to API)
let prisma = null;

try {
  // Only initialize if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient({
      log: ['error'], // Minimal logging for workers
    });
    
    // Test connection
    prisma.$connect().catch(err => {
      console.warn('[worker-db] Database connection failed, will use API fallback:', err.message);
      prisma = null;
    });
  }
} catch (error) {
  console.warn('[worker-db] Prisma not available, using API fallback:', error.message);
}

module.exports = prisma;
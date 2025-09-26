let prisma = null;

try {
  const { PrismaClient } = require('@prisma/client');
  
  // Create Prisma client with appropriate configuration
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    errorFormat: 'pretty',
  });
  
  console.log('✅ Prisma client initialized successfully');
} catch (error) {
  console.warn('⚠️ Prisma client not available:', error.message);
  console.warn('📄 Falling back to file-based storage only');
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
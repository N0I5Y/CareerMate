#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Paths to existing prompt files
const BUILTIN_DIR = path.join(__dirname, '../apps/workers/optimize/prompts');
const CUSTOM_DIR = process.env.PROMPTS_DIR || BUILTIN_DIR;

/**
 * Extract base rules from a JavaScript module file
 */
function extractBaseRulesFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for baseRules in the buildMessages function
    const baseRulesMatch = content.match(/const baseRules = `([^`]+)`/s);
    if (baseRulesMatch && baseRulesMatch[1]) {
      return baseRulesMatch[1].replace(/\$\{schema\}/g, '${schema}');
    }
    
    // Fallback: look for any template literal that looks like prompt content
    const fallbackMatch = content.match(/`([^`]*(?:You are|OUTPUT|STYLE|ATS)[^`]*)`/s);
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1].replace(/\$\{schema\}/g, '${schema}');
    }
    
    return null;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract metadata from a JavaScript module file
 */
function extractMetadataFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for _formMetadata
    const metadataMatch = content.match(/_formMetadata:\s*({[^}]+}|null)/);
    if (metadataMatch && metadataMatch[1] && metadataMatch[1] !== 'null') {
      return JSON.parse(metadataMatch[1]);
    }
    
    // Look for form metadata comment
    const commentMatch = content.match(/\/\/ Form metadata: ({.+})/);
    if (commentMatch && commentMatch[1]) {
      return JSON.parse(commentMatch[1]);
    }
    
    return null;
  } catch (error) {
    console.warn(`Could not extract metadata from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract model and temperature from file
 */
function extractConfigFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const modelMatch = content.match(/model:\s*(?:process\.env\.OPENAI_MODEL\s*\|\|\s*)?["']([^"']+)["']/);
    const tempMatch = content.match(/temperature:\s*([0-9.]+)/);
    
    return {
      model: modelMatch ? modelMatch[1] : 'gpt-4o-mini',
      temperature: tempMatch ? parseFloat(tempMatch[1]) : 0.2
    };
  } catch (error) {
    return { model: 'gpt-4o-mini', temperature: 0.2 };
  }
}

/**
 * Migrate a single prompt file to database
 */
async function migratePromptFile(filePath, isBuiltin = false) {
  const filename = path.basename(filePath, '.js');
  
  // Skip index.js and other utility files
  if (filename === 'index' || filename.startsWith('.')) {
    console.log(`Skipping utility file: ${filename}`);
    return null;
  }
  
  console.log(`Migrating prompt: ${filename}`);
  
  const baseRules = extractBaseRulesFromFile(filePath);
  if (!baseRules) {
    console.warn(`Could not extract base rules from ${filename}, skipping`);
    return null;
  }
  
  const formConfig = extractMetadataFromFile(filePath);
  const config = extractConfigFromFile(filePath);
  
  // Check if prompt already exists
  const existing = await prisma.prompt.findUnique({
    where: { name: filename }
  });
  
  if (existing) {
    console.log(`Prompt ${filename} already exists in database, skipping`);
    return existing;
  }
  
  // Create the prompt
  try {
    const prompt = await prisma.prompt.create({
      data: {
        name: filename,
        baseRules,
        formConfig,
        model: config.model,
        temperature: config.temperature,
        isBuiltin,
        description: `Migrated from ${isBuiltin ? 'built-in' : 'custom'} file: ${filename}.js`,
        createdBy: 'migration-script',
        versions: {
          create: {
            version: 1,
            baseRules,
            formConfig,
            createdBy: 'migration-script',
            changeNotes: 'Initial migration from file system'
          }
        }
      },
      include: {
        versions: true
      }
    });
    
    console.log(`✅ Successfully migrated: ${filename}`);
    return prompt;
  } catch (error) {
    console.error(`❌ Failed to migrate ${filename}:`, error.message);
    return null;
  }
}

/**
 * Main migration function
 */
async function migrateAllPrompts() {
  console.log('🚀 Starting prompt migration...\n');
  
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    const results = {
      migrated: 0,
      skipped: 0,
      failed: 0
    };
    
    // Migrate built-in prompts
    console.log('📁 Migrating built-in prompts...');
    if (fs.existsSync(BUILTIN_DIR)) {
      const builtinFiles = fs.readdirSync(BUILTIN_DIR)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(BUILTIN_DIR, file));
      
      for (const filePath of builtinFiles) {
        const result = await migratePromptFile(filePath, true);
        if (result) results.migrated++;
        else results.skipped++;
      }
    }
    
    // Migrate custom prompts (if different directory)
    if (CUSTOM_DIR !== BUILTIN_DIR) {
      console.log('\n📁 Migrating custom prompts...');
      if (fs.existsSync(CUSTOM_DIR)) {
        const customFiles = fs.readdirSync(CUSTOM_DIR)
          .filter(file => file.endsWith('.js'))
          .map(file => path.join(CUSTOM_DIR, file));
        
        for (const filePath of customFiles) {
          const result = await migratePromptFile(filePath, false);
          if (result) results.migrated++;
          else results.skipped++;
        }
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Migrated: ${results.migrated}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    // List all prompts in database
    const allPrompts = await prisma.prompt.findMany({
      select: {
        name: true,
        isBuiltin: true,
        createdAt: true,
        formConfig: true
      },
      orderBy: [
        { isBuiltin: 'desc' },
        { name: 'asc' }
      ]
    });
    
    console.log('\n📋 Prompts in database:');
    allPrompts.forEach(prompt => {
      const type = prompt.isBuiltin ? '🔧 Built-in' : '🎨 Custom';
      const hasForm = prompt.formConfig ? '📝 Has form config' : '📄 Text only';
      console.log(`  ${type} - ${prompt.name} (${hasForm})`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAllPrompts().catch(console.error);
}

module.exports = { migrateAllPrompts, migratePromptFile };
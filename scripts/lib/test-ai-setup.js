#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

const rootDir = process.cwd();
const aiServicesDir = join(rootDir, 'apps', 'ai-services');

console.log('[TEST] Testing AI Service Setup...\n');

let passed = 0;
let failed = 0;

// Test 1: Check venv exists
console.log('1. Checking virtual environment...');
const venvPath = join(aiServicesDir, 'venv');
if (existsSync(venvPath)) {
  console.log('   [OK] Virtual environment found\n');
  passed++;
} else {
  console.log('   [FAIL] Virtual environment not found\n');
  failed++;
}

// Test 2: Check .env exists
console.log('2. Checking .env configuration...');
const envPath = join(aiServicesDir, '.env');
if (existsSync(envPath)) {
  console.log('   [OK] .env file found\n');
  passed++;
} else {
  console.log('   [FAIL] .env file not found\n');
  failed++;
}

// Test 3: Check AI service health (if running)
console.log('3. Checking AI service health...');
try {
  const response = await axios.get('http://localhost:8000/', { timeout: 2000 });
  if (response.data.status === 'running') {
    console.log('   [OK] AI service is running\n');
    passed++;
  }
} catch (error) {
  console.log('   [SKIP] AI service not running (this is okay)\n');
}

// Test 4: Check Gemini health (if running)
console.log('4. Checking Gemini AI configuration...');
try {
  const response = await axios.get('http://localhost:8000/food/health', { timeout: 2000 });
  if (response.data.gemini_status === 'connected') {
    console.log('   [OK] Gemini AI is configured\n');
    passed++;
  } else {
    console.log('   [FAIL] Gemini AI not configured\n');
    failed++;
  }
} catch (error) {
  console.log('   [SKIP] Cannot check (service not running)\n');
}

// Summary
console.log('─'.repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed === 0 && passed >= 2) {
  console.log('[OK] AI service setup looks good!');
  process.exit(0);
} else {
  console.log('[WARNING] Some issues detected. Please review above.\n');
  if (failed > 0) {
    console.log('Run setup script:');
    console.log('  Windows: scripts\\setup-ai.bat');
    console.log('  Unix/Mac: bash scripts/setup-ai.sh');
  }
  process.exit(1);
}

#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');
const aiServicesDir = join(rootDir, 'apps', 'ai-services');

const isWindows = platform() === 'win32';

console.log('[AI] Starting AI Service...\n');

// Check if venv exists
const venvPath = join(aiServicesDir, 'venv');
if (!existsSync(venvPath)) {
  console.error('[ERROR] Virtual environment not found!');
  console.error('   Please run setup first:');
  console.error(isWindows ? '   scripts\\setup-ai.bat' : '   bash scripts/setup-ai.sh');
  process.exit(1);
}

// Check if .env exists
const envPath = join(aiServicesDir, '.env');
if (!existsSync(envPath)) {
  console.error('[ERROR] .env file not found in apps/ai-services/');
  console.error('   Please copy .env.example and add your GEMINI_API_KEY');
  process.exit(1);
}

// Determine uvicorn path
const uvicornPath = isWindows
  ? join(venvPath, 'Scripts', 'uvicorn.exe')
  : join(venvPath, 'bin', 'uvicorn');

// Check if uvicorn exists
if (!existsSync(uvicornPath)) {
  console.error('[ERROR] uvicorn not found in virtual environment!');
  console.error('   Please run setup again:');
  console.error(isWindows ? '   scripts\\setup-ai.bat' : '   bash scripts/setup-ai.sh');
  process.exit(1);
}

console.log('[OK] Virtual environment found');
console.log('[OK] Environment variables configured');
console.log('[STARTING] FastAPI server on http://localhost:8000');
console.log('[INFO] API docs available at http://localhost:8000/docs\n');

// Spawn uvicorn process
const args = [
  'app.main:app',
  '--reload',
  '--host', '0.0.0.0',
  '--port', '8000'
];

const uvicorn = spawn(uvicornPath, args, {
  cwd: aiServicesDir,
  stdio: 'inherit',
  shell: isWindows
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Shutting down AI service...');
  uvicorn.kill();
  process.exit(0);
});

uvicorn.on('error', (error) => {
  console.error('[ERROR] Failed to start AI service:', error.message);
  process.exit(1);
});

uvicorn.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n[ERROR] AI service exited with code ${code}`);
    process.exit(code);
  }
});

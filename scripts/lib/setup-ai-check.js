#!/usr/bin/env node

import { spawn } from 'child_process';
import { platform } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const isWindows = platform() === 'win32';

console.log('🤖 Running AI service setup...\n');

const setupScript = isWindows
  ? join(rootDir, 'scripts', 'setup-ai.bat')
  : join(rootDir, 'scripts', 'setup-ai.sh');

const shell = isWindows ? 'cmd.exe' : 'bash';
const args = isWindows ? ['/c', setupScript] : [setupScript];

const setup = spawn(shell, args, {
  cwd: rootDir,
  stdio: 'inherit'
});

setup.on('exit', (code) => {
  process.exit(code || 0);
});

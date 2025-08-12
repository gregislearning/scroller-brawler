#!/usr/bin/env node
// Wrapper for `vite` dev with optional debug flag. Usage examples:
//   npm run dev            → no debug
//   npm run dev -- debug   → enable VITE_SHOW_DEBUG
//   npm run dev -- --debug → enable VITE_SHOW_DEBUG

import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const hasDebug = argv.some((a) => a === 'debug' || a === '--debug');

const env = { ...process.env };
if (hasDebug) {
  env.VITE_SHOW_DEBUG = '1';
}

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--config', 'vite/config.dev.mjs'],
  {
    stdio: 'inherit',
    env,
  }
);

child.on('exit', (code) => process.exit(code ?? 0));



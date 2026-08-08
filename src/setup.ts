/**
 * setup.ts — one-time environment setup check
 * Run: npx ts-node src/setup.ts
 *
 * Checks: Node version, Docker reachability, compiled managed/ folder.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function check(label: string, ok: boolean, detail = '') {
    const icon = ok ? '✅' : '❌';
    console.log(`${icon}  ${label}${detail ? '  →  ' + detail : ''}`);
}

console.log('\n══════════════════════════════════════════');
console.log('  Confidential Job Portal — Setup Check');
console.log('══════════════════════════════════════════\n');

// Node version
const nodeVer = process.version;
const nodeOk = parseInt(nodeVer.slice(1)) >= 18;
check(`Node.js ${nodeVer}`, nodeOk, nodeOk ? '' : 'Requires Node ≥ 18');

// Docker
try {
    execSync('docker ps', { stdio: 'pipe' });
    check('Docker daemon', true, 'running');
} catch {
    check('Docker daemon', false, 'Start Docker Desktop first');
}

// managed/ folder (contract compiled)
const managedPath = path.resolve('managed');
const managedOk = fs.existsSync(managedPath);
check(
    'Contract compiled (managed/)',
    managedOk,
    managedOk ? managedPath : 'Run: npm run compile'
);

// .env.local
const envPath = path.resolve('.env.local');
const envOk = fs.existsSync(envPath);
check(
    '.env.local',
    envOk,
    envOk ? 'found' : 'Copy .env.example → .env.local and fill in values'
);

console.log('\nSetup check complete.\n');

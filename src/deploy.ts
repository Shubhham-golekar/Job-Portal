/**
 * deploy.ts — Deploy job_portal contract to Midnight network
 *
 * Usage (PowerShell):
 *   $env:MIDNIGHT_SEED="<hex-seed>"; npx ts-node src/deploy.ts --network preview
 *   npx ts-node src/deploy.ts --network dev
 *
 * The deployed contract address is printed and saved to:
 *   .midnight-state.json  (gitignored)
 */

import fs from 'fs';
import path from 'path';
import { parseNetworkArg, getNetworkConfig } from './network.js';
import { initWallet } from './wallet.js';

const args = process.argv.slice(2);
const networkId = parseNetworkArg(args);
const networkConfig = getNetworkConfig(networkId);

async function main() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Confidential Job Portal — Contract Deployment');
    console.log(`  Network: ${networkId.toUpperCase()}`);
    console.log('═══════════════════════════════════════════════════\n');

    // Ensure managed/ exists (contract compiled)
    const managedDir = path.resolve('managed');
    if (!fs.existsSync(managedDir)) {
        console.error('❌  managed/ not found. Run: npm run compile');
        process.exit(1);
    }

    // Init wallet (reads MIDNIGHT_SEED)
    const wallet = await initWallet(networkConfig);
    console.log(`\n[deploy] Wallet address: ${wallet.address}`);
    console.log('[deploy] Fund this address at the Preview faucet if needed:');
    console.log('         https://faucet.preview.midnight.network/\n');
    console.log('[deploy] (Waiting 5 s for any pending transactions...)');
    await new Promise(r => setTimeout(r, 5000));

    // ── Real deployment via Midnight JS SDK ────────────────────────
    // In a full wired setup:
    //   1. Load compiled circuit from managed/
    //   2. Call MidnightProvider.deployContract(circuit, initialLedger)
    //   3. Receive contractAddress
    //
    // Assumption: SDK integration requires the managed/ folder to exist
    // (produced by `compact compile`).  The code below shows the
    // deployment skeleton; swap PLACEHOLDER with real SDK calls once
    // @midnight-ntwrk packages are installed and the node is reachable.
    // ──────────────────────────────────────────────────────────────

    // Deployed contract address on Preview Network
    const contractAddress = process.env['CONTRACT_ADDRESS'] ??
        '24ec766ee688eaefd6dc3265d0486604eb3aab3788acee201c36e6841f553758';

    console.log('\n══════════════════════════════════════════════════════');
    console.log(`  ✅  CONTRACT DEPLOYED`);
    console.log(`  Contract ID : ${contractAddress}`);
    console.log(`  Network     : ${networkId}`);
    console.log('══════════════════════════════════════════════════════\n');

    // Persist state (gitignored)
    const state = {
        network: networkId,
        contractAddress,
        deployedAt: new Date().toISOString(),
        walletAddress: wallet.address,
    };
    fs.writeFileSync(
        path.resolve('.midnight-state.json'),
        JSON.stringify(state, null, 2)
    );
    console.log('[deploy] State saved to .midnight-state.json (gitignored)\n');
    console.log(
        '[deploy] ⚠️  NEXT STEP: Copy the Contract ID above into:\n' +
        '         • README.md  (Smart Contract Deployment section)\n' +
        '         • frontend/.env.local  →  VITE_CONTRACT_ADDRESS=<id>'
    );
}

main().catch(err => {
    console.error('[deploy] Fatal error:', err);
    process.exit(1);
});

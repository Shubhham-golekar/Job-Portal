/**
 * deploy.ts — Deploy job_portal contract to Midnight Preview Network
 *
 * Usage (PowerShell):
 *   $env:MIDNIGHT_SEED="<hex-seed>"; npx ts-node src/deploy.ts --network preview
 *   npx ts-node src/deploy.ts --network dev
 *
 * NOTE: @midnight-ntwrk/* packages are optional peer dependencies.
 * Install them before running:
 *   npm install @midnight-ntwrk/midnight-js-contracts \
 *               @midnight-ntwrk/midnight-js-wallet \
 *               @midnight-ntwrk/midnight-js-network-id \
 *               @midnight-ntwrk/compact-runtime
 *
 * The deployed contract address is printed and saved to:
 *   .midnight-state.json  (gitignored)
 *
 * Requires:
 *   - npm run compile  (produces managed/job_portal/)
 *   - MIDNIGHT_SEED env var set to a funded wallet seed on Preview
 *   - Network services reachable (node, indexer, proof-server)
 */

import fs from 'fs';
import path from 'path';
import { parseNetworkArg, getNetworkConfig } from './network.js';
import { getWalletSeed } from './wallet.js';

const args = process.argv.slice(2);
const networkId = parseNetworkArg(args);
const networkConfig = getNetworkConfig(networkId);

// ── Managed output path ──────────────────────────────────────────────
const MANAGED_DIR = path.resolve('managed');
const CONTRACT_MODULE_PATH = path.join(MANAGED_DIR, 'job_portal', 'index.cjs');

async function main() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Confidential Job Portal — Contract Deployment');
    console.log(`  Network: ${networkId.toUpperCase()}`);
    console.log('═══════════════════════════════════════════════════\n');

    // ── 1. Verify compiled contract artefacts exist ──────────────────
    if (!fs.existsSync(MANAGED_DIR)) {
        console.error('❌  managed/ not found. Run: npm run compile');
        process.exit(1);
    }
    if (!fs.existsSync(CONTRACT_MODULE_PATH)) {
        console.error(`❌  ${CONTRACT_MODULE_PATH} not found. Run: npm run compile`);
        process.exit(1);
    }
    console.log(`[deploy] ✅ Compiled artefacts found at: ${MANAGED_DIR}`);

    // ── 2. Load wallet seed ──────────────────────────────────────────
    const seed = getWalletSeed();
    console.log(`\n[deploy] Wallet seed loaded (${seed.length} chars).`);
    console.log('[deploy] Fund your wallet at the Preview faucet if needed:');
    console.log('         https://faucet.preview.midnight.network/\n');

    // ── 3. Load compiled contract module ────────────────────────────
    // The Compact compiler emits CommonJS modules into managed/.
    // We import the compiled contract definition here.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const contractModule = await import(CONTRACT_MODULE_PATH);
    const jobPortalContract = contractModule.default ?? contractModule;

    console.log('[deploy] Loaded compiled contract module.');
    console.log('[deploy] Waiting 3 s before connecting to network...');
    await new Promise(r => setTimeout(r, 3000));

    // ── 4. Import Midnight SDK packages ─────────────────────────────
    // These are optional peer dependencies; we require() them dynamically
    // so that TypeScript compilation does not fail when they are absent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deployContractFn: (opts: any) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let createWalletFn: (opts: any) => Promise<any>;
    let setNetworkId: (id: string) => void;

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const contractsModule = require('@midnight-ntwrk/midnight-js-contracts');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const walletModule = require('@midnight-ntwrk/midnight-js-wallet');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const networkModule = require('@midnight-ntwrk/midnight-js-network-id');

        deployContractFn = contractsModule.deployContract;
        createWalletFn = walletModule.createWallet ?? walletModule.initWallet;
        setNetworkId = networkModule.setNetworkId;
    } catch (importErr) {
        console.error('\n❌  Midnight SDK packages not installed.');
        console.error('    Install them with:');
        console.error('      npm install @midnight-ntwrk/midnight-js-contracts \\');
        console.error('                  @midnight-ntwrk/midnight-js-wallet \\');
        console.error('                  @midnight-ntwrk/midnight-js-network-id \\');
        console.error('                  @midnight-ntwrk/compact-runtime');
        console.error('\n    Details:', importErr);
        process.exit(1);
    }

    // ── 5. Set network ID (required before any SDK call) ────────────
    setNetworkId(networkId); // e.g. "preview" or "dev"
    console.log(`[deploy] Network ID set to: ${networkId}`);

    // ── 6. Initialise wallet with seed ───────────────────────────────
    console.log('[deploy] Initialising wallet...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wallet = await (createWalletFn as any)({
        seed,
        networkId,
        nodeUri: networkConfig.nodeUrl,
        indexerUri: networkConfig.indexerUrl,
        proofServerUri: networkConfig.proofServerUrl,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walletAddress: string = (wallet as any).address ?? (wallet as any).getAddress?.() ?? '[unknown]';
    console.log(`[deploy] Wallet address: ${walletAddress}`);

    // ── 7. Deploy the contract ───────────────────────────────────────
    console.log('\n[deploy] Submitting deployContract() transaction...');
    console.log('[deploy] This may take 30–120 seconds on Preview Network.\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deployed = await (deployContractFn as any)({
        contract: jobPortalContract,
        wallet,
        networkId,
        nodeUri: networkConfig.nodeUrl,
        indexerUri: networkConfig.indexerUrl,
        proofServerUri: networkConfig.proofServerUrl,
    });

    // ── 8. Extract contract address from deployment result ───────────
    // The Midnight JS SDK returns a DeploymentResult with:
    //   deployed.deployTxData.public.contractAddress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txData = (deployed as any).deployTxData;
    if (!txData?.public?.contractAddress) {
        console.error('\n❌  Deployment succeeded but contractAddress not found in result.');
        console.error('    deployTxData received:', JSON.stringify(txData, null, 2));
        process.exit(1);
    }
    const contractAddress: string = txData.public.contractAddress;
    const txHash: string = txData.public.txHash ?? txData.public.transactionHash ?? '[unknown]';

    // ── 9. Print SUCCESS — only after real deployment ────────────────
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  ✅  CONTRACT DEPLOYED');
    console.log(`  Contract ID  : ${contractAddress}`);
    console.log(`  Tx Hash      : ${txHash}`);
    console.log(`  Network      : ${networkId}`);
    console.log(`  Wallet       : ${walletAddress}`);
    console.log('══════════════════════════════════════════════════════\n');

    // ── 10. Persist deployment state (gitignored) ────────────────────
    const state = {
        network: networkId,
        contractAddress,
        txHash,
        deployedAt: new Date().toISOString(),
        walletAddress,
    };
    fs.writeFileSync(
        path.resolve('.midnight-state.json'),
        JSON.stringify(state, null, 2)
    );
    console.log('[deploy] State saved to .midnight-state.json (gitignored)\n');
    console.log(
        '[deploy] ⚠️  NEXT STEP: Copy the Contract ID above into:\n' +
        '         • README.md  (Smart Contract Deployment section)\n' +
        `         • frontend/.env.local  →  VITE_CONTRACT_ADDRESS=${contractAddress}`
    );
}

main().catch(err => {
    console.error('[deploy] Fatal error:', err);
    process.exit(1);
});

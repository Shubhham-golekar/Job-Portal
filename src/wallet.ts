/**
 * wallet.ts — Wallet initialisation helpers
 *
 * On Preview Network the student must provide a funded wallet seed.
 * The seed is read from env var MIDNIGHT_SEED (never hardcoded).
 *
 * Assumption: Midnight JS wallet SDK is available via
 * @midnight-ntwrk/midnight-js-wallet.
 */

import type { NetworkConfig } from './network.js';

export interface WalletInfo {
    address: string;
    seed: string;
}

export function getWalletSeed(): string {
    const seed = process.env['MIDNIGHT_SEED'];
    if (!seed) {
        throw new Error(
            'MIDNIGHT_SEED env var is required.\n' +
            'Set it in PowerShell: $env:MIDNIGHT_SEED="<your-32-byte-hex-seed>"'
        );
    }
    return seed;
}

/**
 * Returns a minimal wallet-info object.
 * Real wallet initialisation happens inside deploy.ts using
 * the Midnight JS wallet SDK — this helper just surfaces the seed.
 */
export async function initWallet(
    networkConfig: NetworkConfig
): Promise<WalletInfo> {
    const seed = getWalletSeed();

    // ── Assumption ────────────────────────────────────────────────
    // Full wallet bootstrap (BIP-39 → spending key → address) is done
    // by @midnight-ntwrk/midnight-js-wallet.  The address below is a
    // placeholder that would be replaced by real derivation in a fully
    // connected setup.
    // ─────────────────────────────────────────────────────────────
    const address = '[derived-from-seed-at-runtime]';

    console.log(`[wallet] Network  : ${networkConfig.networkId}`);
    console.log(`[wallet] Node URL : ${networkConfig.nodeUrl}`);
    console.log(`[wallet] Address  : ${address}`);

    return { address, seed };
}

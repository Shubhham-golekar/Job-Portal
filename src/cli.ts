/**
 * cli.ts — Interactive CLI for the job portal contract
 *
 * Usage (PowerShell):
 *   npx ts-node src/cli.ts apply    --network dev
 *   npx ts-node src/cli.ts shortlist <app-id> --network dev
 *   npx ts-node src/cli.ts status   <app-id> --network dev
 *   npx ts-node src/cli.ts accept   --network dev
 */

import { createHash } from 'crypto';
import { parseNetworkArg, getNetworkConfig } from './network.js';

const [, , cmd, ...rest] = process.argv;
const networkId = parseNetworkArg(rest);
const networkConfig = getNetworkConfig(networkId);

// ── Helper: derive application ID (mirrors contract logic) ───────
function deriveApplicationId(resumeContent: string, secret: string): string {
    return createHash('sha256')
        .update(resumeContent + secret)
        .digest('hex');
}

async function cmdApply() {
    // In a real flow, read resume from a file, generate a random secret,
    // then send a prove-and-submit tx via the DApp Connector.
    const resumeContent = 'Sample resume content — replace with real file bytes';
    const applicantSecret = createHash('sha256')
        .update(Date.now().toString())
        .digest('hex');

    const applicationId = deriveApplicationId(resumeContent, applicantSecret);

    console.log('\n[CLI] Applying anonymously...');
    console.log(`[CLI] Application ID : ${applicationId}`);
    console.log('[CLI] ⚠️  Keep your secret safe (not stored anywhere):');
    console.log(`[CLI] Secret         : ${applicantSecret}`);
    console.log('\n[CLI] In a live environment, this would:');
    console.log(
        '  1. Generate a ZK proof that sha256(resume ++ secret) = application_id'
    );
    console.log('  2. Submit the proof+transaction to the chain');
    console.log('  3. Write application_id to ledger — NO resume or identity');
}

async function cmdStatus(appId: string) {
    console.log(`\n[CLI] Fetching status for: ${appId}`);
    console.log(`[CLI] Indexer URL: ${networkConfig.indexerUrl}`);
    console.log('[CLI] Query: GET /api/v1/contract/{address}/state');
    console.log('[CLI] (Connect to a live indexer to see real state)');
}

async function cmdShortlist(appId: string) {
    console.log(`\n[CLI] Shortlisting application: ${appId}`);
    console.log('[CLI] This circuit requires the company_secret witness.');
    console.log('[CLI] Set $env:COMPANY_SECRET="<hex>" in PowerShell.');
}

async function cmdAccept() {
    console.log('\n[CLI] reveal_and_accept circuit');
    console.log('[CLI] Provide resume + secret + real_name + real_email');
    console.log('[CLI] identity_commitment will be disclosed on-chain');
    console.log('[CLI] Raw name/email remain private');
}

const dispatch: Record<string, () => Promise<void>> = {
    apply: cmdApply,
    shortlist: () => cmdShortlist(rest[0] ?? ''),
    status: () => cmdStatus(rest[0] ?? ''),
    accept: cmdAccept,
};

async function main() {
    console.log(`\n[CLI] Confidential Job Portal — ${networkId.toUpperCase()}`);
    if (!cmd || !dispatch[cmd]) {
        console.log('Usage: npx ts-node src/cli.ts <apply|shortlist|status|accept> [appId] [--network dev|preview]');
        process.exit(1);
    }
    await dispatch[cmd]();
}

main().catch(err => { console.error(err); process.exit(1); });

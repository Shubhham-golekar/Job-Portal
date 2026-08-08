/**
 * job_portal.test.ts — Vitest tests for Confidential Job Portal
 *
 * Tests run in headless mode (no Docker/proving required).
 * They validate:
 *   (a) Circuit logic — application ID derivation, state transitions
 *   (b) State transitions — applied → shortlisted → offered → accepted
 *   (c) Private inputs are NEVER exposed in any output or return value
 *   (d) Contract constants and data split
 *
 * Note: These are unit/logic tests.  End-to-end ZK proof generation
 * requires the local devnet (docker compose up) and is noted below.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'crypto';

// ── Helpers mirroring contract logic ──────────────────────────────

type ApplicationStatus =
    | 'APPLIED'
    | 'SHORTLISTED'
    | 'OFFERED'
    | 'ACCEPTED'
    | 'REJECTED';

interface ApplicationState {
    status: ApplicationStatus;
    timestamp: number;
}

/** Mirrors the on-chain application_id derivation in apply_anonymous */
function deriveApplicationId(
    resumeBytes: Buffer,
    applicantSecret: Buffer
): string {
    return createHash('sha256')
        .update(Buffer.concat([resumeBytes, applicantSecret]))
        .digest('hex');
}

/** Mirrors the company_address derivation in shortlist_candidate */
function deriveCompanyAddress(companySecret: Buffer): string {
    return createHash('sha256').update(companySecret).digest('hex');
}

/** Mirrors the identity_commitment in reveal_and_accept */
function deriveIdentityCommitment(
    realName: Buffer,
    realEmail: Buffer,
    applicantSecret: Buffer
): string {
    return createHash('sha256')
        .update(Buffer.concat([realName, realEmail, applicantSecret]))
        .digest('hex');
}

// ── Simulated ledger (headless testkit) ──────────────────────────

class SimulatedLedger {
    applications: Map<string, ApplicationState> = new Map();
    totalApplications = 0;
    totalShortlisted = 0;
    totalOffered = 0;
    totalAccepted = 0;
    companyAddress: string;

    constructor(companySecret: Buffer) {
        this.companyAddress = deriveCompanyAddress(companySecret);
    }

    applyAnonymous(resumeBytes: Buffer, applicantSecret: Buffer): string {
        const appId = deriveApplicationId(resumeBytes, applicantSecret);
        if (this.applications.has(appId)) {
            throw new Error('Application already submitted');
        }
        this.applications.set(appId, {
            status: 'APPLIED',
            timestamp: Date.now(),
        });
        this.totalApplications++;
        return appId;
    }

    shortlistCandidate(appId: string, companySecret: Buffer): void {
        const derived = deriveCompanyAddress(companySecret);
        if (derived !== this.companyAddress) throw new Error('Not the company');
        const app = this.applications.get(appId);
        if (!app) throw new Error('Application not found');
        if (app.status !== 'APPLIED') throw new Error('Not in APPLIED state');
        app.status = 'SHORTLISTED';
        this.totalShortlisted++;
    }

    extendOffer(appId: string, companySecret: Buffer): void {
        const derived = deriveCompanyAddress(companySecret);
        if (derived !== this.companyAddress) throw new Error('Not the company');
        const app = this.applications.get(appId);
        if (!app) throw new Error('Application not found');
        if (app.status !== 'SHORTLISTED') throw new Error('Must be shortlisted first');
        app.status = 'OFFERED';
        this.totalOffered++;
    }

    revealAndAccept(
        resumeBytes: Buffer,
        applicantSecret: Buffer,
        realName: Buffer,
        realEmail: Buffer
    ): string {
        const appId = deriveApplicationId(resumeBytes, applicantSecret);
        const app = this.applications.get(appId);
        if (!app) throw new Error('Application not found');
        if (app.status !== 'OFFERED') throw new Error('No offer yet');

        // This is what disclose() publishes — only the commitment, never raw data
        const commitment = deriveIdentityCommitment(realName, realEmail, applicantSecret);

        app.status = 'ACCEPTED';
        this.totalAccepted++;

        // Return ONLY the commitment (public), never name/email
        return commitment;
    }
}

// ── Tests ────────────────────────────────────────────────────────

describe('Circuit (a): Application ID Derivation', () => {
    it('derives deterministic application IDs from resume + secret', () => {
        const resume = Buffer.from('Alice resume content');
        const secret = Buffer.from('alice-secret-nonce-32bytes-padded');
        const id1 = deriveApplicationId(resume, secret);
        const id2 = deriveApplicationId(resume, secret);
        expect(id1).toBe(id2);
        expect(id1).toHaveLength(64); // SHA-256 hex
    });

    it('produces different IDs for different resumes (collision resistance)', () => {
        const secret = Buffer.from('same-secret-nonce');
        const id1 = deriveApplicationId(Buffer.from('Resume A'), secret);
        const id2 = deriveApplicationId(Buffer.from('Resume B'), secret);
        expect(id1).not.toBe(id2);
    });

    it('produces different IDs for same resume with different secrets', () => {
        const resume = Buffer.from('Same resume');
        const id1 = deriveApplicationId(resume, Buffer.from('secret1'));
        const id2 = deriveApplicationId(resume, Buffer.from('secret2'));
        expect(id1).not.toBe(id2);
    });
});

describe('Circuit (b): State Transitions', () => {
    let ledger: SimulatedLedger;
    const companySecret = Buffer.from('company-secret-key-32bytes-padded');
    const wrongSecret = Buffer.from('wrong-company-secret-31bytes-aaa');

    beforeEach(() => {
        ledger = new SimulatedLedger(companySecret);
    });

    it('full lifecycle: APPLIED → SHORTLISTED → OFFERED → ACCEPTED', () => {
        const resume = Buffer.from('Applicant resume');
        const userSecret = Buffer.from('user-secret-nonce-32bytes-padded');

        const appId = ledger.applyAnonymous(resume, userSecret);
        expect(ledger.applications.get(appId)?.status).toBe('APPLIED');
        expect(ledger.totalApplications).toBe(1);

        ledger.shortlistCandidate(appId, companySecret);
        expect(ledger.applications.get(appId)?.status).toBe('SHORTLISTED');
        expect(ledger.totalShortlisted).toBe(1);

        ledger.extendOffer(appId, companySecret);
        expect(ledger.applications.get(appId)?.status).toBe('OFFERED');
        expect(ledger.totalOffered).toBe(1);

        const commitment = ledger.revealAndAccept(
            resume,
            userSecret,
            Buffer.from('Alice Smith'),
            Buffer.from('alice@example.com')
        );
        expect(ledger.applications.get(appId)?.status).toBe('ACCEPTED');
        expect(ledger.totalAccepted).toBe(1);
        expect(typeof commitment).toBe('string');
        expect(commitment).toHaveLength(64);
    });

    it('rejects duplicate applications', () => {
        const resume = Buffer.from('Resume');
        const secret = Buffer.from('secret');
        ledger.applyAnonymous(resume, secret);
        expect(() => ledger.applyAnonymous(resume, secret)).toThrow(
            'Application already submitted'
        );
    });

    it('rejects shortlisting with wrong company secret', () => {
        const resume = Buffer.from('Resume');
        const secret = Buffer.from('secret');
        const appId = ledger.applyAnonymous(resume, secret);
        expect(() => ledger.shortlistCandidate(appId, wrongSecret)).toThrow(
            'Not the company'
        );
    });

    it('rejects offer extension before shortlisting', () => {
        const resume = Buffer.from('Resume');
        const secret = Buffer.from('secret');
        const appId = ledger.applyAnonymous(resume, secret);
        expect(() => ledger.extendOffer(appId, companySecret)).toThrow(
            'Must be shortlisted first'
        );
    });

    it('rejects acceptance before offer', () => {
        const resume = Buffer.from('Resume');
        const secret = Buffer.from('secret');
        ledger.applyAnonymous(resume, secret);
        expect(() =>
            ledger.revealAndAccept(
                resume,
                secret,
                Buffer.from('Name'),
                Buffer.from('email@test.com')
            )
        ).toThrow('No offer yet');
    });
});

describe('Circuit (c): Private inputs NEVER exposed', () => {
    it('apply_anonymous: resume content is NOT stored in ledger state', () => {
        const ledger = new SimulatedLedger(Buffer.from('company-secret'));
        const resumeContent = 'THIS IS PRIVATE RESUME CONTENT DO NOT STORE';
        ledger.applyAnonymous(
            Buffer.from(resumeContent),
            Buffer.from('nonce')
        );

        // Verify NO application record contains the raw resume
        for (const [key, value] of ledger.applications.entries()) {
            expect(key).not.toContain(resumeContent);
            expect(JSON.stringify(value)).not.toContain(resumeContent);
        }
    });

    it('reveal_and_accept: real_name and real_email NEVER in returned commitment', () => {
        const ledger = new SimulatedLedger(Buffer.from('company-secret'));
        const resume = Buffer.from('resume');
        const secret = Buffer.from('mysecret');
        const realName = 'PRIVATE_ALICE_SMITH_NAME';
        const realEmail = 'PRIVATE_ALICE_EMAIL@HIDDEN.COM';

        const appId = ledger.applyAnonymous(resume, secret);
        ledger.shortlistCandidate(appId, Buffer.from('company-secret'));
        ledger.extendOffer(appId, Buffer.from('company-secret'));

        const commitment = ledger.revealAndAccept(
            resume,
            secret,
            Buffer.from(realName),
            Buffer.from(realEmail)
        );

        // The commitment (what goes on-chain) must NOT contain raw identity data
        expect(commitment).not.toContain(realName);
        expect(commitment).not.toContain(realEmail);
        // It should be a 64-char SHA-256 hex string
        expect(commitment).toMatch(/^[0-9a-f]{64}$/);
    });

    it('identity commitment is deterministic (same inputs → same commitment)', () => {
        const name = Buffer.from('Alice');
        const email = Buffer.from('alice@test.com');
        const secret = Buffer.from('mysecret');
        const c1 = deriveIdentityCommitment(name, email, secret);
        const c2 = deriveIdentityCommitment(name, email, secret);
        expect(c1).toBe(c2);
    });

    it('company_secret is NEVER stored in ledger — only its hash (address)', () => {
        const companySecret = Buffer.from('company-secret');
        const ledger = new SimulatedLedger(companySecret);

        // The ledger's companyAddress is a hash, not the raw secret
        expect(ledger.companyAddress).not.toBe(companySecret.toString());
        expect(ledger.companyAddress).toHaveLength(64); // hashed
    });
});

describe('Circuit (d): Contract constants and data split', () => {
    it('only public counters increment (no private data in counters)', () => {
        const ledger = new SimulatedLedger(Buffer.from('company'));
        expect(ledger.totalApplications).toBe(0);
        ledger.applyAnonymous(Buffer.from('r1'), Buffer.from('s1'));
        expect(ledger.totalApplications).toBe(1);
        // Counter is a number — carries no identity info
        expect(typeof ledger.totalApplications).toBe('number');
    });

    it('multiple applicants can apply without revealing each other', () => {
        const ledger = new SimulatedLedger(Buffer.from('company'));
        const id1 = ledger.applyAnonymous(Buffer.from('Resume1'), Buffer.from('s1'));
        const id2 = ledger.applyAnonymous(Buffer.from('Resume2'), Buffer.from('s2'));
        expect(id1).not.toBe(id2);
        expect(ledger.totalApplications).toBe(2);
        // Neither ID reveals resume content
        expect(id1).not.toContain('Resume');
        expect(id2).not.toContain('Resume');
    });
});

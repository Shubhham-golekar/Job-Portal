# Confidential Job Portal — Product Proposal

## 1. What the product is and who uses it

**Confidential Job Portal** is a zero-knowledge job application platform built on the Midnight Network. It enables professional hiring with full privacy preservation: applicants submit résumé commitments anonymously, employers see only shortlisted candidates (never personal identities), and real identity is disclosed *only* after a job offer is extended — and only by the applicant's own choice.

**Primary Users:**

| Role | How they use it |
|------|----------------|
| **Job Applicants** | Submit a ZK-proof of their résumé without revealing name, email, or content. Track application status using only their Application ID. Selectively disclose identity post-offer. |
| **Hiring Companies** | Review opaque Application IDs shortlisted by a ZK circuit. Extend offers without ever learning applicant identity until the applicant chooses to reveal. |
| **Neutral Observers / Auditors** | Verify the integrity of the pipeline (counters, transitions) on-chain without accessing any private data. |

The target demographic is any organization that wants bias-free, privacy-respecting hiring — legal firms, financial institutions, government agencies, and international employers where anti-discrimination requirements make anonymous-first screening legally attractive. Secondary users include privacy-conscious individual applicants who want to probe the job market without exposing their identity or current employer to recruiters.

---

## 2. Why Midnight specifically rather than a generic blockchain

Midnight is the *only* production-ready blockchain that natively integrates ZK proof generation into the transaction lifecycle via the **Compact language** and its built-in `disclose()` opcode. Every design choice in this product relies on capabilities that are impossible on generic EVM or Solana-style chains:

| Requirement | Generic blockchain (EVM, etc.) | Midnight |
|-------------|-------------------------------|----------|
| Private witnesses in circuits | ❌ All inputs are public calldata | ✅ Native private witness — never hits the chain |
| Selective disclosure on-chain | ❌ Requires complex off-chain ZK toolkit (snarkjs, circom, trusted setup) | ✅ `disclose()` opcode — single line in Compact |
| ZK proof generation in-wallet | ❌ Application must run its own prover node | ✅ Midnight proof server + DApp Connector API handle proving |
| Resume hash commitment | ❌ Hash posted as public calldata; metadata leaks via gas analysis | ✅ Witness inputs never appear in transaction payload |
| Shielded address for applicants | ❌ Applicant wallet address is public | ✅ Midnight shielded addresses break the applicant–transaction link |
| No trusted setup required | ❌ Most ZK systems need a ceremony | ✅ Midnight's ZK system avoids application-level ceremonies |

A Solidity + snarkjs implementation would require: a separate prover server, a trusted setup ceremony, and all private inputs being routed through the dapp back-end — undermining the trustless model. The core selling proposition ("the dapp never sees your résumé") is only credible on Midnight, where the proof is generated inside the user's own wallet.

---

## 3. The data model — public state, private witnesses, and disclosure

### Public ledger state (visible to anyone)

```compact
export ledger applications: Map<Bytes<32>, ApplicationStatus> // Application ID → Status
export ledger pipeline_stats: { applied: Uint<32>, shortlisted: Uint<32>, offered: Uint<32>, accepted: Uint<32> }
export ledger company_address: ZswapCoinPublicKey  // set once at deploy
export ledger identity_commitments: Map<Bytes<32>, Bytes<32>> // app_id → sha256(name||email||secret) after reveal
```

The `ApplicationStatus` enum values (`APPLIED`, `SHORTLISTED`, `OFFERED`, `ACCEPTED`) and all pipeline counters are **fully public** — provable audit trail with zero personal data.

### Private witnesses (never leave the user's device)

| Circuit | Private inputs (witnesses) | What the circuit proves publicly |
|---------|---------------------------|----------------------------------|
| `apply_anonymous` | `resume_bytes`, `applicant_secret` | `sha256(resume ++ secret)` equals the submitted `app_id` |
| `shortlist_candidate` | `company_secret` | Caller knows the company secret (authenticates company role) |
| `extend_offer` | `company_secret` | Same company role authentication |
| `reveal_and_accept` | `name_bytes`, `email_bytes`, `reveal_secret` | `sha256(name ++ email ++ reveal_secret)` equals the disclosed `identity_commitment` |

### Selective disclosure via `disclose()`

The `reveal_and_accept` circuit is the only one that uses `disclose()`. It commits `sha256(name || email || secret)` to the public ledger **without** the raw name or email ever appearing on-chain. The raw values are proved inside the ZK circuit as witnesses and are immediately discarded after the proof is generated. No server, no dapp backend, and no Midnight node ever sees the plaintext.

### Data flow summary

```
Applicant device           Midnight Wallet / Proof Server        Midnight Node
─────────────────          ──────────────────────────────        ─────────────
resume + secret  ──────►  ZK circuit: prove hash match  ──────► app_id (hash) stored on-chain
                           (witness erased after proof)
name + email (offer)  ──► ZK circuit: disclose() opcode  ──────► identity_commitment stored on-chain
                           (witness erased after proof)
```

---

## 4. How the scope is feasible for Mainnet by Level 6

The current Level 3 implementation is a fully deployed, tested smart contract on Midnight Preview with a live frontend. The path to Mainnet is incremental and realistic:

### Milestone map to Mainnet (Levels 4–6)

| Level | Deliverable | Feasibility rationale |
|-------|-------------|----------------------|
| **L4** | Encrypted résumé storage (IPFS/Arweave) with threshold decryption, so only the shortlisting company can retrieve résumé content | Standard IPFS integration; threshold crypto libraries (e.g., `lit-protocol`) are production-ready. No new Midnight primitives needed. |
| **L5** | Multi-sig company authentication (committee shortlisting), anonymous credential proofs (ZK proof of degree/certification without revealing issuer), DAO governance token for decentralized shortlisting | Compact supports multi-witness circuits; credential proofs extend the existing witness model. DAO contracts are a natural Compact extension. |
| **L6** | Mainnet deployment, mobile wallet support (DApp Connector on mobile), production audit, user-facing documentation and onboarding | Mainnet readiness depends on Midnight's own Mainnet launch timeline (publicly anticipated ~2025–2026). Mobile wallet will follow the DApp Connector API roadmap. A code audit is scoped as a standalone deliverable. |

### Why the scope does not require new infrastructure

- **Smart contract**: The Compact circuit is already fully deployed on Preview. Mainnet deployment is a single `npm run deploy -- --network mainnet` command once Mainnet is live.
- **Frontend**: The React/Vite app is production-built, Vercel-deployed, and has zero server-side state — it scales to any number of users at no additional cost.
- **Testing**: 14 headless circuit-logic tests already pass in CI, covering every state transition. Adding credential proof tests at L5 extends the same vitest suite.
- **Wallet**: DApp Connector API is already integrated for Preview; the same API will be used for Mainnet — no code change required, only a network parameter switch.

The hardest engineering risk is the threshold-encryption résumé layer (L4). This is mitigated by the fact that the *privacy model already works without it* — résumés are kept off-chain by design today, so L4 is an enhancement, not a prerequisite.

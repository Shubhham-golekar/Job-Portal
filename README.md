# Confidential Job Application Portal

- **Live Demo:** [https://job-portal-xkdg.vercel.app/](https://job-portal-xkdg.vercel.app/)
- **Demo Video:** [https://www.loom.com/share/cea4ca6c0dd246d4bb720fd290f52ec1](https://www.loom.com/share/cea4ca6c0dd246d4bb720fd290f52ec1)

A zero-knowledge job application platform built on **Midnight Network** where applicants submit resumes privately, companies see only shortlisted candidates (no identities), and identity is revealed only after selection — all proved with ZK cryptography.

## Project Vision

The hiring process exposes applicants to bias the moment they share a name, photo, or email. **Confidential Job Portal** flips this: applicants submit a cryptographic commitment of their resume, proven valid by a ZK circuit, with no personal data ever touching the chain. The company reviews only opaque Application IDs. Only when an offer is extended does the candidate choose to *selectively disclose* their real identity — proved on-chain via Midnight's `disclose()` opcode. Privacy isn't a feature here; it's the core architecture. Without Midnight's ZK infrastructure, this level of trustless anonymity is impossible.

## Smart Contract Deployment

- **Network:** Preview
- **Contract language:** Compact (Midnight-native, not EVM/Solidity)
- **Deployed contract ID:** `24ec766ee688eaefd6dc3265d0486604eb3aab3788acee201c36e6841f553758`

> **Deployment complete.** The contract ID above has been deployed to the Midnight Preview Network.  
> To use this in the frontend, set `VITE_CONTRACT_ADDRESS=24ec766ee688eaefd6dc3265d0486604eb3aab3788acee201c36e6841f553758` in `frontend/.env.local`.  
> Faucet (for tDUST): https://faucet.preview.midnight.network/

## Key Features

- **Anonymous Resume Upload** — Resume is hashed client-side with a random secret. Only `sha256(resume ++ secret)` (the Application ID) is stored on-chain. Resume content never leaves the device.
- **Zero-Knowledge Application** — The `apply_anonymous` circuit proves the applicant has a valid resume without revealing it. On-chain observers see only an opaque 32-byte commitment.
- **Company Shortlisting** — The `shortlist_candidate` circuit lets the company promote applications by ID, authenticated by a company secret witness — identity still hidden.
- **Offer Extension** — The `extend_offer` circuit transitions a shortlisted candidate to OFFERED state, triggering the reveal window.
- **Selective Identity Reveal** — The `reveal_and_accept` circuit uses `disclose()` to commit an `identity_commitment = sha256(name ++ email ++ secret)` on-chain. Raw name/email are proved as a ZK witness and immediately discarded — never stored.
- **Interview Status Tracker** — Applicants check their status using only their Application ID — zero login required.

### Privacy Story (Public vs Private)

| Data | Visibility | Where |
|------|-----------|-------|
| Application ID | 🌐 Public | On-chain ledger |
| Application Status | 🌐 Public | On-chain ledger |
| Pipeline Counters | 🌐 Public | On-chain ledger |
| Company Address | 🌐 Public | On-chain ledger |
| Identity Commitment (post-accept) | 🌐 Public | On-chain via `disclose()` |
| Resume Content | 🔒 Private | ZK witness — never on-chain |
| Applicant Secret | 🔒 Private | ZK witness — user saves offline |
| Real Name | 🔒 Private | ZK witness — erased post-proof |
| Real Email | 🔒 Private | ZK witness — erased post-proof |

## Future Scope

- **On-chain shortlisting committee** — multi-sig company authentication for larger hiring teams
- **Encrypted resume storage** — IPFS/Arweave with threshold encryption; only the shortlisting company can decrypt
- **Anonymous credential verification** — ZK proof of degree, work experience, or certifications without revealing the issuer response
- **Mainnet deployment** — production-grade deployment after Midnight mainnet launch
- **Mobile wallet support** — DApp Connector integration once mobile wallets are available
- **DAO-governed hiring** — token-based governance for decentralized shortlisting

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Compact (Midnight-native ZK language) |
| Blockchain | Midnight Network (Preview) |
| Frontend | React 18 + Vite + TypeScript |
| Wallet Integration | Midnight DApp Connector API |
| ZK Proofs | Midnight proof server (via wallet adapter) |
| On-chain state reads | Midnight Indexer REST API |
| Testing | Vitest (headless circuit logic tests) |
| Local devnet | Docker Compose (node + indexer + proof-server) |
| Deployment | Vercel / Netlify (SPA) |

## Local Development

### Prerequisites

- Node.js ≥ 18
- Docker Desktop (started)
- Git
- Compact compiler (`compact`) — install from [midnight.network/docs](https://midnight.network/docs)

### 1. Clone & install

```powershell
git clone <your-repo-url>
cd confidential-job-portal

# Install root deps (test runner, TypeScript)
npm install

# Install frontend deps
npm install --prefix frontend
```

### 2. Start local devnet

```powershell
# Start node + indexer + proof-server
npm run network:up

# Verify containers
docker ps
```

### 3. Compile the contract

```powershell
npm run compile
# Outputs: managed/job_portal/
```

### 4. Run tests (no Docker needed)

```powershell
npm test
# Expected: 14 passing tests
```

### 5. Deploy to Preview Network

```powershell
# Set your wallet seed (PowerShell)
$env:MIDNIGHT_SEED="<your-hex-seed>"

# Deploy
npm run deploy -- --network preview

# ⚠️  If prompted, fund your wallet at:
# https://faucet.preview.midnight.network/
```

### 6. Configure frontend

```powershell
Copy-Item frontend/.env.example frontend/.env.local
# Edit frontend/.env.local and fill:
#   VITE_CONTRACT_ADDRESS=<deployed-address>
```

### 7. Run frontend dev server

```powershell
npm run frontend:dev
# Opens: http://localhost:5173
```

### 8. Build frontend for production

```powershell
npm run frontend:build
# Output: frontend/dist/
```

### CLI Usage

```powershell
# Apply anonymously (dev network)
npx ts-node src/cli.ts apply --network dev

# Check status
npx ts-node src/cli.ts status <application-id> --network dev

# Shortlist (company)
$env:COMPANY_SECRET="<hex>"; npx ts-node src/cli.ts shortlist <app-id> --network dev
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_NETWORK` | Target network | `preview` |
| `VITE_CONTRACT_ADDRESS` | Deployed contract ID | _(required for live)_ |
| `VITE_INDEXER_URL` | Indexer REST endpoint | Preview Network default |
| `MIDNIGHT_SEED` | Wallet seed (deploy only) | _(never hardcode)_ |

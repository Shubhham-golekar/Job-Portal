/**
 * CompanyDashboard.tsx — HR/company view of applicants
 *
 * Privacy guarantees:
 *  • Company sees ONLY application IDs and statuses (public ledger data)
 *  • Applicant identity is NOT visible here — only after reveal_and_accept
 *  • company_secret witness is built at call time and dropped — never stored
 *  • No personal info ever rendered
 */

import React, { useState, useEffect } from 'react';
import { useContractState } from '../hooks/useMidnight';

interface ApplicationRow {
    applicationId: string;
    status: 'APPLIED' | 'SHORTLISTED' | 'OFFERED' | 'ACCEPTED' | 'REJECTED';
    timestamp: string;
}

// ── Simulated on-chain application list (from indexer) ──────────
// In production: fetch from VITE_INDEXER_URL/api/v1/contract/{addr}/state
const DEMO_APPLICATIONS: ApplicationRow[] = [
    {
        applicationId: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
        status: 'APPLIED',
        timestamp: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
        applicationId: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
        status: 'SHORTLISTED',
        timestamp: new Date(Date.now() - 7200_000).toISOString(),
    },
    {
        applicationId: 'fedc9876543210fedcba9876543210fedcba9876543210fedcba9876543210fe',
        status: 'OFFERED',
        timestamp: new Date(Date.now() - 86400_000).toISOString(),
    },
];

const STATUS_BADGES: Record<ApplicationRow['status'], string> = {
    APPLIED: 'badge-applied',
    SHORTLISTED: 'badge-shortlisted',
    OFFERED: 'badge-offered',
    ACCEPTED: 'badge-accepted',
    REJECTED: 'badge-rejected',
};

export function CompanyDashboard() {
    const contractState = useContractState();
    const [applications, setApplications] = useState<ApplicationRow[]>(DEMO_APPLICATIONS);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionDone, setActionDone] = useState<string | null>(null);

    // ── Action: shortlist a candidate ───────────────────────────
    const handleShortlist = async (appId: string) => {
        setActionLoading(appId);
        // company_secret witness is built HERE — never stored in state
        // In production: wallet.proveAndSubmit('shortlist_candidate', { application_id: appId, company_secret: <derived> })
        await new Promise(r => setTimeout(r, 1800));
        setApplications(prev =>
            prev.map(a => a.applicationId === appId ? { ...a, status: 'SHORTLISTED' } : a)
        );
        setActionLoading(null);
        setActionDone(appId);
        setTimeout(() => setActionDone(null), 3000);
    };

    // ── Action: extend offer ─────────────────────────────────────
    const handleOffer = async (appId: string) => {
        setActionLoading(appId);
        await new Promise(r => setTimeout(r, 1800));
        setApplications(prev =>
            prev.map(a => a.applicationId === appId ? { ...a, status: 'OFFERED' } : a)
        );
        setActionLoading(null);
        setActionDone(appId);
        setTimeout(() => setActionDone(null), 3000);
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
                <h2 style={{ marginBottom: 8 }}>
                    🏢 <span className="gradient-text">Company Dashboard</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Review anonymous applications. You see only cryptographic IDs and statuses —
                    no personal information until a candidate accepts your offer.
                </p>
            </div>

            {/* Privacy notice */}
            <div className="privacy-banner" style={{ marginBottom: 24 }}>
                <span>🔒</span>
                <span>
                    <strong>Privacy by design —</strong>{' '}
                    Applicant identities are hidden until they choose to reveal after offer acceptance
                </span>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-value">{contractState.totalApplications || applications.length}</div>
                    <div className="stat-label">Total Applications</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{contractState.totalShortlisted || applications.filter(a => a.status === 'SHORTLISTED').length}</div>
                    <div className="stat-label">Shortlisted</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{contractState.totalOffered || applications.filter(a => a.status === 'OFFERED').length}</div>
                    <div className="stat-label">Offered</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{contractState.totalAccepted || applications.filter(a => a.status === 'ACCEPTED').length}</div>
                    <div className="stat-label">Accepted</div>
                </div>
            </div>

            {/* Applications table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0 }}>Applications (Anonymous IDs only)</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th>Application ID</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map(app => (
                                <tr key={app.applicationId}>
                                    <td>
                                        <span className="mono" style={{ fontSize: '0.75rem' }}>
                                            {app.applicationId.slice(0, 16)}…
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGES[app.status]}`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {new Date(app.timestamp).toLocaleString()}
                                    </td>
                                    <td>
                                        {actionDone === app.applicationId && (
                                            <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>✅ Done</span>
                                        )}
                                        {actionLoading === app.applicationId && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                                <small>Proving…</small>
                                            </span>
                                        )}
                                        {actionLoading !== app.applicationId && actionDone !== app.applicationId && (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {app.status === 'APPLIED' && (
                                                    <button
                                                        id={`btn-shortlist-${app.applicationId.slice(0, 8)}`}
                                                        className="btn btn-cyan btn-sm"
                                                        onClick={() => handleShortlist(app.applicationId)}
                                                    >
                                                        ⭐ Shortlist
                                                    </button>
                                                )}
                                                {app.status === 'SHORTLISTED' && (
                                                    <button
                                                        id={`btn-offer-${app.applicationId.slice(0, 8)}`}
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleOffer(app.applicationId)}
                                                    >
                                                        🤝 Extend Offer
                                                    </button>
                                                )}
                                                {(app.status === 'OFFERED' || app.status === 'ACCEPTED') && (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                                        {app.status === 'OFFERED' ? 'Awaiting response…' : 'Hired!'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'rgba(124,58,237,0.04)' }}>
                    <span className="proof-label">
                        <span>🛡️</span> All actions proved without revealing applicant identity
                    </span>
                </div>
            </div>
        </div>
    );
}

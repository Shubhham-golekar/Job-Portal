/**
 * StatusTracker.tsx — Applicant checks their application status anonymously
 *
 * Privacy: requires only the public application_id to check status.
 * No identity, no resume, no secret needed at this step.
 */

import React, { useState } from 'react';

type Status = 'APPLIED' | 'SHORTLISTED' | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | null;

const STATUS_MESSAGES: Record<NonNullable<Status>, { emoji: string; label: string; detail: string }> = {
    APPLIED: {
        emoji: '📥',
        label: 'Application Received',
        detail: 'Your application is under review. Your identity remains fully private.',
    },
    SHORTLISTED: {
        emoji: '⭐',
        label: 'Shortlisted!',
        detail: 'Great news — you\'ve been shortlisted. The company will extend an offer soon.',
    },
    OFFERED: {
        emoji: '🤝',
        label: 'Offer Extended!',
        detail: 'You have a job offer! When you\'re ready, use "Accept Offer" to reveal your identity and accept.',
    },
    ACCEPTED: {
        emoji: '🎉',
        label: 'Offer Accepted',
        detail: 'Congratulations — you officially accepted the offer! Identity disclosed on-chain.',
    },
    REJECTED: {
        emoji: '😔',
        label: 'Not Selected',
        detail: 'This application was not selected. Your identity was never revealed.',
    },
};

const DEMO_STATUSES: Record<string, Status> = {
    'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd': 'APPLIED',
    'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678': 'SHORTLISTED',
    'fedc9876543210fedcba9876543210fedcba9876543210fedcba9876543210fe': 'OFFERED',
};

export function StatusTracker() {
    const [applicationId, setApplicationId] = useState('');
    const [status, setStatus] = useState<Status>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const handleCheck = async () => {
        if (!applicationId.trim()) return;
        setIsLoading(true);
        setStatus(null);
        setNotFound(false);

        // Simulate indexer query
        // Production: GET VITE_INDEXER_URL/api/v1/contract/{addr}/applications/{appId}
        await new Promise(r => setTimeout(r, 1000));

        const found = DEMO_STATUSES[applicationId.trim()];
        if (found) {
            setStatus(found);
        } else {
            setNotFound(true);
        }
        setIsLoading(false);
    };

    const statusInfo = status ? STATUS_MESSAGES[status] : null;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
                <h2 style={{ marginBottom: 8 }}>
                    🔍 <span className="gradient-text">Track Your Application</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Check your application status using only your Application ID — no login, no identity required.
                </p>
            </div>

            <div className="privacy-banner" style={{ marginBottom: 24 }}>
                <span>🔒</span>
                <span>
                    <strong>Fully anonymous —</strong> status check requires only your public Application ID
                </span>
            </div>

            <div className="card" style={{ maxWidth: 560 }}>
                <div className="form-group">
                    <label className="form-label" htmlFor="app-id-input">Application ID</label>
                    <input
                        id="app-id-input"
                        className="form-input"
                        type="text"
                        placeholder="Paste your 64-character application ID…"
                        value={applicationId}
                        onChange={e => {
                            setApplicationId(e.target.value);
                            setStatus(null);
                            setNotFound(false);
                        }}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        This was shown when you submitted your application. It's a SHA-256 hash — not your identity.
                    </p>
                </div>

                <button
                    id="btn-check-status"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleCheck}
                    disabled={!applicationId.trim() || isLoading}
                >
                    {isLoading
                        ? <><span className="spinner" /> Querying indexer…</>
                        : '🔍 Check Status'}
                </button>

                {notFound && (
                    <div className="alert alert-warning" style={{ marginTop: 20 }}>
                        <span>🔎</span>
                        <div>Application ID not found on-chain. Double-check the ID you saved.</div>
                    </div>
                )}

                {statusInfo && (
                    <div className="fade-in" style={{ marginTop: 24 }}>
                        <div className="alert alert-success">
                            <span style={{ fontSize: '1.4rem' }}>{statusInfo.emoji}</span>
                            <div>
                                <strong>{statusInfo.label}</strong>
                                <br />
                                <small>{statusInfo.detail}</small>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Status:
                            </span>
                            <span className={`badge badge-${status?.toLowerCase()}`}>{status}</span>
                        </div>
                    </div>
                )}

                {/* Developer demo tip */}
                <hr className="divider" />
                <details style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Demo IDs to try</summary>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                        {Object.entries(DEMO_STATUSES).map(([id, st]) => (
                            <div key={id} style={{ marginBottom: 4 }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                    onClick={() => setApplicationId(id)}
                                >
                                    {st}
                                </button>{' '}
                                {id.slice(0, 20)}…
                            </div>
                        ))}
                    </div>
                </details>
            </div>
        </div>
    );
}

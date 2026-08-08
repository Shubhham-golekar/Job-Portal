/**
 * StatusTracker.tsx — Applicant checks their application status anonymously
 *
 * Privacy: requires only the public application_id to check status.
 * No identity, no resume, no secret needed at this step.
 */

import React, { useState } from 'react';
import { useApplications, type AppStatus } from '../context/ApplicationContext';

type Status = AppStatus | null;

const STATUS_CONFIG: Record<AppStatus, { emoji: string; label: string; detail: string; badge: string; color: string }> = {
    APPLIED: {
        emoji: '📥',
        label: 'Application Received',
        detail: 'Your application is under review. Your identity remains fully private.',
        badge: 'badge-applied',
        color: 'var(--cyan)',
    },
    SHORTLISTED: {
        emoji: '⭐',
        label: 'Shortlisted!',
        detail: 'Great news — you\'ve been shortlisted! The company will extend an offer soon.',
        badge: 'badge-shortlisted',
        color: 'var(--amber)',
    },
    OFFERED: {
        emoji: '🤝',
        label: 'Offer Extended!',
        detail: 'You have a job offer! Go to the "Accept Offer" tab to reveal your identity and accept.',
        badge: 'badge-offered',
        color: 'var(--green)',
    },
    ACCEPTED: {
        emoji: '🎉',
        label: 'Offer Accepted',
        detail: 'Congratulations — you officially accepted the offer! Your identity commitment is now on-chain.',
        badge: 'badge-accepted',
        color: 'var(--green)',
    },
    REJECTED: {
        emoji: '😔',
        label: 'Not Selected',
        detail: 'This application was not selected. Your identity was never revealed — it remains fully private.',
        badge: 'badge-rejected',
        color: 'var(--red)',
    },
};

const PIPELINE_STEPS: { key: AppStatus; label: string; icon: string }[] = [
    { key: 'APPLIED', label: 'Applied', icon: '📥' },
    { key: 'SHORTLISTED', label: 'Shortlisted', icon: '⭐' },
    { key: 'OFFERED', label: 'Offered', icon: '🤝' },
    { key: 'ACCEPTED', label: 'Accepted', icon: '🎉' },
];

const STATUS_ORDER: AppStatus[] = ['APPLIED', 'SHORTLISTED', 'OFFERED', 'ACCEPTED'];

export function StatusTracker() {
    const { getStatus: getSharedStatus, applications } = useApplications();
    const [applicationId, setApplicationId] = useState('');
    const [status, setStatus] = useState<Status>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleCheck = async () => {
        if (!applicationId.trim()) return;
        setIsLoading(true);
        setStatus(null);
        setNotFound(false);
        setHasSearched(true);

        // Simulate indexer query
        await new Promise(r => setTimeout(r, 1000));

        const found = getSharedStatus(applicationId.trim());
        if (found) {
            setStatus(found);
        } else {
            setNotFound(true);
        }
        setIsLoading(false);
    };

    const statusInfo = status ? STATUS_CONFIG[status] : null;
    const currentStepIndex = status && status !== 'REJECTED' ? STATUS_ORDER.indexOf(status) : -1;

    // Quick-fill from recent applications
    const recentApps = applications.slice(-5).reverse();

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

            <div className="card" style={{ maxWidth: 600 }}>
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
                            setHasSearched(false);
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleCheck()}
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
                    <div className="alert alert-warning fade-in" style={{ marginTop: 20 }}>
                        <span>🔎</span>
                        <div>
                            <strong>Application ID not found.</strong>
                            <br />
                            <small>Double-check the ID you saved when you applied. Make sure you copy the full 64-character hash.</small>
                        </div>
                    </div>
                )}

                {statusInfo && status && (
                    <div className="fade-in" style={{ marginTop: 24 }}>
                        {/* Status result */}
                        <div className="alert alert-success">
                            <span style={{ fontSize: '1.8rem' }}>{statusInfo.emoji}</span>
                            <div>
                                <strong style={{ fontSize: '1.05rem' }}>{statusInfo.label}</strong>
                                <br />
                                <span style={{ fontSize: '0.88rem' }}>{statusInfo.detail}</span>
                            </div>
                        </div>

                        {/* Pipeline progress */}
                        {status !== 'REJECTED' && (
                            <div className="pipeline" style={{ margin: '24px 0 16px' }}>
                                {PIPELINE_STEPS.map((s, i) => (
                                    <div
                                        key={s.key}
                                        className={`pipeline-step ${i < currentStepIndex ? 'complete' : i === currentStepIndex ? 'active' : ''}`}
                                    >
                                        <div className="pipeline-dot">
                                            {i <= currentStepIndex ? s.icon : i + 1}
                                        </div>
                                        <span className="pipeline-label">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Current Status:
                            </span>
                            <span className={`badge ${statusInfo.badge}`}>{statusInfo.emoji} {status}</span>
                        </div>
                    </div>
                )}

                {/* Quick-fill from recent submissions */}
                {recentApps.length > 0 && !hasSearched && (
                    <>
                        <hr className="divider" />
                        <div style={{ fontSize: '0.82rem' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
                                Your Recent Applications
                            </p>
                            {recentApps.map(app => (
                                <div
                                    key={app.applicationId}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                        marginBottom: 4, cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.03)',
                                        transition: 'background 0.2s',
                                    }}
                                    onClick={() => setApplicationId(app.applicationId)}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.08)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                >
                                    <span className="mono" style={{ fontSize: '0.72rem' }}>
                                        {app.applicationId.slice(0, 20)}…
                                    </span>
                                    <span className={`badge ${STATUS_CONFIG[app.status]?.badge || 'badge-applied'}`} style={{ fontSize: '0.65rem' }}>
                                        {app.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

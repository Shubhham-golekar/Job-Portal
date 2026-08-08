/**
 * ActivityLog.tsx — Blockchain-style event timeline
 * Shows all actions across the portal like a mini block explorer.
 */

import React from 'react';
import { useApplications, type ActivityEvent } from '../context/ApplicationContext';

const TYPE_STYLES: Record<string, { bg: string; borderColor: string }> = {
    apply: { bg: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)' },
    shortlist: { bg: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
    offer: { bg: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
    accept: { bg: 'rgba(16,185,129,0.15)', borderColor: 'var(--green)' },
    reject: { bg: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
    job_post: { bg: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)' },
    status_check: { bg: 'rgba(255,255,255,0.05)', borderColor: 'var(--border)' },
};

function timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function ActivityLog() {
    const { activities, applications } = useApplications();
    const reversedActivities = [...activities].reverse();

    // Stats
    const stats = {
        totalEvents: activities.length,
        proofs: activities.filter(a => ['apply', 'accept'].includes(a.type)).length,
        statusChanges: activities.filter(a => ['shortlist', 'offer', 'reject'].includes(a.type)).length,
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
                <h2 style={{ marginBottom: 8 }}>
                    📜 <span className="gradient-text">Activity Timeline</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Real-time blockchain-style event log of all actions across the portal.
                    Every action generates a verifiable transaction.
                </p>
            </div>

            <div className="privacy-banner" style={{ marginBottom: 24 }}>
                <span>🔗</span>
                <span>
                    <strong>On-chain ledger —</strong>{' '}
                    all status changes and proofs are recorded as verifiable events
                </span>
            </div>

            {/* Stats */}
            <div className="stats-row" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>📊</div>
                    <div className="stat-value">{stats.totalEvents}</div>
                    <div className="stat-label">Total Events</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🛡️</div>
                    <div className="stat-value">{stats.proofs}</div>
                    <div className="stat-label">ZK Proofs</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🔄</div>
                    <div className="stat-value">{stats.statusChanges}</div>
                    <div className="stat-label">Status Changes</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>👥</div>
                    <div className="stat-value">{applications.length}</div>
                    <div className="stat-label">Applicants</div>
                </div>
            </div>

            {/* Timeline */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Event Log</h3>
                    <span className="badge badge-preview">{activities.length} events</span>
                </div>

                {reversedActivities.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <div className="empty-state-title">No Activity Yet</div>
                        <div className="empty-state-desc">
                            Events will appear here as you interact with the portal — submit applications, shortlist candidates, and more.
                        </div>
                    </div>
                ) : (
                    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                        {reversedActivities.map((event, i) => {
                            const style = TYPE_STYLES[event.type] || TYPE_STYLES.status_check;
                            return (
                                <div
                                    key={event.id}
                                    className="fade-in"
                                    style={{
                                        display: 'flex',
                                        gap: 16,
                                        padding: '16px 24px',
                                        borderBottom: i < reversedActivities.length - 1 ? '1px solid rgba(42,42,90,0.3)' : 'none',
                                        transition: 'background 0.2s',
                                        animationDelay: `${i * 0.03}s`,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    {/* Timeline dot */}
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: style.bg,
                                        border: `1px solid ${style.borderColor}`,
                                        display: 'grid', placeItems: 'center',
                                        fontSize: '1.1rem', flexShrink: 0,
                                    }}>
                                        {event.icon}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
                                                    {event.message}
                                                </div>
                                                {event.detail && (
                                                    <div className="mono" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                                                        {event.detail}
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                                                {timeAgo(event.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'rgba(124,58,237,0.04)' }}>
                    <span className="proof-label">
                        <span>🔗</span> All events are cryptographically verifiable
                    </span>
                </div>
            </div>
        </div>
    );
}

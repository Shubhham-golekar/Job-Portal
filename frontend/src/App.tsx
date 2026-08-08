/**
 * App.tsx — Main application shell
 * Routing: tabs-based SPA (no router dependency)
 * Premium UI with full feature set
 */

import React, { useState } from 'react';
import './index.css';
import { WalletConnect } from './components/WalletConnect';
import { ApplicantPortal } from './components/ApplicantPortal';
import { CompanyDashboard } from './components/CompanyDashboard';
import { StatusTracker } from './components/StatusTracker';
import { OfferAcceptance } from './components/OfferAcceptance';
import { JobBoard } from './components/JobBoard';
import { ActivityLog } from './components/ActivityLog';
import { useMidnightContext } from './context/MidnightContext';
import { useApplications } from './context/ApplicationContext';


type Tab = 'jobs' | 'apply' | 'company' | 'track' | 'accept' | 'activity';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'jobs', label: 'Job Board', icon: '📋' },
    { id: 'apply', label: 'Quick Apply', icon: '🕵️' },
    { id: 'company', label: 'Company', icon: '🏢' },
    { id: 'track', label: 'Track', icon: '🔍' },
    { id: 'accept', label: 'Accept', icon: '🤝' },
    { id: 'activity', label: 'Activity', icon: '📜' },
];

function Landing({ onEnter }: { onEnter: () => void }) {
    return (
        <div className="hero">
            <div className="hero-eyebrow">
                <span>🌙</span> Midnight Network — Zero-Knowledge Privacy
            </div>
            <h1 className="hero-title">
                <span className="gradient-text">Confidential</span> Job Application Portal
            </h1>
            <p className="hero-subtitle">
                Apply for jobs privately. Your resume, identity, and credentials are proved using
                zero-knowledge proofs — never revealed unless you choose to disclose.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
                <button id="btn-enter-portal" className="btn btn-primary btn-lg" onClick={onEnter}>
                    🚀 Enter Portal
                </button>
                <a
                    href="https://midnight.network"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-lg"
                >
                    Learn About Midnight ↗
                </a>
            </div>

            {/* Feature cards */}
            <div className="grid-3" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'left' }}>
                {[
                    {
                        icon: '🔐',
                        title: 'Private Resume Upload',
                        desc: 'Resume is hashed client-side. Only a cryptographic commitment goes on-chain.',
                        gradient: 'var(--grad-violet)',
                    },
                    {
                        icon: '🕵️',
                        title: 'Anonymous Application',
                        desc: 'You are identified only by an Application ID. No name, no email, no trace.',
                        gradient: 'var(--grad-cyan)',
                    },
                    {
                        icon: '🤝',
                        title: 'Selective Identity Reveal',
                        desc: 'Reveal your identity only after receiving an offer — proved with disclose().',
                        gradient: 'linear-gradient(135deg, #10b981, #34d399)',
                    },
                ].map((f, i) => (
                    <div key={f.title} className="card fade-in-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 'var(--radius-sm)',
                            background: f.gradient, display: 'grid', placeItems: 'center',
                            fontSize: '1.5rem', marginBottom: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}>
                            {f.icon}
                        </div>
                        <h3 style={{ marginBottom: 8 }}>{f.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>{f.desc}</p>
                        <div className="proof-label">
                            <span>🛡️</span> Zero-knowledge verified
                        </div>
                    </div>
                ))}
            </div>

            {/* How it works pipeline */}
            <div className="card" style={{ maxWidth: 800, margin: '40px auto 0', textAlign: 'center' }}>
                <h3 style={{ marginBottom: 8 }}>🔄 How it Works</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                    Your complete privacy-preserving hiring journey
                </p>
                <div className="pipeline">
                    {[
                        { label: 'Browse', icon: '📋' },
                        { label: 'Upload', icon: '📄' },
                        { label: 'Prove', icon: '🔐' },
                        { label: 'Review', icon: '⭐' },
                        { label: 'Accept', icon: '🤝' },
                    ].map((s, i) => (
                        <div key={s.label} className={`pipeline-step ${i < 3 ? 'complete' : i === 3 ? 'active' : ''}`}>
                            <div className="pipeline-dot">{s.icon}</div>
                            <span className="pipeline-label">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Privacy comparison */}
            <div className="card" style={{ maxWidth: 700, margin: '24px auto 0', textAlign: 'left' }}>
                <h3 style={{ marginBottom: 16 }}>🔬 Privacy Architecture</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>🌐 Public (On-Chain)</p>
                        {['Application ID (hash)', 'Application Status', 'Pipeline Counters'].map(label => (
                            <div key={label} className="badge badge-applied" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>
                                ✓ {label}
                            </div>
                        ))}
                    </div>
                    <div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>🔒 Private (Never On-Chain)</p>
                        {['Resume Content', 'Name & Email', 'Applicant Secret'].map(label => (
                            <div key={label} className="badge badge-rejected" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>
                                ✗ {label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const { isConnected } = useMidnightContext();
    const { applications, activities, clearAllData } = useApplications();
    const [showPortal, setShowPortal] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('jobs');

    const offeredCount = applications.filter(a => a.status === 'OFFERED').length;
    const totalApps = applications.length;

    return (
        <>
            {/* ── Navbar ─────────────────────────────────────────── */}
            <nav className="navbar">
                <div className="navbar-brand" onClick={() => setShowPortal(false)} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">🌙</div>
                    <span>Confidential Job Portal</span>
                </div>
                <div className="navbar-right">
                    {showPortal && totalApps > 0 && (
                        <span className="badge badge-applied" style={{ fontSize: '0.7rem' }}>
                            {totalApps} app{totalApps !== 1 ? 's' : ''}
                        </span>
                    )}
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                            if (window.confirm('⚠️ Are you sure you want to clear all demo data (Jobs, Applications, Logs)? This cannot be undone.')) {
                                clearAllData();
                                window.location.reload();
                            }
                        }}
                        title="Clear Data & Reset Demo"
                        style={{ padding: '0 8px', fontSize: '1.2rem' }}
                    >
                        ⚙️
                    </button>
                    <WalletConnect compact />
                </div>
            </nav>

            {/* ── Content ────────────────────────────────────────── */}
            {!showPortal ? (
                <Landing onEnter={() => setShowPortal(true)} />
            ) : (
                <div className="page">
                    <div className="container">
                        {!isConnected && (
                            <div style={{ marginBottom: 32 }}>
                                <div className="alert alert-info" style={{ marginBottom: 0 }}>
                                    <span>💡</span>
                                    <div>
                                        <strong>Demo Mode Active</strong> — All features work without a wallet.
                                        Connect your Midnight wallet for real on-chain proofs.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="tabs">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    id={`tab-${tab.id}`}
                                    className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon} {tab.label}
                                    {tab.id === 'accept' && offeredCount > 0 && (
                                        <span className="tab-dot" />
                                    )}
                                    {tab.id === 'company' && totalApps > 0 && (
                                        <span className="notification-badge">{totalApps}</span>
                                    )}
                                    {tab.id === 'activity' && activities.length > 0 && (
                                        <span className="notification-badge">{activities.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab panels — always mounted, hidden via CSS to preserve state */}
                        <div style={{ display: activeTab === 'jobs' ? 'block' : 'none' }}>
                            <JobBoard />
                        </div>
                        <div style={{ display: activeTab === 'apply' ? 'block' : 'none' }}>
                            <ApplicantPortal />
                        </div>
                        <div style={{ display: activeTab === 'company' ? 'block' : 'none' }}>
                            <CompanyDashboard />
                        </div>
                        <div style={{ display: activeTab === 'track' ? 'block' : 'none' }}>
                            <StatusTracker />
                        </div>
                        <div style={{ display: activeTab === 'accept' ? 'block' : 'none' }}>
                            <OfferAcceptance />
                        </div>
                        <div style={{ display: activeTab === 'activity' ? 'block' : 'none' }}>
                            <ActivityLog />
                        </div>

                        {/* Footer */}
                        <footer className="footer">
                            <p>
                                Built on <a href="https://midnight.network" target="_blank" rel="noreferrer">Midnight Network</a> — Zero-Knowledge Privacy Layer
                            </p>
                            <p style={{ marginTop: 4, fontSize: '0.75rem' }}>
                                INTO the Midnight — SPPU Bootcamp 2026
                            </p>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
}

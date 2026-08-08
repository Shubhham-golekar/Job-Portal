/**
 * App.tsx — Main application shell
 * Routing: tabs-based SPA (no router dependency)
 */

import React, { useState } from 'react';
import './index.css';
import { WalletConnect } from './components/WalletConnect';
import { ApplicantPortal } from './components/ApplicantPortal';
import { CompanyDashboard } from './components/CompanyDashboard';
import { StatusTracker } from './components/StatusTracker';
import { OfferAcceptance } from './components/OfferAcceptance';
import { useMidnightContext } from './context/MidnightContext';


type Tab = 'apply' | 'company' | 'track' | 'accept';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'apply', label: 'Apply Anonymously', icon: '🕵️' },
    { id: 'company', label: 'Company Dashboard', icon: '🏢' },
    { id: 'track', label: 'Track Status', icon: '🔍' },
    { id: 'accept', label: 'Accept Offer', icon: '🤝' },
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
                    },
                    {
                        icon: '🕵️',
                        title: 'Anonymous Application',
                        desc: 'You are identified only by an Application ID. No name, no email, no trace.',
                    },
                    {
                        icon: '🤝',
                        title: 'Selective Identity Reveal',
                        desc: 'Reveal your identity only after receiving an offer — proved with disclose().',
                    },
                ].map(f => (
                    <div key={f.title} className="card">
                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>{f.icon}</div>
                        <h3 style={{ marginBottom: 8 }}>{f.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{f.desc}</p>
                        <div className="proof-label" style={{ marginTop: 12 }}>
                            <span>🛡️</span> Proved without revealing your input
                        </div>
                    </div>
                ))}
            </div>

            {/* Privacy story */}
            <div className="card" style={{ maxWidth: 700, margin: '32px auto 0', textAlign: 'left' }}>
                <h3 style={{ marginBottom: 12 }}>🔬 How Privacy Works</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🌐 Public (On-Chain)</p>
                        <div className="badge badge-applied" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>Application ID (hash)</div>
                        <div className="badge badge-shortlisted" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>Application Status</div>
                        <div className="badge badge-offered" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>Pipeline Counters</div>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔒 Private (Never On-Chain)</p>
                        <div className="badge badge-rejected" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>Resume Content</div>
                        <div className="badge badge-rejected" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>Name &amp; Email</div>
                        <div className="badge badge-rejected" style={{ marginBottom: 6, display: 'block', width: 'fit-content' }}>Applicant Secret</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const { isConnected } = useMidnightContext();
    const [showPortal, setShowPortal] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('apply');

    return (
        <>
            {/* ── Navbar ─────────────────────────────────────────── */}
            <nav className="navbar">
                <div className="navbar-brand" onClick={() => setShowPortal(false)} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">🌙</div>
                    <span>Confidential Job Portal</span>
                </div>
                <div className="navbar-right">
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
                                <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                                    <span>⚠️</span>
                                    <div>Connect your Midnight wallet to submit proofs. You can still browse the portal.</div>
                                </div>
                                <WalletConnect />
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
                                </button>
                            ))}
                        </div>

                        {/* Tab panels */}
                        {activeTab === 'apply' && <ApplicantPortal />}
                        {activeTab === 'company' && <CompanyDashboard />}
                        {activeTab === 'track' && <StatusTracker />}
                        {activeTab === 'accept' && <OfferAcceptance />}
                    </div>
                </div>
            )}
        </>
    );
}

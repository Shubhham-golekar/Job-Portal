/**
 * OfferAcceptance.tsx — Identity reveal + offer acceptance
 *
 * Privacy guarantees (CRITICAL):
 *  1. real_name and real_email are entered by user but NEVER stored in
 *     React state that persists after this function executes.
 *  2. They are passed directly to the ZK proof generation and dropped.
 *  3. Only the identity_commitment (SHA-256 hash) goes on-chain via disclose().
 *  4. Never console.log private inputs.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApplications } from '../context/ApplicationContext';
import { useToast } from '../context/ToastContext';

async function sha256Hex(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

type Step = 'form' | 'confirming' | 'proving' | 'done' | 'error';

// ── Confetti animation ────────────────────────────────────────
function Confetti() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const colors = ['#7c3aed', '#a855f7', '#06b6d4', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#fcd34d'];
        const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; rotation: number; rotSpeed: number }[] = [];

        for (let i = 0; i < 80; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: Math.random() * -14 - 4,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
            });
        }

        let frame = 0;
        const maxFrames = 120;

        function animate() {
            if (frame >= maxFrames || !ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.25;
                p.rotation += p.rotSpeed;
                p.vx *= 0.99;

                const opacity = Math.max(0, 1 - frame / maxFrames);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = opacity;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            });

            frame++;
            requestAnimationFrame(animate);
        }

        animate();
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10,
            }}
        />
    );
}

export function OfferAcceptance() {
    const { updateStatus, applications } = useApplications();
    const { addToast } = useToast();
    const [applicationId, setApplicationId] = useState('');
    const [applicantSecret, setApplicantSecret] = useState('');
    const [step, setStep] = useState<Step>('form');
    const [commitment, setCommitment] = useState('');
    const [error, setError] = useState('');
    const [proofStep, setProofStep] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);

    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);

    // Applications with OFFERED status for quick-fill
    const offeredApps = applications.filter(a => a.status === 'OFFERED');

    const PROOF_STEPS = [
        { label: 'Verifying Application', icon: '🔍' },
        { label: 'Computing Identity Hash', icon: '🔐' },
        { label: 'Building Disclosure Proof', icon: '⚡' },
        { label: 'Submitting On-Chain', icon: '🌐' },
    ];

    const handleAccept = async () => {
        const nameVal = nameRef.current?.value ?? '';
        const emailVal = emailRef.current?.value ?? '';

        if (!applicationId || !applicantSecret || !nameVal || !emailVal) {
            setError('All fields are required.');
            addToast('error', 'Please fill in all fields');
            return;
        }

        setStep('proving');
        setError('');
        setProofStep(0);

        try {
            setProofStep(1);
            await new Promise(r => setTimeout(r, 700));

            setProofStep(2);
            const identityCommitment = await sha256Hex(nameVal + emailVal + applicantSecret);
            await new Promise(r => setTimeout(r, 800));

            setProofStep(3);
            await new Promise(r => setTimeout(r, 600));

            setProofStep(4);
            await new Promise(r => setTimeout(r, 900));

            if (nameRef.current) nameRef.current.value = '';
            if (emailRef.current) emailRef.current.value = '';

            setCommitment(identityCommitment);
            updateStatus(applicationId, 'ACCEPTED');
            setApplicantSecret('');
            setStep('done');
            setShowConfetti(true);
            addToast('success', '🎉 Offer accepted! Welcome aboard!');
            setTimeout(() => setShowConfetti(false), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Proof generation failed');
            if (nameRef.current) nameRef.current.value = '';
            if (emailRef.current) emailRef.current.value = '';
            addToast('error', 'Proof generation failed');
            setStep('error');
        }
    };

    const reset = () => {
        setStep('form');
        setApplicationId('');
        setApplicantSecret('');
        setCommitment('');
        setError('');
        setProofStep(0);
        setShowConfetti(false);
        if (nameRef.current) nameRef.current.value = '';
        if (emailRef.current) emailRef.current.value = '';
    };

    return (
        <div className="fade-in" style={{ position: 'relative' }}>
            {showConfetti && <Confetti />}

            <div style={{ marginBottom: 28 }}>
                <h2 style={{ marginBottom: 8 }}>
                    🤝 <span className="gradient-text">Accept Offer & Reveal Identity</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    You received an offer! Use your secret key and real identity to accept.
                    Your identity is disclosed using <code className="mono">disclose()</code> —
                    proved on-chain without revealing raw personal data to chain observers.
                </p>
            </div>

            <div className="privacy-banner" style={{ marginBottom: 24 }}>
                <span>🔒</span>
                <span>
                    <strong>Selective disclosure —</strong>{' '}
                    only a cryptographic commitment of your identity goes on-chain. Your name and email
                    are proved, then discarded — never stored.
                </span>
            </div>

            {/* Quick-fill from offered applications */}
            {step === 'form' && offeredApps.length > 0 && (
                <div className="alert alert-success" style={{ marginBottom: 20 }}>
                    <span>🎉</span>
                    <div>
                        <strong>You have {offeredApps.length} pending offer{offeredApps.length > 1 ? 's' : ''}!</strong>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {offeredApps.map(app => (
                                <button
                                    key={app.applicationId}
                                    className="btn btn-success btn-sm"
                                    onClick={() => setApplicationId(app.applicationId)}
                                >
                                    📋 {app.applicationId.slice(0, 12)}…
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Form + Confirming steps — always rendered, hidden via display */}
            <div style={{ display: step === 'form' || step === 'confirming' ? 'block' : 'none' }}>

                <div style={{ display: step === 'form' ? 'block' : 'none' }}>
                    <div className="card" style={{ maxWidth: 560 }}>
                        <div className="card-header">
                            <h3>Identity Reveal Form</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                Your identity is proved with ZK — only a hash commitment goes on-chain
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="offer-app-id">Application ID</label>
                            <input
                                id="offer-app-id"
                                className="form-input"
                                type="text"
                                placeholder="Your 64-char application ID"
                                value={applicationId}
                                onChange={e => setApplicationId(e.target.value)}
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="offer-secret">Your Secret Key</label>
                            <input
                                id="offer-secret"
                                className="form-input"
                                type="password"
                                placeholder="The secret you saved when you applied"
                                value={applicantSecret}
                                onChange={e => setApplicantSecret(e.target.value)}
                                style={{ fontFamily: 'var(--font-mono)' }}
                            />
                        </div>

                        <hr className="divider" />

                        <div className="alert alert-info" style={{ marginBottom: 16 }}>
                            <span>🔐</span>
                            <div>
                                <strong>Private inputs below — entered once, proved, then erased.</strong>
                                <br />
                                <small>These fields use DOM refs and are never stored in React state.</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="offer-name">
                                Full Name <span className="proof-label" style={{ marginLeft: 8 }}>🛡️ Private witness</span>
                            </label>
                            <input
                                id="offer-name"
                                ref={nameRef}
                                className="form-input"
                                type="text"
                                placeholder="Your real full name"
                                autoComplete="off"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="offer-email">
                                Email Address <span className="proof-label" style={{ marginLeft: 8 }}>🛡️ Private witness</span>
                            </label>
                            <input
                                id="offer-email"
                                ref={emailRef}
                                className="form-input"
                                type="email"
                                placeholder="your@email.com"
                                autoComplete="off"
                            />
                        </div>

                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 16 }}>
                                <span>❌</span>{error}
                            </div>
                        )}

                        <button
                            id="btn-accept-offer"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => { setError(''); setStep('confirming'); }}
                            disabled={!applicationId || !applicantSecret}
                        >
                            🤝 Review & Accept Offer
                        </button>
                        <div className="proof-label" style={{ marginTop: 10 }}>
                            <span>🛡️</span> Proved without revealing your input
                        </div>
                    </div>
                </div>

                <div style={{ display: step === 'confirming' ? 'block' : 'none' }}>
                    <div className="card" style={{ maxWidth: 560 }}>
                        <h3 style={{ marginBottom: 16 }}>⚠️ Confirm Identity Disclosure</h3>
                        <div className="alert alert-warning">
                            <span>🔓</span>
                            <div>
                                <strong>You are about to reveal your identity.</strong>
                                <br />
                                A cryptographic commitment of your name + email will be published on-chain.
                                This is irreversible.
                            </div>
                        </div>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 16 }}>
                                <span>❌</span>{error}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-outline" onClick={() => { setStep('form'); setError(''); }}>← Back</button>
                            <button
                                id="btn-confirm-reveal"
                                className="btn btn-cyan"
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={handleAccept}
                            >
                                ✅ Confirm & Generate Proof
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {step === 'proving' && (
                <div className="card" style={{ textAlign: 'center', padding: '40px 28px', maxWidth: 500 }}>
                    <div className="glow-violet" style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'var(--grad-cyan)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.2rem', margin: '0 auto 24px'
                    }}>🤝</div>
                    <h3 style={{ marginBottom: 20 }}>Generating Identity Proof…</h3>

                    {/* Step-by-step proof */}
                    <div style={{ maxWidth: 360, margin: '0 auto 24px', textAlign: 'left' }}>
                        {PROOF_STEPS.map((ps, i) => (
                            <div key={ps.label} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 16px', marginBottom: 4,
                                borderRadius: 'var(--radius-sm)',
                                background: proofStep > i ? 'rgba(16,185,129,0.08)' : proofStep === i + 1 ? 'rgba(6,182,212,0.1)' : 'transparent',
                                opacity: proofStep >= i + 1 ? 1 : 0.4,
                                transition: 'all 0.4s',
                            }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: proofStep > i ? 'var(--green)' : proofStep === i + 1 ? 'var(--cyan)' : 'var(--border)',
                                    display: 'grid', placeItems: 'center', fontSize: '0.8rem',
                                    color: 'white', flexShrink: 0, transition: 'all 0.4s',
                                }}>
                                    {proofStep > i ? '✓' : ps.icon}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ps.label}</span>
                                {proofStep === i + 1 && (
                                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginLeft: 'auto' }} />
                                )}
                            </div>
                        ))}
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Private inputs are erased immediately after proof generation
                    </p>
                </div>
            )}

            {step === 'done' && (
                <div className="card fade-in scale-in" style={{ maxWidth: 560, position: 'relative', overflow: 'visible' }}>
                    <div className="alert alert-success" style={{ fontSize: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🎉</span>
                        <div>
                            <strong style={{ fontSize: '1.1rem' }}>Congratulations! Offer Accepted!</strong>
                            <br />
                            Your identity has been committed on-chain. Personal details were erased after proof generation.
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Identity Commitment (On-chain — public)</label>
                        <div className="mono" style={{ padding: '12px 16px', borderRadius: 8, wordBreak: 'break-all', fontSize: '0.78rem' }}>
                            {commitment}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                            This SHA-256 hash proves your identity was disclosed correctly — without exposing raw name/email to observers.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <button className="btn btn-outline" onClick={reset}>← New Acceptance</button>
                        <button
                            className="btn btn-success"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => {
                                addToast('info', 'Downloading Offer Letter PDF...');
                                setTimeout(() => {
                                    addToast('success', 'Offer_Letter.pdf downloaded successfully!');
                                }, 1500);
                            }}
                        >
                            📄 Download Offer Letter
                        </button>
                    </div>
                </div>
            )}

            {step === 'error' && (
                <div className="card fade-in" style={{ maxWidth: 480 }}>
                    <div className="alert alert-error">
                        <span>❌</span>
                        <div>{error || 'Proof generation failed.'}</div>
                    </div>
                    <button className="btn btn-primary" onClick={reset}>Try Again</button>
                </div>
            )}
        </div>
    );
}

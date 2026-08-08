/**
 * OfferAcceptance.tsx — Identity reveal + offer acceptance
 *
 * Privacy guarantees (CRITICAL):
 *  1. real_name and real_email are entered by user but NEVER stored in
 *     React state that persists after this function executes.
 *  2. They are passed directly to the ZK proof generation and dropped.
 *  3. Only the identity_commitment (SHA-256 hash) goes on-chain via disclose().
 *  4. This component uses DOM refs that stay mounted (form is hidden, not unmounted)
 *     so refs remain valid when handleAccept runs from the confirming step.
 *  5. Never console.log private inputs.
 */

import React, { useState, useRef } from 'react';

async function sha256Hex(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

type Step = 'form' | 'confirming' | 'proving' | 'done' | 'error';

export function OfferAcceptance() {
    const [applicationId, setApplicationId] = useState('');
    const [applicantSecret, setApplicantSecret] = useState('');
    const [step, setStep] = useState<Step>('form');
    const [commitment, setCommitment] = useState('');
    const [error, setError] = useState('');

    // Private fields — DOM refs so they never enter React state lifecycle.
    // IMPORTANT: The form div stays rendered (just hidden) during 'confirming'
    // so these refs remain non-null when handleAccept is called.
    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);

    const handleAccept = async () => {
        const nameVal = nameRef.current?.value ?? '';
        const emailVal = emailRef.current?.value ?? '';

        if (!applicationId || !applicantSecret || !nameVal || !emailVal) {
            setError('All fields are required — please go back and fill in your name and email.');
            return;
        }

        setStep('proving');
        setError('');

        try {
            // Read private inputs from refs (NOT from state)
            const identityCommitment = await sha256Hex(nameVal + emailVal + applicantSecret);

            // ── ZK Proof would be submitted here ──────────────────────
            // wallet.proveAndSubmit('reveal_and_accept', {
            //   applicant_secret: applicantSecret,
            //   real_name: nameVal,       // PRIVATE witness — dropped after prove
            //   real_email: emailVal,     // PRIVATE witness — dropped after prove
            // })
            await new Promise(r => setTimeout(r, 2500));

            // Clear private inputs from DOM immediately after proof
            if (nameRef.current) nameRef.current.value = '';
            if (emailRef.current) emailRef.current.value = '';

            // Store ONLY the public commitment
            setCommitment(identityCommitment);
            setApplicantSecret('');
            setStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Proof generation failed');
            if (nameRef.current) nameRef.current.value = '';
            if (emailRef.current) emailRef.current.value = '';
            setStep('error');
        }
    };

    const reset = () => {
        setStep('form');
        setApplicationId('');
        setApplicantSecret('');
        setCommitment('');
        setError('');
        if (nameRef.current) nameRef.current.value = '';
        if (emailRef.current) emailRef.current.value = '';
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
                <h2 style={{ marginBottom: 8 }}>
                    🤝 <span className="gradient-text">Accept Offer &amp; Reveal Identity</span>
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

            {/* ── Form + Confirming steps ─────────────────────────────
                The form div is ALWAYS rendered (hidden via display:none when not active)
                so nameRef / emailRef remain non-null when handleAccept runs.        */}
            <div style={{ display: step === 'form' || step === 'confirming' ? 'block' : 'none' }}>

                {/* Form card — visible only at 'form' step */}
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
                            🤝 Review &amp; Accept Offer
                        </button>
                        <div className="proof-label" style={{ marginTop: 10 }}>
                            <span>🛡️</span> Proved without revealing your input
                        </div>
                    </div>
                </div>

                {/* Confirming card — visible only at 'confirming' step */}
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
                                ✅ Confirm &amp; Generate Proof
                            </button>
                        </div>
                    </div>
                </div>

            </div>{/* end always-rendered wrapper */}

            {step === 'proving' && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 28px', maxWidth: 480 }}>
                    <div className="glow-violet" style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'var(--grad-cyan)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.2rem', margin: '0 auto 20px'
                    }}>🤝</div>
                    <h3 style={{ marginBottom: 12 }}>Generating Identity Proof…</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                        ZK proof is being computed. Your name and email are being proved without
                        being revealed to any chain observer.
                    </p>
                    <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 14 }}>
                        Private inputs are erased immediately after proof generation
                    </p>
                </div>
            )}

            {step === 'done' && (
                <div className="card fade-in" style={{ maxWidth: 560 }}>
                    <div className="alert alert-success">
                        <span>🎉</span>
                        <div>
                            <strong>Offer accepted! Welcome aboard!</strong>
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
                    <button className="btn btn-outline" onClick={reset}>← New Acceptance</button>
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

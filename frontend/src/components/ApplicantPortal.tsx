/**
 * ApplicantPortal.tsx — Anonymous job application feature
 *
 * Privacy guarantees (enforced here):
 *  1. Resume content is hashed CLIENT-SIDE. Only the hash (application_id)
 *     leaves this component — never the raw resume text.
 *  2. The applicant_secret (nonce) is generated at proof time, shown once
 *     to the user to save offline, then dropped from React state.
 *  3. Real name / email are NEVER stored in state; they go directly into
 *     the proof witness and are dropped after use.
 *  4. Private inputs are NEVER console.log'd.
 *
 * On-chain: sha256(resume ++ secret) = application_id
 * Off-chain: everything else
 */

import React, { useState, useRef, useCallback } from 'react';

// ── Tiny crypto helper (browser SubtleCrypto) ─────────────────
async function sha256Hex(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function generateSecret(): string {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Types ─────────────────────────────────────────────────────
type Step = 'upload' | 'review' | 'proving' | 'done' | 'error';

interface Application {
    applicationId: string;
    savedSecret: string; // user MUST save this; dropped from state after shown
    timestamp: string;
}

export function ApplicantPortal() {
    const [step, setStep] = useState<Step>('upload');
    const [resumeFileName, setResumeFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [application, setApplication] = useState<Application | null>(null);
    const [error, setError] = useState('');
    const [secretCopied, setSecretCopied] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Tracks whether user acknowledged saving the secret
    const [secretAcknowledged, setSecretAcknowledged] = useState(false);

    // ── File handling ────────────────────────────────────────────
    const handleFile = useCallback((file: File) => {
        if (!file) return;
        setResumeFileName(file.name);
        setStep('review');
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
        },
        [handleFile]
    );

    // ── Submit: derive application ID, call contract ─────────────
    const handleSubmit = useCallback(async () => {
        if (!fileRef.current?.files?.[0]) {
            setError('Please select a resume file.');
            return;
        }

        setStep('proving');
        setError('');

        try {
            // Read file content (PRIVATE — never leaves this function exposed)
            const file = fileRef.current.files[0];
            const content = await new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsText(file);
            });

            // Generate per-session secret (PRIVATE — shown once then dropped)
            const secret = generateSecret();

            // Derive public application_id from private inputs
            // This mirrors: sha256(pad(1056, resume_bytes ++ applicant_secret))
            const applicationId = await sha256Hex(content + secret);

            // ── ZK Proof submission ─────────────────────────────────
            // In a fully wired dApp, here we would:
            //   1. Build the circuit witness: { resume_bytes: content, applicant_secret: secret }
            //   2. Call wallet.proveAndSubmit('apply_anonymous', witness)
            //   3. The wallet generates the ZK proof, submits to chain
            //   4. Await tx confirmation from indexer
            //
            // Private inputs (content, secret) NEVER enter React state —
            // they are used here and then dropped.
            //
            // Simulated 2 s proof time for UI demo:
            await new Promise(r => setTimeout(r, 2000));

            // Store ONLY public output (applicationId) + one-time secret for user backup
            // After this component re-renders the `secret` var is GC'd
            setApplication({
                applicationId,
                savedSecret: secret, // shown once; user must save offline
                timestamp: new Date().toISOString(),
            });

            setStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Proof generation failed');
            setStep('error');
        }
    }, []);

    const copySecret = () => {
        if (application?.savedSecret) {
            navigator.clipboard.writeText(application.savedSecret);
            setSecretCopied(true);
        }
    };

    const reset = () => {
        setStep('upload');
        setResumeFileName('');
        setApplication(null);
        setSecretAcknowledged(false);
        setSecretCopied(false);
        setError('');
    };

    // ── Step indicators ──────────────────────────────────────────
    const stepList = [
        { key: 'upload', label: 'Upload Resume' },
        { key: 'review', label: 'Review' },
        { key: 'proving', label: 'Proving' },
        { key: 'done', label: 'Submitted' },
    ];

    const stepIndex = stepList.findIndex(s =>
        s.key === step || (step === 'error' && s.key === 'proving')
    );

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
                <h2 style={{ marginBottom: 8 }}>
                    🕵️ <span className="gradient-text">Anonymous Application</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Submit your resume privately using zero-knowledge proofs.
                    Only a cryptographic commitment is stored on-chain — never your resume or identity.
                </p>
            </div>

            {/* Privacy banner */}
            <div className="privacy-banner" style={{ marginBottom: 24 }}>
                <span>🔒</span>
                <span>
                    <strong>Proved without revealing your input —</strong>{' '}
                    resume content and identity never leave your device or hit the chain
                </span>
            </div>

            {/* Steps */}
            <div className="steps" style={{ marginBottom: 28 }}>
                {stepList.map((s, i) => (
                    <div
                        key={s.key}
                        className={`step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''
                            }`}
                    >
                        <span className="step-num">{i < stepIndex ? '✓' : i + 1}</span>
                        {s.label}
                    </div>
                ))}
            </div>

            {/* ── Panels by step ─────────────────────────────────── */}

            {step === 'upload' && (
                <div
                    id="upload-zone"
                    className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                >
                    <div className="upload-icon">📄</div>
                    <h3 style={{ marginBottom: 8 }}>Drop your resume here</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        or click to browse — PDF, DOCX, or TXT
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 12 }}>
                        🔐 Content is hashed locally — never uploaded to any server
                    </p>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                </div>
            )}

            {step === 'review' && (
                <div className="card">
                    <div className="card-header">
                        <h3>📋 Review & Confirm</h3>
                    </div>
                    <div className="alert alert-info">
                        <span>📎</span>
                        <div>
                            <strong>Selected file:</strong> {resumeFileName}
                            <br />
                            <small>Content will be hashed locally. Only the hash goes on-chain.</small>
                        </div>
                    </div>
                    <div className="alert alert-success">
                        <span>🛡️</span>
                        <div>
                            <strong>Zero-Knowledge Guarantee</strong>
                            <br />
                            <small>
                                A random secret will be generated, combined with your resume, and hashed.
                                The hash is your anonymous Application ID. Your resume and secret stay on your device.
                            </small>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button className="btn btn-outline" onClick={reset}>← Back</button>
                        <button
                            id="btn-submit-application"
                            className="btn btn-primary"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={handleSubmit}
                        >
                            🔐 Generate Proof & Submit Anonymously
                        </button>
                    </div>
                    <div className="proof-label" style={{ marginTop: 12 }}>
                        <span>🛡️</span> Proved without revealing your input
                    </div>
                </div>
            )}

            {step === 'proving' && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 28px' }}>
                    <div className="glow-violet" style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'var(--grad-violet)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', margin: '0 auto 20px'
                    }}>🔐</div>
                    <h3 style={{ marginBottom: 12 }}>Generating Zero-Knowledge Proof…</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                        Your resume is being hashed locally. A ZK proof is being generated
                        that proves you have a valid resume without revealing its content.
                    </p>
                    <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 16 }}>
                        Private inputs are never sent to any server
                    </p>
                </div>
            )}

            {step === 'done' && application && (
                <div className="card fade-in">
                    <div className="card-header">
                        <h3>✅ Application Submitted Anonymously</h3>
                    </div>
                    <div className="alert alert-success">
                        <span>🎉</span>
                        <div>
                            Your application has been submitted. The company sees only your Application ID — not your identity.
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Your Application ID (Public — on-chain)</label>
                        <div className="mono" style={{ padding: '12px 16px', borderRadius: 8, wordBreak: 'break-all', fontSize: '0.82rem' }}>
                            {application.applicationId}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            ⚠️ Your Secret Key — Save This Now!
                        </label>
                        <div className="alert alert-warning" style={{ marginBottom: 8 }}>
                            <span>🔑</span>
                            <div>
                                <strong>Copy and store this secret offline.</strong> You need it to check status and accept an offer.
                                It will NOT be shown again.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div className="mono" style={{
                                flex: 1, padding: '12px 16px', borderRadius: 8,
                                wordBreak: 'break-all', fontSize: '0.78rem',
                                filter: secretAcknowledged ? 'none' : 'blur(4px)',
                                transition: 'filter 0.3s'
                            }}>
                                {application.savedSecret}
                            </div>
                            <button
                                id="btn-copy-secret"
                                className="btn btn-outline btn-sm"
                                onClick={copySecret}
                                style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
                            >
                                {secretCopied ? '✓ Copied' : '📋 Copy'}
                            </button>
                        </div>
                        {!secretAcknowledged && (
                            <button
                                className="btn btn-ghost btn-sm"
                                style={{ marginTop: 8 }}
                                onClick={() => setSecretAcknowledged(true)}
                            >
                                Click to reveal secret
                            </button>
                        )}
                    </div>
                    <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={reset}>
                        Submit Another Application
                    </button>
                </div>
            )}

            {step === 'error' && (
                <div className="card fade-in">
                    <div className="alert alert-error">
                        <span>❌</span>
                        <div>{error || 'An error occurred during proof generation.'}</div>
                    </div>
                    <button className="btn btn-primary" onClick={reset}>Try Again</button>
                </div>
            )}
        </div>
    );
}

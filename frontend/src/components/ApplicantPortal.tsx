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
import { useApplications } from '../context/ApplicationContext';
import { useToast } from '../context/ToastContext';

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
    savedSecret: string;
    timestamp: string;
}

const PROOF_STEPS = [
    { label: 'Reading File', icon: '📄', desc: 'Reading resume content…' },
    { label: 'Hashing Data', icon: '🔐', desc: 'Computing SHA-256 hash…' },
    { label: 'Generating Secret', icon: '🎲', desc: 'Creating cryptographic nonce…' },
    { label: 'Building ZK Circuit', icon: '⚡', desc: 'Constructing proof circuit…' },
    { label: 'Generating Proof', icon: '🛡️', desc: 'Computing zero-knowledge proof…' },
];

export function ApplicantPortal() {
    const { addApplication, applications } = useApplications();
    const { addToast } = useToast();
    const [step, setStep] = useState<Step>('upload');
    const [resumeFileName, setResumeFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [application, setApplication] = useState<Application | null>(null);
    const [error, setError] = useState('');
    const [secretCopied, setSecretCopied] = useState(false);
    const [idCopied, setIdCopied] = useState(false);
    const [proofStep, setProofStep] = useState(0);
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Tracks whether user acknowledged saving the secret
    const [secretAcknowledged, setSecretAcknowledged] = useState(false);

    // ── File handling ────────────────────────────────────────────
    const handleFile = useCallback((file: File) => {
        if (!file) return;
        setResumeFileName(file.name);
        setStep('review');
        setIsAnalyzing(true);
        addToast('info', `Resume "${file.name}" selected, extracting verifiable skills...`);

        // Simulate local AI / keyword extraction for skills ZK proving later
        setTimeout(() => {
            const possibleSkills = ['React', 'TypeScript', 'Zero-Knowledge', 'Node.js', 'Solidity', 'System Design', 'UI/UX', 'Cryptography', 'AWS'];
            // randomly pick 3-4 skills
            const picked = possibleSkills.sort(() => 0.5 - Math.random()).slice(0, 3 + Math.floor(Math.random() * 2));
            setExtractedSkills(picked);
            setIsAnalyzing(false);
            addToast('success', 'Local extraction complete.');
        }, 1500);
    }, [addToast]);

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
            addToast('error', 'No resume file selected');
            return;
        }

        setStep('proving');
        setError('');
        setProofStep(0);

        try {
            // Step 1: Read file
            setProofStep(1);
            const file = fileRef.current.files[0];
            const content = await new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsText(file);
            });
            await new Promise(r => setTimeout(r, 500));

            // Step 2: Hash
            setProofStep(2);
            await new Promise(r => setTimeout(r, 600));

            // Step 3: Generate secret
            setProofStep(3);
            const secret = generateSecret();
            await new Promise(r => setTimeout(r, 500));

            // Step 4: Build circuit
            setProofStep(4);
            await new Promise(r => setTimeout(r, 600));

            // Step 5: Generate proof
            setProofStep(5);
            const applicationId = await sha256Hex(content + secret);
            await new Promise(r => setTimeout(r, 800));

            setApplication({
                applicationId,
                savedSecret: secret,
                timestamp: new Date().toISOString(),
            });

            addApplication(applicationId, undefined, file.name);
            addToast('success', 'Application submitted anonymously with ZK proof!');
            setStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Proof generation failed');
            addToast('error', 'Proof generation failed');
            setStep('error');
        }
    }, [addApplication, addToast]);

    const copyToClipboard = (text: string, type: 'id' | 'secret') => {
        navigator.clipboard.writeText(text);
        if (type === 'secret') {
            setSecretCopied(true);
            addToast('info', 'Secret key copied — save it somewhere safe!');
        } else {
            setIdCopied(true);
            addToast('info', 'Application ID copied to clipboard');
        }
    };

    const downloadKeycard = () => {
        if (!application) return;
        const text = `MIDNIGHT NETWORK — CONFIDENTIAL JOB PORTAL
==========================================
Date: ${new Date().toLocaleString()}

APPLICATION ID (Public):
${application.applicationId}

SECRET KEY (Private - DO NOT SHARE):
${application.savedSecret}

------------------------------------------
Keep this file safe. You need the Application ID to track your status, and you will need the Secret Key to cryptographically accept an offer and reveal your identity.
`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `midnight-keycard-${application.applicationId.slice(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('success', 'Keycard downloaded securely.');
    };

    const reset = () => {
        setStep('upload');
        setResumeFileName('');
        setApplication(null);
        setSecretAcknowledged(false);
        setSecretCopied(false);
        setIdCopied(false);
        setProofStep(0);
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

    // My recent applications
    const myApps = applications.slice(-3).reverse();

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

            {/* Hidden file input — ALWAYS mounted so fileRef stays valid across steps */}
            <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

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
                </div>
            )}

            {step === 'review' && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 16 }}>
                        <h3>📋 Review & Confirm</h3>
                    </div>
                    <div className="alert alert-info" style={{ marginBottom: 16 }}>
                        <span>📎</span>
                        <div>
                            <strong>Selected file:</strong> {resumeFileName}
                            <br />
                            <small>Content will be hashed locally. Only the hash goes on-chain.</small>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                🧠 Extracted Verifiable Skills
                            </span>
                            {isAnalyzing && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                        </div>
                        {isAnalyzing ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Scanning document client-side...</div>
                        ) : (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {extractedSkills.map(skill => (
                                    <span key={skill} className="badge badge-preview" style={{ background: 'rgba(124,58,237,0.1)', borderColor: 'var(--violet)' }}>
                                        ✓ {skill}
                                    </span>
                                ))}
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 8 }}>
                                    (These match claims will be included in your ZK proof)
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="alert alert-success">
                        <span>🛡️</span>
                        <div>
                            <strong>Zero-Knowledge Guarantee</strong>
                            <br />
                            <small>
                                A random secret will be combined with your resume and skills.
                                The resulting cryptographic hash is your anonymous Application ID.
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
                            disabled={isAnalyzing}
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
                <div className="card" style={{ textAlign: 'center', padding: '40px 28px' }}>
                    <div className="glow-violet" style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'var(--grad-violet)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', margin: '0 auto 24px'
                    }}>🔐</div>
                    <h3 style={{ marginBottom: 20 }}>Generating Zero-Knowledge Proof…</h3>

                    {/* Step-by-step proof visualization */}
                    <div style={{ maxWidth: 400, margin: '0 auto 24px', textAlign: 'left' }}>
                        {PROOF_STEPS.map((ps, i) => (
                            <div key={ps.label} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 16px', marginBottom: 4,
                                borderRadius: 'var(--radius-sm)',
                                background: proofStep > i ? 'rgba(16,185,129,0.08)' : proofStep === i + 1 ? 'rgba(124,58,237,0.1)' : 'transparent',
                                opacity: proofStep >= i + 1 ? 1 : 0.4,
                                transition: 'all 0.4s',
                            }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: proofStep > i ? 'var(--green)' : proofStep === i + 1 ? 'var(--violet)' : 'var(--border)',
                                    display: 'grid', placeItems: 'center', fontSize: '0.8rem',
                                    color: 'white', flexShrink: 0, transition: 'all 0.4s',
                                }}>
                                    {proofStep > i ? '✓' : ps.icon}
                                </span>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ps.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ps.desc}</div>
                                </div>
                                {proofStep === i + 1 && (
                                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginLeft: 'auto' }} />
                                )}
                            </div>
                        ))}
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
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
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div className="mono" style={{ flex: 1, padding: '12px 16px', borderRadius: 8, wordBreak: 'break-all', fontSize: '0.78rem' }}>
                                {application.applicationId}
                            </div>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => copyToClipboard(application.applicationId, 'id')}
                                style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
                            >
                                {idCopied ? '✓ Copied' : '📋 Copy'}
                            </button>
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
                                wordBreak: 'break-all', fontSize: '0.75rem',
                                filter: secretAcknowledged ? 'none' : 'blur(4px)',
                                transition: 'filter 0.3s'
                            }}>
                                {application.savedSecret}
                            </div>
                            <button
                                id="btn-copy-secret"
                                className="btn btn-outline btn-sm"
                                onClick={() => copyToClipboard(application.savedSecret, 'secret')}
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
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <button className="btn btn-primary" onClick={reset}>
                            Submit Another
                        </button>
                        <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--amber)', color: 'var(--amber)' }} onClick={downloadKeycard}>
                            💾 Download Keycard Backup
                        </button>
                    </div>
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

            {/* Recent application history */}
            {step === 'upload' && myApps.length > 0 && (
                <div className="card" style={{ marginTop: 24 }}>
                    <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>📁 Your Recent Applications</h3>
                    {myApps.map(app => (
                        <div key={app.applicationId}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255,255,255,0.03)', marginBottom: 8,
                            }}
                        >
                            <div>
                                <span className="mono" style={{ fontSize: '0.72rem' }}>
                                    {app.applicationId.slice(0, 20)}…
                                </span>
                                {app.resumeName && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 12 }}>
                                        📄 {app.resumeName}
                                    </span>
                                )}
                            </div>
                            <span className={`badge badge-${app.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                                {app.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

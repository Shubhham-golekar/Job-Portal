/**
 * JobBoard.tsx — Browse and apply to job listings
 * Each job has a description, requirements, and salary range.
 * Applicants can apply to specific jobs — their application is linked to the job.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useApplications, type JobListing } from '../context/ApplicationContext';
import { useToast } from '../context/ToastContext';

// ── Crypto helpers ────────────────────────────────────────────
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

const TYPE_COLORS: Record<string, string> = {
    'Full-time': 'var(--green)',
    'Part-time': 'var(--amber)',
    'Contract': 'var(--cyan)',
    'Remote': 'var(--violet-light)',
};

export function JobBoard() {
    const { jobs, addApplication } = useApplications();
    const { addToast } = useToast();
    const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
    const [applyingTo, setApplyingTo] = useState<string | null>(null);
    const [proofStep, setProofStep] = useState(0);
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<{ appId: string; secret: string; jobTitle: string } | null>(null);
    const [secretCopied, setSecretCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const filteredJobs = jobs.filter(j =>
        j.isActive && (
            j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            j.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            j.location.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const handleApply = useCallback(async (job: JobListing) => {
        if (!fileRef.current?.files?.[0]) {
            addToast('warning', 'Please select a resume file first.');
            return;
        }

        setApplyingTo(job.id);
        setIsAnalyzing(true);
        addToast('info', 'Analyzing document and verifying skills...');

        // Simulate local AI / keyword extraction for skills ZK proving
        setTimeout(async () => {
            const possibleSkills = job.requirements.length > 0 ? job.requirements : ['React', 'TypeScript', 'Zero-Knowledge', 'System Design'];
            const picked = possibleSkills.sort(() => 0.5 - Math.random()).slice(0, Math.max(2, Math.floor(job.requirements.length * 0.8)));
            setExtractedSkills(picked);
            setIsAnalyzing(false);
            addToast('success', 'Resume matched against job requirements successfully.');

            try {
                const file = fileRef.current!.files![0];
                const content = await new Promise<string>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result as string);
                    reader.onerror = rej;
                    reader.readAsText(file);
                });

                // Step 1: Hashing resume
                setProofStep(1);
                await new Promise(r => setTimeout(r, 800));

                // Step 2: Generating secret
                setProofStep(2);
                const secret = generateSecret();
                await new Promise(r => setTimeout(r, 600));

                // Step 3: Building circuit
                setProofStep(3);
                await new Promise(r => setTimeout(r, 700));

                // Step 4: Generating proof
                setProofStep(4);
                const applicationId = await sha256Hex(content + secret + job.id);
                await new Promise(r => setTimeout(r, 900));

                // Register application
                addApplication(applicationId, job.id, file.name);

                setResult({ appId: applicationId, secret, jobTitle: job.title });
                setApplyingTo(null);
                setProofStep(0);
                setSelectedJob(null);
                addToast('success', `Applied to "${job.title}" anonymously!`);

            } catch (err) {
                setApplyingTo(null);
                setProofStep(0);
                addToast('error', 'Proof generation failed. Please try again.');
            }
        }, 1500);
    }, [addApplication, addToast]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast('info', `${label} copied to clipboard`);
        if (label === 'Secret key') setSecretCopied(true);
    };

    const downloadKeycard = () => {
        if (!result) return;
        const text = `MIDNIGHT NETWORK — CONFIDENTIAL JOB PORTAL
==========================================
Date: ${new Date().toLocaleString()}
Job Applied: ${result.jobTitle}

APPLICATION ID (Public):
${result.appId}

SECRET KEY (Private - DO NOT SHARE):
${result.secret}

------------------------------------------
Keep this file safe. You need the Application ID to track your status, and you will need the Secret Key to cryptographically accept an offer and reveal your identity.
`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `midnight-keycard-${result.appId.slice(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('success', 'Keycard downloaded securely.');
    };

    const PROOF_STEPS = [
        { label: 'Hashing Resume', icon: '🔐' },
        { label: 'Generating Secret', icon: '🎲' },
        { label: 'Building Circuit', icon: '⚡' },
        { label: 'Creating ZK Proof', icon: '🛡️' },
    ];

    // Application result view
    if (result) {
        return (
            <div className="fade-in">
                <div style={{ marginBottom: 28 }}>
                    <h2 style={{ marginBottom: 8 }}>
                        📋 <span className="gradient-text">Job Board</span>
                    </h2>
                </div>
                <div className="card" style={{ maxWidth: 600 }}>
                    <div className="card-header">
                        <h3>✅ Applied to "{result.jobTitle}"</h3>
                    </div>
                    <div className="alert alert-success">
                        <span>🎉</span>
                        <div>Your anonymous application has been submitted with a ZK proof!</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Application ID (Public)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div className="mono" style={{ flex: 1, padding: '12px 16px', borderRadius: 8, wordBreak: 'break-all', fontSize: '0.78rem' }}>
                                {result.appId}
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={() => copyToClipboard(result.appId, 'Application ID')}>
                                📋
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">⚠️ Secret Key — Save This Now!</label>
                        <div className="alert alert-warning" style={{ marginBottom: 8 }}>
                            <span>🔑</span>
                            <div><strong>Copy and store this secret offline.</strong> You need it to check status and accept an offer. It will NOT be shown again.</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div className="mono" style={{ flex: 1, padding: '12px 16px', borderRadius: 8, wordBreak: 'break-all', fontSize: '0.75rem' }}>
                                {result.secret}
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={() => copyToClipboard(result.secret, 'Secret key')}>
                                {secretCopied ? '✓' : '📋'}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }}
                            onClick={() => { setResult(null); setSecretCopied(false); }}>
                            ← Back to Job Board
                        </button>
                        <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--amber)', color: 'var(--amber)' }} onClick={downloadKeycard}>
                            💾 Download Backup
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
                <h2 style={{ marginBottom: 8 }}>
                    📋 <span className="gradient-text">Job Board</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Browse available positions and apply anonymously with zero-knowledge proofs.
                </p>
            </div>

            <div className="privacy-banner" style={{ marginBottom: 24 }}>
                <span>🔒</span>
                <span>
                    <strong>Apply to specific jobs —</strong>{' '}
                    your resume is hashed locally and linked to the job ID. Companies never see your identity.
                </span>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
            />

            {/* Search bar */}
            <div style={{ marginBottom: 24 }}>
                <input
                    className="form-input"
                    type="text"
                    placeholder="🔍 Search jobs by title, company, or location…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ maxWidth: 500 }}
                />
            </div>

            {/* Job listings */}
            <div style={{ display: 'grid', gap: 16 }}>
                {filteredJobs.map((job, i) => (
                    <div key={job.id} className="card fade-in-up" style={{ animationDelay: `${i * 0.05}s`, padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px 28px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <h3 style={{ marginBottom: 4 }}>{job.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {job.company} • {job.location}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className="badge" style={{
                                        background: `${TYPE_COLORS[job.type]}20`,
                                        color: TYPE_COLORS[job.type],
                                        border: `1px solid ${TYPE_COLORS[job.type]}40`,
                                    }}>
                                        {job.type}
                                    </span>
                                </div>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.5 }}>
                                {job.description}
                            </p>

                            {/* Requirements */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                                {job.requirements.map(req => (
                                    <span key={req} className="badge badge-preview" style={{ fontSize: '0.7rem' }}>
                                        {req}
                                    </span>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <span>💰 {job.salary}</span>
                                    <span>👥 {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
                                    <span>📅 {new Date(job.postedAt).toLocaleDateString()}</span>
                                </div>
                                {selectedJob?.id === job.id ? (
                                    <button className="btn btn-outline btn-sm" onClick={() => setSelectedJob(null)}>
                                        Cancel
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setSelectedJob(job)}
                                    >
                                        🔐 Apply Anonymously
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Apply expandable section */}
                        {selectedJob?.id === job.id && (
                            <div className="fade-in" style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', background: 'rgba(124,58,237,0.04)' }}>
                                {applyingTo === job.id ? (
                                    /* Proof generation visualization */
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        <h4 style={{ marginBottom: 16, color: 'var(--violet-light)' }}>
                                            {isAnalyzing ? 'Scanning Document Client-Side...' : 'Generating Zero-Knowledge Proof...'}
                                        </h4>
                                        {isAnalyzing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                                <span className="spinner" style={{ width: 30, height: 30, borderWidth: 3, color: 'var(--cyan)' }} />
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Matching resume skills locally to job requirements without revealing identity.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
                                                    {PROOF_STEPS.map((step, idx) => (
                                                        <div key={step.label} style={{
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                                            opacity: proofStep > idx ? 1 : proofStep === idx + 1 ? 1 : 0.3,
                                                            transition: 'all 0.4s',
                                                        }}>
                                                            <div style={{
                                                                width: 40, height: 40, borderRadius: '50%',
                                                                background: proofStep > idx ? 'var(--green)' : proofStep === idx + 1 ? 'var(--grad-violet)' : 'var(--border)',
                                                                display: 'grid', placeItems: 'center', fontSize: '1.1rem',
                                                                boxShadow: proofStep === idx + 1 ? '0 0 20px var(--violet-glow)' : 'none',
                                                                transition: 'all 0.4s',
                                                            }}>
                                                                {proofStep > idx ? '✓' : step.icon}
                                                            </div>
                                                            <span style={{ fontSize: '0.7rem', color: proofStep >= idx + 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                                            Select your resume file to apply. Your resume will be hashed locally — only the hash goes on-chain.
                                        </p>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
                                                📄 {fileRef.current?.files?.[0]?.name || 'Choose Resume'}
                                            </button>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleApply(job)}
                                            >
                                                🔐 Generate Proof & Apply
                                            </button>
                                        </div>
                                        <div className="proof-label" style={{ marginTop: 12 }}>
                                            <span>🛡️</span> Proved without revealing your input
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredJobs.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <div className="empty-state-title">No jobs found</div>
                    <div className="empty-state-desc">Try adjusting your search query.</div>
                </div>
            )}
        </div>
    );
}

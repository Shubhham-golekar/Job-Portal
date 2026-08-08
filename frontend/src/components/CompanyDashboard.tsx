/**
 * CompanyDashboard.tsx — HR/company view
 * Manage applicants and post new jobs.
 *
 * Privacy guarantees:
 *  • Company sees ONLY application IDs and statuses (public ledger data)
 *  • Applicant identity is NOT visible here — only after reveal_and_accept
 *  • Job postings are public.
 */

import React, { useState, useRef } from 'react';
import { useApplications, type AppStatus, type JobListing } from '../context/ApplicationContext';
import { useToast } from '../context/ToastContext';

const STATUS_BADGES: Record<AppStatus, string> = {
    APPLIED: 'badge-applied',
    SHORTLISTED: 'badge-shortlisted',
    OFFERED: 'badge-offered',
    ACCEPTED: 'badge-accepted',
    REJECTED: 'badge-rejected',
};

export function CompanyDashboard() {
    const { applications, updateStatus, jobs, addJob } = useApplications();
    const { addToast } = useToast();
    const [view, setView] = useState<'applicants' | 'post-job'>('applicants');
    const [filterStatus, setFilterStatus] = useState<AppStatus | 'ALL'>('ALL');

    // Action states
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionDone, setActionDone] = useState<string | null>(null);

    // Job Form refs
    const jobTitleRef = useRef<HTMLInputElement>(null);
    const companyRef = useRef<HTMLInputElement>(null);
    const locationRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLSelectElement>(null);
    const salaryRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const reqsRef = useRef<HTMLInputElement>(null);

    const reversedApps = [...applications].reverse();

    // ── Applicant Actions ─────────────────────────────────────
    const handleShortlist = async (appId: string) => {
        setActionLoading(appId);
        await new Promise(r => setTimeout(r, 1800));
        updateStatus(appId, 'SHORTLISTED');
        setActionLoading(null);
        setActionDone(appId);
        addToast('success', 'Candidate shortlisted successfully');
        setTimeout(() => setActionDone(null), 3000);
    };

    const handleOffer = async (appId: string) => {
        setActionLoading(appId);
        await new Promise(r => setTimeout(r, 1800));
        updateStatus(appId, 'OFFERED');
        setActionLoading(null);
        setActionDone(appId);
        addToast('success', 'Offer extended to candidate');
        setTimeout(() => setActionDone(null), 3000);
    };

    const handleReject = async (appId: string) => {
        setActionLoading(appId);
        await new Promise(r => setTimeout(r, 1200));
        updateStatus(appId, 'REJECTED');
        setActionLoading(null);
        setActionDone(appId);
        addToast('warning', 'Application rejected');
        setTimeout(() => setActionDone(null), 3000);
    };

    // ── Job Posting Action ────────────────────────────────────
    const handlePostJob = (e: React.FormEvent) => {
        e.preventDefault();
        const title = jobTitleRef.current?.value.trim();
        const company = companyRef.current?.value.trim();
        const location = locationRef.current?.value.trim();
        const type = typeRef.current?.value as JobListing['type'];
        const salary = salaryRef.current?.value.trim();
        const description = descRef.current?.value.trim();
        const reqsStr = reqsRef.current?.value.trim();

        if (!title || !company || !location || !salary || !description || !reqsStr) {
            addToast('error', 'Please fill out all fields to post a job.');
            return;
        }

        const requirements = reqsStr.split(',').map(s => s.trim()).filter(Boolean);

        addJob({ title, company, location, type, salary, description, requirements });
        addToast('success', 'Job posted successfully to the public board!');

        // Reset form
        if (jobTitleRef.current) jobTitleRef.current.value = '';
        if (locationRef.current) locationRef.current.value = '';
        if (salaryRef.current) salaryRef.current.value = '';
        if (descRef.current) descRef.current.value = '';
        if (reqsRef.current) reqsRef.current.value = '';

        setView('applicants');
    };

    // Analytics calculations
    const totalApps = applications.length;
    const stats = {
        APPLIED: applications.filter(a => a.status === 'APPLIED').length,
        SHORTLISTED: applications.filter(a => a.status === 'SHORTLISTED').length,
        OFFERED: applications.filter(a => a.status === 'OFFERED').length,
        ACCEPTED: applications.filter(a => a.status === 'ACCEPTED').length,
        REJECTED: applications.filter(a => a.status === 'REJECTED').length,
    };

    const getWidth = (count: number) => totalApps === 0 ? '0%' : `${(count / totalApps) * 100}%`;

    const filteredApps = reversedApps.filter(app => filterStatus === 'ALL' || app.status === filterStatus);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ marginBottom: 8 }}>
                        🏢 <span className="gradient-text">Company Dashboard</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Manage anonymous applicants and post new job opportunities.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`btn ${view === 'applicants' ? 'btn-outline' : 'btn-ghost'}`} onClick={() => setView('applicants')} style={{ borderColor: view === 'applicants' ? 'var(--cyan)' : 'transparent' }}>
                        👥 Review Applicants
                    </button>
                    <button className={`btn ${view === 'post-job' ? 'btn-outline' : 'btn-ghost'}`} onClick={() => setView('post-job')} style={{ borderColor: view === 'post-job' ? 'var(--green)' : 'transparent' }}>
                        ✍️ Post New Job
                    </button>
                </div>
            </div>

            {view === 'applicants' && (
                <>
                    <div className="privacy-banner" style={{ marginBottom: 24 }}>
                        <span>🔒</span>
                        <span>
                            <strong>Zero-Knowledge View —</strong>{' '}
                            You only see the Application IDs. Identities remain completely hidden until an offer is accepted.
                        </span>
                    </div>

                    {/* Analytics Funnel */}
                    {totalApps > 0 && (
                        <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
                            <h3 style={{ marginBottom: 16, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                📊 Hiring Funnel Analytics
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { label: 'Total Applied', count: totalApps, color: 'var(--cyan)' },
                                    { label: 'Shortlisted', count: stats.SHORTLISTED + stats.OFFERED + stats.ACCEPTED, color: 'var(--amber)' },
                                    { label: 'Offered', count: stats.OFFERED + stats.ACCEPTED, color: 'var(--green)' },
                                    { label: 'Hired (Accepted)', count: stats.ACCEPTED, color: 'var(--violet)' }
                                ].map(stat => (
                                    <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 120, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
                                        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{
                                                width: getWidth(stat.count),
                                                height: '100%',
                                                background: stat.color,
                                                transition: 'width 0.8s var(--ease-bounce)',
                                                boxShadow: `0 0 10px ${stat.color}`
                                            }} />
                                        </div>
                                        <div style={{ width: 40, textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>{stat.count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <h3 style={{ margin: 0 }}>Incoming Applications</h3>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filter:</label>
                                <select
                                    className="form-input"
                                    style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: 0, width: 'auto' }}
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="APPLIED">Applied Only</option>
                                    <option value="SHORTLISTED">Shortlisted Only</option>
                                    <option value="OFFERED">Offered Only</option>
                                </select>
                            </div>
                        </div>

                        {filteredApps.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                <div className="empty-state-title">No applications yet</div>
                                <div className="empty-state-desc">When applicants submit their resume, their anonymous Application ID will appear here.</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="app-table">
                                    <thead>
                                        <tr>
                                            <th>Application ID (Public)</th>
                                            <th>Applied For</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredApps.map((app, i) => {
                                            const job = jobs.find(j => j.id === app.jobId);
                                            return (
                                                <tr key={app.applicationId} className="fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                                    <td>
                                                        <div className="mono" style={{ fontSize: '0.75rem', width: 'fit-content' }}>
                                                            {app.applicationId.slice(0, 16)}…{app.applicationId.slice(-8)}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                            {new Date(app.timestamp).toLocaleString()}
                                                            {app.resumeName && ` • 📄 ${app.resumeName}`}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                            {job ? job.title : 'General Application'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${STATUS_BADGES[app.status]}`}>
                                                            {app.status}
                                                        </span>
                                                        {actionDone === app.applicationId && (
                                                            <span className="fade-in" style={{ fontSize: '0.8rem', marginLeft: 8 }}>✓</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {actionLoading === app.applicationId ? (
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, color: 'var(--cyan)' }}>
                                                                <span className="spinner"></span>
                                                                <span style={{ fontSize: '0.8rem' }}>Updating Ledger…</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                {app.status === 'APPLIED' && (
                                                                    <>
                                                                        <button className="btn btn-outline btn-sm" onClick={() => handleShortlist(app.applicationId)}>
                                                                            ⭐ Shortlist
                                                                        </button>
                                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleReject(app.applicationId)} style={{ color: 'var(--red)' }}>
                                                                            Reject
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {app.status === 'SHORTLISTED' && (
                                                                    <>
                                                                        <button className="btn btn-primary btn-sm" onClick={() => handleOffer(app.applicationId)}>
                                                                            🤝 Extend Offer
                                                                        </button>
                                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleReject(app.applicationId)}>
                                                                            Reject
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {['OFFERED', 'ACCEPTED', 'REJECTED'].includes(app.status) && (
                                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                        No actions available
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'rgba(124,58,237,0.04)' }}>
                            <span className="proof-label">
                                <span>🔗</span> Status updates are written to the public ledger
                            </span>
                        </div>
                    </div>
                </>
            )}

            {view === 'post-job' && (
                <div className="card fade-in scale-in" style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div className="card-header">
                        <h3>✍️ Create a New Job Posting</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                            Posted jobs will immediately appear on the public Job Board. Applicants can apply directly to your roles.
                        </p>
                    </div>

                    <form onSubmit={handlePostJob}>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Job Title</label>
                                <input ref={jobTitleRef} className="form-input" placeholder="e.g. Lead Frontend Engineer" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Company Name</label>
                                <input ref={companyRef} className="form-input" defaultValue="Midnight Labs" required />
                            </div>
                        </div>

                        <div className="grid-3">
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input ref={locationRef} className="form-input" placeholder="e.g. Remote, NY" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Employment Type</label>
                                <select ref={typeRef} className="form-input" required>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Remote">Remote (Any)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Salary Range</label>
                                <input ref={salaryRef} className="form-input" placeholder="e.g. $120k - $150k" required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Job Description</label>
                            <textarea ref={descRef} className="form-textarea" placeholder="Describe the role and responsibilities..." required></textarea>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Requirements (comma separated)</label>
                            <input ref={reqsRef} className="form-input" placeholder="e.g. React, TypeScript, 5+ Years Experience" required />
                        </div>

                        <div className="alert alert-info" style={{ marginTop: 24, marginBottom: 24 }}>
                            <span>🌐</span>
                            <div>
                                <strong>Public Listing</strong>
                                <br />
                                This job will be posted publicly on the board. All applications to this job will remain zero-knowledge and anonymous until offers are accepted.
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                            🚀 Post Job to Board
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

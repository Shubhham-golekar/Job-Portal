/**
 * ApplicationContext.tsx — Shared application state across all tabs
 *
 * Stores:
 *  - Applications with statuses
 *  - Job listings posted by companies
 *  - Activity log (blockchain-style event history)
 *
 * State persists in sessionStorage — clears on browser close ("logout").
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type AppStatus = 'APPLIED' | 'SHORTLISTED' | 'OFFERED' | 'ACCEPTED' | 'REJECTED';

export interface ApplicationRecord {
    applicationId: string;
    status: AppStatus;
    timestamp: string;
    jobId?: string;      // which job they applied to
    resumeName?: string; // file name (not content)
}

export interface JobListing {
    id: string;
    title: string;
    company: string;
    location: string;
    type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
    description: string;
    requirements: string[];
    salary: string;
    postedAt: string;
    applicantCount: number;
    isActive: boolean;
}

export interface ActivityEvent {
    id: number;
    type: 'apply' | 'shortlist' | 'offer' | 'accept' | 'reject' | 'job_post' | 'status_check';
    message: string;
    detail?: string;
    timestamp: string;
    icon: string;
}

interface ApplicationContextType {
    applications: ApplicationRecord[];
    addApplication: (applicationId: string, jobId?: string, resumeName?: string) => void;
    updateStatus: (applicationId: string, status: AppStatus) => void;
    getStatus: (applicationId: string) => AppStatus | null;
    jobs: JobListing[];
    addJob: (job: Omit<JobListing, 'id' | 'postedAt' | 'applicantCount' | 'isActive'>) => void;
    activities: ActivityEvent[];
    addActivity: (type: ActivityEvent['type'], message: string, detail?: string, icon?: string) => void;
    clearAllData: () => void;
}

const ApplicationContext = createContext<ApplicationContextType | null>(null);

const STORAGE_KEY = 'midnight_applications';
const JOBS_KEY = 'midnight_jobs';
const ACTIVITY_KEY = 'midnight_activity';

function loadFromStorage<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveToStorage(key: string, data: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch { /* ignore */ }
}

// ── Default job listings ─────────────────────────────────────
const DEFAULT_JOBS: JobListing[] = [
    {
        id: 'job-001',
        title: 'Senior Blockchain Engineer',
        company: 'Midnight Labs',
        location: 'Remote',
        type: 'Full-time',
        description: 'Design and implement zero-knowledge circuits for our privacy-first platform. Work with Compact language and the Midnight runtime.',
        requirements: ['3+ years Rust/TypeScript', 'ZK proof systems experience', 'Blockchain architecture'],
        salary: '$120k – $180k',
        postedAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
        applicantCount: 0,
        isActive: true,
    },
    {
        id: 'job-002',
        title: 'Full-Stack dApp Developer',
        company: 'Privacy Protocol Inc.',
        location: 'San Francisco, CA',
        type: 'Full-time',
        description: 'Build production-ready decentralized applications with React frontends and smart contract backends.',
        requirements: ['React/TypeScript', 'Solidity or Compact', 'Web3 wallet integration'],
        salary: '$100k – $150k',
        postedAt: new Date(Date.now() - 86400_000 * 5).toISOString(),
        applicantCount: 0,
        isActive: true,
    },
    {
        id: 'job-003',
        title: 'ZK Cryptography Researcher',
        company: 'Midnight Foundation',
        location: 'Remote',
        type: 'Contract',
        description: 'Research and optimize zero-knowledge proof systems. Publish papers and contribute to open-source ZK libraries.',
        requirements: ['PhD in Cryptography/CS', 'Published research', 'SNARK/STARK expertise'],
        salary: '$140k – $200k',
        postedAt: new Date(Date.now() - 86400_000 * 1).toISOString(),
        applicantCount: 0,
        isActive: true,
    },
    {
        id: 'job-004',
        title: 'DevOps & Infra Engineer',
        company: 'Midnight Labs',
        location: 'Berlin, Germany',
        type: 'Remote',
        description: 'Scale and maintain blockchain node infrastructure, CI/CD pipelines, and monitoring for the Midnight network.',
        requirements: ['Kubernetes/Docker', 'Terraform/Ansible', 'Blockchain node ops'],
        salary: '$90k – $130k',
        postedAt: new Date(Date.now() - 86400_000 * 3).toISOString(),
        applicantCount: 0,
        isActive: true,
    },
];

let activityIdCounter = 0;

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
    const [applications, setApplications] = useState<ApplicationRecord[]>(() => loadFromStorage(STORAGE_KEY, []));
    const [jobs, setJobs] = useState<JobListing[]>(() => loadFromStorage(JOBS_KEY, DEFAULT_JOBS));
    const [activities, setActivities] = useState<ActivityEvent[]>(() => loadFromStorage(ACTIVITY_KEY, []));

    // Sync to localStorage
    useEffect(() => { saveToStorage(STORAGE_KEY, applications); }, [applications]);
    useEffect(() => { saveToStorage(JOBS_KEY, jobs); }, [jobs]);
    useEffect(() => { saveToStorage(ACTIVITY_KEY, activities); }, [activities]);

    const clearAllData = useCallback(() => {
        setApplications([]);
        setJobs(DEFAULT_JOBS);
        setActivities([]);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(JOBS_KEY);
        localStorage.removeItem(ACTIVITY_KEY);
    }, []);

    const addActivity = useCallback((type: ActivityEvent['type'], message: string, detail?: string, icon?: string) => {
        const iconMap: Record<string, string> = {
            apply: '📨', shortlist: '⭐', offer: '🤝', accept: '🎉', reject: '❌', job_post: '📋', status_check: '🔍'
        };
        setActivities(prev => [...prev.slice(-50), {
            id: ++activityIdCounter,
            type,
            message,
            detail,
            timestamp: new Date().toISOString(),
            icon: icon || iconMap[type] || '📌',
        }]);
    }, []);

    const addApplication = useCallback((applicationId: string, jobId?: string, resumeName?: string) => {
        setApplications(prev => {
            if (prev.some(a => a.applicationId === applicationId)) return prev;
            return [...prev, {
                applicationId,
                status: 'APPLIED' as AppStatus,
                timestamp: new Date().toISOString(),
                jobId,
                resumeName,
            }];
        });
        // Increment applicant count on job
        if (jobId) {
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j));
        }
        addActivity('apply', 'New anonymous application submitted', `App ID: ${applicationId.slice(0, 16)}…`);
    }, [addActivity]);

    const updateStatus = useCallback((applicationId: string, status: AppStatus) => {
        setApplications(prev =>
            prev.map(a => a.applicationId === applicationId ? { ...a, status } : a)
        );
        const actionLabels: Record<AppStatus, string> = {
            APPLIED: 'Application received',
            SHORTLISTED: 'Candidate shortlisted',
            OFFERED: 'Offer extended to candidate',
            ACCEPTED: 'Offer accepted — identity revealed',
            REJECTED: 'Application rejected',
        };
        const typeMap: Record<AppStatus, ActivityEvent['type']> = {
            APPLIED: 'apply',
            SHORTLISTED: 'shortlist',
            OFFERED: 'offer',
            ACCEPTED: 'accept',
            REJECTED: 'reject',
        };
        addActivity(typeMap[status], actionLabels[status], `App ID: ${applicationId.slice(0, 16)}…`);
    }, [addActivity]);

    const getStatus = useCallback((applicationId: string): AppStatus | null => {
        const found = applications.find(a => a.applicationId === applicationId);
        return found ? found.status : null;
    }, [applications]);

    const addJob = useCallback((job: Omit<JobListing, 'id' | 'postedAt' | 'applicantCount' | 'isActive'>) => {
        const newJob: JobListing = {
            ...job,
            id: `job-${Date.now()}`,
            postedAt: new Date().toISOString(),
            applicantCount: 0,
            isActive: true,
        };
        setJobs(prev => [newJob, ...prev]);
        addActivity('job_post', `New job posted: ${job.title}`, `${job.company} — ${job.location}`);
    }, [addActivity]);

    return (
        <ApplicationContext.Provider value={{
            applications, addApplication, updateStatus, getStatus,
            jobs, addJob,
            activities, addActivity,
            clearAllData,
        }}>
            {children}
        </ApplicationContext.Provider>
    );
}

export function useApplications() {
    const ctx = useContext(ApplicationContext);
    if (!ctx) throw new Error('useApplications must be used within ApplicationProvider');
    return ctx;
}

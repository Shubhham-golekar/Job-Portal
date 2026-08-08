/**
 * ToastContext.tsx — Global toast notification system
 * Shows success/error/info pop-ups for every user action.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number;
    type: ToastType;
    message: string;
    exiting?: boolean;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, message: string) => void;
    removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    const addToast = useCallback((type: ToastType, message: string) => {
        const id = ++toastIdCounter;
        setToasts(prev => [...prev.slice(-4), { id, type, message }]);
        setTimeout(() => removeToast(id), 4000);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            {/* Toast container */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : ''}`}>
                        <span className="toast-icon">
                            {t.type === 'success' && '✅'}
                            {t.type === 'error' && '❌'}
                            {t.type === 'info' && '💡'}
                            {t.type === 'warning' && '⚠️'}
                        </span>
                        <span style={{ flex: 1 }}>{t.message}</span>
                        <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

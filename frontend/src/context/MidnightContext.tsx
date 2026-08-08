/**
 * MidnightContext.tsx — Single shared wallet state for the entire app.
 *
 * Without this, each useMidnight() call creates independent state,
 * so WalletConnect connecting doesn't affect App.tsx's isConnected.
 */

import React, { createContext, useContext } from 'react';
import { useMidnight } from '../hooks/useMidnight';

type MidnightContextType = ReturnType<typeof useMidnight>;

const MidnightContext = createContext<MidnightContextType | null>(null);

export function MidnightProvider({ children }: { children: React.ReactNode }) {
    // Called ONCE — shared across the entire tree
    const midnight = useMidnight();
    return (
        <MidnightContext.Provider value={midnight}>
            {children}
        </MidnightContext.Provider>
    );
}

/** Use this everywhere instead of useMidnight() directly */
export function useMidnightContext(): MidnightContextType {
    const ctx = useContext(MidnightContext);
    if (!ctx) throw new Error('useMidnightContext must be inside <MidnightProvider>');
    return ctx;
}

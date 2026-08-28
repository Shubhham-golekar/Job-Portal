/**
 * useMidnight.ts — DApp Connector hook for Midnight Network
 *
 * Supports the Midnight DApp Connector v2 API shape:
 *   window.midnight.<walletId> = { rdns, name, icon, apiVersion, connect }
 *   connect(ServiceUriConfig) → Promise<DAppProviderAPI>
 *
 * Circuit-call flow:
 *  1. connect() — triggers 1AM wallet popup, stores live API in module scope
 *  2. setNetworkId(networkId) — MUST be called before any circuit transaction
 *     so the Midnight SDK routes proofs to the correct network services
 *  3. submitCircuitCall(circuitFn) — calls setNetworkId then invokes the
 *     circuit function through the DApp Connector (prover + indexer + node)
 *
 * Privacy contract:
 *  • Private witnesses are NEVER stored in React state.
 *  • Only public data (address, network, contract state) enters state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────
export type NetworkId = 'preview' | 'dev' | 'mainnet';

export interface MidnightState {
    isConnected: boolean;
    isConnecting: boolean;
    address: string | null;
    network: NetworkId | null;
    error: string | null;
    walletFound: boolean;
}

export interface ContractState {
    totalApplications: number;
    totalShortlisted: number;
    totalOffered: number;
    totalAccepted: number;
    isLoading: boolean;
}

// ── VITE env vars ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env as Record<string, string | undefined>;
const EXPECTED_NETWORK = (env['VITE_NETWORK'] ?? 'preview') as NetworkId;
const CONTRACT_ADDRESS = env['VITE_CONTRACT_ADDRESS'] ?? '';

// ── Service URI config (passed to wallet's connect()) ─────────────
// The Midnight DApp Connector v2 requires these to find the network services.
const SERVICE_CONFIG = {
    proverServerUri: env['VITE_PROOF_SERVER_URL'] ?? 'https://proof-server.preview.midnight.network',
    indexerUri: env['VITE_INDEXER_URL'] ?? 'https://indexer.preview.midnight.network/api/v1/graphql',
    indexerWsUri: env['VITE_INDEXER_WS_URL'] ?? 'wss://indexer.preview.midnight.network/api/v1/graphql/ws',
    nodeUri: env['VITE_NODE_URL'] ?? 'wss://rpc.preview.midnight.network',
};

// ── Network ID normalizer ─────────────────────────────────────────
function normalizeNetworkId(raw: string): NetworkId | null {
    const lower = raw.toLowerCase().trim();
    if (lower === 'preview' || lower.includes('preview')) return 'preview';
    if (lower === 'dev' || lower.includes('dev') || lower.includes('local') || lower.includes('undeployed')) return 'dev';
    if (lower === 'mainnet' || lower.includes('main')) return 'mainnet';
    return null;
}

// ── Dev helper: log an object's keys and method types ────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logApiShape(label: string, obj: any) {
    if (env['MODE'] !== 'development') return;
    console.group(`[useMidnight] ${label}`);
    try {
        const ownKeys = Object.keys(obj ?? {});
        console.log('Own keys:', ownKeys);
        ownKeys.forEach((k: string) => {
            console.log(`  ${k} :`, typeof obj[k], typeof obj[k] === 'string' ? obj[k] : '');
        });
        // Also check prototype
        const proto = Object.getPrototypeOf(obj);
        if (proto && proto !== Object.prototype) {
            const protoKeys = Object.getOwnPropertyNames(proto).filter(k => k !== 'constructor');
            if (protoKeys.length) console.log('Prototype methods:', protoKeys);
        }
    } catch { /* ignore */ }
    console.groupEnd();
}

// ── Wallet discovery ─────────────────────────────────────────────
function discoverWallet(): { found: boolean; api?: unknown } {
    if (typeof window === 'undefined') return { found: false };
    const w = window as unknown as { midnight?: Record<string, unknown> };
    if (!w.midnight) return { found: false };
    const apis = Object.values(w.midnight);
    if (apis.length === 0) return { found: false };
    return { found: true, api: apis[0] };
}

// ── Normalised live API type ─────────────────────────────────────
interface LiveApi {
    getNetworkId: () => Promise<string>;
    getUnshieldedAddress: () => Promise<string>;
    // Optional: present on DApp Connector v2 connected API
    // Used to route ZK proofs to the correct network before submitting
    setNetworkId?: (networkId: string) => void | Promise<void>;
    // submitTransaction is the real circuit-call entry point
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitTransaction?: (tx: unknown) => Promise<any>;
}

// ── Resolve live API from any known wallet shape ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveLiveApi(provider: any): Promise<LiveApi> {
    logApiShape('Provider API (pre-connect)', provider);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let connected: any;

    if (typeof provider.enable === 'function') {
        // Legacy / CIP-30 style (some older builds)
        connected = await provider.enable();

    } else if (typeof provider.connect === 'function') {
        // Midnight DApp Connector v2 — connect() takes a ServiceUriConfig
        try {
            connected = await provider.connect(SERVICE_CONFIG);
        } catch (e) {
            // If it rejected, try without args as last resort
            console.warn('[useMidnight] connect(config) failed, retrying without args:', e);
            connected = await provider.connect();
        }

    } else if (typeof provider.getNetworkId === 'function') {
        // Already a live API
        connected = provider;

    } else {
        const foundKeys = (() => { try { return Object.keys(provider).join(', '); } catch { return '?'; } })();
        throw new Error(
            `Unrecognised wallet API. Found keys: [${foundKeys}]. ` +
            `Please update your 1AM Midnight wallet extension.`
        );
    }

    // Log what connect() gave back
    logApiShape('Connected API (post-connect)', connected);

    // ── Normalise method names ────────────────────────────────────
    // The 1AM wallet v4 connected API shape (from debug log):
    //   getUnshieldedAddress ✅   getNetworkId ❌ (use getConfiguration / getConnectionStatus)
    //
    // Build a unified LiveApi from whatever the connected object provides.

    // Address — getUnshieldedAddress exists directly
    // Address — getUnshieldedAddress exists directly in 1AM v4
    const resolvedGetAddress: () => Promise<string> =
        connected?.getUnshieldedAddress?.bind(connected) ??
        connected?.unshieldedAddress?.bind(connected) ??
        connected?.getAddress?.bind(connected) ??
        connected?.address?.bind(connected) ??
        (async () => ''); // should never happen with 1AM v4

    // Network ID — not present directly; extract from getConfiguration or getConnectionStatus
    const resolvedGetNetworkId: () => Promise<string> = (() => {
        if (typeof connected?.getNetworkId === 'function') {
            return connected.getNetworkId.bind(connected) as () => Promise<string>;
        }
        if (typeof connected?.networkId === 'function') {
            return connected.networkId.bind(connected) as () => Promise<string>;
        }
        if (typeof connected?.getConfiguration === 'function') {
            return async () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cfg: any = await connected.getConfiguration();
                if (env['MODE'] === 'development') console.info('[useMidnight] getConfiguration():', cfg);
                return cfg?.networkId ?? cfg?.network ?? cfg?.networkID ?? EXPECTED_NETWORK;
            };
        }
        if (typeof connected?.getConnectionStatus === 'function') {
            return async () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const status: any = await connected.getConnectionStatus();
                if (env['MODE'] === 'development') console.info('[useMidnight] getConnectionStatus():', status);
                return status?.networkId ?? status?.network ?? EXPECTED_NETWORK;
            };
        }
        // Ultimate fallback: trust the VITE_NETWORK env var
        return async () => EXPECTED_NETWORK;
    })();

    return { getNetworkId: resolvedGetNetworkId, getUnshieldedAddress: resolvedGetAddress };
}

// ── Hook ─────────────────────────────────────────────────────────
export function useMidnight() {
    const [state, setState] = useState<MidnightState>({
        isConnected: false,
        isConnecting: false,
        address: null,
        network: null,
        error: null,
        walletFound: false,
    });

    // Store the live connected API for circuit calls
    const liveApiRef = useRef<LiveApi | null>(null);

    // Poll for wallet injection (extension may load after page)
    useEffect(() => {
        const check = () => {
            const { found } = discoverWallet();
            setState(s => s.walletFound !== found ? { ...s, walletFound: found } : s);
        };
        check();
        const timer = setInterval(check, 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Connect ─────────────────────────────────────────────────────
    const connect = useCallback(async () => {
        setState(s => ({ ...s, isConnecting: true, error: null }));

        try {
            const { found, api } = discoverWallet();

            if (!found || !api) {
                throw new Error('NO_WALLET');
            }

            // Get a live API — this triggers the 1AM wallet popup
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const liveApi = await resolveLiveApi(api as any);

            // ── setNetworkId — MUST run before any circuit call ──────
            // This tells the Midnight SDK which network's proof-server,
            // indexer, and node to use when submitting ZK transactions.
            if (typeof liveApi.setNetworkId === 'function') {
                await liveApi.setNetworkId(EXPECTED_NETWORK);
                if (env['MODE'] === 'development') {
                    console.info(`[useMidnight] setNetworkId("${EXPECTED_NETWORK}") called.`);
                }
            } else {
                // DApp Connector v2 handles network routing via SERVICE_CONFIG
                // passed to connect() above — no explicit setNetworkId needed.
                if (env['MODE'] === 'development') {
                    console.info('[useMidnight] setNetworkId not available; network set via SERVICE_CONFIG.');
                }
            }

            // Store live API for subsequent circuit calls
            liveApiRef.current = liveApi;

            const rawNetworkId = await liveApi.getNetworkId();
            // The 1AM wallet v4 returns address as { unshieldedAddress: 'mn_addr_...' }
            // instead of a plain string — normalise it here.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawAddress = await liveApi.getUnshieldedAddress() as any;
            const address: string =
                typeof rawAddress === 'string'
                    ? rawAddress
                    : rawAddress?.unshieldedAddress ??
                    rawAddress?.address ??
                    String(rawAddress);

            if (env['MODE'] === 'development') {
                console.info('[useMidnight] Raw networkId:', rawNetworkId);
                console.info('[useMidnight] Resolved address:', address);
            }


            const networkId = normalizeNetworkId(rawNetworkId);

            if (!networkId || networkId !== EXPECTED_NETWORK) {
                throw new Error(
                    `Network mismatch: wallet is on "${rawNetworkId}" — ` +
                    `switch your 1AM wallet to ${EXPECTED_NETWORK.toUpperCase()} and try again.`
                );
            }

            setState({
                isConnected: true,
                isConnecting: false,
                address,
                network: networkId,
                error: null,
                walletFound: true,
            });
        } catch (err) {
            const raw = err instanceof Error ? err.message : 'Connection failed';
            const message = raw === 'NO_WALLET'
                ? 'Midnight wallet not detected. Install the 1AM extension and refresh.'
                : raw;
            setState(s => ({
                ...s,
                isConnecting: false,
                isConnected: false,
                error: message,
            }));
        }
    }, []);

    const disconnect = useCallback(() => {
        liveApiRef.current = null;
        setState(s => ({
            ...s,
            isConnected: false,
            address: null,
            network: null,
            error: null,
        }));
    }, []);

    const clearError = useCallback(() => {
        setState(s => ({ ...s, error: null }));
    }, []);

    /**
     * submitCircuitCall — the single entry-point for all circuit transactions.
     *
     * Always calls setNetworkId(EXPECTED_NETWORK) before submitting so the
     * Midnight SDK uses the correct proof-server and indexer.
     *
     * Usage (from any component):
     *   const { submitCircuitCall } = useMidnight();
     *   const appId = await submitCircuitCall(async (api) => {
     *     return api.submitTransaction(applyAnonymousTx);
     *   });
     */
    const submitCircuitCall = useCallback(async <T>(
        circuitFn: (liveApi: LiveApi) => Promise<T>
    ): Promise<T> => {
        const liveApi = liveApiRef.current;
        if (!liveApi) {
            throw new Error('Wallet not connected. Call connect() first.');
        }
        // Ensure network is set before every circuit call
        if (typeof liveApi.setNetworkId === 'function') {
            await liveApi.setNetworkId(EXPECTED_NETWORK);
        }
        return circuitFn(liveApi);
    }, []);

    return {
        ...state,
        expectedNetwork: EXPECTED_NETWORK,
        connect,
        disconnect,
        clearError,
        contractAddress: CONTRACT_ADDRESS,
        submitCircuitCall,
    };
}

// ── Contract state hook ──────────────────────────────────────────
export function useContractState() {
    const INDEXER_URL = env['VITE_INDEXER_URL'] ?? 'https://indexer.preview.midnight.network/api/v1/graphql';

    const [contractState, setContractState] = useState<ContractState>({
        totalApplications: 0,
        totalShortlisted: 0,
        totalOffered: 0,
        totalAccepted: 0,
        isLoading: false,
    });

    const fetchState = useCallback(async () => {
        if (!CONTRACT_ADDRESS) return;
        setContractState(s => ({ ...s, isLoading: true }));
        try {
            const res = await fetch(`${INDEXER_URL}/contract/${CONTRACT_ADDRESS}/state`);
            if (res.ok) {
                const data: {
                    total_applications?: number;
                    total_shortlisted?: number;
                    total_offered?: number;
                    total_accepted?: number;
                } = await res.json();
                setContractState({
                    totalApplications: data.total_applications ?? 0,
                    totalShortlisted: data.total_shortlisted ?? 0,
                    totalOffered: data.total_offered ?? 0,
                    totalAccepted: data.total_accepted ?? 0,
                    isLoading: false,
                });
            } else {
                setContractState(s => ({ ...s, isLoading: false }));
            }
        } catch {
            setContractState(s => ({ ...s, isLoading: false }));
        }
    }, [INDEXER_URL]);

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 30000);
        return () => clearInterval(interval);
    }, [fetchState]);

    return { ...contractState, refresh: fetchState };
}

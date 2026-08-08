/**
 * WalletConnect.tsx — Connect / disconnect wallet UI
 *
 * Clean version — no Demo Mode.
 * Clicking "Connect Wallet" triggers the 1AM Midnight wallet popup directly.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useMidnightContext } from '../context/MidnightContext';



// ── Modal overlay styles ──────────────────────────────────────────
const OVERLAY: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5,5,16,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
};

const MODAL: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '32px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.15)',
    animation: 'fadeIn 0.22s ease both',
};

interface Props {
    compact?: boolean;
}

export function WalletConnect({ compact = false }: Props) {
    const {
        isConnected,
        isConnecting,
        address,
        network,
        error,
        walletFound,
        expectedNetwork,
        connect,
        disconnect,
        clearError,
    } = useMidnightContext();


    const [modalOpen, setModalOpen] = React.useState(false);

    const openModal = () => {
        clearError();
        setModalOpen(true);
    };
    const closeModal = () => {
        if (!isConnecting) setModalOpen(false);
    };

    const handleConnect = async () => {
        await connect();
        // Auto-close on success (error stays visible if failed)
    };

    const handleDisconnect = () => {
        disconnect();
        setModalOpen(false);
    };

    // Close modal when connection succeeds
    React.useEffect(() => {
        if (isConnected && modalOpen) setModalOpen(false);
    }, [isConnected, modalOpen]);

    // ── Render Modal (via Portal to escape navbar stacking context) ─────
    // The navbar has backdrop-filter which creates a new stacking context.
    // Without a portal, position:fixed children are clipped to the navbar,
    // showing only the dark overlay ("black screen"). Portal fixes this.
    const renderModal = () => {
        if (!modalOpen) return null;
        return ReactDOM.createPortal(
            <div style={OVERLAY} onClick={e => e.target === e.currentTarget && closeModal()}>
                <div style={MODAL}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', margin: 0 }}>🌙 Connect Wallet</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4, marginBottom: 0 }}>
                                Connect your 1AM Midnight wallet to continue
                            </p>
                        </div>
                        <button
                            id="btn-modal-close"
                            onClick={closeModal}
                            style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)',
                                fontSize: '1.3rem', cursor: 'pointer', padding: '4px 8px',
                                borderRadius: 6, lineHeight: 1,
                            }}
                            disabled={isConnecting}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 16 }}>
                            <span>❌</span>
                            <div style={{ flex: 1, fontSize: '0.88rem' }}>{error}</div>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={clearError}
                                style={{ flexShrink: 0 }}
                            >✕</button>
                        </div>
                    )}

                    {/* Network requirement */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(124,58,237,0.08)',
                        border: '1px solid rgba(124,58,237,0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        marginBottom: 20,
                    }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Network required:</span>
                        <span className="badge badge-preview">{expectedNetwork.toUpperCase()}</span>
                    </div>

                    {/* Wallet status */}
                    <div style={{
                        border: `1px solid ${walletFound ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                        marginBottom: 20,
                        background: walletFound ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.04)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.5rem' }}>🌙</span>
                            <div>
                                <strong style={{ fontSize: '0.95rem' }}>1AM Midnight Wallet</strong>
                                <br />
                                <small style={{ color: walletFound ? 'var(--green)' : 'var(--amber)' }}>
                                    {walletFound ? '✅ Extension detected' : '⚠️ Extension not detected'}
                                </small>
                            </div>
                        </div>

                        {!walletFound && (
                            <div style={{ marginBottom: 12, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Install the 1AM extension first, then refresh this page.{' '}
                                <a
                                    href="https://midnight.network/wallet"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: 'var(--violet-light)' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    midnight.network/wallet ↗
                                </a>
                            </div>
                        )}

                        <button
                            id="btn-modal-connect"
                            className={`btn ${walletFound ? 'btn-primary' : 'btn-outline'}`}
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={handleConnect}
                            disabled={isConnecting}
                        >
                            {isConnecting
                                ? <><span className="spinner" /> Waiting for wallet approval…</>
                                : walletFound
                                    ? '🔐 Connect with 1AM Wallet'
                                    : '🔐 Try Anyway'}
                        </button>
                    </div>

                    <p style={{
                        fontSize: '0.73rem',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        margin: 0,
                    }}>
                        🔒 Your identity is never shared until you choose to reveal it
                    </p>
                </div>
            </div>,
            document.body
        );
    };

    // ── Compact (navbar) ─────────────────────────────────────────────
    if (compact) {
        if (isConnected && address) {
            return (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="badge badge-preview">
                            <span className="status-dot green" />
                            {network ?? expectedNetwork}
                        </span>
                        <span style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            {address.slice(0, 8)}…{address.slice(-6)}
                        </span>
                        <button
                            id="btn-disconnect-compact"
                            className="btn btn-ghost btn-sm"
                            onClick={handleDisconnect}
                        >
                            Disconnect
                        </button>
                    </div>
                </>
            );
        }

        return (
            <>
                <button
                    id="btn-connect-wallet-compact"
                    className="btn btn-primary btn-sm"
                    onClick={openModal}
                    disabled={isConnecting}
                >
                    {isConnecting
                        ? <><span className="spinner" /> Connecting…</>
                        : '🔐 Connect Wallet'}
                </button>
                {renderModal()}
            </>
        );
    }

    // ── Full card mode ───────────────────────────────────────────────
    return (
        <>
            <div className="card fade-in" style={{ maxWidth: 480, margin: '0 auto' }}>
                <div className="card-header">
                    <h2 style={{ fontSize: '1.3rem' }}>🌙 Connect Your Wallet</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
                        Connect your 1AM Midnight wallet to submit ZK-proofs
                    </p>
                </div>

                {/* Network requirement */}
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    <span>🌐</span>
                    <div>
                        <strong>Required Network:</strong>{' '}
                        <span className="badge badge-preview">{expectedNetwork}</span>
                        <br />
                        <small style={{ opacity: 0.8 }}>
                            Make sure your wallet is switched to the {expectedNetwork.charAt(0).toUpperCase() + expectedNetwork.slice(1)} network
                        </small>
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>
                        <span>❌</span>
                        <div style={{ flex: 1, fontSize: '0.88rem' }}>{error}</div>
                        <button className="btn btn-ghost btn-sm" onClick={clearError}>✕</button>
                    </div>
                )}

                {isConnected && address ? (
                    <div>
                        <div className="alert alert-success">
                            <span>✅</span>
                            <div>
                                <strong>Wallet connected</strong>
                                <br />
                                <span className="mono" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{address}</span>
                            </div>
                        </div>
                        <button
                            id="btn-disconnect-full"
                            className="btn btn-outline"
                            style={{ width: '100%' }}
                            onClick={handleDisconnect}
                        >
                            Disconnect Wallet
                        </button>
                    </div>
                ) : (
                    <button
                        id="btn-connect-wallet-full"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={openModal}
                        disabled={isConnecting}
                    >
                        {isConnecting
                            ? <><span className="spinner" /> Connecting…</>
                            : '🔐 Connect Midnight Wallet'}
                    </button>
                )}

                <hr className="divider" />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Your identity is never shared until YOU choose to reveal it.
                </p>
            </div>

            {renderModal()}
        </>
    );
}

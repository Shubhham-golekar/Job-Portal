/**
 * network.ts — Midnight network configuration helpers
 * Supports: 'dev' (local devnet), 'preview' (Preview Network)
 */

export type NetworkId = 'dev' | 'preview';

export interface NetworkConfig {
    networkId: NetworkId;
    nodeUrl: string;
    indexerUrl: string;
    proofServerUrl: string;
}

const NETWORKS: Record<NetworkId, NetworkConfig> = {
    dev: {
        networkId: 'dev',
        nodeUrl: 'ws://localhost:9944',
        indexerUrl: 'http://localhost:8088',
        proofServerUrl: 'http://localhost:6300',
    },
    preview: {
        networkId: 'preview',
        nodeUrl: 'wss://rpc.preview.midnight.network',
        indexerUrl: 'https://indexer.preview.midnight.network',
        proofServerUrl: 'https://proof-server.preview.midnight.network',
    },
};

export function getNetworkConfig(networkId: NetworkId = 'dev'): NetworkConfig {
    return NETWORKS[networkId];
}

export function parseNetworkArg(args: string[]): NetworkId {
    const idx = args.indexOf('--network');
    if (idx !== -1 && args[idx + 1]) {
        const n = args[idx + 1] as NetworkId;
        if (n === 'dev' || n === 'preview') return n;
    }
    return 'dev';
}

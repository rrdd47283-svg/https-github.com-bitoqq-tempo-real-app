export const tempoModerato = {
  id: 42431,
  name: 'Tempo Moderato',
  network: 'tempo-moderato',
  nativeCurrency: {
    decimals: 18,
    name: 'Tempo',
    symbol: 'TEMPO',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.moderato.tempo.xyz'],
      webSocket: ['wss://rpc.moderato.tempo.xyz'],
    },
    public: {
      http: ['https://rpc.moderato.tempo.xyz'],
      webSocket: ['wss://rpc.moderato.tempo.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Explorer',
      url: 'https://explore.tempo.xyz',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
}

export const RPC_URL = 'https://rpc.moderato.tempo.xyz'
export const WS_URL = 'wss://rpc.moderato.tempo.xyz'
export const EXPLORER_URL = 'https://explore.tempo.xyz'
export const FAUCET_URL = 'https://faucet.moderato.tempo.xyz'
export const CHAIN_ID = 42431
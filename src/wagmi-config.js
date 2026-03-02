import { createConfig, http } from 'wagmi'
import { tempoModerato } from 'viem/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [tempoModerato],
  connectors: [
    injected({
      target: 'passkey',
      name: 'Passkey',
    })
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    [tempoModerato.id]: http(),
  },
})
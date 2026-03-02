import { http } from 'viem'
import { tempoModerato } from './chain'

// ============================================
// 1. URLS
// ============================================
export const RPC_URL = 'https://rpc.moderato.tempo.xyz'
export const WS_URL = 'wss://rpc.moderato.tempo.xyz'
export const EXPLORER_URL = 'https://explore.tempo.xyz'
export const CHAIN_ID = 42431

// ============================================
// 2. TIP-20 ABI (ИЗ СПЕЦИФИКАЦИИ)
// ============================================
export const TIP20_ABI = [
  // ERC-20 standard
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'pure'
  },
  {
    name: 'totalSupply',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'transferFrom',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  
  // TIP-20 specific
  {
    name: 'transferWithMemo',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'memo', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'transferFromWithMemo',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'memo', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'mint',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'burn',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  }
]

// ============================================
// 3. DEX ABI (ИСПРАВЛЕННЫЙ - ДОБАВЛЕНА ОШИБКА)
// ============================================
export const DEX_ABI = [
  // ===== CUSTOM ERRORS =====
  // Добавлено определение ошибки для несуществующей пары (сигнатура 0xaa4bc69a)
  {
    type: 'error',
    name: 'PairDoesNotExist',
    inputs: []
  },
  
  // ===== CORE DEX FUNCTIONS =====
  {
    name: 'createPair',
    type: 'function',
    inputs: [
      { name: 'baseToken', type: 'address' },
      { name: 'quoteToken', type: 'address' }
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getPair',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' }
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  
  // ===== QUOTE FUNCTIONS =====
  {
    name: 'quoteSwapExactAmountIn',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint128' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint128' }],
    stateMutability: 'view'
  },
  {
    name: 'quoteSwapExactAmountOut',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint128' }
    ],
    outputs: [{ name: 'amountIn', type: 'uint128' }],
    stateMutability: 'view'
  },
  
  // ===== SWAP EXECUTION =====
  {
    name: 'swapExactAmountIn',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint128' },
      { name: 'minAmountOut', type: 'uint128' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint128' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'swapExactAmountOut',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint128' },
      { name: 'maxAmountIn', type: 'uint128' }
    ],
    outputs: [{ name: 'amountIn', type: 'uint128' }],
    stateMutability: 'nonpayable'
  },
  
  // ===== LIMIT ORDER FUNCTIONS =====
  {
    name: 'getBuyQuote',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'tokenOut', type: 'address' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'place',
    type: 'function',
    inputs: [
      { name: 'baseToken', type: 'address' },
      { name: 'quoteToken', type: 'address' },
      { name: 'isBid', type: 'bool' },
      { name: 'tick', type: 'uint32' },
      { name: 'amount', type: 'uint128' },
      { name: 'expiry', type: 'uint32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'cancel',
    type: 'function',
    inputs: [
      { name: 'baseToken', type: 'address' },
      { name: 'quoteToken', type: 'address' },
      { name: 'isBid', type: 'bool' },
      { name: 'tick', type: 'uint32' },
      { name: 'id', type: 'uint64' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // ===== SYSTEM FUNCTIONS =====
  {
    name: 'systemTransferFrom',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  }
]

// ============================================
// 4. FACTORY ABI (ИЗ СПЕЦИФИКАЦИИ)
// ============================================
export const FACTORY_ABI = [
  {
    name: 'createToken',
    type: 'function',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'currency', type: 'string' },
      { name: 'quoteToken', type: 'address' },
      { name: 'admin', type: 'address' },
      { name: 'salt', type: 'bytes32' }
    ],
    outputs: [{ name: 'token', type: 'address' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'isTIP20',
    type: 'function',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'getTokenAddress',
    type: 'function',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'salt', type: 'bytes32' }
    ],
    outputs: [{ name: 'token', type: 'address' }],
    stateMutability: 'pure'
  }
]

export const FEE_MANAGER_ABI = []
export const TIP403_REGISTRY_ABI = []

// ============================================
// 5. КОНТРАКТЫ (АДРЕСА ИЗ ДОКУМЕНТАЦИИ)
// ============================================
export const CONTRACTS = {
  tip20Factory: {
    address: '0x20fc000000000000000000000000000000000000',
    abi: FACTORY_ABI,
    name: 'TIP-20 Factory',
    description: 'Create new TIP-20 tokens'
  },
  feeManager: {
    address: '0xfeec000000000000000000000000000000000000',
    abi: FEE_MANAGER_ABI,
    name: 'Fee Manager',
    description: 'Handle fee payments and conversions'
  },
  stablecoinDex: {
    address: '0xdec0000000000000000000000000000000000000',
    abi: DEX_ABI,
    name: 'Stablecoin DEX',
    description: 'Enshrined DEX for stablecoin swaps'
  },
  tip403Registry: {
    address: '0x403c000000000000000000000000000000000000',
    abi: TIP403_REGISTRY_ABI,
    name: 'TIP-403 Registry',
    description: 'Transfer policy registry'
  },
  multicall3: {
    address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    abi: [],
    name: 'Multicall3',
    description: 'Batch multiple calls in one transaction'
  },
  createX: {
    address: '0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed',
    abi: [],
    name: 'CreateX',
    description: 'Deterministic contract deployment'
  },
  permit2: {
    address: '0x000000000022d473030f116ddee9f6b43ac78ba3',
    abi: [],
    name: 'Permit2',
    description: 'Token approvals and transfers'
  },
  create2Factory: {
    address: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
    abi: [],
    name: 'Create2 Factory',
    description: 'CREATE2 deployment proxy'
  },
  safeDeployer: {
    address: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
    abi: [],
    name: 'Safe Deployer',
    description: 'Safe deployer contract'
  },
  tokens: {
    pathUSD: {
      address: '0x20c0000000000000000000000000000000000000',
      symbol: 'pUSD',
      name: 'pathUSD',
      decimals: 6,
      abi: TIP20_ABI,
      faucetAmount: '1,000,000'
    },
    alphaUSD: {
      address: '0x20c0000000000000000000000000000000000001',
      symbol: 'aUSD',
      name: 'AlphaUSD',
      decimals: 6,
      abi: TIP20_ABI,
      faucetAmount: '1,000,000'
    },
    betaUSD: {
      address: '0x20c0000000000000000000000000000000000002',
      symbol: 'bUSD',
      name: 'BetaUSD',
      decimals: 6,
      abi: TIP20_ABI,
      faucetAmount: '1,000,000'
    },
    thetaUSD: {
      address: '0x20c0000000000000000000000000000000000003',
      symbol: 'tUSD',
      name: 'ThetaUSD',
      decimals: 6,
      abi: TIP20_ABI,
      faucetAmount: '1,000,000'
    }
  }
}
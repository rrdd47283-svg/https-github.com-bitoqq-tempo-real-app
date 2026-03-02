export const KEYCHAIN_ABI = [
  {
    type: 'function',
    name: 'addKey',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'keyType', type: 'uint8' },
      { name: 'publicKey', type: 'bytes' },
      { name: 'expiry', type: 'uint64' },
      { name: 'spendingLimit', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'removeKey',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'keyHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'getKey',
    'stateMutability': 'view',
    inputs: [
      { name: 'keyHash', type: 'bytes32' }
    ],
    outputs: [
      { name: 'keyType', type: 'uint8' },
      { name: 'publicKey', type: 'bytes' },
      { name: 'expiry', type: 'uint64' },
      { name: 'spendingLimit', type: 'uint256' }
    ]
  }
]

export const KEYCHAIN_ADDRESS = '0x0000000000000000000000000000000000000801'
export const KEY_TYPE_WEBAUTHN = 2
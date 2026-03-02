import { createPublicClient, http, encodeFunctionData, parseUnits } from 'viem'
import { tempoModerato } from 'viem/chains'
import { Account, WebAuthnP256 } from 'viem/tempo'
import { CONTRACTS, TIP20_ABI, DEX_ABI, RPC_URL } from '../config/contracts'

// ============================================
// 1. PUBLIC CLIENT
// ============================================
export const publicClient = createPublicClient({
  chain: tempoModerato,
  transport: http(RPC_URL)
})

// ============================================
// 2. ХЕЛПЕРЫ
// ============================================
export const shortAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatTokenBalance = (value, decimals = 6) => {
  if (!value) return '0.00'
  try {
    const cleanValue = value.toString().replace(/,/g, '')
    const num = Number(cleanValue) / 10 ** decimals
    if (num === 0) return '0.00'
    if (num < 0.0001) return '< 0.0001'
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  } catch {
    return '0.00'
  }
}

export const formatNativeBalance = (value) => {
  if (!value) return '0.00'
  try {
    const cleanValue = value.toString().replace(/,/g, '')
    const num = Number(cleanValue) / 1e18
    if (num === 0) return '0.00'
    if (num < 0.0001) return '< 0.0001'
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  } catch {
    return '0.00'
  }
}

// ============================================
// 3. WALLET CONNECTION (METAMASK)
// ============================================
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${tempoModerato.id.toString(16)}` }]
    })
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${tempoModerato.id.toString(16)}`,
            chainName: tempoModerato.name,
            nativeCurrency: tempoModerato.nativeCurrency,
            rpcUrls: [tempoModerato.rpcUrls.default.http[0]],
            blockExplorerUrls: [tempoModerato.blockExplorers.default.url]
          }]
        })
      } catch (addError) {
        console.log('Network add error:', addError)
      }
    }
  }

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  return { address: accounts[0] }
}

// ============================================
// 4. PASSKEY ФУНКЦИИ (ПО ДОКУМЕНТАЦИИ)
// ============================================

const CREDENTIAL_ID_KEY = 'tempo-credential-id'

/**
 * Создание Passkey — исправлено для WebAuthnP256
 */
export const createPasskeyAccount = async (username = 'Tempo User') => {
  try {
    console.log('🔐 Creating Passkey...')

    if (!window.isSecureContext) {
      throw new Error('WebAuthn requires HTTPS or localhost')
    }

    // ✅ Генерируем уникальный ID пользователя (16 байт)
    const userId = new Uint8Array(16)
    crypto.getRandomValues(userId)

    // ✅ Создаём WebAuthn credential с полным user объектом
    const credential = await WebAuthnP256.createCredential({
      user: {
        id: userId,
        name: username,
        displayName: username
      }
    })

    console.log('✅ Credential created:', credential.id)

    // ✅ Создаём аккаунт Tempo из credential
    const account = Account.fromWebAuthnP256(credential)
    if (!account?.address) throw new Error('Failed to create account')

    console.log('✅ Account address:', account.address)

    // ✅ Сохраняем только ID в localStorage
    localStorage.setItem(CREDENTIAL_ID_KEY, credential.id)
    localStorage.setItem('tempo-passkey-address', account.address)

    return account
  } catch (error) {
    console.error('❌ Passkey error:', error)
    throw error
  }
}

/**
 * Загрузка Passkey
 */
export const loadPasskeyAccount = async () => {
  try {
    const credentialId = localStorage.getItem(CREDENTIAL_ID_KEY)
    const address = localStorage.getItem('tempo-passkey-address')

    console.log('🔍 Loading credentialId:', credentialId)

    if (!credentialId) return null

    try {
      const credential = await WebAuthnP256.getCredential({
        id: credentialId
      })

      const account = Account.fromWebAuthnP256(credential)
      console.log('✅ Full account restored:', account.address)
      return account
    } catch (e) {
      console.warn('⚠️ Could not restore full account, using address only')
      return {
        address: address,
        type: 'webauthn'
      }
    }
  } catch (error) {
    console.error('Error loading passkey:', error)
    return null
  }
}

/**
 * Отправка транзакции через Passkey (ТИП 0x76)
 */
export const sendPasskeyTransaction = async ({
  passkeyAccount,
  tokenAddress,
  to,
  amount,
  memo = '',
  feeToken = tokenAddress,
  nonceKey,
  validAfter,
  validBefore
}) => {
  try {
    if (!passkeyAccount?.address) {
      throw new Error('Passkey account is missing')
    }

    console.log('📤 Sending REAL Passkey transaction from:', passkeyAccount.address)
    console.log('💸 Fee token:', feeToken)

    // Получаем decimals токена
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: TIP20_ABI,
      functionName: 'decimals'
    }).catch(() => 6)

    // Преобразуем сумму
    const amountInUnits = parseUnits(amount, decimals)

    // Кодируем данные
    let data
    if (memo) {
      const encoder = new TextEncoder()
      const memoBytesArray = encoder.encode(memo)
      const fullArray = new Uint8Array(32)
      fullArray.set(memoBytesArray.slice(0, 32))
      const memoHex = '0x' + Array.from(fullArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      data = encodeFunctionData({
        abi: TIP20_ABI,
        functionName: 'transferWithMemo',
        args: [to, amountInUnits, memoHex]
      })
    } else {
      data = encodeFunctionData({
        abi: TIP20_ABI,
        functionName: 'transfer',
        args: [to, amountInUnits]
      })
    }

    // Получаем nonce
    const nonce = await publicClient.getTransactionCount({ 
      address: passkeyAccount.address 
    })

    // Получаем gas price
    const gasPrice = await publicClient.getGasPrice()

    // ✅ Создаём транзакцию типа 0x76 (Tempo Transaction)
    const tx = {
      account: passkeyAccount,
      to: tokenAddress,
      data,
      value: 0n,
      gas: 500000n,
      gasPrice,
      nonce,
      chainId: tempoModerato.id,
      feeToken
    }

    // Добавляем опциональные параметры Tempo
    if (nonceKey !== undefined) {
      tx.nonceKey = BigInt(nonceKey)
    }
    if (validAfter) {
      tx.validAfter = BigInt(validAfter)
    }
    if (validBefore) {
      tx.validBefore = BigInt(validBefore)
    }

    console.log('📦 Transaction to send:', tx)

    // ✅ Отправляем через publicClient (подпись произойдёт автоматически)
    const txHash = await publicClient.sendTransaction(tx)

    console.log('✅ Passkey transaction sent:', txHash)
    return txHash

  } catch (error) {
    console.error('❌ Passkey transaction error:', error)
    throw error
  }
}

// ============================================
// 5. GET WALLET CLIENT (METAMASK)
// ============================================
export const getWalletClient = async () => {
  if (!window.ethereum) throw new Error('MetaMask not installed')
  
  const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  if (accounts.length === 0) throw new Error('No connected account')
  
  const getTokenDecimals = async (tokenAddress) => {
    try {
      const decimals = await publicClient.readContract({
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: 'decimals'
      });
      return Number(decimals);
    } catch (e) {
      return 6;
    }
  };

  const createTransaction = async ({ to, data, feeToken, nonceKey }) => {
    const nonce = await publicClient.getTransactionCount({ address: accounts[0] })
    const gasPrice = await publicClient.getGasPrice()
    
    const txParams = {
      from: accounts[0],
      to,
      data,
      value: '0x0',
      gas: '0x7A120',
      gasPrice: `0x${gasPrice.toString(16)}`,
      nonce: `0x${nonce.toString(16)}`,
      chainId: `0x${tempoModerato.id.toString(16)}`,
      type: '0x0'
    };

    if (feeToken) txParams.feeToken = feeToken;
    if (nonceKey !== undefined) txParams.nonceKey = `0x${nonceKey.toString(16)}`;
    
    return txParams;
  }

  const sendTransaction = async (txParams) => {
    try {
      return await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      })
    } catch (error) {
      if (error.message?.includes('Invalid transaction envelope type')) {
        const { feeToken, nonceKey, ...cleanParams } = txParams
        return await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [cleanParams]
        })
      }
      throw error
    }
  }
  
  return {
    account: { address: accounts[0] },
    
    sendTransaction: async ({ to, data, feeToken, nonceKey }) => {
      const txParams = await createTransaction({ to, data, feeToken, nonceKey })
      return await sendTransaction(txParams)
    },
    
    transferToken: async ({ tokenAddress, to, amount, feeToken }) => {
      const decimals = await getTokenDecimals(tokenAddress);
      const amountInUnits = parseUnits(amount, decimals);
      const transferData = encodeFunctionData({
        abi: TIP20_ABI,
        functionName: 'transfer',
        args: [to, amountInUnits]
      });
      const txParams = await createTransaction({
        to: tokenAddress,
        data: transferData,
        feeToken
      });
      return await sendTransaction(txParams);
    },
    
    approveToken: async ({ tokenAddress, spender, amount, feeToken }) => {
      const decimals = await getTokenDecimals(tokenAddress);
      const amountInUnits = parseUnits(amount, decimals);
      const approveData = encodeFunctionData({
        abi: TIP20_ABI,
        functionName: 'approve',
        args: [spender, amountInUnits]
      });
      const txParams = await createTransaction({
        to: tokenAddress,
        data: approveData,
        feeToken
      });
      return await sendTransaction(txParams);
    },
    
    createPair: async ({ baseToken, quoteToken, feeToken }) => {
      const createPairData = encodeFunctionData({
        abi: DEX_ABI,
        functionName: 'createPair',
        args: [baseToken, quoteToken]
      });
      const txParams = await createTransaction({
        to: CONTRACTS.stablecoinDex.address,
        data: createPairData,
        feeToken
      });
      return await sendTransaction(txParams);
    },
    
    placeOrder: async ({ baseToken, quoteToken, isBid, tick, amount, feeToken }) => {
      const decimals = await getTokenDecimals(baseToken);
      const amountInUnits = parseUnits(amount, decimals);
      const placeData = encodeFunctionData({
        abi: DEX_ABI,
        functionName: 'place',
        args: [baseToken, quoteToken, isBid, tick, amountInUnits, 0]
      });
      const txParams = await createTransaction({
        to: CONTRACTS.stablecoinDex.address,
        data: placeData,
        feeToken
      });
      return await sendTransaction(txParams);
    },
    
    cancelOrder: async ({ baseToken, quoteToken, isBid, tick, feeToken }) => {
      const cancelData = encodeFunctionData({
        abi: DEX_ABI,
        functionName: 'cancel',
        args: [baseToken, quoteToken, isBid, tick]
      });
      const txParams = await createTransaction({
        to: CONTRACTS.stablecoinDex.address,
        data: cancelData,
        feeToken
      });
      return await sendTransaction(txParams);
    },
    
    getQuote: async ({ baseToken, quoteToken, amount }) => {
      const decimals = await getTokenDecimals(baseToken);
      const amountInUnits = parseUnits(amount, decimals);
      
      return await publicClient.readContract({
        address: CONTRACTS.stablecoinDex.address,
        abi: DEX_ABI,
        functionName: 'getBuyQuote',
        args: [baseToken, amountInUnits, quoteToken]
      });
    }
  }
}

// ============================================
// 6. BALANCE FUNCTIONS
// ============================================
export const getRealTempoBalance = async (address) => {
  if (!address) return 0
  try {
    const balance = await publicClient.getBalance({ address })
    return Number(balance) / 1e18
  } catch (error) {
    return 0
  }
}

export const getProtocolNonce = async (address) => {
  if (!address) return 0
  try {
    return await publicClient.getTransactionCount({ address })
  } catch (error) {
    return 0
  }
}

export const getUserNonceByKey = async () => 0

export const fetchBlockNumber = async () => {
  try {
    return await publicClient.getBlockNumber()
  } catch (error) {
    return null
  }
}

export const fetchNativeBalance = async (address) => {
  if (!address) return { raw: 0n, formatted: '0.00' }
  try {
    const balance = await publicClient.getBalance({ address })
    return {
      raw: balance,
      formatted: formatNativeBalance(balance.toString())
    }
  } catch (error) {
    return { raw: 0n, formatted: '0.00' }
  }
}

export const fetchTokenBalance = async (tokenAddress, userAddress) => {
  if (!tokenAddress || !userAddress) return 0n
  try {
    return await publicClient.readContract({
      address: tokenAddress,
      abi: TIP20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    })
  } catch (error) {
    return 0n
  }
}

export const fetchAllBalances = async (address) => {
  if (!address) return null
  
  const nativeData = await fetchNativeBalance(address)
  
  const pUSD = await fetchTokenBalance(CONTRACTS.tokens.pathUSD.address, address)
  const aUSD = await fetchTokenBalance(CONTRACTS.tokens.alphaUSD.address, address)
  const bUSD = await fetchTokenBalance(CONTRACTS.tokens.betaUSD.address, address)
  const tUSD = await fetchTokenBalance(CONTRACTS.tokens.thetaUSD.address, address)
  
  return {
    rawNative: nativeData.raw,
    native: nativeData.formatted,
    pUSD,
    aUSD,
    bUSD,
    tUSD,
    pUSDFormatted: formatTokenBalance(pUSD),
    aUSDFormatted: formatTokenBalance(aUSD),
    bUSDFormatted: formatTokenBalance(bUSD),
    tUSDFormatted: formatTokenBalance(tUSD)
  }
}

export const requestFaucet = async (address) => {
  if (!address) return { success: false, message: 'Address required' }
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tempo_fundAddress',
        params: [address],
        id: 1
      })
    })
    
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return { success: true, txHash: data.result }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

// ============================================
// 7. FEE MANAGER HELPERS
// ============================================
export const getAccountFeeToken = async (address) => {
  if (!address) return null;
  try {
    const feeManagerAddress = '0xfeec000000000000000000000000000000000000';
    const abi = [{
      name: 'getUserToken',
      type: 'function',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: 'token', type: 'address' }],
      stateMutability: 'view'
    }];
    const result = await publicClient.readContract({
      address: feeManagerAddress,
      abi,
      functionName: 'getUserToken',
      args: [address]
    }).catch(() => null);
    if (result && result !== '0x0000000000000000000000000000000000000000') return result;
    return null;
  } catch (error) {
    return null;
  }
};

export const setAccountFeeToken = async (wallet, tokenAddress) => {
  if (!wallet || !tokenAddress) throw new Error('Wallet and token address required');
  try {
    const feeManagerAddress = '0xfeec000000000000000000000000000000000000';
    const abi = [{
      name: 'setUserToken',
      type: 'function',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable'
    }];
    const setTokenData = encodeFunctionData({
      abi,
      functionName: 'setUserToken',
      args: [tokenAddress]
    });
    return await wallet.sendTransaction({
      to: feeManagerAddress,
      data: setTokenData
    });
  } catch (error) {
    console.error('Error setting account fee token:', error);
    throw error;
  }
};

export const getAccountFeeTokenInfo = async (address) => {
  const tokenAddress = await getAccountFeeToken(address);
  if (!tokenAddress) return null;
  try {
    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: 'symbol',
        args: []
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: 'decimals',
        args: []
      })
    ]);
    return { address: tokenAddress, symbol, decimals: Number(decimals) };
  } catch (error) {
    return { address: tokenAddress, symbol: '???', decimals: 6 };
  }
};

// ============================================
// 8. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
// ============================================
const getTokenDecimals = async (tokenAddress) => {
  if (!tokenAddress) return 6
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: TIP20_ABI,
      functionName: 'decimals'
    });
    return Number(decimals);
  } catch (e) {
    return 6;
  }
};
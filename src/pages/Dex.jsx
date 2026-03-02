import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, CheckCircle, 
  ExternalLink, Copy, ArrowLeftRight, Shield, Zap,
  ArrowDownUp, Layers, BookOpen, XCircle, History,
  Clock, BarChart3, TrendingDown, TrendingUp as TrendUp,
  Repeat, Send
} from 'lucide-react'
import { 
  publicClient, 
  getWalletClient, 
  shortAddress,
  getRealTempoBalance,
  getProtocolNonce,
  getUserNonceByKey,
  fetchTokenBalance
} from '../lib/tempo'
import { CONTRACTS, EXPLORER_URL } from '../config/contracts'
import { parseUnits, encodeFunctionData } from 'viem'

export default function Dex({ account }) {
  // ============================================
  // STATE
  // ============================================
  const [baseToken, setBaseToken] = useState(CONTRACTS.tokens.alphaUSD.address)
  const [quoteToken, setQuoteToken] = useState(CONTRACTS.tokens.pathUSD.address)
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('1.00')
  const [flipPrice, setFlipPrice] = useState('1.02')
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [orderType, setOrderType] = useState('buy')
  const [orderStyle, setOrderStyle] = useState('limit')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pairExists, setPairExists] = useState(false)
  const [pairAddress, setPairAddress] = useState(null)
  const [copied, setCopied] = useState('')
  const [activeTab, setActiveTab] = useState('limit')
  const [swapMode, setSwapMode] = useState('exactIn')
  const [slippage, setSlippage] = useState('0.5')
  const [protocolNonce, setProtocolNonce] = useState(null)
  const [userNonce, setUserNonce] = useState(null)

  // Ордербук
  const [orderbook, setOrderbook] = useState({ bids: [], asks: [] })
  const [userOrders, setUserOrders] = useState([])
  const [orderHistory, setOrderHistory] = useState([])
  const [showUserOrders, setShowUserOrders] = useState(false)
  const [loadingOrderbook, setLoadingOrderbook] = useState(false)

  // Параллельные транзакции
  const [parallelMode, setParallelMode] = useState('transfer')
  const [parallelAmount1, setParallelAmount1] = useState('')
  const [parallelAmount2, setParallelAmount2] = useState('')
  const [parallelAmount3, setParallelAmount3] = useState('')
  const [parallelAddr1, setParallelAddr1] = useState('')
  const [parallelAddr2, setParallelAddr2] = useState('')
  const [parallelAddr3, setParallelAddr3] = useState('')
  const [parallelNonceKey, setParallelNonceKey] = useState(1)
  const [parallelResults, setParallelResults] = useState([])

  // ============================================
  // LOAD NONCES ON MOUNT
  // ============================================
  useEffect(() => {
    if (account?.address) {
      loadNonces()
      checkPairExists()
    }
  }, [account, baseToken, quoteToken])

  useEffect(() => {
    if (pairExists) {
      fetchOrderbook()
      fetchUserOrders()
    }
  }, [pairExists, baseToken, quoteToken])

  const loadNonces = async () => {
    try {
      const protocol = await getProtocolNonce(account.address)
      const user = await getUserNonceByKey(account.address, 1)
      setProtocolNonce(protocol)
      setUserNonce(user)
    } catch (error) {
      console.error('Error loading nonces:', error)
    }
  }

  // ============================================
  // HELPERS
  // ============================================
  const getTokenSymbol = (address) => {
    const token = Object.values(CONTRACTS.tokens).find(t => t.address === address)
    return token?.symbol || '???'
  }

  const getTokenDecimals = (address) => {
    const token = Object.values(CONTRACTS.tokens).find(t => t.address === address)
    return token?.decimals || 6
  }

  const calculateMinAmountOut = (amount, slippagePercent) => {
    if (!amount) return '0'
    const amountNum = parseFloat(amount)
    const slippageNum = parseFloat(slippagePercent) / 100
    return (amountNum * (1 - slippageNum)).toFixed(2)
  }

  const calculateMaxAmountIn = (amount, slippagePercent) => {
    if (!amount) return '0'
    const amountNum = parseFloat(amount)
    const slippageNum = parseFloat(slippagePercent) / 100
    return (amountNum * (1 + slippageNum)).toFixed(2)
  }

  // Конвертация цены в tick (согласно документации)
  const priceToTick = (price) => {
    const priceNum = parseFloat(price)
    return Math.floor((priceNum - 1) * 100000)
  }

  // Конвертация tick в цену
  const tickToPrice = (tick) => {
    return (1 + tick / 100000).toFixed(4)
  }

  // ============================================
  // ORDERBOOK FUNCTIONS
  // ============================================
  
  const fetchOrderbook = async () => {
    setLoadingOrderbook(true)
    try {
      const mockBids = []
      const mockAsks = []
      
      const basePrice = parseFloat(price) || 1.0
      
      for (let i = 1; i <= 8; i++) {
        const tickOffset = -i * 5
        const bidPrice = tickToPrice(tickOffset)
        mockBids.push({
          tick: tickOffset,
          price: bidPrice,
          amount: (Math.random() * 5000 + 1000).toFixed(0),
          total: (parseFloat(bidPrice) * (Math.random() * 5000 + 1000)).toFixed(2),
          maker: '0x' + Math.random().toString(16).substring(2, 10)
        })
      }
      
      for (let i = 1; i <= 8; i++) {
        const tickOffset = i * 5
        const askPrice = tickToPrice(tickOffset)
        mockAsks.push({
          tick: tickOffset,
          price: askPrice,
          amount: (Math.random() * 5000 + 1000).toFixed(0),
          total: (parseFloat(askPrice) * (Math.random() * 5000 + 1000)).toFixed(2),
          maker: '0x' + Math.random().toString(16).substring(2, 10)
        })
      }
      
      mockBids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      mockAsks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      
      setOrderbook({ bids: mockBids, asks: mockAsks })
    } catch (error) {
      console.error('Error fetching orderbook:', error)
    } finally {
      setLoadingOrderbook(false)
    }
  }

  const fetchUserOrders = async () => {
    try {
      const mockOrders = []
      if (account?.address) {
        for (let i = 0; i < 2; i++) {
          const isBid = Math.random() > 0.5
          const tick = isBid ? -10 : 10
          mockOrders.push({
            id: `order-${i}-${Date.now()}`,
            type: isBid ? 'Buy' : 'Sell',
            token: getTokenSymbol(baseToken),
            price: tickToPrice(tick),
            tick: tick,
            amount: (Math.random() * 2000 + 500).toFixed(0),
            filled: (Math.random() * 30).toFixed(0) + '%',
            status: Math.random() > 0.3 ? 'Active' : 'Partial',
            timestamp: new Date(Date.now() - i * 3600000).toLocaleTimeString()
          })
        }
      }
      setUserOrders(mockOrders)
    } catch (error) {
      console.error('Error fetching user orders:', error)
    }
  }

  // ============================================
  // PLACE ORDER
  // ============================================
  const handlePlaceOrder = async () => {
    setError('')
    setSuccess('')
    
    if (!amount || !price) {
      setError('Enter amount and price')
      return
    }

    const exists = await checkPairExists()
    if (!exists) {
      setError('Create pair first')
      return
    }

    const priceNum = parseFloat(price)
    const tick = priceToTick(price)
    
    if (Math.abs(tick) > 2000) {
      setError('Price must be within ±2% of peg (±2000 ticks)')
      return
    }

    if (orderStyle === 'flip') {
      if (!flipPrice) {
        setError('Enter flip price for flip order')
        return
      }
      const flipTick = priceToTick(flipPrice)
      if (orderType === 'buy' && flipTick <= tick) {
        setError('Flip tick must be greater than bid tick')
        return
      }
      if (orderType === 'sell' && flipTick >= tick) {
        setError('Flip tick must be less than ask tick')
        return
      }
    }

    setLoading(true)
    try {
      const tokenBalance = await fetchTokenBalance(baseToken, account.address)
      const tokenBalanceFormatted = Number(tokenBalance) / 1e6
      
      if (tokenBalanceFormatted < parseFloat(amount)) {
        setError(`Insufficient ${getTokenSymbol(baseToken)} balance. You have ${tokenBalanceFormatted.toFixed(2)} ${getTokenSymbol(baseToken)}`)
        setLoading(false)
        return
      }

      const wallet = await getWalletClient()
      const amountInUnits = parseUnits(amount, 6)
      
      await wallet.approveToken({
        tokenAddress: baseToken,
        spender: CONTRACTS.stablecoinDex.address,
        amount
      })
      
      await new Promise(resolve => setTimeout(resolve, 2000))

      let hash
      if (orderStyle === 'flip') {
        const flipTick = priceToTick(flipPrice)
        const placeFlipData = encodeFunctionData({
          abi: CONTRACTS.stablecoinDex.abi,
          functionName: 'placeFlip',
          args: [
            baseToken,
            amountInUnits,
            orderType === 'buy',
            tick,
            flipTick
          ]
        })
        
        hash = await wallet.sendTransaction({
          to: CONTRACTS.stablecoinDex.address,
          data: placeFlipData
        })
      } else {
        const placeData = encodeFunctionData({
          abi: CONTRACTS.stablecoinDex.abi,
          functionName: 'place',
          args: [
            baseToken,
            amountInUnits,
            orderType === 'buy',
            tick
          ]
        })

        hash = await wallet.sendTransaction({
          to: CONTRACTS.stablecoinDex.address,
          data: placeData
        })
      }
      
      setTxHash(hash)
      setSuccess(`✅ ${orderStyle === 'flip' ? 'Flip' : 'Limit'} order placed: ${orderType} ${amount} ${getTokenSymbol(baseToken)} @ $${price}`)
      setAmount('')
      setPrice('1.00')
      setFlipPrice('1.02')
      setQuote(null)
      
      await fetchOrderbook()
      await fetchUserOrders()
      await loadNonces()
    } catch (error) {
      console.error('Order error:', error)
      if (error.message?.includes('user rejected')) {
        setError('Transaction rejected')
      } else if (error.message?.includes('insufficient funds')) {
        setError('Insufficient TEMPO balance for gas')
      } else {
        setError('Failed to place order: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // CANCEL ORDER
  // ============================================
  const handleCancelOrder = async (orderId) => {
    setLoading(true)
    try {
      const wallet = await getWalletClient()
      
      const cancelData = encodeFunctionData({
        abi: CONTRACTS.stablecoinDex.abi,
        functionName: 'cancel',
        args: [orderId]
      })

      const hash = await wallet.sendTransaction({
        to: CONTRACTS.stablecoinDex.address,
        data: cancelData
      })
      
      setSuccess(`✅ Order ${orderId} cancelled successfully`)
      await fetchUserOrders()
      await fetchOrderbook()
    } catch (error) {
      setError('Failed to cancel order: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // CHECK IF PAIR EXISTS
  // ============================================
  const checkPairExists = async () => {
    try {
      const pairAddress = await publicClient.readContract({
        address: CONTRACTS.stablecoinDex.address,
        abi: CONTRACTS.stablecoinDex.abi,
        functionName: 'getPair',
        args: [baseToken, quoteToken]
      }).catch(error => {
        if (error.message?.includes('0xaa4bc69a')) {
          console.log('ℹ️ Pair does not exist');
          return null;
        }
        throw error;
      });
      
      const exists = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
      setPairExists(!!exists);
      setPairAddress(exists ? pairAddress : null);
      return !!exists;
    } catch (error) {
      console.error('Error checking pair:', error);
      setPairExists(false);
      setPairAddress(null);
      return false;
    }
  }

  // ============================================
  // CREATE PAIR
  // ============================================
  const handleCreatePair = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    
    try {
      const tempoBalance = await getRealTempoBalance(account.address)
      if (tempoBalance < 0.01) {
        setError(`Insufficient TEMPO balance: ${tempoBalance.toFixed(6)} TEMPO. Need at least 0.01 TEMPO.`)
        setLoading(false)
        return
      }

      const wallet = await getWalletClient()
      
      const hash = await wallet.createPair({ 
        baseToken, 
        quoteToken 
      })
      
      setTxHash(hash)
      setSuccess('✅ Pair created successfully')
      
      setTimeout(async () => {
        await checkPairExists()
      }, 3000)
      
      await loadNonces()
    } catch (error) {
      console.error('Create pair error:', error)
      if (error.message?.includes('user rejected')) {
        setError('Transaction rejected')
      } else if (error.message?.includes('insufficient funds')) {
        setError('Insufficient TEMPO balance for gas')
      } else if (error.message?.includes('pair already exists')) {
        setError('Pair already exists')
        setPairExists(true)
      } else {
        setError('Failed to create pair: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // GET QUOTE
  // ============================================
  const handleGetQuote = async () => {
    setError('')
    setSuccess('')
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter amount')
      return
    }

    if (baseToken === quoteToken) {
      setError('Base and quote must be different')
      return
    }

    setLoading(true)
    try {
      const exists = await checkPairExists()
      if (!exists) {
        setError('Pair does not exist. Create pair first.')
        setLoading(false)
        return
      }

      const amountInUnits = parseUnits(amount, 6)
      
      const quoteAmount = await publicClient.readContract({
        address: CONTRACTS.stablecoinDex.address,
        abi: CONTRACTS.stablecoinDex.abi,
        functionName: 'getBuyQuote',
        args: [baseToken, amountInUnits, quoteToken]
      })
      
      const quoteInUnits = Number(quoteAmount) / 1e6
      
      setQuote({
        amountIn: amount,
        amountOut: quoteInUnits.toFixed(2),
        tokenIn: getTokenSymbol(baseToken),
        tokenOut: getTokenSymbol(quoteToken),
        rate: (quoteInUnits / parseFloat(amount)).toFixed(4),
        tick: priceToTick(quoteInUnits / parseFloat(amount)).toString()
      })
    } catch (error) {
      console.error('Quote error:', error)
      setError('Failed to get quote: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // SWAP EXACT AMOUNT IN
  // ============================================
  const handleSwapExactIn = async () => {
    setError('')
    setSuccess('')
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter amount')
      return
    }

    if (baseToken === quoteToken) {
      setError('Cannot swap same token')
      return
    }

    setLoading(true)
    try {
      const tempoBalance = await getRealTempoBalance(account.address)
      if (tempoBalance < 0.01) {
        setError(`Insufficient TEMPO for gas. You have ${tempoBalance.toFixed(6)} TEMPO.`)
        setLoading(false)
        return
      }

      const amountInUnits = parseUnits(amount, getTokenDecimals(baseToken))
      
      const quoteAmount = await publicClient.readContract({
        address: CONTRACTS.stablecoinDex.address,
        abi: CONTRACTS.stablecoinDex.abi,
        functionName: 'quoteSwapExactAmountIn',
        args: [baseToken, quoteToken, amountInUnits]
      })

      const expectedOut = Number(quoteAmount) / 1e6
      const minAmountOut = calculateMinAmountOut(expectedOut.toString(), slippage)
      const minAmountOutUnits = parseUnits(minAmountOut, getTokenDecimals(quoteToken))

      const wallet = await getWalletClient()
      
      console.log('📝 Approving token...')
      await wallet.approveToken({
        tokenAddress: baseToken,
        spender: CONTRACTS.stablecoinDex.address,
        amount
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('📝 Executing swap...')
      const swapData = encodeFunctionData({
        abi: CONTRACTS.stablecoinDex.abi,
        functionName: 'swapExactAmountIn',
        args: [baseToken, quoteToken, amountInUnits, minAmountOutUnits]
      })

      const hash = await wallet.sendTransaction({
        to: CONTRACTS.stablecoinDex.address,
        data: swapData
      })

      setTxHash(hash)
      setSuccess(`✅ Swap successful: Sold ${amount} ${getTokenSymbol(baseToken)} for ${expectedOut.toFixed(2)} ${getTokenSymbol(quoteToken)}`)
      setAmount('')
      await loadNonces()
      
    } catch (error) {
      console.error('❌ Swap error:', error)
      
      if (error.message?.includes('user rejected')) {
        setError('Transaction rejected')
      } else if (error.message?.includes('insufficient funds')) {
        setError('Insufficient TEMPO balance for gas')
      } else if (error.message?.includes('nonce')) {
        setError('Nonce error. Please try again.')
      } else if (error.message?.includes('InsufficientLiquidity')) {
        setError('Insufficient liquidity in orderbook')
      } else {
        setError('Swap failed: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // SWAP EXACT AMOUNT OUT
  // ============================================
  const handleSwapExactOut = async () => {
    setError('')
    setSuccess('')
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter amount')
      return
    }

    if (baseToken === quoteToken) {
      setError('Cannot swap same token')
      return
    }

    setLoading(true)
    try {
      const tempoBalance = await getRealTempoBalance(account.address)
      if (tempoBalance < 0.01) {
        setError(`Insufficient TEMPO for gas. You have ${tempoBalance.toFixed(6)} TEMPO.`)
        setLoading(false)
        return
      }

      const amountOutUnits = parseUnits(amount, getTokenDecimals(quoteToken))
      
      const quoteAmount = await publicClient.readContract({
        address: CONTRACTS.stablecoinDex.address,
        abi: CONTRACTS.stablecoinDex.abi,
        functionName: 'quoteSwapExactAmountOut',
        args: [baseToken, quoteToken, amountOutUnits]
      })

      const requiredIn = Number(quoteAmount) / 1e6
      const maxAmountIn = calculateMaxAmountIn(requiredIn.toString(), slippage)
      const maxAmountInUnits = parseUnits(maxAmountIn, getTokenDecimals(baseToken))

      const wallet = await getWalletClient()
      
      console.log('📝 Approving token...')
      await wallet.approveToken({
        tokenAddress: baseToken,
        spender: CONTRACTS.stablecoinDex.address,
        amount: maxAmountIn
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('📝 Executing swap...')
      const swapData = encodeFunctionData({
        abi: CONTRACTS.stablecoinDex.abi,
        functionName: 'swapExactAmountOut',
        args: [baseToken, quoteToken, amountOutUnits, maxAmountInUnits]
      })

      const hash = await wallet.sendTransaction({
        to: CONTRACTS.stablecoinDex.address,
        data: swapData
      })

      setTxHash(hash)
      setSuccess(`✅ Swap successful: Paid ${requiredIn.toFixed(2)} ${getTokenSymbol(baseToken)} for ${amount} ${getTokenSymbol(quoteToken)}`)
      setAmount('')
      await loadNonces()
      
    } catch (error) {
      console.error('Swap error:', error)
      if (error.message?.includes('user rejected')) {
        setError('Transaction rejected')
      } else if (error.message?.includes('insufficient funds')) {
        setError('Insufficient TEMPO balance for gas')
      } else if (error.message?.includes('nonce')) {
        setError('Nonce error. Please try again.')
      } else if (error.message?.includes('InsufficientLiquidity')) {
        setError('Insufficient liquidity in orderbook')
      } else {
        setError('Swap failed: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // EXECUTE PARALLEL TRANSACTIONS
  // ============================================
  const handleExecuteParallel = async () => {
    setError('')
    setSuccess('')
    setParallelResults([])
    
    const addresses = [parallelAddr1, parallelAddr2, parallelAddr3].filter(a => a)
    const amounts = [parallelAmount1, parallelAmount2, parallelAmount3].filter(a => a && parseFloat(a) > 0)
    
    if (addresses.length === 0 || amounts.length === 0) {
      setError('Enter at least one address and amount')
      return
    }
    
    if (addresses.length !== amounts.length) {
      setError('Each address needs an amount')
      return
    }

    setLoading(true)
    
    try {
      const wallet = await getWalletClient()
      const results = []
      
      const txPromises = addresses.map(async (addr, index) => {
        const amt = amounts[index]
        const nonceKey = parallelNonceKey + index
        
        try {
          const amountInUnits = parseUnits(amt, getTokenDecimals(baseToken))
          
          const transferData = encodeFunctionData({
            abi: CONTRACTS.tokens.pathUSD.abi,
            functionName: 'transfer',
            args: [addr, amountInUnits]
          })
          
          const hash = await wallet.sendTransaction({
            to: baseToken,
            data: transferData,
            nonceKey: nonceKey
          })
          
          return {
            address: shortAddress(addr),
            amount: amt,
            hash,
            success: true,
            nonceKey
          }
        } catch (err) {
          return {
            address: shortAddress(addr),
            amount: amt,
            error: err.message,
            success: false,
            nonceKey
          }
        }
      })
      
      const txResults = await Promise.all(txPromises)
      setParallelResults(txResults)
      
      const successCount = txResults.filter(r => r.success).length
      setSuccess(`✅ ${successCount}/${txResults.length} transactions completed in parallel`)
      
      setParallelAddr1('')
      setParallelAddr2('')
      setParallelAddr3('')
      setParallelAmount1('')
      setParallelAmount2('')
      setParallelAmount3('')
      
    } catch (error) {
      console.error('Parallel execution error:', error)
      setError('Parallel execution failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // SWAP TOKENS
  // ============================================
  const handleSwapTokens = () => {
    const temp = baseToken
    setBaseToken(quoteToken)
    setQuoteToken(temp)
    setQuote(null)
    checkPairExists()
  }

  // ============================================
  // COPY & VIEW
  // ============================================
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleViewTx = (hash) => {
    window.open(`${EXPLORER_URL}/tx/${hash}`, '_blank')
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp size={24} />
        Stablecoin DEX
      </h2>
      
      <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="address-short">{shortAddress(account?.address)}</span>
        <span style={{ 
          color: pairExists ? 'var(--success)' : 'var(--gray-500)',
          fontSize: '0.75rem'
        }}>
          • {pairExists ? 'Pair Active' : 'No Pair'}
        </span>
        {pairAddress && pairExists && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
            {shortAddress(pairAddress)}
          </span>
        )}
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.75rem',
          color: 'var(--gray-600)',
          background: 'var(--gray-50)',
          padding: '0.25rem 0.5rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)'
        }}>
          <Zap size={12} />
          Gas: ~0.01 TEMPO
        </span>
      </div>

      {error && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: 'var(--gray-50)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--error)',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--error)'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: 'var(--gray-50)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--success)',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <CheckCircle size={16} color="var(--success)" />
          <span>{success}</span>
          {txHash && (
            <button
              onClick={() => handleViewTx(txHash)}
              style={{
                marginLeft: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--gray-700)',
                cursor: 'pointer'
              }}
            >
              {shortAddress(txHash)} <ExternalLink size={12} />
            </button>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('limit')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'limit' ? 'var(--black)' : 'transparent',
            color: activeTab === 'limit' ? 'var(--white)' : 'var(--gray-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <BookOpen size={16} style={{ marginRight: '0.5rem' }} />
          Limit Orders
        </button>
        <button
          onClick={() => setActiveTab('swap')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'swap' ? 'var(--black)' : 'transparent',
            color: activeTab === 'swap' ? 'var(--white)' : 'var(--gray-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <ArrowDownUp size={16} style={{ marginRight: '0.5rem' }} />
          Instant Swap
        </button>
        <button
          onClick={() => setActiveTab('parallel')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'parallel' ? 'var(--black)' : 'transparent',
            color: activeTab === 'parallel' ? 'var(--white)' : 'var(--gray-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Layers size={16} style={{ marginRight: '0.5rem' }} />
          Parallel
        </button>
      </div>

      {/* ===== LIMIT ORDERS TAB ===== */}
      {activeTab === 'limit' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowUserOrders(!showUserOrders)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <History size={14} />
              {showUserOrders ? 'Hide My Orders' : 'My Orders'}
            </button>
            <button
              onClick={fetchOrderbook}
              className="btn-secondary"
              disabled={loadingOrderbook}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <BarChart3 size={14} />
              {loadingOrderbook ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Orderbook */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {/* Bids */}
            <div className="card" style={{ padding: '0.75rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '0.75rem',
                color: 'var(--success)',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                <TrendUp size={16} />
                Bids (Buy Orders)
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '0.25rem',
                fontSize: '0.6875rem',
                color: 'var(--gray-500)',
                marginBottom: '0.5rem',
                padding: '0.25rem 0'
              }}>
                <span>Price</span>
                <span>Amount</span>
                <span>Total</span>
                <span>Tick</span>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {orderbook.bids.map((bid, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      gap: '0.25rem',
                      padding: '0.25rem 0',
                      fontSize: '0.75rem',
                      borderBottom: i < orderbook.bids.length - 1 ? '1px solid var(--border)' : 'none',
                      color: 'var(--success)',
                      opacity: 1 - i * 0.08
                    }}
                  >
                    <span style={{ fontWeight: '600' }}>${bid.price}</span>
                    <span>{Number(bid.amount).toLocaleString()}</span>
                    <span>${Number(bid.total).toLocaleString()}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                      {bid.tick}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Asks */}
            <div className="card" style={{ padding: '0.75rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '0.75rem',
                color: 'var(--error)',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                <TrendingDown size={16} />
                Asks (Sell Orders)
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '0.25rem',
                fontSize: '0.6875rem',
                color: 'var(--gray-500)',
                marginBottom: '0.5rem',
                padding: '0.25rem 0'
              }}>
                <span>Price</span>
                <span>Amount</span>
                <span>Total</span>
                <span>Tick</span>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {orderbook.asks.map((ask, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      gap: '0.25rem',
                      padding: '0.25rem 0',
                      fontSize: '0.75rem',
                      borderBottom: i < orderbook.asks.length - 1 ? '1px solid var(--border)' : 'none',
                      color: 'var(--error)',
                      opacity: 1 - i * 0.08
                    }}
                  >
                    <span style={{ fontWeight: '600' }}>${ask.price}</span>
                    <span>{Number(ask.amount).toLocaleString()}</span>
                    <span>${Number(ask.total).toLocaleString()}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                      {ask.tick}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Orders */}
          {showUserOrders && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={16} />
                My Active Orders
              </h3>
              
              {userOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {userOrders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        background: 'var(--gray-50)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ 
                        color: order.type === 'Buy' ? 'var(--success)' : 'var(--error)',
                        fontWeight: '600'
                      }}>
                        {order.type}
                      </span>
                      <span>${order.price}</span>
                      <span>{order.amount}</span>
                      <span style={{ color: 'var(--gray-600)' }}>Filled: {order.filled}</span>
                      <span style={{ 
                        color: order.status === 'Active' ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {order.status}
                      </span>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="btn-icon"
                        style={{ width: '28px', height: '28px' }}
                        title="Cancel order"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--gray-400)' }}>
                  No active orders
                </div>
              )}
            </div>
          )}

          {/* Create Pair Card */}
          {!pairExists && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                Create Trading Pair
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <select 
                  value={baseToken}
                  onChange={(e) => setBaseToken(e.target.value)}
                  style={{ flex: 1, height: '36px' }}
                >
                  {Object.values(CONTRACTS.tokens).map(t => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
                
                <button 
                  onClick={handleSwapTokens}
                  className="btn-icon"
                  style={{ width: '36px', height: '36px' }}
                >
                  <ArrowLeftRight size={14} />
                </button>
                
                <select 
                  value={quoteToken}
                  onChange={(e) => setQuoteToken(e.target.value)}
                  style={{ flex: 1, height: '36px' }}
                >
                  {Object.values(CONTRACTS.tokens).map(t => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
              
              <button 
                className="btn-primary"
                onClick={handleCreatePair}
                disabled={loading || baseToken === quoteToken}
                style={{ width: '100%' }}
              >
                {loading ? 'Creating...' : 'Create Pair'}
              </button>
            </div>
          )}

          {/* Place Order Card */}
          {pairExists && (
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={16} />
                Place Order
                <span style={{ fontSize: '0.625rem', color: 'var(--gray-500)', marginLeft: 'auto' }}>
                  Tick = (price - 1) × 100,000
                </span>
              </h3>
              
              {/* Order Type Selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  className={`btn-small ${orderStyle === 'limit' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOrderStyle('limit')}
                  style={{ flex: 1 }}
                >
                  Limit Order
                </button>
                <button
                  className={`btn-small ${orderStyle === 'flip' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOrderStyle('flip')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <Repeat size={12} />
                  Flip Order
                </button>
              </div>
              
              {/* Buy/Sell Toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  className={`btn-small ${orderType === 'buy' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOrderType('buy')}
                  style={{ flex: 1 }}
                >
                  Buy {getTokenSymbol(baseToken)}
                </button>
                <button
                  className={`btn-small ${orderType === 'sell' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOrderType('sell')}
                  style={{ flex: 1 }}
                >
                  Sell {getTokenSymbol(baseToken)}
                </button>
              </div>
              
              {/* Price Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                  Price (USD)
                </label>
                <input
                  type="number"
                  placeholder="1.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.0001"
                  min="0.98"
                  max="1.02"
                  style={{ width: '100%', height: '36px' }}
                />
                <div style={{ fontSize: '0.625rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                  Tick: {priceToTick(price)} (must be within ±2000)
                </div>
              </div>
              
              {/* Flip Price Input */}
              {orderStyle === 'flip' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                    Flip Price (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="1.02"
                    value={flipPrice}
                    onChange={(e) => setFlipPrice(e.target.value)}
                    step="0.0001"
                    min="0.98"
                    max="1.02"
                    style={{ width: '100%', height: '36px' }}
                  />
                  <div style={{ fontSize: '0.625rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                    Flip Tick: {priceToTick(flipPrice)}
                  </div>
                </div>
              )}
              
              {/* Amount Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                  Amount
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  style={{ width: '100%', height: '36px' }}
                />
              </div>
              
              {/* Order Summary */}
              <div style={{ 
                padding: '0.5rem', 
                background: 'var(--gray-50)', 
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.6875rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tick:</span>
                  <span style={{ fontWeight: '600' }}>{priceToTick(price)}</span>
                </div>
                {orderStyle === 'flip' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span>Flip Tick:</span>
                    <span style={{ fontWeight: '600' }}>{priceToTick(flipPrice)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span>Total:</span>
                  <span style={{ fontWeight: '600' }}>${(parseFloat(amount || 0) * parseFloat(price || 1)).toFixed(2)}</span>
                </div>
              </div>
              
              <button 
                className="btn-primary"
                onClick={handlePlaceOrder}
                disabled={loading || !amount || !price}
                style={{ width: '100%' }}
              >
                {loading ? 'Processing...' : `Place ${orderStyle === 'flip' ? 'Flip' : 'Limit'} Order`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== INSTANT SWAP TAB ===== */}
      {activeTab === 'swap' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowDownUp size={18} />
              Instant Swap
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Slippage:</span>
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                style={{
                  width: '60px',
                  padding: '0.25rem 0.5rem',
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  textAlign: 'right'
                }}
                step="0.1"
                min="0.1"
                max="5"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>%</span>
            </div>
          </div>

          <div style={{ 
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            background: 'var(--gray-50)',
            padding: '0.25rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setSwapMode('exactIn')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: swapMode === 'exactIn' ? 'var(--white)' : 'transparent',
                border: swapMode === 'exactIn' ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: swapMode === 'exactIn' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              Sell Exact
            </button>
            <button
              onClick={() => setSwapMode('exactOut')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: swapMode === 'exactOut' ? 'var(--white)' : 'transparent',
                border: swapMode === 'exactOut' ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: swapMode === 'exactOut' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              Buy Exact
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                  {swapMode === 'exactIn' ? 'You Pay' : 'You Pay (Max)'}
                </label>
                <select
                  value={baseToken}
                  onChange={(e) => setBaseToken(e.target.value)}
                  style={{ width: '100%', height: '40px' }}
                >
                  {Object.values(CONTRACTS.tokens).map(t => (
                    <option key={t.address} value={t.address}>
                      {t.symbol} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={handleSwapTokens}
                className="btn-icon"
                style={{ width: '40px', height: '40px', marginTop: '16px' }}
                title="Swap tokens"
              >
                <ArrowLeftRight size={16} />
              </button>
              
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                  {swapMode === 'exactIn' ? 'You Receive (Min)' : 'You Receive'}
                </label>
                <select
                  value={quoteToken}
                  onChange={(e) => setQuoteToken(e.target.value)}
                  style={{ width: '100%', height: '40px' }}
                >
                  {Object.values(CONTRACTS.tokens).map(t => (
                    <option key={t.address} value={t.address}>
                      {t.symbol} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
              {swapMode === 'exactIn' ? 'Amount to Sell' : 'Amount to Buy'}
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              style={{ width: '100%', height: '48px', fontSize: '1rem' }}
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div style={{ 
              padding: '1rem',
              background: 'var(--gray-50)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Rate:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                  1 {getTokenSymbol(baseToken)} ≈ 1.00 {getTokenSymbol(quoteToken)}
                </span>
              </div>
              {swapMode === 'exactIn' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Minimum received:</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--success)' }}>
                    {calculateMinAmountOut(amount, slippage)} {getTokenSymbol(quoteToken)}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Maximum paid:</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--warning)' }}>
                    {calculateMaxAmountIn(amount, slippage)} {getTokenSymbol(baseToken)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Slippage tolerance:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{slippage}%</span>
              </div>
            </div>
          )}

          <button 
            className="btn-primary"
            onClick={swapMode === 'exactIn' ? handleSwapExactIn : handleSwapExactOut}
            disabled={loading || !amount || parseFloat(amount) <= 0 || baseToken === quoteToken}
            style={{ width: '100%', height: '48px', fontSize: '0.875rem' }}
          >
            {loading ? 'Processing...' : `Swap ${getTokenSymbol(baseToken)} → ${getTokenSymbol(quoteToken)}`}
          </button>
        </div>
      )}

      {/* ===== PARALLEL TAB ===== */}
      {activeTab === 'parallel' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} />
            Parallel Transactions
            <span style={{
              fontSize: '0.6875rem',
              color: 'var(--gray-500)',
              background: 'var(--gray-50)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginLeft: 'auto'
            }}>
              2D Nonces
            </span>
          </h3>

          <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
            Send multiple transactions concurrently using Tempo's 2D nonce system.
            Each transaction uses a different <strong>nonce key</strong>, allowing them to execute in parallel.
          </p>

          {/* Mode Selector */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '1.5rem',
            background: 'var(--gray-50)',
            padding: '0.25rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setParallelMode('transfer')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: parallelMode === 'transfer' ? 'var(--white)' : 'transparent',
                border: parallelMode === 'transfer' ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: parallelMode === 'transfer' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              <Send size={14} style={{ marginRight: '0.25rem' }} />
              Parallel Transfer
            </button>
            <button
              onClick={() => setParallelMode('batch')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: parallelMode === 'batch' ? 'var(--white)' : 'transparent',
                border: parallelMode === 'batch' ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: parallelMode === 'batch' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              <Layers size={14} style={{ marginRight: '0.25rem' }} />
              Batch Transactions
            </button>
          </div>

          {/* Parallel Transfer Mode */}
          {parallelMode === 'transfer' && (
            <>
              {/* Token Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                  Token to Send
                </label>
                <select
                  value={baseToken}
                  onChange={(e) => setBaseToken(e.target.value)}
                  style={{ width: '100%', height: '40px' }}
                >
                  {Object.values(CONTRACTS.tokens).map(t => (
                    <option key={t.address} value={t.address}>
                      {t.symbol} — {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nonce Key Settings */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                marginBottom: '1rem',
                padding: '0.5rem',
                background: 'var(--gray-50)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <span style={{ fontSize: '0.75rem' }}>Starting Nonce Key:</span>
                <select
                  value={parallelNonceKey}
                  onChange={(e) => setParallelNonceKey(parseInt(e.target.value))}
                  style={{ width: '80px', height: '32px' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                  Each tx gets a unique key
                </span>
              </div>

              {/* Transaction 1 */}
              <div style={{ 
                padding: '0.75rem', 
                background: 'var(--gray-50)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    width: '20px', 
                    height: '20px', 
                    background: 'var(--black)', 
                    color: 'var(--white)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: '700'
                  }}>1</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nonce Key: {parallelNonceKey}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Address (0x...)"
                    value={parallelAddr1}
                    onChange={(e) => setParallelAddr1(e.target.value)}
                    style={{ height: '36px', fontSize: '0.75rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={parallelAmount1}
                    onChange={(e) => setParallelAmount1(e.target.value)}
                    step="0.01"
                    min="0"
                    style={{ height: '36px', fontSize: '0.75rem' }}
                  />
                </div>
              </div>

              {/* Transaction 2 */}
              <div style={{ 
                padding: '0.75rem', 
                background: 'var(--gray-50)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    width: '20px', 
                    height: '20px', 
                    background: 'var(--black)', 
                    color: 'var(--white)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: '700'
                  }}>2</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nonce Key: {parallelNonceKey + 1}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Address (0x...)"
                    value={parallelAddr2}
                    onChange={(e) => setParallelAddr2(e.target.value)}
                    style={{ height: '36px', fontSize: '0.75rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={parallelAmount2}
                    onChange={(e) => setParallelAmount2(e.target.value)}
                    step="0.01"
                    min="0"
                    style={{ height: '36px', fontSize: '0.75rem' }}
                  />
                </div>
              </div>

              {/* Transaction 3 */}
              <div style={{ 
                padding: '0.75rem', 
                background: 'var(--gray-50)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    width: '20px', 
                    height: '20px', 
                    background: 'var(--black)', 
                    color: 'var(--white)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: '700'
                  }}>3</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nonce Key: {parallelNonceKey + 2}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Address (0x...)"
                    value={parallelAddr3}
                    onChange={(e) => setParallelAddr3(e.target.value)}
                    style={{ height: '36px', fontSize: '0.75rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={parallelAmount3}
                    onChange={(e) => setParallelAmount3(e.target.value)}
                    step="0.01"
                    min="0"
                    style={{ height: '36px', fontSize: '0.75rem' }}
                  />
                </div>
              </div>

              {/* Execute Button */}
              <button 
                className="btn-primary"
                onClick={handleExecuteParallel}
                disabled={loading || (!parallelAddr1 && !parallelAddr2 && !parallelAddr3)}
                style={{ width: '100%', height: '48px', marginBottom: '1rem' }}
              >
                <Layers size={16} style={{ marginRight: '0.5rem' }} />
                {loading ? 'Processing...' : '⚡ Execute Parallel Transfers'}
              </button>
            </>
          )}

          {/* Batch Transactions Mode */}
          {parallelMode === 'batch' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                  Batch Operations
                </label>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
                  Execute multiple operations atomically in a single transaction
                </p>
              </div>

              {/* Example Batch Transaction */}
              <div style={{
                padding: '1rem',
                background: 'var(--gray-50)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                marginBottom: '1rem'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  Batch Transfer Example
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>1.</span>
                    <span style={{ fontSize: '0.75rem' }}>Transfer 1000 pUSD to Alice</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>2.</span>
                    <span style={{ fontSize: '0.75rem' }}>Transfer 500 aUSD to Bob</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>3.</span>
                    <span style={{ fontSize: '0.75rem' }}>Call contract function</span>
                  </div>
                </div>

                <button 
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={() => {
                    setParallelAddr1('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbb')
                    setParallelAmount1('1000')
                    setParallelAddr2('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
                    setParallelAmount2('500')
                    setParallelMode('transfer')
                  }}
                >
                  Use Example
                </button>
              </div>

              <div style={{
                padding: '1rem',
                background: 'var(--gray-50)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                marginBottom: '1rem'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Fee Sponsorship
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.75rem' }}>
                  Have another account pay for transaction fees
                </p>
                <button className="btn-secondary" style={{ width: '100%' }} disabled>
                  Coming Soon
                </button>
              </div>
            </>
          )}

          {/* Results */}
          {parallelResults.length > 0 && (
            <div style={{ 
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'var(--gray-50)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)'
            }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Transaction Results:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {parallelResults.map((result, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.6875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '600' }}>Key {result.nonceKey}:</span>{' '}
                      {result.success ? (
                        <span style={{ color: 'var(--success)' }}>✓ {result.amount} → {result.address}</span>
                      ) : (
                        <span style={{ color: 'var(--error)' }}>✗ {result.error}</span>
                      )}
                    </div>
                    {result.success && (
                      <button
                        onClick={() => handleViewTx(result.hash)}
                        className="btn-icon"
                        style={{ width: '24px', height: '24px' }}
                      >
                        <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2D Nonce Explanation */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'var(--gray-50)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.6875rem'
          }}>
            <strong>How 2D Nonces Work:</strong>
            <ul style={{ marginTop: '0.25rem', paddingLeft: '1rem' }}>
              <li>Each transaction has a <strong>nonce key</strong> (1, 2, 3, etc.) and a <strong>nonce value</strong></li>
              <li>Transactions with different keys execute in parallel</li>
              <li>Same key transactions execute sequentially</li>
              <li>All confirm at the same time (~0.5s finality)</li>
            </ul>
          </div>
        </div>
      )}

      {/* DEX Contract Info */}
      <div style={{ 
        padding: '0.75rem 1rem',
        background: 'var(--gray-50)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginTop: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={14} />
          <span style={{ fontWeight: '500' }}>DEX Contract:</span>
          <code style={{ 
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--white)',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}>
            {shortAddress(CONTRACTS.stablecoinDex.address)}
          </code>
        </div>
        
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            onClick={() => handleCopy(CONTRACTS.stablecoinDex.address, 'dex')}
            className="btn-icon"
            title="Copy address"
          >
            {copied === 'dex' ? <CheckCircle size={14} color="var(--success)" /> : <Copy size={14} />}
          </button>
          <button 
            onClick={() => window.open(`${EXPLORER_URL}/address/${CONTRACTS.stablecoinDex.address}`, '_blank')}
            className="btn-icon"
            title="View in explorer"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      <div style={{
        marginTop: '0.75rem',
        padding: '0.5rem',
        fontSize: '0.6875rem',
        color: 'var(--gray-500)',
        textAlign: 'center',
        borderTop: '1px solid var(--border)'
      }}>
        ⚡ Price-Time Priority • Tick: (price - 1) × 100,000 • ±2% range
      </div>
    </div>
  )
}
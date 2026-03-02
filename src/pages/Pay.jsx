import React, { useState, useEffect } from 'react'
import { 
  Send, Download, Users, Copy,
  CheckCircle, CreditCard, Clock,
  Fingerprint, AlertCircle, Info
} from 'lucide-react'
import { 
  shortAddress, 
  getWalletClient,
  publicClient,
  createPasskeyAccount,
  loadPasskeyAccount,
  sendPasskeyTransaction
} from '../lib/tempo'
import { CONTRACTS, EXPLORER_URL } from '../config/contracts'
import { parseUnits, encodeFunctionData } from 'viem'
import PasskeyAuthSimple from '../components/PasskeyAuthSimple'

export default function Pay({ account: metaMaskAccount }) {
  // ============================================
  // STATE
  // ============================================
  const [activeTab, setActiveTab] = useState('send')
  const [copied, setCopied] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [memo, setMemo] = useState('')
  const [selectedToken, setSelectedToken] = useState(CONTRACTS.tokens.pathUSD.address)
  
  // Auth mode
  const [usePasskey, setUsePasskey] = useState(false)
  const [passkeyAccount, setPasskeyAccount] = useState(null)
  const [passkeyAddress, setPasskeyAddress] = useState('')
  const [isLoadingPasskey, setIsLoadingPasskey] = useState(true)
  const [passkeySupported, setPasskeySupported] = useState(true)
  
  // Fee token
  const [feeTokenAddress, setFeeTokenAddress] = useState('')
  const [accountFeeToken, setAccountFeeToken] = useState(null)
  const [feeInSameToken, setFeeInSameToken] = useState(true)
  
  // Advanced options
  const [useNonceKey, setUseNonceKey] = useState(false)
  const [nonceKey, setNonceKey] = useState(1)
  const [useScheduled, setUseScheduled] = useState(false)
  const [validAfter, setValidAfter] = useState('')
  const [validBefore, setValidBefore] = useState('')
  
  // Transaction state
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txDetails, setTxDetails] = useState(null)

  // ============================================
  // ПРОВЕРКА ПОДДЕРЖКИ PASSKEY
  // ============================================
  useEffect(() => {
    const checkPasskeySupport = () => {
      const supported = window.PublicKeyCredential !== undefined && 
                        typeof window.PublicKeyCredential === 'function'
      setPasskeySupported(supported)
      if (!supported) {
        console.warn('❌ WebAuthn not supported in this browser')
      }
    }
    checkPasskeySupport()
  }, [])

  // ============================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================
  useEffect(() => {
    console.log('🔍 Initial localStorage check:', {
      address: localStorage.getItem('tempo-passkey-address'),
      hasCredential: !!localStorage.getItem('tempo-passkey-credential')
    })
    
    if (metaMaskAccount?.address) {
      loadAccountFeeToken()
    }
    
    const loadSavedPasskey = async () => {
      setIsLoadingPasskey(true)
      console.log('🔄 Attempting to load saved passkey...')
      
      try {
        const savedAccount = await loadPasskeyAccount()
        if (savedAccount) {
          console.log('✅ Saved passkey loaded:', savedAccount)
          setPasskeyAccount(savedAccount)
          setPasskeyAddress(savedAccount.address)
          setUsePasskey(true)
          setSuccess(`✅ Passkey loaded: ${shortAddress(savedAccount.address)}`)
        } else {
          console.log('❌ No saved passkey found')
        }
      } catch (error) {
        console.error('Error loading passkey:', error)
      } finally {
        setIsLoadingPasskey(false)
      }
    }
    
    loadSavedPasskey()
  }, [metaMaskAccount])

  const loadAccountFeeToken = async () => {
    try {
      // Здесь функция получения fee token
    } catch (error) {
      console.log('Could not load account fee token')
    }
  }

  // ============================================
  // HANDLERS
  // ============================================
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const getTokenSymbol = (address) => {
    if (!address) return 'default'
    const token = Object.values(CONTRACTS.tokens).find(t => t.address === address)
    return token?.symbol || '???'
  }

  const getTokenDecimals = (address) => {
    const token = Object.values(CONTRACTS.tokens).find(t => t.address === address)
    return token?.decimals || 6
  }

  const isValidAddress = (addr) => {
    return addr && addr.startsWith('0x') && addr.length === 42
  }

  // ============================================
  // PASSKEY HANDLERS
  // ============================================
  const handlePasskeySuccess = async (data) => {
    console.log('🎯 Passkey success data:', data)
    
    // Проверяем что аккаунт имеет адрес
    if (!data.account || !data.account.address) {
      setError('Passkey created but no address found')
      return
    }
    
    setPasskeyAccount(data.account)
    setPasskeyAddress(data.address)
    setUsePasskey(true)
    setSuccess(`✅ Passkey created: ${shortAddress(data.address)}`)
  }

  const handlePasskeyError = (errorMsg) => {
    setError(`Passkey error: ${errorMsg}`)
  }

  // ============================================
  // ФУНКЦИЯ ДЛЯ СОЗДАНИЯ MEMO BYTES
  // ============================================
  const createMemoBytes = (memoText) => {
    if (!memoText) return '0x0000000000000000000000000000000000000000000000000000000000000000'
    
    const encoder = new TextEncoder()
    const memoBytesArray = encoder.encode(memoText)
    const fullArray = new Uint8Array(32)
    fullArray.set(memoBytesArray.slice(0, 32))
    return '0x' + Array.from(fullArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // ============================================
  // ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ABI ВЫБРАННОГО ТОКЕНА
  // ============================================
  const getTokenAbi = () => {
    const tokenKey = Object.keys(CONTRACTS.tokens).find(
      key => CONTRACTS.tokens[key].address === selectedToken
    )
    return CONTRACTS.tokens[tokenKey]?.abi || CONTRACTS.tokens.pathUSD.abi
  }

  // ============================================
  // SEND PAYMENT
  // ============================================
  const handleSendPayment = async () => {
    setError('')
    setSuccess('')
    setTxDetails(null)
    
    if (!recipient || !amount) {
      setError('Enter recipient and amount')
      return
    }

    if (!isValidAddress(recipient)) {
      setError('Invalid recipient address')
      return
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (usePasskey && !passkeyAccount) {
      setError('Please create a Passkey first')
      return
    }

    if (!usePasskey && !metaMaskAccount?.address) {
      setError('Please connect MetaMask first')
      return
    }

    // Проверяем адрес Passkey перед отправкой
    if (usePasskey && passkeyAccount) {
      if (!passkeyAccount.address) {
        setError('Passkey account has no address. Please recreate.')
        return
      }
      
      if (passkeyAccount.address.length !== 42) {
        setError(`Invalid passkey address length: ${passkeyAccount.address.length}`)
        return
      }
      
      console.log('✅ Passkey address valid:', passkeyAccount.address)
    }

    setLoading(true)
    try {
      let hash
      let details = {}
      
      if (usePasskey && passkeyAccount) {
        // ============================================
        // PASSKEY ТРАНЗАКЦИЯ
        // ============================================
        console.log('🚀 Sending passkey transaction with account:', passkeyAccount)
        
        // Определяем токен для оплаты комиссии
        const feeToken = feeInSameToken ? selectedToken : (feeTokenAddress || undefined)
        
        console.log('💸 Fee payment:', feeInSameToken ? 'in same token' : `in ${getTokenSymbol(feeToken)}`)
        
        details = {
          type: 'passkey',
          from: passkeyAccount.address,
          to: recipient,
          amount,
          token: getTokenSymbol(selectedToken),
          feeToken: feeInSameToken ? 'same token' : getTokenSymbol(feeToken)
        }
        
        hash = await sendPasskeyTransaction({
          passkeyAccount,
          tokenAddress: selectedToken,
          to: recipient,
          amount,
          memo,
          feeToken: feeInSameToken ? selectedToken : (feeTokenAddress || undefined),
          nonceKey: useNonceKey ? nonceKey : undefined,
          validAfter: useScheduled ? (validAfter ? parseInt(validAfter) : Math.floor(Date.now() / 1000) + 3600) : undefined,
          validBefore: useScheduled ? (validBefore ? parseInt(validBefore) : Math.floor(Date.now() / 1000) + 86400) : undefined
        })
        
        setSuccess(`✅ Payment sent with Passkey! ${amount} ${getTokenSymbol(selectedToken)} sent to ${shortAddress(recipient)}`)
        
      } else {
        // ============================================
        // METAMASK ТРАНЗАКЦИЯ
        // ============================================
        const wallet = await getWalletClient()
        const amountInUnits = parseUnits(amount, getTokenDecimals(selectedToken))
        
        const memoBytes = createMemoBytes(memo)
        const tokenAbi = getTokenAbi()

        const transferData = encodeFunctionData({
          abi: tokenAbi,
          functionName: memo ? 'transferWithMemo' : 'transfer',
          args: memo 
            ? [recipient, amountInUnits, memoBytes]
            : [recipient, amountInUnits]
        })

        const txOptions = { 
          to: selectedToken, 
          data: transferData
        }
        
        // Определяем токен для оплаты комиссии
        if (feeInSameToken) {
          txOptions.feeToken = selectedToken
        } else if (feeTokenAddress) {
          txOptions.feeToken = feeTokenAddress
        }
        
        if (useNonceKey) txOptions.nonceKey = nonceKey
        if (useScheduled) {
          txOptions.validAfter = validAfter ? parseInt(validAfter) : Math.floor(Date.now() / 1000) + 3600
          txOptions.validBefore = validBefore ? parseInt(validBefore) : Math.floor(Date.now() / 1000) + 86400
        }
        
        details = {
          type: 'metamask',
          from: metaMaskAccount.address,
          to: recipient,
          amount,
          token: getTokenSymbol(selectedToken),
          feeToken: feeInSameToken ? 'same token' : (feeTokenAddress ? getTokenSymbol(feeTokenAddress) : 'TEMPO')
        }
        
        hash = await wallet.sendTransaction(txOptions)
        setSuccess(`✅ Payment sent! ${amount} ${getTokenSymbol(selectedToken)} sent to ${shortAddress(recipient)}`)
      }
      
      setTxHash(hash)
      setTxDetails(details)
      setRecipient('')
      setAmount('')
      setMemo('')
      
    } catch (error) {
      console.error('Send error:', error)
      
      if (error.message?.includes('user rejected')) {
        setError('Transaction rejected by user')
      } else if (error.message?.includes('insufficient funds')) {
        setError('Insufficient balance for gas')
      } else if (error.message?.includes('Passkey') || error.message?.includes('passkey')) {
        setError('Passkey error: ' + error.message)
      } else if (error.message?.includes('address is missing')) {
        setError('Passkey address error. Please recreate passkey.')
      } else {
        setError('Failed: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const activeAccount = usePasskey && passkeyAddress 
    ? passkeyAddress 
    : metaMaskAccount?.address

  return (
    <div className="panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CreditCard size={24} />
        Tempo Pay
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--gray-500)',
          background: 'var(--gray-50)',
          padding: '0.25rem 0.5rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          marginLeft: '0.5rem'
        }}>
          {usePasskey ? '🔐 Passkey' : '🦊 MetaMask'}
        </span>
      </h2>
      
      <div className="subtitle" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="address-short">{shortAddress(activeAccount) || 'Not connected'}</span>
          {passkeyAccount && (
            <span style={{ 
              fontSize: '0.6875rem', 
              color: 'var(--success)',
              background: 'var(--success-light)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--success)'
            }}>
              ✓ Passkey
            </span>
          )}
          {isLoadingPasskey && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
              Loading...
            </span>
          )}
          {!passkeySupported && (
            <span style={{ 
              fontSize: '0.6875rem', 
              color: 'var(--warning)',
              background: 'var(--warning-light)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--warning)'
            }}>
              ⚠️ Passkey not supported
            </span>
          )}
        </div>
        {accountFeeToken && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
            Default fee: {accountFeeToken.symbol}
          </span>
        )}
      </div>

      {error && (
        <div style={{ 
          padding: '0.75rem', 
          background: 'var(--gray-50)', 
          borderLeft: '3px solid var(--error)', 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} color="var(--error)" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: '0.75rem', 
          background: 'var(--gray-50)', 
          borderLeft: '3px solid var(--success)', 
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <CheckCircle size={16} color="var(--success)" />
            <span>{success}</span>
            {txHash && (
              <button 
                onClick={() => window.open(`${EXPLORER_URL}/tx/${txHash}`, '_blank')}
                className="btn-small"
                style={{ marginLeft: 'auto' }}
              >
                View
              </button>
            )}
          </div>
          {txDetails && (
            <div style={{
              fontSize: '0.75rem',
              background: 'var(--white)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div><strong>From:</strong> {shortAddress(txDetails.from)}</div>
              <div><strong>To:</strong> {shortAddress(txDetails.to)}</div>
              <div><strong>Amount:</strong> {txDetails.amount} {txDetails.token}</div>
              <div><strong>Fee paid in:</strong> {txDetails.feeToken}</div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('send')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'send' ? 'var(--black)' : 'transparent',
            color: activeTab === 'send' ? 'var(--white)' : 'var(--gray-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Send size={16} style={{ marginRight: '0.5rem' }} />
          Send Payment
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'receive' ? 'var(--black)' : 'transparent',
            color: activeTab === 'receive' ? 'var(--white)' : 'var(--gray-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Download size={16} style={{ marginRight: '0.5rem' }} />
          Receive Payment
        </button>
        <button
          onClick={() => setActiveTab('sponsor')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'sponsor' ? 'var(--black)' : 'transparent',
            color: activeTab === 'sponsor' ? 'var(--white)' : 'var(--gray-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Users size={16} style={{ marginRight: '0.5rem' }} />
          Fee Sponsorship
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'scheduled' ? 'var(--black)' : 'transparent',
            color: activeTab === 'scheduled' ? 'var(--white)' : 'var(--gray-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Clock size={16} style={{ marginRight: '0.5rem' }} />
          Scheduled
        </button>
      </div>

      {/* ===== SEND PAYMENT TAB ===== */}
      {activeTab === 'send' && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Send Payment
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* PASSKEY AUTHENTICATION */}
            {passkeySupported && (
              <PasskeyAuthSimple 
                onSuccess={handlePasskeySuccess}
                onError={handlePasskeyError}
                isLoading={isLoadingPasskey}
              />
            )}

            {/* Auth Mode Toggle */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginBottom: '0.5rem',
              background: 'var(--gray-50)',
              padding: '0.25rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)'
            }}>
              <button
                onClick={() => setUsePasskey(false)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: !usePasskey ? 'var(--white)' : 'transparent',
                  border: !usePasskey ? '1px solid var(--border)' : 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: !usePasskey ? '600' : '400',
                  cursor: 'pointer'
                }}
              >
                🦊 MetaMask
              </button>
              <button
                onClick={() => setUsePasskey(true)}
                disabled={!passkeySupported || !passkeyAccount}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: usePasskey ? 'var(--white)' : 'transparent',
                  border: usePasskey ? '1px solid var(--border)' : 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: usePasskey ? '600' : '400',
                  cursor: (!passkeySupported || !passkeyAccount) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  opacity: (!passkeySupported || !passkeyAccount) ? 0.5 : 1
                }}
              >
                <Fingerprint size={14} />
                Passkey {!passkeyAccount && '(Create first)'}
              </button>
            </div>

            {/* Информация о поддержке Passkey */}
            {!passkeySupported && (
              <div style={{
                padding: '0.5rem',
                background: 'var(--warning-light)',
                border: '1px solid var(--warning)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={14} color="var(--warning)" />
                <span>Passkey not supported in this browser. Please use MetaMask or a modern browser.</span>
              </div>
            )}

            {/* Transfer Token */}
            <div>
              <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                Transfer token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                style={{ width: '100%', height: '40px' }}
              >
                {Object.values(CONTRACTS.tokens).map(t => (
                  <option key={t.address} value={t.address}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient */}
            <input
              type="text"
              placeholder="Recipient Address (0x...)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              style={{ width: '100%', height: '40px' }}
            />

            {/* Amount */}
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              style={{ width: '100%', height: '40px' }}
            />

            {/* Memo */}
            <input
              type="text"
              placeholder="Memo (optional)"
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 32))}
              style={{ width: '100%', height: '40px' }}
            />

            {/* Fee Payment Options */}
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.75rem', 
              background: 'var(--gray-50)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)'
            }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                Fee payment
              </label>
              
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={feeInSameToken}
                    onChange={(e) => setFeeInSameToken(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.75rem' }}>Pay fees in the same token (recommended)</span>
                </label>
                <p style={{ fontSize: '0.6875rem', color: 'var(--gray-500)', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                  Fees will be automatically deducted from the transfer amount using Tempo's Fee AMM
                </p>
              </div>
              
              {!feeInSameToken && (
                <>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.25rem' }}>
                    Select fee token
                  </label>
                  <select
                    value={feeTokenAddress || ''}
                    onChange={(e) => setFeeTokenAddress(e.target.value)}
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="">TEMPO (native token)</option>
                    {Object.values(CONTRACTS.tokens).map(t => (
                      <option key={t.address} value={t.address}>
                        {t.symbol}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Advanced Options */}
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                Advanced Options
              </summary>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* 2D Nonces */}
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'var(--gray-50)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={useNonceKey}
                      onChange={(e) => setUseNonceKey(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Use 2D Nonce</span>
                  </label>
                  
                  {useNonceKey && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)' }}>Nonce Key</label>
                      <select
                        value={nonceKey}
                        onChange={(e) => setNonceKey(parseInt(e.target.value))}
                        style={{ width: '100%', height: '32px', marginTop: '0.25rem' }}
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Scheduled Transactions */}
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'var(--gray-50)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={useScheduled}
                      onChange={(e) => setUseScheduled(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Schedule Transaction</span>
                  </label>
                  
                  {useScheduled && (
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)' }}>Valid After</label>
                        <input
                          type="number"
                          placeholder="timestamp"
                          value={validAfter}
                          onChange={(e) => setValidAfter(e.target.value)}
                          style={{ width: '100%', height: '32px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.6875rem', color: 'var(--gray-600)' }}>Valid Before</label>
                        <input
                          type="number"
                          placeholder="timestamp"
                          value={validBefore}
                          onChange={(e) => setValidBefore(e.target.value)}
                          style={{ width: '100%', height: '32px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>

            {/* Информация о комиссии */}
            <div style={{
              padding: '0.5rem',
              background: 'var(--info-light)',
              border: '1px solid var(--info)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Info size={14} color="var(--info)" />
              <span>
                {feeInSameToken 
                  ? `Fees will be paid in ${getTokenSymbol(selectedToken)} using Tempo's Fee AMM`
                  : `Fees will be paid in ${feeTokenAddress ? getTokenSymbol(feeTokenAddress) : 'TEMPO'}`
                }
              </span>
            </div>

            {/* Submit Button */}
            <button
              className="btn-primary"
              onClick={handleSendPayment}
              disabled={loading || !recipient || !amount || !isValidAddress(recipient) || (usePasskey && !passkeyAccount)}
              style={{ 
                width: '100%', 
                height: '44px', 
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  {usePasskey ? <Fingerprint size={16} /> : <Send size={16} />}
                  Send {amount || '0'} {getTokenSymbol(selectedToken)}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===== RECEIVE PAYMENT TAB ===== */}
      {activeTab === 'receive' && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Receive Payment
          </h3>
          
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 1rem',
              background: 'var(--gray-50)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>QR Code</span>
            </div>
            
            <div style={{
              padding: '0.75rem',
              background: 'var(--gray-50)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{shortAddress(activeAccount) || 'Not connected'}</span>
              {activeAccount && (
                <button
                  onClick={() => handleCopy(activeAccount, 'address')}
                  className="btn-icon"
                  style={{ width: '28px', height: '28px' }}
                >
                  {copied === 'address' ? <CheckCircle size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>

            <select
              style={{ width: '100%', height: '40px', marginBottom: '1rem' }}
            >
              {Object.values(CONTRACTS.tokens).map(t => (
                <option key={t.address} value={t.address}>
                  {t.symbol}
                </option>
              ))}
            </select>

            <button className="btn-primary" style={{ width: '100%', height: '44px' }}>
              Generate Payment Link
            </button>
          </div>
        </div>
      )}

      {/* ===== FEE SPONSORSHIP TAB ===== */}
      {activeTab === 'sponsor' && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Fee Sponsorship
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Coming soon</p>
        </div>
      )}

      {/* ===== SCHEDULED TRANSACTIONS TAB ===== */}
      {activeTab === 'scheduled' && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Scheduled Transactions
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Coming soon</p>
        </div>
      )}
    </div>
  )
}
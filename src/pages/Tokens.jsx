import React, { useState, useEffect } from 'react'
import { 
  Send, Copy, ExternalLink, RefreshCw,
  CheckCircle
} from 'lucide-react'
import { 
  publicClient,
  getWalletClient, 
  shortAddress, 
  fetchTokenBalance,
  formatTokenBalance
} from '../lib/tempo'
import { CONTRACTS, EXPLORER_URL } from '../config/contracts'

export default function Tokens({ account }) {
  const [selectedToken, setSelectedToken] = useState(CONTRACTS.tokens.pathUSD.address)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState('0.00')
  const [txHash, setTxHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState('')

  const currentToken = Object.values(CONTRACTS.tokens).find(t => t.address === selectedToken)

  useEffect(() => {
    if (account?.address) loadBalance()
  }, [selectedToken, account])

  const loadBalance = async () => {
    if (!currentToken || !account?.address) return
    const balance = await fetchTokenBalance(currentToken.address, account.address)
    setBalance(formatTokenBalance(balance, currentToken.decimals))
  }

  const handleTransfer = async () => {
    setError('')
    setSuccess('')
    
    if (!recipient) {
      setError('Enter recipient address')
      return
    }
    
    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      setError('Invalid address')
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter amount')
      return
    }

    setLoading(true)
    try {
      const wallet = await getWalletClient()
      const hash = await wallet.transferToken({
        tokenAddress: currentToken.address,
        to: recipient,
        amount
      })
      
      setTxHash(hash)
      setSuccess(`Sent ${amount} ${currentToken?.symbol}`)
      setRecipient('')
      setAmount('')
      setTimeout(() => loadBalance(), 3000)
    } catch (error) {
      setError('Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleExplorer = (hash) => {
    window.open(`${EXPLORER_URL}/tx/${hash}`, '_blank')
  }

  return (
    <div className="panel">
      <h2>Tokens</h2>
      <div className="subtitle">
        <span className="address-short">{shortAddress(account?.address)}</span>
      </div>

      {error && (
        <div className="notification error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="notification success">
          ✅ {success}
          {txHash && (
            <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.75rem' }}>{shortAddress(txHash)}</code>
              <button onClick={() => handleExplorer(txHash)} className="btn-icon" style={{ width: 24, height: 24 }}>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <h3>Transfer</h3>
          <div className="form-group">
            <select 
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
            >
              {Object.values(CONTRACTS.tokens).map(token => (
                <option key={token.address} value={token.address}>
                  {token.symbol} — {token.name}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Recipient (0x...)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
            />
            
            <div className="balance-info">
              Balance: {balance} {currentToken?.symbol}
            </div>
            
            <button 
              className="btn-primary"
              onClick={handleTransfer}
              disabled={loading || !recipient || !amount}
            >
              <Send size={14} />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Token List</h3>
          <div className="tokens-list">
            {Object.values(CONTRACTS.tokens).map(token => (
              <div key={token.address} className="token-item">
                <div className="token-info">
                  <div className="token-symbol">{token.symbol}</div>
                  <div className="token-details">
                    <strong>{token.name}</strong>
                    <small>{shortAddress(token.address)}</small>
                  </div>
                </div>
                <div className="token-actions">
                  <button 
                    className="btn-icon"
                    onClick={() => handleCopy(token.address, token.symbol)}
                    title="Copy address"
                  >
                    {copied === token.symbol ? <CheckCircle size={12} /> : <Copy size={12} />}
                  </button>
                  <button 
                    className="btn-small"
                    onClick={() => setSelectedToken(token.address)}
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
            Faucet: 1,000,000 {currentToken?.symbol}
          </div>
        </div>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { ExternalLink, Copy, CheckCircle, Zap, Coins, Wallet, Send, Terminal } from 'lucide-react'
import { shortAddress, publicClient } from '../lib/tempo'
import { CONTRACTS, EXPLORER_URL, RPC_URL } from '../config/contracts'

export default function Faucet({ account }) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [fundAddress, setFundAddress] = useState('')
  const [showRpc, setShowRpc] = useState(false)

  const tokens = [
    {
      ...CONTRACTS.tokens.pathUSD,
      icon: '$',
      amount: '1,000,000'
    },
    {
      ...CONTRACTS.tokens.alphaUSD,
      icon: 'α',
      amount: '1,000,000'
    },
    {
      ...CONTRACTS.tokens.betaUSD,
      icon: 'β',
      amount: '1,000,000'
    },
    {
      ...CONTRACTS.tokens.thetaUSD,
      icon: 'θ',
      amount: '1,000,000'
    }
  ]

  // ============================================
  // 1. ОСНОВНОЙ МЕТОД — RPC faucet
  // ============================================
  const handleFaucetRPC = async (address) => {
    if (!address) {
      setError('Enter an address')
      return
    }

    if (!address.startsWith('0x') || address.length !== 42) {
      setError('Invalid Ethereum address')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    setTxHash('')

    try {
      // Делаем RPC вызов напрямую через fetch
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tempo_fundAddress',
          params: [address],
          id: 1
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'Faucet request failed')
      }

      // Успех!
      setMessage(`✅ Success! Sent 1,000,000 of each token to ${shortAddress(address)}`)
      
      if (data.result) {
        setTxHash(data.result)
      }

    } catch (err) {
      console.error('Faucet error:', err)
      setError(`Faucet request failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // 2. ДЛЯ ПОДКЛЮЧЕННОГО КОШЕЛЬКА
  // ============================================
  const handleFundMyWallet = () => {
    if (!account?.address) {
      setError('Connect wallet first')
      return
    }
    handleFaucetRPC(account.address)
  }

  // ============================================
  // 3. ДЛЯ ЛЮБОГО АДРЕСА
  // ============================================
  const handleFundAddress = () => {
    handleFaucetRPC(fundAddress)
  }

  // ============================================
  // 4. CAST КОМАНДА
  // ============================================
  const getCastCommand = (address) => {
    return `cast rpc tempo_fundAddress ${address || '<YOUR_ADDRESS>'} --rpc-url ${RPC_URL}`
  }

  const handleCopyCast = () => {
    const cmd = getCastCommand(account?.address || fundAddress || '<YOUR_ADDRESS>')
    navigator.clipboard.writeText(cmd)
    setCopied('cast')
    setTimeout(() => setCopied(''), 2000)
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={24} />
        Tempo Testnet Faucet
      </h2>
      
      <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="address-short">{shortAddress(account?.address) || 'Not connected'}</span>
        <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
          • RPC: tempo_fundAddress
        </span>
      </div>

      {/* Error Message */}
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

      {/* Success Message */}
      {message && (
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
          gap: '0.5rem'
        }}>
          <CheckCircle size={16} color="var(--success)" />
          <span>{message}</span>
          {txHash && (
            <a 
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                marginLeft: '0.5rem',
                color: 'var(--black)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.75rem'
              }}
            >
              {shortAddress(txHash)} ↗
            </a>
          )}
        </div>
      )}

      {/* ===== 2-COLUMN GRID ===== */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        
        {/* CARD 1: Fund My Wallet */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '24px',
                height: '24px',
                background: 'var(--black)',
                color: 'var(--white)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>1</span>
              Fund Your Wallet
            </h3>
            <Wallet size={16} color="var(--gray-400)" />
          </div>
          
          <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Request 1,000,000 of each stablecoin directly to your connected wallet.
          </p>
          
          <div style={{ marginTop: 'auto' }}>
            <button 
              onClick={handleFundMyWallet}
              disabled={loading || !account}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '0.75rem' }}
            >
              {loading ? 'Processing...' : '🚰 Request 1,000,000 Tokens'}
            </button>
            
            {!account && (
              <div style={{
                padding: '0.5rem',
                background: 'var(--gray-50)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--gray-600)',
                textAlign: 'center'
              }}>
                Connect wallet to request tokens
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Fund Any Address */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '24px',
                height: '24px',
                background: 'var(--black)',
                color: 'var(--white)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>2</span>
              Fund Any Address
            </h3>
            <Send size={16} color="var(--gray-400)" />
          </div>
          
          <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Send 1,000,000 stablecoins to any Ethereum address via RPC.
          </p>
          
          <div style={{ marginTop: 'auto' }}>
            <input
              type="text"
              placeholder="0x..."
              value={fundAddress}
              onChange={(e) => setFundAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem',
                marginBottom: '0.75rem',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.75rem'
              }}
            />
            
            <button 
              onClick={handleFundAddress}
              disabled={loading || !fundAddress}
              className="btn-secondary"
              style={{ width: '100%' }}
            >
              {loading ? 'Processing...' : 'Send Tokens to Address'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== RPC INFO CARD ===== */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--gray-50)' }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          cursor: 'pointer'
        }} onClick={() => setShowRpc(!showRpc)}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={18} />
            Testnet Faucet RPC
          </h3>
          <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
            {showRpc ? '▼' : '▶'} tempo_fundAddress
          </span>
        </div>

        {showRpc && (
          <div>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Request test tokens using the <code style={{ background: 'var(--white)', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-sm)' }}>tempo_fundAddress</code> RPC method:
            </p>

            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              marginBottom: '1rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875rem',
              position: 'relative'
            }}>
              <code>
                {getCastCommand(account?.address || fundAddress || '<YOUR_ADDRESS>')}
              </code>
              
              <button
                onClick={handleCopyCast}
                className="btn-icon"
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
                title="Copy command"
              >
                {copied === 'cast' ? <CheckCircle size={14} color="var(--success)" /> : <Copy size={14} />}
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '0.75rem',
              color: 'var(--gray-600)',
              flexWrap: 'wrap'
            }}>
              <span>🔹 Replace with your address</span>
              <span>🔹 Requires cast (Foundry)</span>
              <span>🔹 Instant 1M tokens</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== TOKEN TABLE ===== */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Coins size={18} />
            What You'll Receive
          </h3>
          <span style={{
            padding: '0.25rem 0.75rem',
            background: 'var(--gray-100)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            Each request
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-600)' }}>Token</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-600)' }}>Address</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-600)' }}>Amount</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-600)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token, index) => (
                <tr key={token.address} style={{ 
                  borderBottom: index < tokens.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--black)',
                        color: 'var(--white)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        {token.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{token.symbol}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>{token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <code style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.75rem',
                      background: 'var(--gray-50)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}>
                      {shortAddress(token.address)}
                    </code>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                    {token.amount}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleCopy(token.address, token.symbol)}
                        className="btn-icon"
                        title="Copy address"
                      >
                        {copied === token.symbol ? <CheckCircle size={14} /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => window.open(`${EXPLORER_URL}/address/${token.address}`, '_blank')}
                        className="btn-icon"
                        title="View in explorer"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--gray-600)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={14} />
            <span>Plus 10,000 TEMPO for gas</span>
          </div>
          <span>Chain ID: 42431</span>
        </div>
      </div>

      {/* ===== VERIFY BALANCE ===== */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: 'var(--gray-50)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        fontSize: '0.75rem'
      }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '0.5rem' }}>
            🔍 Verify Your Balance
          </summary>
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ marginBottom: '0.5rem', color: 'var(--gray-600)' }}>
              Check AlphaUSD balance using cast:
            </p>
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <code>
                cast call 0x20c0000000000000000000000000000000000001 "balanceOf(address)(uint256)" {account?.address || '<YOUR_ADDRESS>'} --rpc-url {RPC_URL}
              </code>
              <button
                onClick={() => handleCopy(`cast call 0x20c0000000000000000000000000000000000001 "balanceOf(address)(uint256)" ${account?.address || '<YOUR_ADDRESS>'} --rpc-url ${RPC_URL}`, 'verify')}
                className="btn-icon"
              >
                {copied === 'verify' ? <CheckCircle size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
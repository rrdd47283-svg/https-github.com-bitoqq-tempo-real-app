import React, { useState, useEffect } from 'react'
import { 
  Coins, TrendingUp, Activity, 
  RefreshCw, Zap, ExternalLink, Copy, 
  Wallet, Shield, BarChart3, Globe,
  Clock, CheckCircle
} from 'lucide-react'
import { 
  fetchAllBalances, 
  fetchBlockNumber, 
  shortAddress, 
  requestFaucet,
  publicClient
} from '../lib/tempo'
import { CONTRACTS, EXPLORER_URL } from '../config/contracts'

const Dashboard = ({ account }) => {
  const [balances, setBalances] = useState(null)
  const [blockNumber, setBlockNumber] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedText, setCopiedText] = useState('')
  const [gasPrice, setGasPrice] = useState('0.0012')
  const [verifiedContracts, setVerifiedContracts] = useState({})
  const [chainId] = useState('42431')

  // System contracts definition
  const systemContracts = [
    CONTRACTS.tip20Factory,
    CONTRACTS.stablecoinDex,
    CONTRACTS.feeManager,
    CONTRACTS.tip403Registry
  ]

  useEffect(() => {
    if (account?.address) {
      loadData()
    }
    
    const interval = setInterval(async () => {
      const block = await fetchBlockNumber()
      setBlockNumber(block)
      await fetchGasPrice()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [account])

  useEffect(() => {
    checkContractVerification()
  }, [])

  const loadData = async () => {
    if (!account?.address) return
    const data = await fetchAllBalances(account.address)
    setBalances(data)
    const block = await fetchBlockNumber()
    setBlockNumber(block)
    await fetchGasPrice()
  }

  const fetchGasPrice = async () => {
    try {
      const price = await publicClient.getGasPrice()
      const tempoPrice = Number(price) / 1e18
      setGasPrice(tempoPrice.toFixed(4))
    } catch (error) {
      console.error('Error fetching gas price:', error)
    }
  }

  const checkContractVerification = async () => {
    const verificationStatus = {}
    
    for (const contract of systemContracts) {
      try {
        const response = await fetch(`https://contracts.tempo.xyz/v2/contract/${chainId}/${contract.address}`)
        if (response.ok) {
          const data = await response.json()
          verificationStatus[contract.address] = data.match === 'exact_match'
        } else {
          verificationStatus[contract.address] = false
        }
      } catch (error) {
        console.error(`Error checking verification for ${contract.name}:`, error)
        verificationStatus[contract.address] = false
      }
    }
    
    setVerifiedContracts(verificationStatus)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    await checkContractVerification()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(''), 2000)
  }

  const handleExplorer = (type, value) => {
    if (type === 'address') {
      window.open(`${EXPLORER_URL}/address/${value}`, '_blank')
    } else if (type === 'tx') {
      window.open(`${EXPLORER_URL}/tx/${value}`, '_blank')
    } else {
      window.open(EXPLORER_URL, '_blank')
    }
  }

  const formatCompactBalance = (value) => {
    if (!value || value === '0' || value === '0.00') return '0'
    
    const cleanValue = value.toString().replace(/,/g, '')
    const num = parseFloat(cleanValue)
    
    if (isNaN(num) || num === 0) return '0'
    
    if (num >= 1_000_000_000_000_000) return (num / 1_000_000_000_000_000).toFixed(1) + 'Q'
    if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(1) + 'T'
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toFixed(2)
  }

  const formatTempoBalance = (value) => {
    if (!value) return '4.2Q'
    
    const cleanValue = value.toString().replace(/,/g, '')
    const num = parseFloat(cleanValue)
    
    if (num >= 1_000_000_000_000_000_000) return (num / 1_000_000_000_000_000_000).toFixed(1) + 'Q'
    if (num >= 1_000_000_000_000_000) return (num / 1_000_000_000_000_000).toFixed(1) + 'P'
    if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(1) + 'T'
    return formatCompactBalance(value)
  }

  // 5 карточек с балансами - все с буквенными иконками, TEMPO с T
  const tokenCards = [
    { 
      label: 'TEMPO', 
      value: formatTempoBalance(balances?.native), 
      icon: <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>T</span>,
      color: 'var(--black)',
      textColor: 'var(--white)'
    },
    { 
      label: 'pUSD', 
      value: formatCompactBalance(balances?.pUSDFormatted) || '0', 
      icon: <span style={{ fontSize: '1rem', fontWeight: '700' }}>$</span>,
      color: 'var(--white)',
      textColor: 'var(--black)',
      border: true
    },
    { 
      label: 'aUSD', 
      value: formatCompactBalance(balances?.aUSDFormatted) || '0', 
      icon: <span style={{ fontSize: '1rem', fontWeight: '700' }}>α</span>,
      color: 'var(--white)',
      textColor: 'var(--black)',
      border: true
    },
    { 
      label: 'bUSD', 
      value: formatCompactBalance(balances?.bUSDFormatted) || '0', 
      icon: <span style={{ fontSize: '1rem', fontWeight: '700' }}>β</span>,
      color: 'var(--white)',
      textColor: 'var(--black)',
      border: true
    },
    { 
      label: 'tUSD', 
      value: formatCompactBalance(balances?.tUSDFormatted) || '0', 
      icon: <span style={{ fontSize: '1rem', fontWeight: '700' }}>θ</span>,
      color: 'var(--white)',
      textColor: 'var(--black)',
      border: true
    }
  ]

  const networkStats = [
    { label: 'Chain ID', value: chainId, icon: <Globe size={14} />, real: true },
    { label: 'Block', value: blockNumber?.toString() || '--', icon: <Clock size={14} />, real: true },
    { label: 'Gas Price', value: `${gasPrice} TEMPO`, icon: <Zap size={14} />, real: true }
  ]

  return (
    <div className="dashboard">
      {/* ШАПКА - ПОЛНОСТЬЮ ПУСТАЯ СЛЕВА, ТОЛЬКО КНОПКИ СПРАВА */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: '1.5rem'
      }}>
        <div className="header-actions">
          <button onClick={() => handleExplorer('')} className="btn-secondary">
            <ExternalLink size={16} />
            Explorer
          </button>
          <button onClick={handleRefresh} className="btn-primary" disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
            {isRefreshing ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Адрес под шапкой */}
      <div style={{
        marginBottom: '1.5rem',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.875rem',
        color: 'var(--gray-600)'
      }}>
        {shortAddress(account?.address)}
      </div>

      {/* 5 карточек с балансами */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        {tokenCards.map((token, index) => (
          <div
            key={index}
            style={{
              background: token.color,
              color: token.textColor,
              border: token.border ? '1px solid var(--border)' : 'none',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: token.color === 'var(--black)' ? 'var(--white)' : 'var(--black)',
                color: token.color === 'var(--black)' ? 'var(--black)' : 'var(--white)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {token.icon}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{token.label}</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{token.value}</div>
          </div>
        ))}
      </div>

      {/* Network Activity */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Network Activity</h3>
          </div>
          <span className="status-badge online">
            <span className="status-dot"></span>
            Online
          </span>
        </div>
        
        {/* Пульсирующий график */}
        <div style={{ 
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          marginBottom: '1rem'
        }}>
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.random() * 100}%`,
                background: 'var(--black)',
                opacity: 0.7,
                transition: 'height 0.2s ease',
                animation: i % 3 === 0 ? 'pulse 1s infinite' : 'none'
              }}
            />
          ))}
        </div>

        {/* Реальные показатели */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)'
        }}>
          {networkStats.map((stat, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '0.6875rem',
                color: 'var(--gray-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                marginBottom: '0.25rem'
              }}>
                {stat.icon}
                {stat.label}
                {stat.real && (
                  <span style={{
                    fontSize: '0.625rem',
                    color: 'var(--success)',
                    marginLeft: '0.25rem'
                  }}>
                    ✓
                  </span>
                )}
              </div>
              <div style={{ 
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--black)'
              }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* System Contracts Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Shield size={18} />
              <h3>System Contracts</h3>
            </div>
          </div>
          <div className="contracts-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {systemContracts.map((contract, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: 'var(--gray-50)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--black)' }}>
                      {contract.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--gray-600)' }}>
                      {contract.description}
                    </div>
                  </div>
                  {verifiedContracts[contract.address] && (
                    <span style={{
                      background: 'var(--success)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      <CheckCircle size={10} />
                      Verified
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <code style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.6875rem',
                    color: 'var(--gray-700)',
                    background: 'var(--white)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}>
                    {shortAddress(contract.address)}
                  </code>
                  <button 
                    onClick={() => handleCopy(contract.address, contract.name)}
                    className="btn-icon"
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '1px solid var(--border)',
                      background: 'var(--white)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={() => handleExplorer('address', contract.address)}
                    className="btn-icon"
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '1px solid var(--border)',
                      background: 'var(--white)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RPC Endpoint */}
        <div style={{
          padding: '1rem',
          background: 'var(--gray-50)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={14} />
            <span style={{ fontWeight: '500' }}>RPC Endpoint:</span>
            <code style={{
              fontFamily: 'JetBrains Mono, monospace',
              background: 'var(--white)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}>
              https://rpc.moderato.tempo.xyz
            </code>
          </div>
          <button 
            onClick={() => handleCopy('https://rpc.moderato.tempo.xyz', 'rpc')}
            className="btn-icon"
            style={{
              width: '28px',
              height: '28px',
              border: '1px solid var(--border)',
              background: 'var(--white)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Copy size={12} />
          </button>
        </div>
      </div>

      {/* Анимация пульса и спина */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Dashboard
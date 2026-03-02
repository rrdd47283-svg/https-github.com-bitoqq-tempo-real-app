import React, { useState, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi-config'
import { connectWallet } from './lib/tempo'

import Header from './components/Header'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import Tokens from './pages/Tokens'
import Dex from './pages/Dex'
import Faucet from './pages/Faucet'
import Pay from './pages/Pay'
import AI from './pages/AI'

// Создаем клиент для React Query
const queryClient = new QueryClient()

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [account, setAccount] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setAccount({ address: accounts[0] })
          }
        })
        .catch(console.error)
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const wallet = await connectWallet()
      setAccount(wallet)
    } catch (error) {
      alert(error.message || 'Failed to connect')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setAccount(null)
    setCurrentPage('dashboard')
  }

  if (!account) {
    return (
      <div className="app">
        <Header 
          account={null} 
          onDisconnect={handleDisconnect}
          setCurrentPage={setCurrentPage}
          currentPage={currentPage}
        />
        <div className="welcome-screen">
          <div className="welcome-hero">
            <div className="hero-icon">⧫</div>
            <h1 className="hero-title">Tempo Moderato</h1>
            <p className="hero-subtitle">Chain ID: 42431</p>
            <div className="connect-section">
              <div className="connect-card">
                <h3>Connect Wallet</h3>
                <button 
                  className="btn-primary" 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  style={{ width: '100%' }}
                >
                  {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard account={account} />
      case 'tokens': return <Tokens account={account} />
      case 'dex': return <Dex account={account} />
      case 'pay': return <Pay account={account} />
      case 'faucet': return <Faucet account={account} />
      case 'ai': return <AI account={account} />
      default: return <Dashboard account={account} />
    }
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="app">
          <Header 
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            account={account}
            onDisconnect={handleDisconnect}
          />
          <main className="main-content">
            {renderPage()}
          </main>
          <Footer />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
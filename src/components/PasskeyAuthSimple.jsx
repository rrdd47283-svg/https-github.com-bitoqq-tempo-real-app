import React, { useState } from 'react'
import { Fingerprint, CheckCircle, AlertCircle } from 'lucide-react'

export default function PasskeyAuthSimple({ onSuccess, onError, isLoading }) {
  const [loading, setLoading] = useState(false)

  const handleCreatePasskey = async () => {
    setLoading(true)
    try {
      console.log('🚀 Creating REAL WebAuthn passkey...')
      
      // Динамический импорт функции из tempo.js
      const { createPasskeyAccount } = await import('../lib/tempo')
      
      const account = await createPasskeyAccount('Tempo User')
      
      console.log('✅ Passkey created successfully:', account)
      
      onSuccess({ 
        address: account.address,
        account: account
      })
    } catch (error) {
      console.error('❌ Passkey creation error:', error)
      onError(error.message || 'Failed to create passkey')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: '#f5f5f5', 
        borderRadius: '8px', 
        marginBottom: '0.5rem',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Fingerprint size={20} />
          <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Loading saved passkey...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '1rem', 
      background: '#f5f5f5', 
      borderRadius: '8px', 
      marginBottom: '0.5rem',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Fingerprint size={20} />
        <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Passkey Authentication</span>
      </div>

      <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '1rem' }}>
        Create a passkey to authenticate with Face ID, Touch ID, or security key
      </p>
      
      <button
        onClick={handleCreatePasskey}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '10px',
          background: loading ? '#ccc' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}
      >
        <Fingerprint size={16} />
        {loading ? 'Creating...' : 'Create New Passkey'}
      </button>
    </div>
  )
}
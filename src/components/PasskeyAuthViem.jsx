import React, { useState, useEffect } from 'react'
import { Fingerprint, CheckCircle, AlertCircle, Info, Shield, Key } from 'lucide-react'

export default function PasskeyAuthView({ onSuccess, onError, isLoading }) {
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)
  const [platform, setPlatform] = useState('')

  // Проверяем поддержку WebAuthn при загрузке
  useEffect(() => {
    const checkSupport = () => {
      // Проверяем поддержку WebAuthn
      const webAuthnSupported = window.PublicKeyCredential !== undefined && 
                                typeof window.PublicKeyCredential === 'function'
      
      setSupported(webAuthnSupported)
      
      // Определяем платформу для рекомендации
      const ua = navigator.userAgent
      if (ua.includes('Mac')) setPlatform('mac')
      else if (ua.includes('Windows')) setPlatform('windows')
      else if (ua.includes('Linux')) setPlatform('linux')
      else if (ua.includes('iPhone') || ua.includes('iPad')) setPlatform('ios')
      else if (ua.includes('Android')) setPlatform('android')
    }
    
    checkSupport()
  }, [])

  const handleCreatePasskey = async () => {
    setLoading(true)
    try {
      // Динамический импорт функции из tempo.js
      const { createPasskeyAccount } = await import('../lib/tempo')
      
      console.log('🚀 Creating REAL WebAuthn passkey...')
      const account = await createPasskeyAccount('Tempo User')
      
      console.log('✅ Passkey created successfully:', account)
      
      onSuccess({ 
        address: account.address,
        account: account
      })
    } catch (error) {
      console.error('❌ Passkey creation error:', error)
      
      // Понятные сообщения об ошибках
      let errorMessage = error.message || 'Failed to create passkey'
      
      if (errorMessage.includes('not supported')) {
        errorMessage = 'Passkey not supported in this browser'
      } else if (errorMessage.includes('cancelled') || errorMessage.includes('cancel')) {
        errorMessage = 'Passkey creation was cancelled'
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Passkey creation timed out. Please try again'
      } else if (errorMessage.includes('already exists')) {
        errorMessage = 'A passkey for this account already exists'
      }
      
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Если идет загрузка сохраненного Passkey
  if (isLoading) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: '#f5f5f5', 
        borderRadius: '8px', 
        marginBottom: '1rem',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Fingerprint size={18} color="#666" />
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              Loading saved passkey...
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              Please wait while we restore your passkey
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Если Passkey не поддерживается
  if (!supported) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: '#f5f5f5', 
        borderRadius: '8px', 
        marginBottom: '1rem',
        border: '1px solid #ffa726'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Fingerprint size={20} color="#ffa726" />
          <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Passkey Authentication</span>
        </div>

        <div style={{
          padding: '0.75rem',
          background: 'white',
          border: '1px solid #ffa726',
          borderRadius: '4px',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} color="#ffa726" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
              Passkey not supported in this browser.
            </span>
            <span style={{ fontSize: '0.7rem', color: '#999' }}>
              Please use Safari, Chrome, Edge, or a modern browser with WebAuthn support.
            </span>
          </div>
        </div>
        
        <button
          disabled
          style={{ 
            width: '100%', 
            padding: '10px',
            background: '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            opacity: 0.6
          }}
        >
          <Fingerprint size={16} />
          Passkey Not Supported
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '1rem', 
      background: '#f8f9fa', 
      borderRadius: '12px', 
      marginBottom: '1rem',
      border: '1px solid #dee2e6',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }}>
      {/* Заголовок */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '8px', 
          background: '#e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Fingerprint size={18} color="#495057" />
        </div>
        <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#212529' }}>
          Passkey Authentication
        </span>
        <span style={{
          fontSize: '0.7rem',
          padding: '0.25rem 0.5rem',
          background: '#e9ecef',
          borderRadius: '4px',
          color: '#495057',
          marginLeft: 'auto'
        }}>
          WebAuthn
        </span>
      </div>

      {/* Преимущества */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={14} color="#28a745" />
          <span style={{ fontSize: '0.75rem', color: '#495057' }}>Biometric secured</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={14} color="#28a745" />
          <span style={{ fontSize: '0.75rem', color: '#495057' }}>No seed phrase</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={14} color="#28a745" />
          <span style={{ fontSize: '0.75rem', color: '#495057' }}>Faster access</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={14} color="#28a745" />
          <span style={{ fontSize: '0.75rem', color: '#495057' }}>Works offline</span>
        </div>
      </div>

      {/* Информация о комиссиях */}
      <div style={{
        padding: '0.75rem',
        background: '#e3f2fd',
        border: '1px solid #90caf9',
        borderRadius: '8px',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem'
      }}>
        <Info size={16} color="#1976d2" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontSize: '0.75rem', color: '#0d47a1', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
            Pay fees with Passkey
          </span>
          <span style={{ fontSize: '0.7rem', color: '#1565c0' }}>
            Transaction fees will be automatically paid in the same token you're sending using Tempo's Fee AMM.
          </span>
        </div>
      </div>

      {/* Рекомендация для платформы */}
      {platform && (
        <div style={{
          padding: '0.5rem',
          background: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: '6px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.7rem',
          color: '#e65100'
        }}>
          <Info size={14} />
          <span>
            {platform === 'ios' && 'Use Face ID or Touch ID to authenticate'}
            {platform === 'android' && 'Use fingerprint or screen lock to authenticate'}
            {platform === 'mac' && 'Use Touch ID or iCloud Keychain'}
            {platform === 'windows' && 'Use Windows Hello or security key'}
            {platform === 'linux' && 'Use security key or platform authenticator'}
          </span>
        </div>
      )}

      {/* Кнопка создания Passkey */}
      <button
        onClick={handleCreatePasskey}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '12px',
          background: loading ? '#ccc' : '#212529',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          transition: 'all 0.2s',
          opacity: loading ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = '#000'
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.background = '#212529'
        }}
      >
        {loading ? (
          <>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              border: '2px solid rgba(255,255,255,0.3)', 
              borderTopColor: 'white', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Creating Passkey...
          </>
        ) : (
          <>
            <Fingerprint size={16} />
            Create New Passkey
          </>
        )}
      </button>

      {/* Примечание */}
      <p style={{ 
        fontSize: '0.65rem', 
        color: '#999', 
        textAlign: 'center', 
        marginTop: '0.75rem',
        marginBottom: 0
      }}>
        Passkey is stored securely on your device and never leaves it
      </p>

      {/* Добавляем анимацию */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
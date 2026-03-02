import React, { useState, useRef } from 'react'
import { CreditCard, Zap } from 'lucide-react'
import { shortAddress, publicClient, getWalletClient } from '../lib/tempo'
import { CONTRACTS, EXPLORER_URL, RPC_URL } from '../config/contracts'
import { parseUnits, encodeFunctionData } from 'viem'
import { tempoModerato } from '../config/chain'
import PasskeyAuth from '../components/PasskeyAuth'

export default function Payments({ account }) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState(CONTRACTS.tokens.pathUSD.address)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passkeyInfo, setPasskeyInfo] = useState(null)
  const passkeyRef = useRef()

  const encodeTransfer = async () => {
    const amountInUnits = parseUnits(amount, 6)
    return encodeFunctionData({
      abi: CONTRACTS.tokens.pathUSD.abi,
      functionName: 'transfer',
      args: [recipient, amountInUnits]
    })
  }

  const handleSendWithMetaMask = async () => {
    if (!recipient || !amount) return setError('Enter recipient and amount')
    setLoading(true)
    try {
      const wallet = await getWalletClient()
      const hash = await wallet.sendTransaction({ to: selectedToken, data: await encodeTransfer() })
      setTxHash(hash); setSuccess('✅ Sent via MetaMask')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const handleSendWithPasskey = async () => {
    if (!passkeyInfo) return setError('Create passkey first')
    setLoading(true)
    try {
      const nonce = await publicClient.getTransactionCount({ address: account.address })
      const gasPrice = await publicClient.getGasPrice()
      const { serializeTransaction, keccak256, toBytes } = await import('viem')
      const tx = {
        to: selectedToken,
        data: await encodeTransfer(),
        value: 0n,
        gas: 100000n,
        gasPrice,
        nonce,
        chainId: 42431,
      }
      const serialized = serializeTransaction(tx)
      const txHash = keccak256(toBytes(serialized))
      const signature = await passkeyRef.current.signMessage({ raw: txHash })
      const signedTx = serializeTransaction(tx, signature)
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_sendRawTransaction', params: [signedTx], id: 1 })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error.message)
      setTxHash(result.result); setSuccess('✅ Sent via Passkey')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="panel">
      <h2><CreditCard size={24} /> Tempo Pay</h2>
      <div>{shortAddress(account?.address)}</div>
      {error && <div className="notification error">❌ {error}</div>}
      {success && <div className="notification success">✅ {success}</div>}
      <select value={selectedToken} onChange={e => setSelectedToken(e.target.value)}>
        {Object.values(CONTRACTS.tokens).map(t => <option key={t.address} value={t.address}>{t.symbol}</option>)}
      </select>
      <input placeholder="Recipient" value={recipient} onChange={e => setRecipient(e.target.value)} />
      <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
      <PasskeyAuth ref={passkeyRef} account={account} onSuccess={setPasskeyInfo} onError={setError} />
      <button onClick={handleSendWithMetaMask} disabled={loading}>Send via MetaMask</button>
      {passkeyInfo && <button onClick={handleSendWithPasskey} disabled={loading}>🔐 Send via Passkey</button>}
    </div>
  )
}
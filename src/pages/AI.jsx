import React, { useState } from 'react'
import { 
  Bot, ExternalLink, Copy, CheckCircle, Zap, 
  Github, Book, Search, Code, FileText, Globe
} from 'lucide-react'
import { shortAddress } from '../lib/tempo'

export default function AI({ account }) {
  const [copied, setCopied] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const aiFeatures = [
    {
      title: 'llms.txt',
      desc: 'Complete documentation index for LLMs',
      icon: <FileText size={20} />,
      links: [
        { label: 'llms.txt', url: 'https://docs.tempo.xyz/llms.txt' },
        { label: 'llms-full.txt', url: 'https://docs.tempo.xyz/llms-full.txt' }
      ]
    },
    {
      title: 'MCP Server',
      desc: 'Model Context Protocol for AI assistants',
      icon: <Globe size={20} />,
      links: [
        { label: 'MCP URL', url: 'https://docs.tempo.xyz/api/mcp', code: true },
        { label: 'Claude Config', code: 'claude mcp add --transport http tempo https://docs.tempo.xyz/api/mcp' }
      ]
    },
    {
      title: 'Agent Skills',
      desc: 'Pre-built skills for AI coding agents',
      icon: <Bot size={20} />,
      links: [
        { label: 'GitHub Repo', url: 'https://github.com/tempoxyz/agent-skills' },
        { label: 'Install', code: 'npx skills add tempoxyz/agent-skills' }
      ]
    },
    {
      title: 'Source Code',
      desc: 'Access to Tempo source repositories',
      icon: <Github size={20} />,
      links: [
        { label: 'tempo', url: 'https://github.com/tempoxyz/tempo' },
        { label: 'tempo-ts', url: 'https://github.com/tempoxyz/tempo-ts' },
        { label: 'agent-skills', url: 'https://github.com/tempoxyz/agent-skills' }
      ]
    }
  ]

  const mcpTools = [
    { name: 'list_pages', desc: 'List all documentation pages' },
    { name: 'read_page', desc: 'Read a specific documentation page' },
    { name: 'search_docs', desc: 'Search documentation' },
    { name: 'list_sources', desc: 'List source repositories' },
    { name: 'read_source_file', desc: 'Read source code files' },
    { name: 'search_source', desc: 'Search source code' }
  ]

  return (
    <div className="panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Bot size={24} />
        AI Developer Tools
      </h2>
      
      <div className="subtitle" style={{ marginBottom: '2rem' }}>
        <span className="address-short">{shortAddress(account?.address)}</span>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Ask about Tempo development... (e.g., 'How to create a stablecoin?')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, height: '40px' }}
          />
          <button className="btn-primary" style={{ width: '100px' }}>
            <Search size={16} />
            Search
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
          🔍 Search will query Tempo documentation and source code
        </p>
      </div>

      {/* AI Features Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {aiFeatures.map((feature, index) => (
          <div key={index} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'var(--black)',
                color: 'var(--white)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {feature.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>{feature.desc}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {feature.links.map((link, i) => (
                <div key={i} style={{
                  padding: '0.5rem',
                  background: 'var(--gray-50)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {link.code ? (
                    <code style={{ fontSize: '0.6875rem', fontFamily: 'JetBrains Mono, monospace' }}>
                      {link.code}
                    </code>
                  ) : (
                    <span style={{ fontSize: '0.75rem' }}>{link.label}</span>
                  )}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {link.url && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon"
                        style={{ width: '28px', height: '28px' }}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {(link.code || link.url) && (
                      <button
                        onClick={() => handleCopy(link.code || link.url, `link-${i}`)}
                        className="btn-icon"
                        style={{ width: '28px', height: '28px' }}
                      >
                        {copied === `link-${i}` ? <CheckCircle size={12} /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MCP Tools */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Code size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>MCP Server Tools</h3>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem'
        }}>
          {mcpTools.map((tool, index) => (
            <div
              key={index}
              style={{
                padding: '0.75rem',
                background: 'var(--gray-50)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <code style={{ fontSize: '0.6875rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                {tool.name}
              </code>
              <p style={{ fontSize: '0.625rem', color: 'var(--gray-600)' }}>{tool.desc}</p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'var(--gray-50)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem'
        }}>
          <strong>MCP Server Configuration:</strong>
          <pre style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.6875rem',
            fontFamily: 'JetBrains Mono, monospace',
            overflow: 'auto'
          }}>
{`{
  "mcpServers": {
    "tempo-docs": {
      "url": "https://docs.tempo.xyz/api/mcp"
    }
  }
}`}
          </pre>
          <button
            onClick={() => handleCopy(JSON.stringify({
              mcpServers: {
                "tempo-docs": {
                  "url": "https://docs.tempo.xyz/api/mcp"
                }
              }
            }, null, 2), 'mcp-config')}
            className="btn-icon"
            style={{ marginTop: '0.5rem', width: '100%' }}
          >
            {copied === 'mcp-config' ? <CheckCircle size={14} /> : <Copy size={14} />}
            Copy MCP Config
          </button>
        </div>
      </div>

      {/* Markdown Access */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: 'var(--gray-50)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <FileText size={16} />
          <strong>Markdown Access</strong>
        </div>
        <p style={{ color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
          Append <code style={{ background: 'var(--white)', padding: '0.125rem 0.375rem' }}>.md</code> to any URL for raw markdown:
        </p>
        <code style={{
          display: 'block',
          padding: '0.5rem',
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.6875rem',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          https://docs.tempo.xyz/quickstart/integrate-tempo.md
        </code>
      </div>
    </div>
  )
}
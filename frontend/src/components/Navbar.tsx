import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();
  const [activeFileId, setActiveFileId]   = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [expandAgents, setExpandAgents] = useState(false);

  useEffect(() => {
    const sync = () => {
      setActiveFileId(localStorage.getItem('activeFileId'));
      setActiveFilename(localStorage.getItem('activeFilename'));
    };
    sync();
    const id = setInterval(sync, 800);
    return () => clearInterval(id);
  }, []);

  const MAIN_LINKS = [
    { path: '/',         label: 'Dashboard',      icon: '📊' },
    { path: '/upload',   label: 'Upload Data',     icon: '📤' },
    { path: '/copilot',  label: 'Dataset Copilot', icon: '💬' },
  ];

  const AGENT_LINKS = [
    { path: '/cleaning',              label: 'Data Cleaning',      icon: '🧹' },
    { path: '/eda',                   label: 'EDA',               icon: '📊' },
    { path: '/feature-engineering',   label: 'Feature Engineering', icon: '✨' },
    { path: '/model-selection',       label: 'Model Selection',    icon: '🤖' },
    { path: '/tuning',                label: 'Hyperparameter Tuning', icon: '⚡' },
    { path: '/explainability',        label: 'Explainability',    icon: '🔍' },
    { path: '/insights',              label: 'Business Insights',  icon: '💡' },
  ];

  const isActive = (p: string) =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p);

  const isAgentActive = AGENT_LINKS.some(link => isActive(link.path));

  return (
    <div className="sidebar">
      {/* Brand */}
      <div className="brand-section">
        <span className="brand-logo">DataMind AI</span>
        <span className="brand-tag">v1.0</span>
      </div>

      {/* Nav Links */}
      <ul className="nav-list">
        {MAIN_LINKS.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.1rem', minWidth: '24px', textAlign: 'center' }}>
                {link.icon}
              </span>
              <span>{link.label}</span>
              {isActive(link.path) && (
                <span style={{
                  marginLeft: 'auto',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  boxShadow: '0 0 8px var(--accent-primary)',
                  flexShrink: 0,
                }} />
              )}
            </Link>
          </li>
        ))}

        {/* Agent Pages Section */}
        <li style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setExpandAgents(!expandAgents)}
            style={{
              width: '100%',
              background: expandAgents ? 'var(--bg-secondary)' : 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            <span>🔧</span>
            <span>Agent Pages</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
              {expandAgents ? '▼' : '▶'}
            </span>
          </button>
          {expandAgents && (
            <ul style={{ marginTop: '0.5rem', listStyle: 'none', padding: 0 }}>
              {AGENT_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                    style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
                  >
                    <span style={{ fontSize: '1rem', minWidth: '20px', textAlign: 'center' }}>
                      {link.icon}
                    </span>
                    <span>{link.label}</span>
                    {isActive(link.path) && (
                      <span style={{
                        marginLeft: 'auto',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        boxShadow: '0 0 8px var(--accent-primary)',
                        flexShrink: 0,
                      }} />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>

      {/* Active Dataset Widget */}
      <div className="active-dataset-widget">
        <span className="widget-label">Active Dataset</span>
        {activeFilename ? (
          <>
            <span className="widget-value" title={activeFilename}>{activeFilename}</span>
            <span style={{
              fontSize: '0.73rem',
              color: 'var(--text-muted)',
              display: 'block',
              marginTop: '6px',
              fontFamily: 'var(--mono)',
            }}>
              ID: {activeFileId?.slice(0, 8)}…
            </span>
            <div style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--accent-success)',
                boxShadow: '0 0 8px var(--accent-success)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', fontWeight: 700 }}>
                Ready for analysis
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="widget-value" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>
              No dataset loaded
            </span>
            <Link
              to="/upload"
              style={{
                display: 'inline-block',
                marginTop: '10px',
                fontSize: '0.78rem',
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              + Upload a file →
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;

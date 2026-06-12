import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { sendChatMessage } from '../services/api';

type Message = { role: 'user' | 'assistant'; content: string; sources?: any[] };

const QUICK_PROMPTS = [
  'What is the best predictive model and why?',
  'Explain the top 3 most important features',
  'What did hyperparameter tuning improve?',
  'Suggest business decisions based on these metrics',
  'What data quality issues were found?',
];

const Copilot: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    const filename = localStorage.getItem('activeFilename');
    setActiveFileId(fileId);
    setActiveFilename(filename);

    if (filename) {
      setMessages([
        {
          role: 'assistant',
          content: `Hello! I'm your Senior Data Science Copilot 🤖\n\nI have full context of your dataset **${filename}** and its analysis results. Ask me anything about your models, feature impacts, data quality, or business strategy.`,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (msgText: string) => {
    if (!msgText.trim() || !activeFileId) return;
    const userMsg = msgText.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await sendChatMessage(activeFileId, userMsg);
      const answer = res.data.answer || '';
      const sources = res.data.sources || [];
      setMessages((prev) => [...prev, { role: 'assistant', content: answer, sources }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ I encountered an error. Please ensure the backend server is running and your local Ollama service is active with the 'phi-2' model loaded.` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  // Simple markdown-lite renderer: bold, inline code
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.88em', fontFamily: 'var(--mono)' }}>{part.slice(1, -1)}</code>;
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content" style={{ paddingBottom: '1.5rem' }}>

        {/* Header */}
        <div>
          <h1>Dataset Copilot</h1>
          <p style={{ marginTop: '0.5rem' }}>Ask natural-language questions about your dataset, models, and business implications.</p>
        </div>

        {/* No dataset guard */}
        {!activeFileId ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No Dataset Active</h3>
            <p>Please upload a CSV dataset and run analysis before chatting with the Copilot.</p>
            <a href="/upload" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>Go to Upload</a>
          </div>
        ) : (
          <div className="chat-container" style={{ flexGrow: 1, height: 'calc(100vh - 260px)' }}>

            {/* Chat Header */}
            <div className="chat-header">
              <div className="status-dot" />
              <div>
                <strong style={{ display: 'block', fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>DataMind AI Copilot</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Connected to <strong>{activeFilename}</strong></span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble-wrapper ${msg.role}`}>
                  <div className="chat-bubble-meta">{msg.role === 'user' ? 'You' : 'AI Copilot'}</div>
                  <div className="chat-bubble">
                    {renderContent(msg.content)}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="chat-sources" style={{ marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                          📚 Retrieved Context
                        </span>
                        {msg.sources.slice(0, 3).map((src: any, sIdx: number) => (
                          <span key={sIdx} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            • {src.content || src.document}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chat-bubble-wrapper assistant">
                  <div className="chat-bubble-meta">AI Copilot</div>
                  <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                      ))}
                    </span>
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 1 && !loading && (
              <div style={{ padding: '0 1.5rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', borderRadius: '10px', fontWeight: 600 }}
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="chat-input-area">
              <form onSubmit={handleSubmit} className="chat-form">
                <input
                  ref={inputRef}
                  type="text"
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${activeFilename}...`}
                  disabled={loading}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={!input.trim() || loading} style={{ minWidth: '90px' }}>
                  Send ↑
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Copilot;

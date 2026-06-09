import React, { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

type ChatWindowProps = {
  messages: Message[];
  onSend: (msg: string) => void;
};

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSend }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  // scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
      {messages.map((msg, idx) => (
        <div key={idx} style={{ marginBottom: '0.5rem' }}>
          <strong>{msg.role === 'user' ? 'You' : 'Copilot'}:</strong> {msg.content}
        </div>
      ))}
      <div ref={endRef} />
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          style={{ flex: 1, marginRight: '0.5rem' }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatWindow;

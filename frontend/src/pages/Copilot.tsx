import React, { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import { sendChatMessage } from '../services/api';

const Copilot: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const handleSend = async (msg: string) => {
    // add user message
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    try {
      const res = await sendChatMessage(msg);
      const reply = res.data.reply || res.data.message || '';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error contacting copilot.' }]);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Copilot</h1>
      <ChatWindow messages={messages} onSend={handleSend} />
    </div>
  );
};

export default Copilot;

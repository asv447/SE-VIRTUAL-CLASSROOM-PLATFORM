// components/MessageList.js
import MessageItem from './MessageItem';

export default function MessageList({ messages, messagesEndRef }) {
  return (
    <div className="space-y-4">
      {messages.map((msg, index) => (
        <MessageItem key={index} user={msg.user} text={msg.text} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

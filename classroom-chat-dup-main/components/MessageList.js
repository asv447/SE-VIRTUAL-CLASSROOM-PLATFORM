// components/MessageList.js
import MessageItem from "./MessageItem";

export default function MessageList({ messages, messagesEndRef }) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          user={msg.author?.name}
          text={msg.text}
          photoUrl={msg.author?.photoUrl}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

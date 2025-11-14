"use client";

import ChatMessageItem from "./ChatMessageItem";

export default function ChatMessageList({ messages, currentUserId, messagesEndRef, onDeleteMessage }) {
  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <ChatMessageItem
          key={msg.id}
          message={msg}
          currentUserId={currentUserId}
          onDelete={onDeleteMessage}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

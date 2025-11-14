"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export default function ChatMessageInput({ newMessage, setNewMessage, onSendMessage }) {
  return (
    <form onSubmit={onSendMessage} className="flex items-center space-x-3 bg-gray-100 p-3 rounded-lg border border-gray-300">
      <Input
        type="text"
        placeholder="Type a message..."
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        className="flex-1 bg-white border-gray-300 focus:ring-gray-400"
      />
      <Button
        type="submit"
        disabled={!newMessage.trim()}
        className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

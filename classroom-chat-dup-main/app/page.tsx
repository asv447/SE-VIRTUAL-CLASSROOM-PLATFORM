// app/page.tsx
"use client";

import { useState, useEffect, useRef, type FormEvent } from 'react';
import io, { type Socket } from 'socket.io-client';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';

interface Message {
  user: string;
  text: string;
  timestamp?: { 
      seconds: number;
      nanoseconds: number;
  } | Date | undefined; 
}


let socket: Socket | undefined;

const INITIAL_MESSAGES: Message[] = [];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('Guest');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let storedName = localStorage.getItem('username');
    if (storedName) { setUsername(storedName); }
    else {
      storedName = window.prompt("What's your name?");
      if (storedName) {
        localStorage.setItem('username', storedName);
        setUsername(storedName);
      }
    }

    const initSocket = async () => {
       if (!socket) {
           await fetch('/api/socket');
           socket = io({ path: '/api/socket' });

           socket.on('connect', () => { console.log("--- CLIENT: Socket connected."); });
           
           socket.on('load_history', (history: Message[]) => {
               console.log(`--- CLIENT: Received ${history.length} messages from history.`);
               setMessages(history); 
           });

           socket.on('new_message', (msg: Message) => {
               setMessages((prevMessages) => [...prevMessages, msg]);
           });

           socket.on('connect_error', (err) => { console.error("--- CLIENT: Socket connection error:", err); });
           socket.on('disconnect', () => { console.log("--- CLIENT: Socket disconnected."); });
       }
    }
    initSocket();

    return () => { 
      if (socket) { socket.disconnect(); socket = undefined; }
    };
  }, []); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !socket || !socket.connected) {
        console.error("--- CLIENT: Socket not connected. Cannot send message.");
        return;
    }
    const messageToSend: Message = { user: username, text: newMessage.trim() }; 
    socket.emit('send_message', messageToSend);
    setNewMessage('');
  };

  return (

    <main className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b shadow-sm">
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-medium text-gray-800">Software Engineering Project</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 13a5.975 5.975 0 013 5.197" />
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        <MessageList messages={messages} messagesEndRef={messagesEndRef} />
      </div>

      {/* Footer */}
      <footer className="p-4 bg-white border-t">
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
        />
      </footer>
    </main>
  );
}

// pages/api/socket.js
import { Server } from 'socket.io';
import { db } from '../../lib/firebase-admin';

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');

    const io = new Server(res.socket.server, {
      path: "/api/socket", 
    });
    res.socket.server.io = io;

    io.on('connection', async (socket) => { 
      console.log('A client connected:', socket.id);

      try {
        console.log("--- SERVER: Fetching chat history...");
        const messagesSnap = await db.collection('messages').orderBy('timestamp', 'asc').get();
        const oldMessages = messagesSnap.docs.map(doc => doc.data());

        socket.emit('load_history', oldMessages); 
        console.log(`--- SERVER: Sent ${oldMessages.length} messages to ${socket.id}`);
      } 
      catch (error) {
        console.error("--- SERVER ERROR: Error loading chat history:", error);
      }
      
      socket.on('send_message', async (msg) => {
        console.log('Broadcasting message:', msg.text);
        io.emit('new_message', msg); 

        if (!db) {
          console.error("--- SERVER ERROR: Firebase 'db' object is not initialized.");
          return;
        }
        try {
          const messageData = { ...msg, timestamp: new Date() };
          console.log("--- SERVER: Attempting to save to Firestore...");
          await db.collection('messages').add(messageData);
          console.log("--- SERVER: Message saved to DB successfully.");
        } catch (error) {
          console.error("--- SERVER ERROR: Error saving message:", error.message);
        }
      });

      socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
      });
    });
  }
  res.end();
};

export default SocketHandler;
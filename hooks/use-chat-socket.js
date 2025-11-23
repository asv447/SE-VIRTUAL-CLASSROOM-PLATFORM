// hooks/use-chat-socket.js
import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";

/**
 * Custom hook for managing Socket.IO connection for classroom chat
 * @param {string} classId - The classroom ID to join
 * @param {function} onNewMessage - Callback when a new message is received
 * @param {function} onMessageDeleted - Callback when a message is deleted
 * @returns {object} Socket connection state and methods
 */
export function useChatSocket(classId, onNewMessage, onMessageDeleted) {
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);

  const initSocket = useCallback(async () => {
    if (!classId || isConnectedRef.current) return;

    try {
      // Initialize socket endpoint
      await fetch("/api/socket");

      // Create socket connection using API route path
      const socket = io({
        path: "/api/socket",
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        isConnectedRef.current = true;

        // Join the classroom room
        socket.emit("join_classroom", classId);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        isConnectedRef.current = false;
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      // Listen for new messages in this classroom
      socket.on("new_chat_message", (message) => {
        console.log("Received new message:", message);
        if (onNewMessage) {
          onNewMessage(message);
        }
      });

      // Listen for deleted messages
      socket.on("chat_message_deleted", (messageId) => {
        console.log("Message deleted:", messageId);
        if (onMessageDeleted) {
          onMessageDeleted(messageId);
        }
      });
    } catch (error) {
      console.error("Error initializing socket:", error);
    }
  }, [classId, onNewMessage, onMessageDeleted]);

  useEffect(() => {
    initSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        const classroomToLeave = classId;
        if (classroomToLeave) {
          socketRef.current.emit("leave_classroom", classroomToLeave);
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [initSocket, classId]);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
  };
}

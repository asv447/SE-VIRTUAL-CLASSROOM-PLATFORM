"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ChatMessageItem({ message, currentUserId, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwnMessage = message.author?.id === currentUserId;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(message.id);
    } catch (error) {
      console.error("Failed to delete message:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition group ${
        isOwnMessage ? "flex-row-reverse space-x-reverse" : ""
      }`}
    >
      <Avatar className="w-8 h-8">
        <AvatarImage src={message.author?.photoUrl} alt={`${message.author?.name}'s avatar`} />
        <AvatarFallback className="bg-primary text-white text-sm">
          {message.author?.name?.charAt(0)?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 ${isOwnMessage ? "text-right" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          <p className={`font-semibold text-sm text-gray-900 ${isOwnMessage ? "order-2" : ""}`}>
            {message.author?.name || "Unknown"}
          </p>
          {message.createdAt && (
            <p className={`text-xs text-gray-500 ${isOwnMessage ? "order-1" : ""}`}>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className={`flex items-start gap-2 ${isOwnMessage ? "justify-end" : ""}`}>
          <p className={`text-gray-700 text-sm break-words ${isOwnMessage ? "bg-blue-100 rounded-lg px-3 py-2" : ""}`}>
            {message.text}
          </p>
          
          {isOwnMessage && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This message will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

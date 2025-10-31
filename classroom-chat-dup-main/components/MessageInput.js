// components/MessageInput.js

// Receive the state and functions from the parent page as props
export default function MessageInput({ newMessage, setNewMessage, onSendMessage }) {
  return (
    // When the form is submitted, call the onSendMessage function
    <form onSubmit={onSendMessage} className="flex items-center space-x-3 bg-gray-100 p-2 rounded-full border">
      <input
        type="text"
        placeholder="Announce something to your class..."
        // The input's value is now controlled by the state from the parent
        value={newMessage}
        // When the user types, call the setNewMessage function to update the state
        onChange={(e) => setNewMessage(e.target.value)}
        className="flex-1 bg-transparent focus:outline-none px-3 text-gray-800"
      />
      <button
        type="submit"
        className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </form>
  );
}
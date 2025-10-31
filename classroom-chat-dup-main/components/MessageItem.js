// components/MessageItem.js
export default function MessageItem({ user, text }) {
  return (
    <div className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
      {/* Placeholder for user avatar */}
      <div className="w-10 h-10 rounded-full bg-indigo-500 flex-shrink-0"></div>
      <div>
        <p className="font-semibold text-gray-900">{user}</p>
        <p className="text-gray-700">{text}</p>
      </div>
    </div>
  );
}
// components/MessageItem.js
import PropTypes from "prop-types";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../components/ui/avatar";

export default function MessageItem({ user, text, photoUrl }) {
  return (
    <div className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
      <Avatar>
        <AvatarImage src={photoUrl} alt={`${user}'s avatar`} />
        <AvatarFallback className="bg-primary text-white">
          {user?.charAt(0)?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-gray-900">{user}</p>
        <p className="text-gray-700">{text}</p>
      </div>
    </div>
  );
}

MessageItem.propTypes = {
  user: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  photoUrl: PropTypes.string,
};

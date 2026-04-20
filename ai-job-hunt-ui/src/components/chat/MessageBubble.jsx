// =============================================================================
// MessageBubble Component
// =============================================================================

import { formatMessageTime } from '../../utils/formatters';

export default function MessageBubble({ message }) {
  const { role, content, timestamp } = message;
  const isUser = role === 'user';

  return (
    <div className={`message-bubble message-bubble--${role}`} id={`msg-${message.id}`}>
      <div className={`message-bubble__avatar message-bubble__avatar--${role}`}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-bubble__content">
        <span>{content}</span>
        <span className="message-bubble__time">
          {formatMessageTime(timestamp)}
        </span>
      </div>
    </div>
  );
}

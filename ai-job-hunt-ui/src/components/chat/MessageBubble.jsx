// =============================================================================
// MessageBubble Component
// =============================================================================

import { formatMessageTime } from '../../utils/formatters';
import { UserIcon, SparklesIcon } from '../common/Icons';

export default function MessageBubble({ message }) {
  const { role, content, timestamp } = message;
  const isUser = role === 'user';

  return (
    <div className={`message-bubble message-bubble--${role}`} id={`msg-${message.id}`}>
      <div className={`message-bubble__avatar message-bubble__avatar--${role}`}>
        {isUser
          ? <UserIcon size={16} stroke="var(--text-on-accent)" />
          : <SparklesIcon size={16} stroke="#ffffff" />
        }
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

// =============================================================================
// TypingIndicator Component
// =============================================================================

import { SparklesIcon } from '../common/Icons';

export default function TypingIndicator() {
  return (
    <div className="typing-indicator" id="typing-indicator">
      <div className="message-bubble__avatar message-bubble__avatar--assistant" style={{ width: 30, height: 30 }}>
        <SparklesIcon size={14} stroke="#ffffff" />
      </div>
      <div className="typing-indicator__dots">
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
      </div>
      <span className="typing-indicator__label">Thinking...</span>
    </div>
  );
}

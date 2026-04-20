// =============================================================================
// ChatFeed Component
// =============================================================================

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import DraftPreviewCard from '../cards/DraftPreviewCard';
import CalendarConfirmCard from '../cards/CalendarConfirmCard';
import ConflictWarningCard from '../cards/ConflictWarningCard';
import { SUGGESTIONS } from '../../utils/constants';

export default function ChatFeed({
  messages,
  isTyping,
  pendingDraft,
  draftStatus,
  onApproveDraft,
  onRejectDraft,
  onSuggestionClick,
}) {
  const feedRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isTyping, pendingDraft]);

  // Empty state
  if (messages.length === 0 && !isTyping) {
    return (
      <div className="chat-feed" ref={feedRef} id="chat-feed">
        <div className="chat-feed__empty">
          <div className="chat-feed__empty-icon">🎯</div>
          <h2 className="chat-feed__empty-title">Welcome to JobHunt AI</h2>
          <p className="chat-feed__empty-subtitle">
            I can help you draft professional emails, schedule meetings, 
            and track your job search. Try one of these commands to get started:
          </p>
          <div className="chat-feed__suggestions">
            {SUGGESTIONS.map((suggestion, i) => (
              <button
                key={i}
                className="chat-feed__suggestion"
                onClick={() => onSuggestionClick(suggestion.command)}
                id={`suggestion-${i}`}
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-feed" ref={feedRef} id="chat-feed">
      {messages.map((msg) => {
        // Render calendar confirmation card inline
        if (msg.type === 'calendar' && msg.event) {
          return (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              <CalendarConfirmCard event={msg.event} />
            </div>
          );
        }

        // Render conflict warning card inline
        if (msg.type === 'conflict' && msg.conflicts) {
          return (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              <ConflictWarningCard
                conflicts={msg.conflicts}
                suggestion={msg.suggestion}
              />
            </div>
          );
        }

        return <MessageBubble key={msg.id} message={msg} />;
      })}

      {/* Pending Draft Card */}
      {pendingDraft && (
        <DraftPreviewCard
          draft={pendingDraft}
          status={draftStatus}
          onApprove={onApproveDraft}
          onReject={onRejectDraft}
        />
      )}

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator />}
    </div>
  );
}

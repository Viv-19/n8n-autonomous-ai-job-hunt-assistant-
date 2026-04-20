// =============================================================================
// MessageInput Component
// =============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';

export default function MessageInput({ onSend, disabled, inputActionRef }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Allow parent to pre-fill the input via ref callback
  useEffect(() => {
    if (inputActionRef) {
      inputActionRef.current = (prefill) => {
        setText(prefill);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(prefill.length, prefill.length);
          }
        }, 50);
      };
    }
  }, [inputActionRef]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, []);

  return (
    <div className="message-input" id="message-input-area">
      <form className="message-input__form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="message-input__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={disabled ? 'Waiting for response...' : 'Type your command... (Enter to send, Shift+Enter for new line)'}
          disabled={disabled}
          rows={1}
          id="chat-input"
          aria-label="Chat message input"
        />
        <button
          type="submit"
          className="message-input__send"
          disabled={disabled || !text.trim()}
          id="send-button"
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

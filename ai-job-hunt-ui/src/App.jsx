// =============================================================================
// App — Main Application Component
// =============================================================================

import { useCallback, useRef } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import StatusBar from './components/layout/StatusBar';
import ChatFeed from './components/chat/ChatFeed';
import MessageInput from './components/chat/MessageInput';
import ToastContainer from './components/common/Toast';
import { useChat } from './hooks/useChat';
import { useN8nConnection } from './hooks/useN8nConnection';

export default function App() {
  const {
    messages,
    isTyping,
    pendingDraft,
    draftStatus,
    sendMessage,
    approveDraft,
    rejectDraft,
  } = useChat();

  // Keep connection hook alive at app level
  useN8nConnection();

  // Ref to control the input from parent (for quick actions & suggestions)
  const inputActionRef = useRef(null);

  /**
   * Handle quick action / suggestion clicks.
   * If the command is a complete sentence (no trailing space), send it.
   * If it has a trailing space, insert it into the input for user to complete.
   */
  const handleQuickAction = useCallback((command) => {
    if (command.endsWith(' ')) {
      // Partial command — focus input and pre-fill
      if (inputActionRef.current) {
        inputActionRef.current(command);
      }
    } else {
      // Complete command — send directly
      sendMessage(command);
    }
  }, [sendMessage]);

  return (
    <div className="app">
      <Header />

      <div className="app__body">
        <Sidebar onQuickAction={handleQuickAction} />

        <main className="main-area" id="main-area">
          <ChatFeed
            messages={messages}
            isTyping={isTyping}
            pendingDraft={pendingDraft}
            draftStatus={draftStatus}
            onApproveDraft={approveDraft}
            onRejectDraft={rejectDraft}
            onSuggestionClick={handleQuickAction}
          />
          <MessageInput
            onSend={sendMessage}
            disabled={isTyping}
            inputActionRef={inputActionRef}
          />
        </main>
      </div>

      <StatusBar />
      <ToastContainer />
    </div>
  );
}

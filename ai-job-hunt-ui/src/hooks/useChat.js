// =============================================================================
// useChat — Chat Logic Hook
// =============================================================================
// Redesigned for autonomous AI Agent architecture.
// The n8n Agent returns PLAIN TEXT (not structured JSON), so we use
// intelligent text analysis to detect drafts, confirmations, and actions.

import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { n8nService } from '../services/n8nService';
import { DRAFT_STATUS } from '../utils/constants';

/**
 * Attempt to extract a structured email draft from the agent's plain-text response.
 * The AI typically formats drafts like:
 *   Subject: ...
 *   To: ...
 *   Body/Message: ...
 * OR just includes all content after "Here is your draft email:"
 */
function extractDraftFromText(text) {
  if (!text) return null;

  // Indicators that this response contains a draft
  const hasDraftSignal =
    /draft|here is (your|the) (draft|email)|i('ve|'ve| have) (drafted|composed|prepared|written)/i.test(text);
  const hasSubjectLine = /\bsubject\s*:/i.test(text);
  const hasToLine = /\bto\s*:/i.test(text);

  if (!hasDraftSignal || !hasSubjectLine) return null;

  // Extract fields
  const toMatch = text.match(/\bTo\s*:\s*(.+?)(?:\n|$)/i);
  const subjectMatch = text.match(/\bSubject\s*:\s*(.+?)(?:\n|$)/i);

  // Body is everything after the Subject/To/headers section
  // Try to find a "Body:" or "Message:" label first
  let body = '';
  const bodyMatch = text.match(/\b(?:Body|Message)\s*:\s*([\s\S]+?)(?:\n\n---|\n\nShould I|$)/i);
  if (bodyMatch) {
    body = bodyMatch[1].trim();
  } else {
    // Fall back: everything after the last header line
    const lines = text.split('\n');
    let bodyStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(To|Subject|From|CC|BCC)\s*:/i.test(lines[i])) {
        bodyStart = i + 1;
      }
    }
    if (bodyStart > 0 && bodyStart < lines.length) {
      body = lines.slice(bodyStart).join('\n').trim();
      // Remove trailing "Should I send it?" type prompts
      body = body.replace(/\n*(?:Should I (?:send|mail).*|Would you like me to (?:send|mail).*|Let me know.*)$/i, '').trim();
    }
  }

  if (!subjectMatch) return null;

  return {
    to: toMatch ? toMatch[1].trim() : 'recipient',
    subject: subjectMatch[1].trim(),
    body: body || '(See email content above)',
    draftId: `draft-${Date.now()}`,
  };
}

/**
 * Detect if the agent confirmed an email was sent
 */
function isEmailSentConfirmation(text) {
  if (!text) return false;
  return /email (?:has been |was )?sent|successfully sent|email delivered|mail(?:ed| sent)/i.test(text);
}

export function useChat() {
  const {
    state,
    addMessage,
    setTyping,
    setDraft,
    clearDraft,
    setDraftStatus,
    addActivity,
    addToast,
  } = useApp();

  /**
   * Send a user message and handle the response
   */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    // Add user message to chat
    addMessage('user', text);
    setTyping(true);

    try {
      // Call n8n webhook
      const response = await n8nService.sendMessage(text);
      setTyping(false);

      // --- Extract the actual message text ---
      // The n8n Agent returns various formats: plain string, {output: "..."}, or rarely structured JSON.
      let messageText = '';

      if (typeof response === 'string') {
        // Try to parse as JSON first (agent might return JSON string)
        try {
          const parsed = JSON.parse(response);
          messageText = parsed.message || parsed.output || response;
        } catch {
          messageText = response;
        }
      } else if (typeof response === 'object' && response !== null) {
        // n8n typically returns {output: "..."} or the LLM might return structured JSON
        messageText = response.message || response.output || JSON.stringify(response);
      }

      // Clean up: if messageText is itself a JSON string, try to extract the message
      if (messageText.startsWith('{') && messageText.includes('"message"')) {
        try {
          const inner = JSON.parse(messageText);
          messageText = inner.message || messageText;
        } catch { /* keep as-is */ }
      }

      // --- Analyze the response and take appropriate action ---

      // Case 1: Agent confirmed email was sent
      if (isEmailSentConfirmation(messageText)) {
        addMessage('assistant', messageText, 'text');
        // Clear any pending draft since it's been sent
        if (state.pendingDraft) {
          const recipient = state.pendingDraft.to;
          clearDraft();
          addActivity('EMAIL_SENT', `Email to ${recipient}`);
          addToast('success', 'Email Sent', `Email delivered to ${recipient}`);
        } else {
          addActivity('EMAIL_SENT', 'Email sent');
          addToast('success', 'Email Sent', 'Email delivered successfully');
        }
        return;
      }

      // Case 2: Agent returned a draft for review
      const draft = extractDraftFromText(messageText);
      if (draft) {
        addMessage('assistant', messageText, 'text');
        setDraft(draft);
        addActivity('DRAFT_CREATED', `Draft to ${draft.to}`);
        return;
      }

      // Case 3: Default — regular conversational message
      addMessage('assistant', messageText || 'I received your message.', 'text');

    } catch (error) {
      setTyping(false);
      const errorMsg = error.message || 'Failed to connect to the assistant.';
      addMessage('assistant', `⚠️ ${errorMsg}`, 'error');
      addToast('error', 'Connection Error', errorMsg);
    }
  }, [addMessage, setTyping, setDraft, clearDraft, addActivity, addToast, state.pendingDraft]);

  /**
   * Approve a pending draft — tells the agent to send via Gmail tool
   */
  const approveDraft = useCallback(async () => {
    const draft = state.pendingDraft;
    if (!draft) return;

    setDraftStatus(DRAFT_STATUS.SENDING);

    try {
      // Send approval message to the agent — it will use the Gmail tool
      const response = await n8nService.sendMessage(
        `Yes, send the email to ${draft.to} with subject "${draft.subject}". Send it now.`
      );

      setDraftStatus(DRAFT_STATUS.APPROVED);
      clearDraft();

      // Parse the response
      let confirmText = '';
      if (typeof response === 'string') {
        try { confirmText = JSON.parse(response).message || response; } catch { confirmText = response; }
      } else {
        confirmText = response?.message || response?.output || 'Email sent!';
      }

      addMessage('assistant', confirmText || '✅ Email sent successfully!', 'text');
      addActivity('EMAIL_SENT', `Email to ${draft.to}`);
      addToast('success', 'Email Sent', `Email delivered to ${draft.to}`);
    } catch (error) {
      setDraftStatus(DRAFT_STATUS.PENDING);
      addToast('error', 'Send Failed', error.message);
    }
  }, [state.pendingDraft, setDraftStatus, clearDraft, addMessage, addActivity, addToast]);

  /**
   * Reject a pending draft
   */
  const rejectDraft = useCallback(async () => {
    const draft = state.pendingDraft;
    if (!draft) return;

    clearDraft();
    addMessage('assistant', 'Draft discarded. Let me know if you\'d like to try again.', 'text');
    addActivity('EMAIL_REJECTED', `Draft to ${draft.to} rejected`);
  }, [state.pendingDraft, clearDraft, addMessage, addActivity]);

  return {
    messages: state.messages,
    isTyping: state.isTyping,
    pendingDraft: state.pendingDraft,
    draftStatus: state.draftStatus,
    sendMessage,
    approveDraft,
    rejectDraft,
  };
}

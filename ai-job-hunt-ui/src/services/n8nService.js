// =============================================================================
// n8n Service — HTTP Client for Webhook Communication
// =============================================================================

import { WEBHOOK_URL, N8N_BASE_URL, ACTIONS } from '../utils/constants';

class N8nService {
  constructor() {
    this.webhookUrl = WEBHOOK_URL;
    this.sessionId = this._getOrCreateSession();
  }

  /**
   * Get or create a persistent session ID
   */
  _getOrCreateSession() {
    let id = sessionStorage.getItem('job_assistant_session_id');
    if (!id) {
      id = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem('job_assistant_session_id', id);
    }
    return id;
  }

  /**
   * Core fetch wrapper with timeout and error handling
   */
  async _request(body, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.webhookUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`n8n error (${response.status}): ${errorText}`);
      }

      // AI Agent may return plain text or JSON — handle both gracefully
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { type: 'message', message: text };
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The assistant may be processing a complex task.');
      }
      throw error;
    }
  }

  /**
   * Send a chat message to n8n
   */
  async sendMessage(message) {
    return this._request({
      action: ACTIONS.CHAT,
      message: message.trim(),
    });
  }

  /**
   * Approve a pending email draft
   */
  async approveDraft(draftId) {
    return this._request({
      action: ACTIONS.APPROVE,
      draftId,
    });
  }

  /**
   * Reject a pending email draft
   */
  async rejectDraft(draftId, reason = '') {
    return this._request({
      action: ACTIONS.REJECT,
      draftId,
      reason,
    });
  }

  /**
   * Check if n8n is reachable
   */
  async healthCheck() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${N8N_BASE_URL}/healthz`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Reset session (start new conversation)
   */
  resetSession() {
    sessionStorage.removeItem('job_assistant_session_id');
    this.sessionId = this._getOrCreateSession();
    return this.sessionId;
  }
}

// Singleton export
export const n8nService = new N8nService();

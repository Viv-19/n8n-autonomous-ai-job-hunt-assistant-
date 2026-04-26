// =============================================================================
// Constants & Configuration
// =============================================================================

export const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678';
export const WEBHOOK_URL = `${N8N_BASE_URL}/webhook`;

// Message types from n8n
export const MESSAGE_TYPES = {
  DRAFT: 'draft',
  CALENDAR_CONFIRM: 'calendar_confirm',
  CONFLICT: 'conflict',
  CONFIRMATION: 'confirmation',
  MESSAGE: 'message',
  ERROR: 'error',
};

// Action types for webhook
export const ACTIONS = {
  CHAT: 'chat',
  APPROVE: 'approve',
  REJECT: 'reject',
};

// Intent types (from Gemini classification)
export const INTENTS = {
  SEND_EMAIL: 'SEND_EMAIL',
  SCHEDULE_MEETING: 'SCHEDULE_MEETING',
  CHECK_CALENDAR: 'CHECK_CALENDAR',
  VIEW_LOGS: 'VIEW_LOGS',
  VIEW_CONTACTS: 'VIEW_CONTACTS',
  GENERAL_QUERY: 'GENERAL_QUERY',
};

// Draft statuses
export const DRAFT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENDING: 'sending',
};

// Quick action suggestions for empty chat
export const SUGGESTIONS = [
  { text: 'Send email to a recruiter', command: 'Send an email to ' },
  { text: 'Schedule a meeting', command: 'Schedule a meeting on ' },
  { text: 'Show activity log', command: 'Show my recent activity log' },
  { text: 'View contacts', command: 'Show my contacts list' },
  { text: 'Draft a follow-up', command: 'Draft a follow-up email to ' },
  { text: 'Check calendar', command: 'What meetings do I have this week?' },
];

// Activity type to dot color mapping
export const ACTIVITY_COLORS = {
  DRAFT_CREATED: 'email',
  EMAIL_SENT: 'email',
  EMAIL_REJECTED: 'error',
  MEETING_CREATED: 'calendar',
  CALENDAR_CHECKED: 'calendar',
  LOG_VIEWED: 'log',
  ERROR: 'error',
};

// Health check interval (ms)
export const HEALTH_CHECK_INTERVAL = 15000;

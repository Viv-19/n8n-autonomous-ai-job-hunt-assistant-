// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format a timestamp to relative time (e.g., "2m ago", "1h ago")
 */
export function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a timestamp for message display
 */
export function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date for calendar display
 */
export function formatCalendarDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time range (e.g., "2:00 PM – 3:00 PM")
 */
export function formatTimeRange(startTime, endTime) {
  const formatTime = (t) => {
    const [hours, minutes] = t.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * Generate a unique ID
 */
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Map activity type to human-readable label
 */
export function formatActivityType(type) {
  const labels = {
    DRAFT_CREATED: 'Draft created',
    EMAIL_SENT: 'Email sent',
    EMAIL_REJECTED: 'Draft rejected',
    MEETING_CREATED: 'Meeting scheduled',
    CALENDAR_CHECKED: 'Calendar checked',
    LOG_VIEWED: 'Logs viewed',
    ERROR: 'Error occurred',
  };
  return labels[type] || type;
}

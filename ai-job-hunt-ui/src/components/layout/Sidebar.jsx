// =============================================================================
// Sidebar Component
// =============================================================================

import { useApp } from '../../context/AppContext';
import { formatRelativeTime, formatActivityType, truncate } from '../../utils/formatters';
import { ACTIVITY_COLORS, SUGGESTIONS } from '../../utils/constants';

export default function Sidebar({ onQuickAction }) {
  const { state, clearMessages } = useApp();
  const { sidebarOpen, recentActivity } = state;

  return (
    <aside className={`sidebar ${!sidebarOpen ? 'sidebar--hidden' : ''}`} id="sidebar">
      {/* Quick Actions */}
      <div className="sidebar__section">
        <h3 className="sidebar__section-title">Quick Actions</h3>
        <div className="sidebar__actions-list">
          <button
            className="sidebar__action"
            onClick={() => onQuickAction('Send an email to ')}
            id="action-send-email"
          >
            <span className="sidebar__action-icon">✉️</span>
            Send Email
          </button>
          <button
            className="sidebar__action"
            onClick={() => onQuickAction('Schedule a meeting on ')}
            id="action-schedule-meeting"
          >
            <span className="sidebar__action-icon">📅</span>
            Schedule Meeting
          </button>
          <button
            className="sidebar__action"
            onClick={() => onQuickAction('Show my recent activity log')}
            id="action-view-logs"
          >
            <span className="sidebar__action-icon">📋</span>
            View Activity Log
          </button>
          <button
            className="sidebar__action"
            onClick={() => onQuickAction('Show my contacts list')}
            id="action-view-contacts"
          >
            <span className="sidebar__action-icon">👥</span>
            View Contacts
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="sidebar__section">
        <h3 className="sidebar__section-title">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="sidebar__activity-empty">No activity yet. Start chatting!</p>
        ) : (
          <div className="sidebar__activity-list">
            {recentActivity.slice(0, 10).map((activity) => (
              <div className="activity-card" key={activity.id}>
                <span
                  className={`activity-card__dot activity-card__dot--${
                    ACTIVITY_COLORS[activity.activityType] || 'log'
                  }`}
                />
                <span className="activity-card__text">
                  {truncate(activity.details || formatActivityType(activity.activityType), 30)}
                </span>
                <span className="activity-card__time">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session */}
      <div className="sidebar__section" style={{ marginTop: 'auto' }}>
        <button
          className="sidebar__action"
          onClick={clearMessages}
          id="action-clear-chat"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="sidebar__action-icon">🗑️</span>
          Clear Chat
        </button>
      </div>
    </aside>
  );
}

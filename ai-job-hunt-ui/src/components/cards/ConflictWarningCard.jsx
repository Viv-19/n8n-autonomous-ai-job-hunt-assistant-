// =============================================================================
// ConflictWarningCard Component
// =============================================================================

import { AlertTriangleIcon, CalendarIcon, LightbulbIcon } from '../common/Icons';

export default function ConflictWarningCard({ conflicts, suggestion }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="conflict-card animate-fade-in-up" id="conflict-warning-card">
      {/* Header */}
      <div className="conflict-card__header">
        <AlertTriangleIcon size={18} stroke="var(--accent-warning)" />
        <span className="conflict-card__title">Schedule Conflict</span>
      </div>

      {/* Body */}
      <div className="conflict-card__body">
        {conflicts.map((conflict, index) => (
          <div className="conflict-card__item" key={index}>
            <CalendarIcon size={14} />
            <span>
              <strong>{conflict.title}</strong>
              {conflict.startTime && conflict.endTime && (
                <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                  {conflict.startTime} – {conflict.endTime}
                </span>
              )}
            </span>
          </div>
        ))}

        {suggestion && (
          <p className="conflict-card__suggestion">
            <LightbulbIcon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {suggestion}
          </p>
        )}
      </div>
    </div>
  );
}

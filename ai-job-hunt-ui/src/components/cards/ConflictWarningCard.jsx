// =============================================================================
// ConflictWarningCard Component
// =============================================================================

export default function ConflictWarningCard({ conflicts, suggestion }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="conflict-card animate-fade-in-up" id="conflict-warning-card">
      {/* Header */}
      <div className="conflict-card__header">
        <span style={{ fontSize: 'var(--font-size-lg)' }}>⚠️</span>
        <span className="conflict-card__title">Schedule Conflict</span>
      </div>

      {/* Body */}
      <div className="conflict-card__body">
        {conflicts.map((conflict, index) => (
          <div className="conflict-card__item" key={index}>
            <span>📌</span>
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
          <p className="conflict-card__suggestion">💡 {suggestion}</p>
        )}
      </div>
    </div>
  );
}

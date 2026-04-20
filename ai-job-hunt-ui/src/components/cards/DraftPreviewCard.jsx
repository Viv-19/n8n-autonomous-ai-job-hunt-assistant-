// =============================================================================
// DraftPreviewCard Component
// =============================================================================

import { DRAFT_STATUS } from '../../utils/constants';

export default function DraftPreviewCard({ draft, status, onApprove, onReject }) {
  if (!draft) return null;

  const isSending = status === DRAFT_STATUS.SENDING;
  const statusLabel = {
    [DRAFT_STATUS.PENDING]: 'Pending Review',
    [DRAFT_STATUS.SENDING]: 'Sending...',
    [DRAFT_STATUS.APPROVED]: 'Sent',
    [DRAFT_STATUS.REJECTED]: 'Rejected',
  };

  const statusClass = {
    [DRAFT_STATUS.PENDING]: 'pending',
    [DRAFT_STATUS.SENDING]: 'pending',
    [DRAFT_STATUS.APPROVED]: 'sent',
    [DRAFT_STATUS.REJECTED]: 'rejected',
  };

  return (
    <div className="draft-card animate-fade-in-up" id="draft-preview-card">
      {/* Header */}
      <div className="draft-card__header">
        <div className="draft-card__header-left">
          <div className="draft-card__icon">✉️</div>
          <span className="draft-card__title">Email Draft</span>
        </div>
        <span className={`draft-card__status draft-card__status--${statusClass[status]}`}>
          {statusLabel[status]}
        </span>
      </div>

      {/* Body */}
      <div className="draft-card__body">
        {/* To */}
        <div className="draft-card__field">
          <span className="draft-card__label">To</span>
          <span className="draft-card__value draft-card__value--email">
            {draft.toName ? `${draft.toName} <${draft.to}>` : draft.to}
            {draft.company && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                at {draft.company}
              </span>
            )}
          </span>
        </div>

        {/* Subject */}
        <div className="draft-card__field">
          <span className="draft-card__label">Subject</span>
          <span className="draft-card__value">{draft.subject}</span>
        </div>

        {/* Body */}
        <div className="draft-card__field">
          <span className="draft-card__label">Message</span>
          <div className="draft-card__email-body">{draft.body}</div>
        </div>

        {/* Attachment */}
        {draft.attachmentName && (
          <div className="draft-card__attachment">
            <span className="draft-card__attachment-icon">📎</span>
            <span>{draft.attachmentName}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {status === DRAFT_STATUS.PENDING && (
        <div className="draft-card__actions">
          <button
            className="btn btn--success"
            onClick={onApprove}
            disabled={isSending}
            id="approve-draft-btn"
          >
            <span className="btn__icon">✓</span>
            Approve & Send
          </button>
          <button
            className="btn btn--danger"
            onClick={onReject}
            disabled={isSending}
            id="reject-draft-btn"
          >
            <span className="btn__icon">✗</span>
            Reject
          </button>
        </div>
      )}

      {isSending && (
        <div className="draft-card__actions" style={{ justifyContent: 'center' }}>
          <div className="spinner spinner--sm" style={{ marginRight: 8 }} />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Sending email...
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CalendarConfirmCard Component
// =============================================================================

import { formatCalendarDate, formatTimeRange } from '../../utils/formatters';
import { CalendarIcon, MapPinIcon, ClockIcon, ExternalLinkIcon } from '../common/Icons';

export default function CalendarConfirmCard({ event }) {
  if (!event) return null;

  return (
    <div className="calendar-card animate-fade-in-up" id="calendar-confirm-card">
      {/* Header */}
      <div className="calendar-card__header">
        <div className="calendar-card__icon">
          <CalendarIcon size={16} stroke="#ffffff" />
        </div>
        <span className="calendar-card__title">Meeting Scheduled</span>
      </div>

      {/* Body */}
      <div className="calendar-card__body">
        <div className="calendar-card__detail">
          <span className="calendar-card__detail-icon">
            <MapPinIcon size={16} />
          </span>
          <span className="calendar-card__detail-label">Title</span>
          <span className="calendar-card__detail-value">{event.title}</span>
        </div>

        <div className="calendar-card__detail">
          <span className="calendar-card__detail-icon">
            <CalendarIcon size={16} />
          </span>
          <span className="calendar-card__detail-label">Date</span>
          <span className="calendar-card__detail-value">
            {event.date ? formatCalendarDate(event.date) : 'N/A'}
          </span>
        </div>

        <div className="calendar-card__detail">
          <span className="calendar-card__detail-icon">
            <ClockIcon size={16} />
          </span>
          <span className="calendar-card__detail-label">Time</span>
          <span className="calendar-card__detail-value">
            {event.startTime && event.endTime
              ? formatTimeRange(event.startTime, event.endTime)
              : event.startTime || 'N/A'}
          </span>
        </div>

        {event.calendarLink && (
          <a
            href={event.calendarLink}
            target="_blank"
            rel="noopener noreferrer"
            className="calendar-card__link"
            id="calendar-event-link"
          >
            <ExternalLinkIcon size={14} />
            Open in Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}

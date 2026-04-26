// =============================================================================
// StatusBar Component
// =============================================================================

import { useApp } from '../../context/AppContext';
import { n8nService } from '../../services/n8nService';
import { MessageSquareIcon } from '../common/Icons';

export default function StatusBar() {
  const { state } = useApp();
  const { messages, connectionStatus } = state;

  const lastAction = state.recentActivity[0];

  return (
    <div className="status-bar" id="status-bar">
      <div className="status-bar__left">
        <span className="status-bar__item">
          <MessageSquareIcon size={12} />
          {messages.length} messages
        </span>
        {lastAction && (
          <span className="status-bar__item">
            <span className="status-bar__separator" />
            Last: {lastAction.details || 'N/A'}
          </span>
        )}
      </div>
      <div className="status-bar__right">
        <span className="status-bar__item">
          Session: {n8nService.getSessionId().slice(0, 8)}...
        </span>
        <span className="status-bar__item">
          <span className={`status-bar__dot status-bar__dot--${connectionStatus === 'connected' ? 'online' : 'offline'}`} />
          n8n
        </span>
      </div>
    </div>
  );
}

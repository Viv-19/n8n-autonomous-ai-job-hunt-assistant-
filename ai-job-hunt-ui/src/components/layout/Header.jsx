// =============================================================================
// Header Component
// =============================================================================

import { useApp } from '../../context/AppContext';
import { useN8nConnection } from '../../hooks/useN8nConnection';
import { MenuIcon, BriefcaseIcon } from '../common/Icons';

export default function Header() {
  const { toggleSidebar } = useApp();
  const { connectionStatus, isConnected } = useN8nConnection();

  return (
    <header className="header" id="app-header">
      <div className="header__left">
        <button
          className="header__menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          id="sidebar-toggle"
        >
          <MenuIcon size={20} />
        </button>
        <div className="header__logo">
          <div className="header__logo-icon">
            <BriefcaseIcon size={18} stroke="#ffffff" />
          </div>
          <span className="header__logo-text">JobHunt AI</span>
          <span className="header__logo-badge">Assistant</span>
        </div>
      </div>
      <div className="header__right">
        <div className="header__status" id="connection-status">
          <span
            className={`header__status-dot header__status-dot--${isConnected ? 'connected' : 'disconnected'}`}
          />
          <span className="header__status-label">
            {connectionStatus === 'checking'
              ? 'Connecting...'
              : isConnected
              ? 'n8n Connected'
              : 'n8n Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}

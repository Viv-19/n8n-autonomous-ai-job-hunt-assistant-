// =============================================================================
// Main Entry Point
// =============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import App from './App';

// Design system & component styles
import './styles/index.css';
import './styles/layout.css';
import './styles/chat.css';
import './styles/cards.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);

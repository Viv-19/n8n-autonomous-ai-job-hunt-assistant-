// =============================================================================
// App Context — Global State Management
// =============================================================================

import { createContext, useContext, useReducer, useCallback } from 'react';
import { generateId } from '../utils/formatters';
import { DRAFT_STATUS, MESSAGE_TYPES } from '../utils/constants';

// --- Initial State ---
const initialState = {
  messages: [],
  isTyping: false,
  pendingDraft: null,
  draftStatus: DRAFT_STATUS.PENDING,
  recentActivity: [],
  connectionStatus: 'checking', // 'connected' | 'disconnected' | 'checking'
  sidebarOpen: true,
  toasts: [],
};

// --- Action Types ---
const ActionTypes = {
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_TYPING: 'SET_TYPING',
  SET_DRAFT: 'SET_DRAFT',
  CLEAR_DRAFT: 'CLEAR_DRAFT',
  SET_DRAFT_STATUS: 'SET_DRAFT_STATUS',
  ADD_ACTIVITY: 'ADD_ACTIVITY',
  SET_CONNECTION: 'SET_CONNECTION',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
};

// --- Reducer ---
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, {
          id: generateId(),
          timestamp: new Date().toISOString(),
          ...action.payload,
        }],
      };

    case ActionTypes.SET_TYPING:
      return { ...state, isTyping: action.payload };

    case ActionTypes.SET_DRAFT:
      return {
        ...state,
        pendingDraft: action.payload,
        draftStatus: DRAFT_STATUS.PENDING,
      };

    case ActionTypes.CLEAR_DRAFT:
      return {
        ...state,
        pendingDraft: null,
        draftStatus: DRAFT_STATUS.PENDING,
      };

    case ActionTypes.SET_DRAFT_STATUS:
      return { ...state, draftStatus: action.payload };

    case ActionTypes.ADD_ACTIVITY:
      return {
        ...state,
        recentActivity: [
          { id: generateId(), timestamp: new Date().toISOString(), ...action.payload },
          ...state.recentActivity,
        ].slice(0, 20),
      };

    case ActionTypes.SET_CONNECTION:
      return { ...state, connectionStatus: action.payload };

    case ActionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case ActionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, {
          id: generateId(),
          timestamp: Date.now(),
          ...action.payload,
        }],
      };

    case ActionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload),
      };

    case ActionTypes.CLEAR_MESSAGES:
      return { ...state, messages: [], pendingDraft: null, draftStatus: DRAFT_STATUS.PENDING };

    default:
      return state;
  }
}

// --- Context ---
const AppContext = createContext(null);

// --- Provider ---
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Action creators
  const addMessage = useCallback((role, content, type = 'text', meta = {}) => {
    dispatch({
      type: ActionTypes.ADD_MESSAGE,
      payload: { role, content, type, ...meta },
    });
  }, []);

  const setTyping = useCallback((isTyping) => {
    dispatch({ type: ActionTypes.SET_TYPING, payload: isTyping });
  }, []);

  const setDraft = useCallback((draft) => {
    dispatch({ type: ActionTypes.SET_DRAFT, payload: draft });
  }, []);

  const clearDraft = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_DRAFT });
  }, []);

  const setDraftStatus = useCallback((status) => {
    dispatch({ type: ActionTypes.SET_DRAFT_STATUS, payload: status });
  }, []);

  const addActivity = useCallback((activityType, details) => {
    dispatch({
      type: ActionTypes.ADD_ACTIVITY,
      payload: { activityType, details },
    });
  }, []);

  const setConnection = useCallback((status) => {
    dispatch({ type: ActionTypes.SET_CONNECTION, payload: status });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
  }, []);

  const addToast = useCallback((variant, title, message = '') => {
    const toastId = generateId();
    dispatch({
      type: ActionTypes.ADD_TOAST,
      payload: { id: toastId, variant, title, message },
    });
    // Auto-remove after 5 seconds
    setTimeout(() => {
      dispatch({ type: ActionTypes.REMOVE_TOAST, payload: toastId });
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: ActionTypes.REMOVE_TOAST, payload: id });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_MESSAGES });
  }, []);

  const value = {
    state,
    addMessage,
    setTyping,
    setDraft,
    clearDraft,
    setDraftStatus,
    addActivity,
    setConnection,
    toggleSidebar,
    addToast,
    removeToast,
    clearMessages,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// --- Hook ---
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

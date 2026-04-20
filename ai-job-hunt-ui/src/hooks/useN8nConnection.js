// =============================================================================
// useN8nConnection — Health Check Hook
// =============================================================================

import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { n8nService } from '../services/n8nService';
import { HEALTH_CHECK_INTERVAL } from '../utils/constants';

export function useN8nConnection() {
  const { state, setConnection } = useApp();
  const intervalRef = useRef(null);

  useEffect(() => {
    // Initial check
    const check = async () => {
      const isHealthy = await n8nService.healthCheck();
      setConnection(isHealthy ? 'connected' : 'disconnected');
    };

    check();

    // Periodic health checks
    intervalRef.current = setInterval(check, HEALTH_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setConnection]);

  return {
    connectionStatus: state.connectionStatus,
    isConnected: state.connectionStatus === 'connected',
  };
}

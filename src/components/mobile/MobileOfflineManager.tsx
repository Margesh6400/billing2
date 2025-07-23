import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react';

interface OfflineData {
  challans: any[];
  returns: any[];
  clients: any[];
  lastSync: string;
}

export function MobileOfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      cacheCurrentData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheCurrentData = async () => {
    try {
      // Cache current data to localStorage for offline access
      const cachedData: OfflineData = {
        challans: JSON.parse(localStorage.getItem('cached_challans') || '[]'),
        returns: JSON.parse(localStorage.getItem('cached_returns') || '[]'),
        clients: JSON.parse(localStorage.getItem('cached_clients') || '[]'),
        lastSync: new Date().toISOString()
      };
      
      setOfflineData(cachedData);
      localStorage.setItem('offline_data', JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  const syncPendingData = async () => {
    if (!isOnline) return;
    
    setPendingSync(true);
    try {
      // Sync any pending offline changes
      const pendingChanges = JSON.parse(localStorage.getItem('pending_changes') || '[]');
      
      for (const change of pendingChanges) {
        // Process each pending change
        console.log('Syncing change:', change);
        // Implementation would depend on your sync strategy
      }
      
      // Clear pending changes after successful sync
      localStorage.removeItem('pending_changes');
      
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setPendingSync(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-2 text-center text-sm">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>ઓફલાઇન મોડ - ડેટા સ્થાનિક રીતે સેવ થશે</span>
        </div>
      </div>
    );
  }

  if (pendingSync) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white p-2 text-center text-sm">
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>ડેટા સિંક થઈ રહ્યો છે...</span>
        </div>
      </div>
    );
  }

  return null;
}
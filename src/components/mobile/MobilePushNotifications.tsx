import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export function MobilePushNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        // Show a test notification
        new Notification('NO WERE TECH', {
          body: 'નોટિફિકેશન સક્રિય કરવામાં આવ્યું!',
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    }
  };

  const scheduleReminderNotification = (title: string, body: string, delay: number) => {
    if (notificationsEnabled) {
      setTimeout(() => {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'reminder'
        });
      }, delay);
    }
  };

  // Example: Schedule reminder for overdue challans
  const scheduleOverdueReminder = () => {
    scheduleReminderNotification(
      'ચલણ રિમાઇન્ડર',
      'કેટલાક ચલણ મુદત વીતી ગઈ છે. કૃપા કરીને તપાસો.',
      5000 // 5 seconds for demo
    );
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {notificationsEnabled ? (
            <Bell className="w-5 h-5 text-green-600" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <h3 className="font-medium text-gray-900">નોટિફિકેશન</h3>
        </div>
        
        {permission === 'default' && (
          <button
            onClick={requestNotificationPermission}
            className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
          >
            સક્રિય કરો
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-3">
        {notificationsEnabled 
          ? 'નોટિફિકેશન સક્રિય છે. તમને મહત્વપૂર્ણ અપડેટ મળશે.'
          : 'મહત્વપૂર્ણ રિમાઇન્ડર માટે નોટિફિકેશન સક્રિય કરો.'
        }
      </p>
      
      {notificationsEnabled && (
        <button
          onClick={scheduleOverdueReminder}
          className="px-3 py-1 text-sm text-green-600 border border-green-600 rounded hover:bg-green-50"
        >
          ટેસ્ટ નોટિફિકેશન
        </button>
      )}
    </div>
  );
}
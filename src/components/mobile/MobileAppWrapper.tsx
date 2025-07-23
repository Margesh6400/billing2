import React, { useEffect } from 'react';
import { useMobileFeatures } from '../../hooks/useMobileFeatures';
import { ImpactStyle } from '@capacitor/haptics';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

export function MobileAppWrapper({ children }: MobileAppWrapperProps) {
  const { isNative, keyboardHeight, triggerHaptic } = useMobileFeatures();

  useEffect(() => {
    // Add haptic feedback to all buttons when running as native app
    if (isNative) {
      const handleButtonClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          triggerHaptic(ImpactStyle.Light);
        }
      };

      document.addEventListener('click', handleButtonClick);
      return () => document.removeEventListener('click', handleButtonClick);
    }
  }, [isNative, triggerHaptic]);

  return (
    <div 
      className={`min-h-screen ${isNative ? 'native-app' : 'web-app'}`}
      style={{
        paddingBottom: keyboardHeight ? `${keyboardHeight}px` : undefined,
        transition: 'padding-bottom 0.3s ease'
      }}
    >
      {children}
      
      {/* Native app specific styles */}
      {isNative && (
        <style>
          {`
            .native-app {
              -webkit-user-select: none;
              -webkit-touch-callout: none;
              -webkit-tap-highlight-color: transparent;
            }
            
            .native-app input,
            .native-app textarea {
              -webkit-user-select: text;
            }
            
            /* Prevent zoom on input focus */
            .native-app input[type="text"],
            .native-app input[type="email"],
            .native-app input[type="tel"],
            .native-app input[type="number"],
            .native-app input[type="password"],
            .native-app input[type="search"],
            .native-app input[type="url"],
            .native-app select,
            .native-app textarea {
              font-size: 16px !important;
            }
            
            /* Safe area support */
            .native-app {
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
            }
          `}
        </style>
      )}
    </div>
  );
}
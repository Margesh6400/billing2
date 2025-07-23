import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function useMobileFeatures() {
  const [isNative, setIsNative] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());

    if (Capacitor.isNativePlatform()) {
      // Configure status bar
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#1e40af' });

      // Keyboard listeners
      const keyboardWillShow = Keyboard.addListener('keyboardWillShow', info => {
        setKeyboardHeight(info.keyboardHeight);
      });

      const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      });

      // App state listeners
      const appStateChange = App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
        appStateChange.remove();
      };
    }
  }, []);

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (isNative) {
      await Haptics.impact({ style });
    }
  };

  const hideKeyboard = async () => {
    if (isNative) {
      await Keyboard.hide();
    }
  };

  return {
    isNative,
    keyboardHeight,
    triggerHaptic,
    hideKeyboard
  };
}
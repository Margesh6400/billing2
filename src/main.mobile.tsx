import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MobileApp from './App.mobile.tsx';
import './index.css';

// Import Capacitor plugins
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

// Initialize mobile app
const initMobileApp = async () => {
  if (Capacitor.isNativePlatform()) {
    // Hide splash screen after app is ready
    await SplashScreen.hide();
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MobileApp />
    </BrowserRouter>
  </StrictMode>
);

// Initialize mobile features
initMobileApp();
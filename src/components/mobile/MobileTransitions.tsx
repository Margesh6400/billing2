import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

export const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

export const LoadingCard = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

interface OfflineIndicatorProps {
  isOffline: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOffline }) => (
  <motion.div
    initial={{ y: -100 }}
    animate={{ y: isOffline ? 0 : -100 }}
    className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50"
  >
    You are currently offline. Changes will sync when connection is restored.
  </motion.div>
);

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  // Implementation would go here - requires additional setup
  return <>{children}</>;
};

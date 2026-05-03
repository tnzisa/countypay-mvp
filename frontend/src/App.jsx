import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Counties from './pages/Counties';
import Payment from './pages/Payment';
import Transactions from './pages/Transactions';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineIndicator from './components/OfflineIndicator';
import OfflineQueueService from './lib/offlineQueueService';

import AdminCounties from './pages/AdminCounties';
import AdminAnalytics from './pages/AdminAnalytics';

function App() {
  useEffect(() => {
    // Initialize offline queue service
    const initOfflineSupport = async () => {
      try {
        await window.offlineQueueService.init();
        console.log('✅ Offline support initialized');
      } catch (error) {
        console.error('❌ Failed to initialize offline support:', error);
      }
    };

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
          initOfflineSupport();
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
          initOfflineSupport();
        });
    } else {
      initOfflineSupport();
    }
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <OfflineIndicator />
        <div style={{ paddingTop: '50px' }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/counties" element={<ProtectedRoute><Counties /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/counties" element={<ProtectedRoute adminOnly><AdminCounties /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute adminOnly><AdminAnalytics /></ProtectedRoute>} />

            {/* Default */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation, { NavigationRef } from './components/Navigation';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Brands from './pages/Brands';
import Stock from './pages/Stock';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import TpCharges from './pages/TpCharges';
import InvoiceManagement from './pages/InvoiceManagement';
import './App.css';
import './mobile.css';
import './styles/invoice.css';

const AppContent: React.FC = () => {
  const navigationRef = useRef<NavigationRef>(null);
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    navigationRef.current?.toggleSidebar();
    // Get the actual state from Navigation component after toggle
    setTimeout(() => {
      if (navigationRef.current) {
        setIsSidebarOpen(navigationRef.current.isSidebarOpen);
      }
    }, 0);
  };

  // Get page title based on current route
  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/brands': return 'Brands';
      case '/stock': return 'Stock';
      case '/sales': return 'Sales';
      case '/tp-charges': return 'TP Charges';
      case '/reports': return 'Reports';
      // case '/invoices': return 'Invoice Management';
      default: return 'Power House';
    }
  };

  // Update sidebar state when navigation changes
  useEffect(() => {
    if (navigationRef.current) {
      setIsSidebarOpen(navigationRef.current.isSidebarOpen);
    }
  }, [location.pathname]);

  // Sync state with Navigation component periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigationRef.current) {
        const actualState = navigationRef.current.isSidebarOpen;
        if (actualState !== isSidebarOpen) {
          setIsSidebarOpen(actualState);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isSidebarOpen]);

  return (
    <div className="App">
      <ProtectedRoute>
        <Header 
          title={getPageTitle(location.pathname)}
          onToggleSidebar={handleToggleSidebar} 
          isSidebarOpen={isSidebarOpen}
        />
        <Navigation ref={navigationRef} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/tp-charges" element={<TpCharges />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/invoices" element={<InvoiceManagement />} />
          </Routes>
        </main>
      </ProtectedRoute>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;

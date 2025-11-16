import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

export interface NavigationRef {
  toggleSidebar: () => void;
  closeSidebar: () => void;
  isSidebarOpen: boolean;
}

const Navigation = forwardRef<NavigationRef>((props, ref) => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Changed to false by default

  // Debug logging
  React.useEffect(() => {
    console.log('🍔 Navigation component mounted');
    console.log('📱 Screen size:', window.innerWidth + 'x' + window.innerHeight);
    console.log('🔘 Sidebar open:', isSidebarOpen);
  }, [isSidebarOpen]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/brands', label: 'Brands', icon: '🏷️' },
    { path: '/stock', label: 'Stock', icon: '📦' },
    { path: '/sales', label: 'Sales', icon: '💰' },
    { path: '/invoices', label: 'Invoice Management', icon: '📄' },
    // { path: '/tp-charges', label: 'TP Charges', icon: '💳' },
    { path: '/reports', label: 'Reports', icon: '📋' },
  ];

  const toggleSidebar = () => {
    console.log('🍔 Toggle sidebar clicked! Current state:', isSidebarOpen);
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    toggleSidebar,
    closeSidebar,
    isSidebarOpen
  }));

  // Close sidebar when route changes
  React.useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  return (
    <>
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <nav className={`navigation ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="nav-header">
          <div className="nav-header-content">
            <h2>🍷 Power House</h2>
            <button 
              className="nav-close-btn" 
              onClick={closeSidebar}
              title="Close Menu"
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>
        </div>
        <ul className="nav-list">
          {navItems.map((item, index) => (
            <li 
              key={item.path} 
              className="nav-item"
              style={{ '--item-index': index } as React.CSSProperties}
            >
              <Link
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
});

export default Navigation;
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="unified-header">
      {/* Left section: Hamburger menu + Title */}
      <div className="header-left">
        <button 
          className={`header-toggle ${isSidebarOpen ? 'sidebar-open' : ''}`}
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Close Menu' : 'Open Menu'}
          aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isSidebarOpen ? '✕' : '☰'}
        </button>
        <div className="header-title-section">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Right section: User info + Logout */}
      <div className="header-right">
        <div className="header-user-info">
          <span className="header-username">👤 {user?.username}</span>
          <button className="header-logout-btn" onClick={handleLogout} title="Logout">
            🚪
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
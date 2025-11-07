import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Brands from './pages/Brands';
import Stock from './pages/Stock';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import TpCharges from './pages/TpCharges';
import './App.css';
import './mobile.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <ProtectedRoute>
            <Navigation />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/brands" element={<Brands />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/tp-charges" element={<TpCharges />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </main>
          </ProtectedRoute>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

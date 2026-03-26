import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import './styles/index.css';
import LoginPage from './components/LoginPage';
import FirstAccessPage from './components/FirstAccessPage';
import Footer from './components/Footer';
import MainPage from './components/MainPage';
import OCRPage from './components/OCRPage';
import UserManagementDashboard from './components/UserManagementDashboard';
import AssignmentsPanel from './components/AssignmentsPanel';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/first-access" element={<FirstAccessPage />} />
          <Route
            path="/main"
            element={(
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/ocr"
            element={(
              <ProtectedRoute>
                <OCRPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/users"
            element={(
              <ProtectedRoute>
                <UserManagementDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/assignments"
            element={(
              <ProtectedRoute>
                <AssignmentsPanel />
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
    <Footer />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import './styles/tokens.css';
import './styles/index.css';
import LoginPage from './Pages/LoginPage';
import FirstAccessPage from './Pages/FirstAccessPage';
import Footer from './Components/Layout/Footer';
import MainPage from './Pages/MainPage';
import OCRPage from './Pages/OCRPage';
import UserManagementDashboard from './Pages/UserManagementDashboard';
import AssignmentsPanel from './Pages/AssignmentsPanel';
import { AuthProvider } from './Context/Auth/AuthContext';
import ProtectedRoute from './Components/Layout/ProtectedRoute';

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
                            <ProtectedRoute requireAdmin={true}>
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

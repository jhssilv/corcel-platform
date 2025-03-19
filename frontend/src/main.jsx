import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './styles/index.css'
import LoginPage from './components/login_page.jsx'
import Footer from './components/footer.jsx'
import MainPage from './components/main_page.jsx'
import { AuthProvider } from './components/auth_context.jsx';
import ProtectedRoute from './components/protected_route.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
        <AuthProvider>  
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/main"
                        element={
                            <ProtectedRoute>
                                <MainPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </Router>
        </AuthProvider>
    <Footer />
  </StrictMode>,
)

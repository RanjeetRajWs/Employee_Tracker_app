/**
 * App Component
 * Main application component with providers and routing
 * @module App
 */

import { BrowserRouter } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { AppRoutes } from './routes';
import './App.css';
import './services/socket'; // Initialize socket connection

/**
 * Main App Component
 */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AdminProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AdminProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

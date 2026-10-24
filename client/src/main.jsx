import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { GameProvider } from './context/GameContext.jsx';
import { SocialProvider } from './context/SocialContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <GameProvider>
          <SocialProvider>
            <App />
          </SocialProvider>
        </GameProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);

// Installable app: register the service worker in production builds only
// (in development it would cache Vite's modules and fight hot reload).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

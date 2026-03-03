import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// Registrar PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva actualización disponible. ¿Deseas recargar la app?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App lista para trabajar sin conexión.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

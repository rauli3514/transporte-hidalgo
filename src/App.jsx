import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehiculos from './pages/Vehiculos';
import Choferes from './pages/Choferes';
import NuevoRemito from './pages/remitos/NuevoRemito';
import ListaRemitos from './pages/remitos/ListaRemitos';
import PrintRemito from './pages/remitos/PrintRemito';
import AsignarViaje from './pages/viajes/AsignarViaje';
import MisViajes from './pages/viajes/MisViajes';
import NuevoViaje from './pages/viajes/NuevoViaje';
import PrintPlanilla from './pages/viajes/PrintPlanilla';
import Seguimiento from './pages/public/Seguimiento';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const location = useLocation();
  const isPrintRoute = location.pathname.includes('/imprimir/');
  const isPublicRoute = location.pathname.includes('/seguimiento/');

  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
        <p className="text-muted">Cargando sistema...</p>
      </div>
    );
  }

  const layoutClass = isPrintRoute || isPublicRoute ? "" : "app-container";
  const mainClass = isPrintRoute || isPublicRoute ? "w-full min-h-screen" : "main-content flex flex-col";

  return (
    <div className={layoutClass}>
      <main className={mainClass}>
        <Routes>
          {/* Rutas Públicas (Sin login requerido) */}
          <Route path="/seguimiento/:guia" element={<Seguimiento />} />

          {/* Si ya hay sesión, redirigimos al Dashboard */}
          <Route
            path="/"
            element={session ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          {/* Si NO hay sesión, cualquier ruta protegida vuelve al Login */}
          <Route
            path="/dashboard"
            element={session ? <Dashboard /> : <Navigate to="/" replace />}
          />
          <Route
            path="/vehiculos"
            element={session ? <Vehiculos /> : <Navigate to="/" replace />}
          />
          <Route
            path="/choferes"
            element={session ? <Choferes /> : <Navigate to="/" replace />}
          />
          <Route
            path="/remitos/nuevo"
            element={session ? <NuevoRemito /> : <Navigate to="/" replace />}
          />
          <Route
            path="/remitos"
            element={session ? <ListaRemitos /> : <Navigate to="/" replace />}
          />
          <Route
            path="/remitos/imprimir/:id"
            element={session ? <PrintRemito /> : <Navigate to="/" replace />}
          />
          <Route
            path="/viajes/asignar/:id"
            element={session ? <AsignarViaje /> : <Navigate to="/" replace />}
          />
          <Route
            path="/viajes/nuevo"
            element={session ? <NuevoViaje /> : <Navigate to="/" replace />}
          />
          <Route
            path="/viajes/imprimir/:id"
            element={session ? <PrintPlanilla /> : <Navigate to="/" replace />}
          />
          <Route
            path="/viajes"
            element={session ? <MisViajes /> : <Navigate to="/" replace />}
          />
          {/* Agregaremos más rutas protegidas aquí luego */}
        </Routes>
      </main>
    </div>
  );
}

export default App;

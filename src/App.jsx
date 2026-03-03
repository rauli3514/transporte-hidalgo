import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehiculos from './pages/Vehiculos';
import Choferes from './pages/Choferes';
import NuevoRemito from './pages/remitos/NuevoRemito';
import ListaRemitos from './pages/remitos/ListaRemitos';
import AsignarViaje from './pages/viajes/AsignarViaje';
import MisViajes from './pages/viajes/MisViajes';

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

  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
        <p className="text-muted">Cargando sistema...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="main-content flex flex-col">
        <Routes>
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
            path="/viajes/asignar/:id"
            element={session ? <AsignarViaje /> : <Navigate to="/" replace />}
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

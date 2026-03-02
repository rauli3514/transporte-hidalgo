import { useState, useEffect } from 'react';
import { LogIn, Search, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function Login() {
    const [identifier, setIdentifier] = useState(''); // Puede ser usuario o email
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        // Si el usuario ingresa solo "juan", asumimos que su email es "juan@hidalgo.com.ar"
        // Esto permite loguearse rápido con un "Usuario" corto sin pedirle correo electrónico real.
        const emailToUse = identifier.includes('@') ? identifier : `${identifier}@hidalgo.com.ar`;

        const { error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password,
        });

        if (error) {
            if (error.message.includes('Invalid login')) {
                setErrorMsg('Usuario o contraseña incorrectos.');
            } else {
                setErrorMsg(error.message);
            }
        }

        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full" style={{ padding: '1rem' }}>
            <div className="text-center mb-8 mt-4">
                <div className="flex justify-center mb-6" style={{ transform: 'scale(1.2)' }}>
                    <Logo style={{ width: 80, height: 80, color: 'var(--primary)' }} />
                </div>
                <h1 className="mb-2" style={{ letterSpacing: '-0.03em', fontSize: '2.25rem', textTransform: 'uppercase' }}>
                    Transporte <span style={{ color: 'var(--primary)' }}>Hidalgo</span>
                </h1>
                <p className="text-muted" style={{ fontSize: '0.9375rem', maxWidth: '250px', margin: '0 auto' }}>
                    Sistema de logística, seguimiento y remitos digitales
                </p>
            </div>

            <div className="w-full">
                <div className="card w-full" style={{ padding: '2rem 1.5rem', marginBottom: '2rem' }}>
                    {errorMsg && (
                        <div className="mb-4" style={{ padding: '0.75rem', backgroundColor: 'var(--status-observed-bg)', color: 'var(--status-observed)', borderRadius: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="identifier">Identificador (Usuario)</label>
                            <input
                                id="identifier"
                                type="text"
                                className="form-input"
                                placeholder="Ejemplo: admin o operador1"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                autoCapitalize="none"
                                required
                            />
                        </div>

                        <div className="form-group mb-8">
                            <label className="form-label" htmlFor="password">Contraseña (PIN)</label>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Ingresar al Sistema
                                    <LogIn size={20} style={{ marginLeft: '0.5rem' }} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-muted mb-4" style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ¿Sos cliente y buscás tu envío?
                    </p>
                    <button className="btn btn-secondary w-full" onClick={() => alert('Próximamente: Búsqueda pública')} style={{ justifyContent: 'center' }}>
                        <Search size={18} style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }} />
                        Seguimiento de Paquete
                    </button>
                </div>
            </div>

            {/* Añadimos estilos keyframes para el spin loader */}
            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bird, LogIn, Search } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Start login flow
        navigate('/dashboard');
    };

    return (
        <div className="flex flex-col items-center justify-center h-full" style={{ padding: '1rem' }}>
            <div className="text-center mb-8 mt-4">
                <div className="flex justify-center mb-6 text-[var(--primary)]" style={{ transform: 'scale(1.2)' }}>
                    <Bird size={64} strokeWidth={1.2} />
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
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Usuario o Email</label>
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                placeholder="operador@hidalgo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group mb-8">
                            <label className="form-label" htmlFor="password">Contraseña</label>
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

                        <button type="submit" className="btn btn-primary w-full">
                            Ingresar al Sistema
                            <LogIn size={20} style={{ marginLeft: '0.5rem' }} />
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
        </div>
    );
}

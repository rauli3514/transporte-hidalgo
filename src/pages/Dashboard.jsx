import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';
import { MapPin, Search, PackagePlus, FileText, CheckCircle2, Truck, Users } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function Dashboard() {
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState(null);
    const [stats, setStats] = useState({ viajesEnCurso: 0, remitosHoy: 0 });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
                setUserProfile(data);
            }
        };

        const fetchStats = async () => {
            try {
                // Viajes en curso = estado != cerrado
                const { count: countViajes } = await supabase
                    .from('viajes')
                    .select('*', { count: 'exact', head: true })
                    .neq('estado', 'cerrado');

                // Remitos hoy = creados hoy
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const { count: countRemitos } = await supabase
                    .from('remitos')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startOfDay.toISOString());

                setStats({
                    viajesEnCurso: countViajes || 0,
                    remitosHoy: countRemitos || 0
                });
            } catch (error) {
                console.error("Error cargando stats", error);
            }
        };

        fetchProfile();
        fetchStats();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center" style={{ padding: '0.5rem 0' }}>
                <div className="flex items-center gap-3">
                    <Logo style={{ width: 32, height: 32, color: 'var(--primary)' }} />
                    <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                        Transporte <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                            Hidalgo <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.9rem' }}>{userProfile?.rol === 'transportista' ? 'Chofer' : 'Admin'}</span>
                        </span>
                    </h1>
                </div>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', border: 'none', backgroundColor: 'transparent' }}>
                    SALIR
                </button>
            </header>

            <p className="text-muted text-sm mb-6">Métricas de hoy y accesos rápidos a la operativa de transporte.</p>

            {userProfile?.rol !== 'transportista' && (
                <div className="grid gap-4 mb-6 grid-cols-2">
                    <div className="card text-center mb-0" style={{ padding: '1.5rem 1rem' }}>
                        <h3 className="text-muted mb-2" style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planillas en Curso</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }}>{stats.viajesEnCurso}</p>
                    </div>
                    <div className="card text-center mb-0" style={{ padding: '1.5rem 1rem' }}>
                        <h3 className="text-muted mb-2" style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remitos Hoy</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }}>{stats.remitosHoy}</p>
                    </div>
                </div>
            )}

            <div className={`mb-8 grid gap-3 ${userProfile?.rol !== 'transportista' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Link to="/remitos/nuevo" className="btn btn-primary w-full" style={{ padding: '1.25rem', textDecoration: 'none' }}>
                    <PackagePlus size={20} style={{ marginRight: '0.75rem' }} />
                    Cargar Remito
                </Link>
                {userProfile?.rol !== 'transportista' && (
                    <Link to="/remitos" className="btn bg-[var(--surface-hover)] border border-[var(--border)] w-full text-white" style={{ padding: '1.25rem', justifyContent: 'center', textDecoration: 'none' }}>
                        Ver Historial
                    </Link>
                )}
            </div>

            <h3 className="mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operativa</h3>

            <div className="flex flex-col gap-3">
                <Link to="/viajes" className="card flex items-center justify-between mb-0" style={{ textDecoration: 'none', color: 'inherit', padding: '1rem' }}>
                    <div className="flex items-center gap-4">
                        <MapPin size={24} style={{ color: 'var(--primary)' }} />
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem' }}>Mis Viajes de Reparto</h4>
                            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Actualizar hoja de ruta</p>
                        </div>
                    </div>
                    <span className="badge badge-transit">Ver</span>
                </Link>

                {userProfile?.rol !== 'transportista' && (
                    <Link to="/remitos" className="card flex items-center justify-between mb-0" style={{ textDecoration: 'none', color: 'inherit', padding: '1rem' }}>
                        <div className="flex items-center gap-4">
                            <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Listado de Remitos</h4>
                                <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Ver todos o filtrar por estado</p>
                            </div>
                        </div>
                        <span className="badge" style={{ backgroundColor: 'var(--surface-hover)' }}>Lista</span>
                    </Link>
                )}

                {userProfile?.rol !== 'transportista' && (
                    <Link to="/remitos?filtro=entregado" className="card flex items-center justify-between mb-0" style={{ textDecoration: 'none', color: 'inherit', padding: '1rem' }}>
                        <div className="flex items-center gap-4">
                            <CheckCircle2 size={24} style={{ color: 'var(--status-delivered)' }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Entregas Realizadas</h4>
                                <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Comprobantes y firmas</p>
                            </div>
                        </div>
                        <span className="badge badge-delivered">OK</span>
                    </Link>
                )}
            </div>

            {userProfile?.rol !== 'transportista' && (
                <>
                    <h3 className="mb-4 mt-8" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administración</h3>

                    <div className="flex flex-col gap-3 mb-8">
                        <Link to="/vehiculos" className="card flex items-center justify-between mb-0" style={{ textDecoration: 'none', color: 'inherit', padding: '1rem' }}>
                            <div className="flex items-center gap-4">
                                <Truck size={24} style={{ color: 'var(--text-muted)' }} />
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Flota de Vehículos</h4>
                                    <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Gestionar camiones y fletes</p>
                                </div>
                            </div>
                        </Link>

                        <Link to="/choferes" className="card flex items-center justify-between mb-0" style={{ textDecoration: 'none', color: 'inherit', padding: '1rem' }}>
                            <div className="flex items-center gap-4">
                                <Users size={24} style={{ color: 'var(--text-muted)' }} />
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Nómina de Choferes</h4>
                                    <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Personal de entrega</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </>
            )}
        </div >
    );
}

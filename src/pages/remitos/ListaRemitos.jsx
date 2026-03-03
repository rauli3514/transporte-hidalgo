import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, FileText, Truck, Search, Printer, MapPin, CheckCircle, Clock, Trash2, AlertCircle, PackageCheck, PackagePlus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function ListaRemitos() {
    const [searchParams] = useSearchParams();
    const filtroInicial = searchParams.get('filtro') || '';

    const [remitos, setRemitos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState(filtroInicial); // 'pendiente', 'en_transito', 'entregado'
    const [userProfile, setUserProfile] = useState(null);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', confirmText: '', onConfirm: null, isDestructive: false, isAlert: false });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
                setUserProfile(data);
            }
        };
        fetchProfile();
        fetchRemitos();
    }, [filtro]);

    const showAlert = (title, message, isDestructive = false) => {
        setDialog({ isOpen: true, title, message, isAlert: true, isDestructive });
    };

    const showConfirm = (title, message, confirmText, isDestructive, onConfirm) => {
        setDialog({ isOpen: true, title, message, confirmText, isDestructive, isAlert: false, onConfirm });
    };

    const eliminarRemito = (remitoId) => {
        showConfirm(
            '⚠️ Eliminar Remito',
            '¿Estás seguro de eliminar este remito definitivamente del sistema?',
            'Eliminar Definitivo',
            true,
            async () => {
                try {
                    // Eliminar remitos_items primero (por las dudas)
                    await supabase.from('remitos_items').delete().eq('remito_id', remitoId);

                    const { error } = await supabase.from('remitos').delete().eq('id', remitoId);
                    if (error) throw error;

                    fetchRemitos();
                } catch (error) {
                    console.error(error);
                    showAlert('Error', 'Error al intentar eliminar remito: ' + (error.message || JSON.stringify(error)), true);
                }
            }
        );
    };

    const fetchRemitos = async () => {
        setLoading(true);
        try {
            let query = supabase.from('remitos').select('*, remitos_items(*)').order('created_at', { ascending: false });

            if (filtro) {
                query = query.eq('estado', filtro);
            }

            const { data, error } = await query;
            if (error) throw error;
            setRemitos(data || []);
        } catch (error) {
            console.error('Error fetching remitos:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const StatusBadge = ({ estado }) => {
        let color = 'var(--text-muted)';
        let bgConfig = 'rgba(255,255,255,0.1)';
        let icon = <FileText size={16} />;

        if (estado === 'pendiente') { color = '#f59e0b'; bgConfig = 'rgba(245, 158, 11, 0.1)'; icon = <Clock size={16} />; }
        if (estado === 'en_transito') { color = '#3b82f6'; bgConfig = 'rgba(59, 130, 246, 0.1)'; icon = <Truck size={16} />; }
        if (estado === 'entregado') { color = '#10b981'; bgConfig = 'rgba(16, 185, 129, 0.1)'; icon = <CheckCircle size={16} />; }

        return (
            <span style={{ color, backgroundColor: bgConfig, border: `1px solid ${color}`, borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {icon}
                {estado.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto pb-10">
            <header className="mb-6 flex flex-col gap-4" style={{ padding: '0.5rem 0' }}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="text-muted" style={{ display: 'flex' }}>
                            <ArrowLeft size={24} />
                        </Link>
                        <div className="flex items-center gap-2 text-[var(--primary)]">
                            <FileText size={24} />
                            <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)' }}>Historial de Remitos</h1>
                        </div>
                    </div>
                </div>

                {/* Filtros rápidos */}
                <div className="flex gap-2 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)] overflow-x-auto">
                    <button onClick={() => setFiltro('')} className={`flex-1 min-w-max py-1.5 px-3 text-sm rounded transition-colors ${filtro === '' ? 'bg-[var(--primary)] text-black font-bold' : 'text-muted'}`}>
                        Todos
                    </button>
                    <button onClick={() => setFiltro('pendiente')} style={{ backgroundColor: filtro === 'pendiente' ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: filtro === 'pendiente' ? '#f59e0b' : 'var(--text-muted)' }} className={`flex-1 min-w-max py-1.5 px-3 text-sm rounded transition-colors ${filtro === 'pendiente' ? 'font-bold' : ''}`}>
                        Pendientes
                    </button>
                    <button onClick={() => setFiltro('en_transito')} style={{ backgroundColor: filtro === 'en_transito' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: filtro === 'en_transito' ? '#3b82f6' : 'var(--text-muted)' }} className={`flex-1 min-w-max py-1.5 px-3 text-sm rounded transition-colors ${filtro === 'en_transito' ? 'font-bold' : ''}`}>
                        En Tránsito
                    </button>
                    <button onClick={() => setFiltro('entregado')} style={{ backgroundColor: filtro === 'entregado' ? 'rgba(16, 185, 129, 0.2)' : 'transparent', color: filtro === 'entregado' ? '#10b981' : 'var(--text-muted)' }} className={`flex-1 min-w-max py-1.5 px-3 text-sm rounded transition-colors ${filtro === 'entregado' ? 'font-bold' : ''}`}>
                        Entregados
                    </button>
                </div>
            </header>

            <div className="flex flex-col gap-4">
                {loading ? (
                    <p className="text-muted text-center py-4">Buscando remitos...</p>
                ) : remitos.length === 0 ? (
                    <div className="text-center py-10 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                        <PackagePlus size={48} className="mx-auto mb-3 text-muted opacity-50" />
                        <p className="text-muted">No se encontraron remitos.</p>
                    </div>
                ) : (
                    remitos.map((r) => (
                        <div key={r.id} className="card relative transition-all hover:border-[var(--primary)]" style={{ padding: '1.25rem 1rem', overflow: 'hidden' }}>
                            {/* Borde izquierdo de color segun status */}
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: r.estado === 'pendiente' ? '#f59e0b' : r.estado === 'en_transito' ? '#3b82f6' : '#10b981' }}></div>

                            <div className="flex justify-between items-start mb-3 pl-2">
                                <div>
                                    <h4 className="font-bold text-lg mb-1 leading-none">Guía: {r.numero_guia || 'SN'}</h4>
                                    <p className="text-xs text-muted font-mono">{new Date(r.created_at).toLocaleString('es-AR')}</p>
                                </div>
                                <StatusBadge estado={r.estado} />
                            </div>

                            <div className="pl-2 flex flex-col gap-2 mb-4">
                                <div className="flex gap-2 items-start text-sm">
                                    <MapPin size={16} className="text-muted mt-0.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-muted text-xs uppercase">Origen</span>
                                        <span><b>{r.remitente_nombre}</b> ({r.remitente_localidad})</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-start text-sm">
                                    <MapPin size={16} className="text-[var(--primary)] mt-0.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-[var(--primary)] text-xs uppercase">Destino final</span>
                                        <span><b>{r.destinatario_nombre}</b> ({r.destinatario_localidad})</span>
                                        <span className="text-muted">{r.destinatario_direccion}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pl-2 flex items-center justify-between border-t border-[var(--border)] pt-3 mt-3">
                                <div>
                                    <span className="text-xs text-muted block uppercase">Contra Reembolso</span>
                                    <span className="font-bold text-lg text-[var(--primary)]">
                                        {Number(r.contra_reembolso) > 0 ? `$${Number(r.contra_reembolso).toLocaleString('es-AR')}` : 'NO'}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <a href={`/seguimiento/${r.numero_guia}`} target="_blank" rel="noreferrer" className="btn bg-[var(--surface-hover)] text-[var(--primary)] border border-[var(--primary)]/20 p-2 hover:bg-[var(--primary)] hover:text-black transition-colors" title="Ver Seguimiento Digital">
                                        <PackageCheck size={18} />
                                    </a>

                                    <Link to={`/remitos/imprimir/${r.id}`} className="btn bg-[var(--surface-hover)] text-[var(--text-main)] border border-[var(--border)] p-2 hover:bg-[var(--primary)] hover:text-black transition-colors" title="Imprimir Remito Formato A4">
                                        <Printer size={18} />
                                    </Link>

                                    {userProfile?.rol !== 'transportista' && (
                                        <button onClick={() => eliminarRemito(r.id)} className="btn bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors p-2" title="Eliminar Definitivamente">
                                            <Trash2 size={18} />
                                        </button>
                                    )}

                                    {r.estado === 'pendiente' && (
                                        <Link to={`/viajes/asignar/${r.id}`} className="btn btn-primary px-3 py-2 text-sm" style={{ textDecoration: 'none' }}>
                                            Asignar Viaje
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Custom Dialog / Modal */}
            {
                dialog.isOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
                            <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${dialog.isDestructive ? 'text-red-500' : 'text-[var(--primary)]'}`}>
                                <AlertCircle />
                                {dialog.title}
                            </h3>
                            <p className="text-muted mb-6 text-sm">{dialog.message}</p>

                            <div className="flex gap-3 justify-end">
                                {!dialog.isAlert && (
                                    <button
                                        onClick={() => setDialog({ ...dialog, isOpen: false })}
                                        className="px-4 py-2 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-gray-700 text-white font-medium transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (dialog.onConfirm) dialog.onConfirm();
                                        setDialog({ ...dialog, isOpen: false });
                                    }}
                                    className={`px-4 py-2 rounded-md font-bold transition-colors text-sm shadow-md ${dialog.isDestructive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black'}`}
                                >
                                    {dialog.isAlert ? 'Aceptar' : (dialog.confirmText || 'Confirmar')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

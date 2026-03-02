import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, FileText, Truck, Search, Printer, MapPin, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ListaRemitos() {
    const [remitos, setRemitos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState(''); // 'pendiente', 'en_transito', 'entregado'

    useEffect(() => {
        fetchRemitos();
    }, [filtro]);

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
                                    <button className="btn bg-dark text-white border border-[var(--border)] p-2 hover:bg-[var(--surface)]">
                                        <Printer size={18} />
                                    </button>
                                    {r.estado === 'pendiente' && (
                                        <button className="btn btn-primary px-3 py-2 text-sm">
                                            Asignar Viaje
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

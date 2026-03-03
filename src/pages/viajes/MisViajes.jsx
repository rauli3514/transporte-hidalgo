import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Truck, PackageCheck, AlertCircle, Clock, MapPin, Navigation, CheckCircle2, Calendar, PlusCircle, Printer, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MisViajes() {
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
                setUserProfile(data);
            }
        };
        fetchProfile();
        fetchViajes();
    }, []);

    const fetchViajes = async () => {
        setLoading(true);
        try {
            // Buscamos todos los viajes (Planillas) para que el Admin los pueda gestionar y cerrar.
            // Limitamos a los ultimos 30 para no colapsar historial infinito.
            const { data, error } = await supabase
                .from('viajes')
                .select(`
                    *,
                    vehiculos(patente, modelo),
                    choferes(nombre),
                    remitos(*) 
                `)
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;
            setViajes(data || []);
        } catch (error) {
            console.error('Error fetching viajes:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const marcarEntregado = async (remitoId) => {
        if (!window.confirm('¿Confirmar como entregado y cobrado?')) return;
        try {
            const { error } = await supabase
                .from('remitos')
                .update({ estado: 'entregado', fecha_entrega: new Date().toISOString() })
                .eq('id', remitoId);
            if (error) throw error;
            alert('¡Entrega registrada con éxito!');
            fetchViajes();
        } catch (error) {
            alert('Hubo un error al marcar la entrega: ' + error.message);
        }
    };

    const cerrarPlanilla = async (viajeId) => {
        if (!window.confirm('¿Estás seguro de cerrar esta Planilla? Ya no se podrán agregar remitos nuevos a la misma.')) return;
        try {
            const { error } = await supabase
                .from('viajes')
                .update({ estado: 'cerrado' })
                .eq('id', viajeId);
            if (error) throw error;
            fetchViajes();
        } catch (error) {
            alert('Error cerrando planilla: ' + error.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            <header className="mb-6 flex flex-col gap-4" style={{ padding: '0.5rem 0' }}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="text-muted" style={{ display: 'flex' }}>
                            <ArrowLeft size={24} />
                        </Link>
                        <div className="flex items-center gap-2 text-[var(--primary)]">
                            <Truck size={24} />
                            <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)' }}>Planillas de Viajes</h1>
                        </div>
                    </div>
                </div>
                {userProfile?.rol !== 'transportista' && (
                    <Link to="/viajes/nuevo" className="btn bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-main)] w-full py-3 flex justify-center gap-2">
                        <PlusCircle size={20} /> Abrir Nueva Planilla / Turno
                    </Link>
                )}
            </header>

            <div className="flex flex-col gap-8">
                {loading ? (
                    <p className="text-muted text-center py-4">Sincronizando viajes...</p>
                ) : viajes.length === 0 ? (
                    <div className="text-center py-10 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm">
                        <AlertCircle size={48} className="mx-auto mb-3 text-muted opacity-50" />
                        <h3 className="text-lg font-bold mb-1">Cero Viajes Activos</h3>
                        <p className="text-muted text-sm px-4">Cuando la sucursal despache un remito a la calle, aparecerá automáticamente aquí.</p>
                    </div>
                ) : (
                    Object.entries(
                        viajes.reduce((acc, viaje) => {
                            if (!acc[viaje.fecha]) acc[viaje.fecha] = [];
                            acc[viaje.fecha].push(viaje);
                            return acc;
                        }, {})
                    ).sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA)) // Ordenar fechas mas nuevas primero
                        .map(([fecha, viajesDelDia]) => (
                            <div key={fecha} className="flex flex-col gap-4">
                                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <Calendar size={20} className="text-[var(--primary)]" />
                                    Repartos del {fecha.split('-').reverse().join('/')}
                                </h2>
                                {viajesDelDia.map(viaje => (
                                    <div key={viaje.id} className="card p-0 overflow-hidden border-2 border-[var(--primary)]/20 shadow-md">

                                        {/* ENCABEZADO DEL VIAJE */}
                                        <div className="bg-[var(--surface)] p-4 border-b border-[var(--border)] flex justify-between items-start">
                                            <div>
                                                <h2 className="text-lg font-bold mb-1 uppercase tracking-wide text-[var(--primary)] flex items-center gap-2">
                                                    {viaje.nombre}
                                                    {viaje.estado === 'cerrado' && <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">CERRADO</span>}
                                                </h2>
                                                <div className="text-xs text-muted flex gap-2">
                                                    <span><b>Chofer:</b> {viaje.choferes?.nombre || 'Desconocido'}</span>
                                                    <span>•</span>
                                                    <span><b>Dom:</b> {viaje.vehiculos?.patente || 'N/A'}</span>
                                                </div>
                                                {viaje.notas && (
                                                    <div className="mt-2 text-sm bg-orange-500/10 text-orange-400 p-2 rounded">
                                                        <b>Nota Sup:</b> {viaje.notas}
                                                    </div>
                                                )}

                                                {userProfile?.rol !== 'transportista' && (
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <Link to={`/viajes/imprimir/${viaje.id}`} className="btn bg-gray-600/20 text-[var(--text-main)] border border-[var(--border)] text-xs px-3 py-1.5 flex gap-1">
                                                            <Printer size={14} /> Imprimir A4
                                                        </Link>
                                                        {viaje.estado !== 'cerrado' && (
                                                            <button onClick={() => cerrarPlanilla(viaje.id)} className="btn bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors text-xs px-3 py-1.5 flex gap-1">
                                                                <XCircle size={14} /> Cerrar Planilla
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* PARADA / REMITOS */}
                                        <div className="p-2 sm:p-4 bg-[var(--background)]">
                                            <h3 className="text-xs uppercase font-bold text-muted mb-3 tracking-wider pl-2">
                                                Detalle de Paradas ({viaje.remitos?.length || 0})
                                            </h3>

                                            <div className="flex flex-col gap-3">
                                                {viaje.remitos?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((remito, idx) => (
                                                    <div key={remito.id} className={`p-3 sm:p-4 rounded-lg border ${remito.estado === 'entregado' ? 'border-green-500/30 bg-green-500/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                                                        <div className="flex justify-between items-start gap-2 mb-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-mono text-muted">Guía: {remito.numero_guia || 'Sin Nro'}</span>
                                                                <h4 className="font-bold text-base sm:text-lg leading-tight mt-1">{remito.destinatario_nombre}</h4>
                                                                <p className="text-sm text-[var(--text-main)] flex items-center gap-1 mt-1">
                                                                    <MapPin size={14} className="text-[var(--primary)]" />
                                                                    {remito.destinatario_direccion}, {remito.destinatario_localidad}
                                                                </p>
                                                            </div>

                                                            {/* Boton de GPS Nativo Rapido */}
                                                            <a href={`https://maps.google.com/?q=${remito.destinatario_direccion}, ${remito.destinatario_localidad}`} target="_blank" rel="noreferrer" className="shrink-0 p-2 bg-blue-500/10 text-blue-500 rounded-full hover:bg-blue-500/20">
                                                                <Navigation size={20} />
                                                            </a>
                                                        </div>

                                                        <div className="mt-3 pt-3 border-t border-[var(--border)]/50 flex flex-wrap gap-2 justify-between items-center">
                                                            <div className="w-full sm:w-auto">
                                                                {Number(remito.contra_reembolso) > 0 ? (
                                                                    <span className="bg-red-500/10 text-red-500 font-bold px-2 py-1 rounded text-sm sm:text-base border border-red-500/20 inline-block w-full sm:w-auto text-center">
                                                                        Cobrar: ${Number(remito.contra_reembolso).toLocaleString('es-AR')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-[var(--background)] px-2 py-1 rounded text-xs text-muted border border-[var(--border)] inline-block w-full sm:w-auto text-center">
                                                                        Nada que cobrar (Flete: {remito.tipo_flete})
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                                                {remito.estado === 'entregado' ? (
                                                                    <div className="flex items-center gap-2 text-green-500 font-bold bg-green-500/10 px-3 py-1.5 rounded justify-center">
                                                                        <PackageCheck size={18} /> ENTREGADO
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => marcarEntregado(remito.id)}
                                                                        className="flex items-center gap-2 bg-[var(--primary)] text-black font-bold px-4 py-2 sm:py-1.5 rounded justify-center w-full transition-transform active:scale-95"
                                                                    >
                                                                        <CheckCircle2 size={18} /> CONFIRMAR ENTREGA
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {viaje.remitos?.length === 0 && (
                                                    <p className="text-muted text-sm text-center py-4 bg-[var(--surface)]/50 rounded">Viaje sin carga asignada.</p>
                                                )}

                                                {/* Botón rápido para choferes que arman remitos en calle */}
                                                {viaje.estado !== 'cerrado' && (
                                                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                                        <Link to={`/remitos/nuevo?viaje_id=${viaje.id}`} className="btn bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-accent)] font-bold w-full text-sm flex items-center justify-center gap-2 hover:text-[var(--text-main)]" style={{ textDecoration: 'none', padding: '0.75rem' }}>
                                                            <PlusCircle size={18} /> Cargar Nuevo Remito a Esta Planilla
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}

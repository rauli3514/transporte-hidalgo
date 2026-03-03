import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Package, Truck, CheckCircle2, Clock, MapPin, AlertCircle } from 'lucide-react';

export default function Seguimiento() {
    const { guia } = useParams();
    const [remito, setRemito] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (guia) {
            fetchTracking();
        }
    }, [guia]);

    const fetchTracking = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('remitos')
                .select(`
                    *,
                    empresa:empresa_id (nombre, logo_url),
                    viajes (nombre, vehiculos(patente))
                `)
                .eq('numero_guia', guia)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Guía no encontrada');

            setRemito(data);
        } catch (err) {
            console.error(err);
            setError('No pudimos encontrar el envío con el número de guía proporcionado.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
                <div className="text-center animate-pulse flex flex-col items-center">
                    <Package size={48} className="text-[var(--primary)] mb-4" />
                    <p className="text-[var(--text-main)] font-bold text-lg">Buscando envío...</p>
                </div>
            </div>
        );
    }

    if (error || !remito) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
                <div className="bg-[var(--surface)] p-8 rounded-2xl max-w-md w-full text-center border border-red-500/20 shadow-2xl">
                    <AlertCircle size={64} className="text-red-500 mx-auto mb-4 opacity-80" />
                    <h2 className="text-xl font-bold mb-2">Envío no encontrado</h2>
                    <p className="text-muted mb-6 text-sm">Verificá que el número de guía sea correcto e intentalo nuevamente.</p>
                    <div className="bg-black/20 p-3 rounded-lg font-mono text-xl text-white/50 mb-6 border border-[var(--border)]">
                        {guia}
                    </div>
                </div>
            </div>
        );
    }

    const { estado } = remito;
    const isEntregado = estado === 'entregado';
    const isEnTransito = estado === 'en_transito' || isEntregado;

    return (
        <div className="min-h-screen bg-[#f5f7fa] dark:bg-[#0f1115] text-[#1a1d20] dark:text-[#e4e6eb] font-sans selection:bg-[var(--primary)] selection:text-black">

            {/* Cabecera / Marca */}
            <div className="bg-[var(--surface)] border-b border-[var(--border)] p-4 shadow-sm flex items-center justify-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--primary)] rounded-lg flex items-center justify-center rotate-3 shadow-sm">
                        <Truck size={24} className="text-black -rotate-3" />
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tight leading-none uppercase">
                            {remito.empresa?.nombre || 'Logística'}
                        </h1>
                        <span className="text-[10px] text-muted font-bold tracking-widest uppercase">Seguimiento Oficial</span>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto p-4 sm:p-6 pb-20 fade-in">

                {/* Intro Tarjeta Nro Guia */}
                <div className="bg-[var(--primary)] text-black rounded-2xl p-6 mb-6 shadow-lg shadow-[var(--primary)]/20 relative overflow-hidden">
                    <div className="absolute -right-4 -top-8 opacity-10 rotate-12">
                        <Package size={140} />
                    </div>
                    <div className="relative z-10">
                        <span className="text-black/70 font-bold uppercase tracking-wider text-xs mb-1 block">Número de Guía</span>
                        <h2 className="text-4xl sm:text-5xl font-black font-mono tracking-tight mb-4">
                            {remito.numero_guia}
                        </h2>

                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <h3 className="text-sm font-bold opacity-80 uppercase mb-1 flex items-center gap-1"><MapPin size={14} /> Destino Final</h3>
                            <p className="font-bold text-lg leading-tight">{remito.destinatario_nombre}</p>
                            <p className="text-sm opacity-80">{remito.destinatario_direccion}, {remito.destinatario_localidad}</p>
                        </div>
                    </div>
                </div>

                {/* Timeline de Estados */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-6 shadow-sm">
                    <h3 className="font-bold uppercase tracking-wide text-xs text-muted mb-6">Línea de Vida del Envío</h3>

                    <div className="relative border-l-2 border-[var(--border)] ml-3 sm:ml-4 flex flex-col gap-8 pb-4">

                        {/* 1. Ingreso Pivot */}
                        <div className="relative pl-6 sm:pl-8">
                            <div className="absolute -left-[11px] top-0 w-5 h-5 bg-[var(--primary)] rounded-full border-4 border-[var(--surface)] shadow-sm"></div>
                            <h4 className="font-bold text-[var(--primary)] flex items-center gap-2 leading-none">
                                <Package size={18} /> Paquete Recibido
                            </h4>
                            <p className="text-sm text-muted mt-2 leading-relaxed">
                                El paquete fue ingresado en sistema y está siendo preparado para el viaje.
                            </p>
                            <span className="text-xs font-mono text-muted/70 mt-2 block bg-[var(--background)] px-2 py-1 rounded inline-block">
                                {new Date(remito.created_at).toLocaleString('es-AR')}
                            </span>
                        </div>

                        {/* 2. En Tránsito */}
                        <div className={`relative pl-6 sm:pl-8 transition-opacity duration-500 ${!isEnTransito ? 'opacity-40 grayscale' : ''}`}>
                            <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-[var(--surface)] shadow-sm transition-colors ${isEnTransito ? 'bg-blue-500' : 'bg-[var(--border)]'}`}></div>
                            <h4 className={`font-bold flex items-center gap-2 leading-none ${isEnTransito ? 'text-blue-500' : 'text-muted'}`}>
                                <Truck size={18} /> En Camino a Destino
                            </h4>
                            <p className="text-sm text-muted mt-2 leading-relaxed">
                                {isEnTransito
                                    ? `El pedido ya está en el vehículo de reparto y será entregado a la brevedad.`
                                    : 'A la espera de ser despachado.'}
                            </p>
                        </div>

                        {/* 3. Entregado */}
                        <div className={`relative pl-6 sm:pl-8 transition-opacity duration-500 ${!isEntregado ? 'opacity-40 grayscale' : ''}`}>
                            <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-[var(--surface)] shadow-sm transition-colors ${isEntregado ? 'bg-green-500' : 'bg-[var(--border)]'}`}></div>
                            <h4 className={`font-bold flex items-center gap-2 leading-none ${isEntregado ? 'text-green-500' : 'text-muted'}`}>
                                <CheckCircle2 size={18} /> Entrega Exitosa
                            </h4>
                            {isEntregado && (
                                <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                    <p className="text-sm text-green-400 font-bold mb-2 flex items-center gap-1">
                                        <Clock size={14} /> Entregado el {new Date(remito.fecha_entrega).toLocaleString('es-AR')}
                                    </p>
                                    <div className="bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] mt-2">
                                        <p className="text-xs text-muted uppercase mb-1">Recibido por:</p>
                                        <p className="font-bold text-sm">{remito.firma_aclaracion || 'N/A'}</p>
                                        <p className="text-sm text-muted font-mono mt-1">DNI: {remito.firma_dni || 'N/A'}</p>
                                    </div>

                                    {(remito.firma_url || remito.foto_entrega_url) && (
                                        <div className="mt-3 flex flex-col gap-2">
                                            {remito.firma_url && (
                                                <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 text-center">Firma Digital Registrada</p>
                                                    <img src={remito.firma_url} alt="Firma DNI" className="w-full h-auto max-h-[120px] object-contain opacity-80" />
                                                </div>
                                            )}
                                            {remito.foto_entrega_url && (
                                                <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 text-center">Evidencia Fotográfica</p>
                                                    <img src={remito.foto_entrega_url} alt="Foto de entrega" className="w-full h-auto max-h-[160px] object-cover rounded" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                <div className="text-center">
                    <p className="text-xs text-muted mt-8">Transporte y Logística Powered by Hidalgo © {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Truck, PackageCheck, AlertCircle, Clock, MapPin, Navigation, CheckCircle2, Calendar, PlusCircle, Printer, XCircle, Trash2, Eraser, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { saveViajesOffline, getViajesOffline, registrarEntregaOffline, getEntregasPendientes, limpiarEntregaSincronizada } from '../../lib/db/offline';

export default function MisViajes() {
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', confirmText: '', onConfirm: null, isDestructive: false, isAlert: false });
    const [entregaModal, setEntregaModal] = useState({ isOpen: false, remitoId: null, aclaracion: '', dni: '', fotoBase64: null });
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const sigCanvas = useRef({});
    const fileInputRef = useRef(null);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOffline(false);
            if (userProfile?.rol === 'transportista') {
                const pending = await getEntregasPendientes();
                if (pending && pending.length > 0) {
                    showAlert('Sincronizando', `Conectando... Sincronizando ${pending.length} entregas realizadas offline.`);

                    let count = 0;
                    for (const entrega of pending) {
                        try {
                            const { remitoId, ...payload } = entrega;
                            // Reintentar Update
                            const { error } = await supabase.from('remitos').update(payload).eq('id', remitoId);
                            if (!error) {
                                await limpiarEntregaSincronizada(entrega.id);
                                count++;
                            }
                        } catch (e) {
                            console.error('Fallo al sincronizar un remito:', e);
                        }
                    }
                    if (count > 0) fetchViajes(userProfile);
                }
            }
        };

        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [userProfile]);

    const showAlert = (title, message, isDestructive = false) => {
        setDialog({ isOpen: true, title, message, isAlert: true, isDestructive });
    };

    const showConfirm = (title, message, confirmText, isDestructive, onConfirm) => {
        setDialog({ isOpen: true, title, message, confirmText, isDestructive, isAlert: false, onConfirm });
    };

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let profile = null;
            if (user) {
                const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
                setUserProfile(data);
                profile = data;
            }
            fetchViajes(profile);
        };
        initData();
    }, []);

    const fetchViajes = async (profile) => {
        setLoading(true);
        try {
            // Buscamos todos los viajes (Planillas) para que el Admin los pueda gestionar y cerrar.
            // Limitamos a los ultimos 30 para no colapsar historial infinito.
            let query = supabase
                .from('viajes')
                .select(`
                    *,
                    vehiculos(patente, modelo),
                    choferes(nombre),
                    remitos(*) 
                `)
                .neq('estado', 'cerrado')
                .order('created_at', { ascending: false })
                .limit(30);

            const { data, error } = await query;
            if (error) throw error;

            let viajesData = data || [];

            // Si el rol es transportista, SOLO mostrar los viajes que estén a nombre de ese chofer
            if (profile?.rol === 'transportista') {
                viajesData = viajesData.filter(v => {
                    if (!v.choferes || !v.choferes.nombre || !profile.nombre) return false;
                    const nombreChofer = v.choferes.nombre.replace(/\s+/g, '').toLowerCase();
                    const nombrePerfil = profile.nombre.replace(/\s+/g, '').toLowerCase();
                    return nombreChofer === nombrePerfil;
                });
            }

            setViajes(viajesData);

            // Si funciona y somos chofer, guardamos backup offline
            if (profile?.rol === 'transportista') {
                await saveViajesOffline(viajesData);
            }

        } catch (error) {
            console.error('Error fetching viajes:', error.message);

            // Si falla la red, intentar recuperar desde caché offline
            if (profile?.rol === 'transportista') {
                const offlineData = await getViajesOffline();
                if (offlineData.length > 0) {
                    setViajes(offlineData);
                    showAlert('Modo Sin Conexión', 'No se ha detectado internet. Mostrando las planillas guardadas en el dispositivo.');
                }
            } else {
                showAlert('Error de conexión', 'No se pudieron cargar los viajes actualizados.');
            }
        } finally {
            setLoading(false);
        }
    };

    const abrirModalEntrega = (remitoId) => {
        setEntregaModal({ isOpen: true, remitoId, aclaracion: '', dni: '', fotoBase64: null });
        if (sigCanvas.current && sigCanvas.current.clear) {
            sigCanvas.current.clear();
        }
    };

    const handleCapturarFoto = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Comprimir imagen usando un canvas interno para que no explote la base de datos
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    setEntregaModal(prev => ({ ...prev, fotoBase64: compressedBase64 }));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const limpiarFirma = () => {
        if (sigCanvas.current && sigCanvas.current.clear) {
            sigCanvas.current.clear();
        }
    };

    const confirmarEntrega = async (e) => {
        e.preventDefault();
        if (!entregaModal.aclaracion || !entregaModal.dni) {
            showAlert('Atención', 'Debes completar quién recibe y su DNI.', true);
            return;
        }

        try {
            let firmaUrl = null;
            if (sigCanvas.current && !sigCanvas.current.isEmpty && !sigCanvas.current.isEmpty()) {
                firmaUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            }

            const payload = {
                estado: 'entregado',
                fecha_entrega: new Date().toISOString(),
                firma_aclaracion: entregaModal.aclaracion.toUpperCase(),
                firma_dni: entregaModal.dni,
                firma_url: firmaUrl,
                foto_entrega_url: entregaModal.fotoBase64
            };

            const { error } = await supabase.from('remitos').update(payload).eq('id', entregaModal.remitoId);

            if (error) {
                // Si la red falla intentando conectar, guardamos offline
                if (error.message.includes('fetch') || navigator.onLine === false) {
                    await registrarEntregaOffline({ remitoId: entregaModal.remitoId, ...payload });

                    // Actualizamos memoria visual para que no lo joda de nuevo
                    setViajes(prevViajes => prevViajes.map(viaje => ({
                        ...viaje,
                        remitos: viaje.remitos?.map(r => r.id === entregaModal.remitoId ? { ...r, estado: 'entregado' } : r)
                    })));

                    setEntregaModal({ isOpen: false, remitoId: null, aclaracion: '', dni: '', fotoBase64: null });
                    showAlert('Guardado Offline', 'No hay conexión. La entrega se guardó en el dispositivo y se sincronizará automáticamente cuando vuelva el Internet.');
                    return;
                }
                throw error;
            }

            setEntregaModal({ isOpen: false, remitoId: null, aclaracion: '', dni: '', fotoBase64: null });
            showAlert('Éxito', '¡Entrega registrada y sincronizada con éxito!');
            fetchViajes(userProfile);
        } catch (error) {
            showAlert('Error', 'Hubo un error al registrar la entrega: ' + error.message, true);
        }
    };

    const cerrarPlanilla = (viajeId) => {
        showConfirm(
            'Cerrar Planilla',
            '¿Estás seguro de cerrar esta Planilla? Ya no se podrán agregar remitos nuevos a la misma.',
            'Cerrar Planilla',
            true,
            async () => {
                try {
                    const { error } = await supabase
                        .from('viajes')
                        .update({ estado: 'cerrado' })
                        .eq('id', viajeId);
                    if (error) throw error;
                    fetchViajes(userProfile);
                } catch (error) {
                    showAlert('Error', 'Error cerrando planilla: ' + error.message, true);
                }
            }
        );
    };

    const eliminarPlanilla = (viajeId) => {
        showConfirm(
            '⚠️ Eliminar Planilla',
            '¿Estás seguro de eliminar esta Planilla completa? Los remitos asociados quedarán "pendientes" (sin viaje asignado).',
            'Sí, Eliminar',
            true,
            async () => {
                try {
                    const { error: errorUpdate } = await supabase.from('remitos').update({ viaje_id: null, estado: 'pendiente' }).eq('viaje_id', viajeId);
                    if (errorUpdate) throw new Error('Error desligando remitos: ' + errorUpdate.message);

                    const { error } = await supabase.from('viajes').delete().eq('id', viajeId);
                    if (error) throw error;

                    fetchViajes();
                } catch (error) {
                    console.error(error);
                    showAlert('Error', 'Error al intentar eliminar la planilla: ' + (error.message || JSON.stringify(error)), true);
                }
            }
        );
    };

    const eliminarRemito = (remitoId) => {
        showConfirm(
            '⚠️ Eliminar Remito',
            '¿Estás seguro de eliminar este remito definitivamente del sistema?',
            'Eliminar Definitivo',
            true,
            async () => {
                try {
                    // Eliminar remitos_items explícitamente primero si el ON DELETE CASCADE no funciona bien
                    await supabase.from('remitos_items').delete().eq('remito_id', remitoId);

                    const { error } = await supabase.from('remitos').delete().eq('id', remitoId);
                    if (error) throw error;

                    fetchViajes();
                } catch (error) {
                    console.error(error);
                    showAlert('Error', 'Error al intentar eliminar remito: ' + (error.message || JSON.stringify(error)), true);
                }
            }
        );
    };

    const desligarRemito = (remitoId, numeroGuia) => {
        showConfirm(
            'Desvincular Paquete',
            `¿El paquete ${numeroGuia || ''} no pudo ser entregado? Se devolverá a la lista de "Pendientes" para reasignar a otro viaje.`,
            'Sí, Devolver a Pendientes',
            true,
            async () => {
                try {
                    const { error } = await supabase
                        .from('remitos')
                        .update({ viaje_id: null, estado: 'pendiente' })
                        .eq('id', remitoId);

                    if (error) throw error;

                    showAlert('Éxito', 'Paquete devuelto a la base con éxito.');
                    fetchViajes(userProfile);
                } catch (error) {
                    showAlert('Error', 'No se pudo desvincular el paquete: ' + error.message, true);
                }
            }
        );
    };

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            <header className="mb-6 flex flex-col gap-4" style={{ padding: '0.5rem 0' }}>
                <div className="flex justify-between items-center bg-[var(--surface)] p-4 rounded-xl shadow-sm border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="text-muted" style={{ display: 'flex' }}>
                            <ArrowLeft size={24} />
                        </Link>
                        <div className="flex items-center gap-2 text-[var(--primary)]">
                            <Truck size={24} />
                            <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)' }}>Planillas de Viajes</h1>
                        </div>
                    </div>
                    {isOffline && (
                        <div className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                            <WifiOff size={14} /> MODO OFFLINE
                        </div>
                    )}
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
                    <div className="flex flex-col gap-6">
                        {viajes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(viaje => (
                            <div key={viaje.id} className="card p-0 overflow-hidden border-2 border-[var(--primary)]/20 shadow-md">

                                {/* ENCABEZADO DEL VIAJE */}
                                <div className="bg-[var(--surface)] p-4 border-b border-[var(--border)] flex justify-between items-start">
                                    <div>
                                        <h2 className="text-lg font-bold mb-1 uppercase tracking-wide text-[var(--primary)] flex items-center gap-2">
                                            {viaje.nombre}
                                            {viaje.estado === 'cerrado' && <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">CERRADO</span>}
                                        </h2>
                                        <div className="text-xs text-muted flex gap-2">
                                            <span><b>Fecha:</b> {viaje.fecha.split('-').reverse().join('/')}</span>
                                            <span>•</span>
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
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                <Link to={`/viajes/imprimir/${viaje.id}`} className="btn bg-gray-600/20 text-[var(--text-main)] border border-[var(--border)] text-xs px-3 py-1.5 flex gap-1">
                                                    <Printer size={14} /> Imprimir A4
                                                </Link>
                                                {viaje.estado !== 'cerrado' && (
                                                    <button onClick={() => cerrarPlanilla(viaje.id)} className="btn bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors text-xs px-3 py-1.5 flex gap-1">
                                                        <XCircle size={14} /> Cerrar Planilla
                                                    </button>
                                                )}
                                                <button onClick={() => eliminarPlanilla(viaje.id)} className="btn bg-red-900/10 text-red-700 border border-red-900/20 hover:bg-red-900 hover:text-white transition-colors text-xs px-3 py-1.5 flex gap-1">
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                        {userProfile?.rol === 'transportista' && (
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                <Link to={`/viajes/imprimir/${viaje.id}`} className="btn bg-gray-600/20 text-[var(--text-main)] border border-[var(--border)] text-xs px-3 py-1.5 flex gap-1">
                                                    <Printer size={14} /> Ver Planilla Impresa
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* PARADA / REMITOS */}
                                <div className="p-2 sm:p-4 bg-[var(--background)]">
                                    <h3 className="text-xs uppercase font-bold text-muted mb-3 tracking-wider pl-2">
                                        Remitos en esta Planilla ({viaje.remitos?.length || 0})
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

                                                    {/* Boton de GPS Nativo Rapido y de Eliminar */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <a href={`https://maps.google.com/?q=${remito.destinatario_direccion}, ${remito.destinatario_localidad}`} target="_blank" rel="noreferrer" className="p-2 bg-blue-500/10 text-blue-500 rounded-full hover:bg-blue-500/20">
                                                            <Navigation size={20} />
                                                        </a>
                                                        <a href={`/seguimiento/${remito.numero_guia}`} target="_blank" rel="noreferrer" className="p-2 bg-[var(--surface-hover)] text-[var(--primary)] rounded-full hover:bg-[var(--primary)] hover:text-black border border-[var(--primary)]/20" title="Ver Remito Digital">
                                                            <PackageCheck size={20} />
                                                        </a>
                                                        {userProfile?.rol !== 'transportista' && (
                                                            <button onClick={() => eliminarRemito(remito.id)} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20" title="Eliminar Remito Definitivamente">
                                                                <Trash2 size={20} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-3 border-t border-[var(--border)]/50 flex flex-wrap gap-2 justify-between items-center">
                                                    <div className="w-full sm:w-auto flex flex-col gap-1">
                                                        {Number(remito.flete_total) > 0 && (
                                                            <span className="text-xs text-muted block bg-[var(--surface-hover)] p-1 rounded border border-[var(--border)] w-fit">
                                                                Flete Total: <b>${Number(remito.flete_total).toLocaleString('es-AR')}</b>
                                                            </span>
                                                        )}
                                                        {Number(remito.contra_reembolso) > 0 ? (
                                                            <span className="bg-red-500/10 text-red-500 font-bold px-2 py-1 rounded text-sm sm:text-base border border-red-500/20 inline-block w-full sm:w-auto mt-1">
                                                                Cobrar CR: ${Number(remito.contra_reembolso).toLocaleString('es-AR')}
                                                            </span>
                                                        ) : (
                                                            <span className="bg-[var(--background)] px-2 py-1 rounded text-xs text-muted border border-[var(--border)] inline-block w-full sm:w-auto mt-1">
                                                                Sin CR (Tipo Flete: {remito.tipo_flete})
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                                        {remito.estado === 'entregado' ? (
                                                            <div className="flex items-center gap-2 text-green-500 font-bold bg-green-500/10 px-3 py-1.5 rounded justify-center">
                                                                <PackageCheck size={18} /> ENTREGADO
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-2 w-full">
                                                                <button
                                                                    onClick={() => desligarRemito(remito.id, remito.numero_guia)}
                                                                    className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 font-bold px-3 py-2 sm:py-1.5 rounded justify-center transition-transform active:scale-95 flex-1 shadow-sm text-xs"
                                                                    title="No Entregado (Devolver a Pendientes)"
                                                                >
                                                                    <XCircle size={16} /> NO ENTREGADO
                                                                </button>
                                                                <button
                                                                    onClick={() => abrirModalEntrega(remito.id)}
                                                                    className="flex items-center gap-2 bg-[var(--primary)] text-black font-bold px-4 py-2 sm:py-1.5 rounded justify-center flex-[2] transition-transform active:scale-95 shadow-md text-sm"
                                                                >
                                                                    <CheckCircle2 size={18} /> ENTREGAR
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {viaje.remitos?.length === 0 && (
                                            <p className="text-muted text-sm text-center py-4 bg-[var(--surface)]/50 rounded">Planilla sin carga asignada.</p>
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
                )}
            </div>
            {/* Custom Dialog / Modal */}
            {dialog.isOpen && (
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
            )}

            {/* Modal de Registro de Entrega */}
            {entregaModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>

                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

                        {/* Header Modal */}
                        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(234, 179, 8, 0.2)', backgroundColor: 'rgba(234, 179, 8, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, zIndex: 10 }}>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--primary)] flex items-center gap-2 m-0" style={{ margin: 0 }}>
                                    <PackageCheck size={20} /> Registrar Entrega
                                </h3>
                                <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0 0' }}>Complete los datos de entrega (POD).</p>
                            </div>
                            <button onClick={() => setEntregaModal({ isOpen: false, remitoId: null, aclaracion: '', dni: '', fotoBase64: null })} className="text-muted hover:text-white" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={confirmarEntrega} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Inputs Básicos */}
                            <div>
                                <label className="text-xs font-bold text-muted uppercase block" style={{ marginBottom: '0.25rem' }}>Nombre de quien Recibe</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="form-input w-full uppercase"
                                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '0.5rem', width: '100%' }}
                                    placeholder="Ej: Juan Perez"
                                    value={entregaModal.aclaracion}
                                    onChange={e => setEntregaModal({ ...entregaModal, aclaracion: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted uppercase block" style={{ marginBottom: '0.25rem' }}>DNI / ID</label>
                                <input
                                    type="text"
                                    className="form-input w-full font-mono font-bold"
                                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '0.5rem', width: '100%', color: 'var(--primary)' }}
                                    placeholder="Exclusivo Números"
                                    value={entregaModal.dni}
                                    onChange={e => setEntregaModal({ ...entregaModal, dni: e.target.value.replace(/\D/g, '') })}
                                    required
                                />
                            </div>

                            {/* Bloque Foto y Firma */}
                            <div style={{ backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Captura de Foto */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <label className="text-xs font-bold text-white flex items-center gap-1">📷 Evidencia Fotográfica (Opcional)</label>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/jpeg, image/png"
                                        capture="environment"
                                        ref={fileInputRef}
                                        onChange={handleCapturarFoto}
                                        style={{ display: 'none' }}
                                    />
                                    {entregaModal.fotoBase64 ? (
                                        <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                                            <img src={entregaModal.fotoBase64} alt="Captura" style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setEntregaModal({ ...entregaModal, fotoBase64: null }); }}
                                                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(239,68,68,0.8)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Trash2 size={24} style={{ marginRight: '0.5rem' }} /> Eliminar Foto
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            style={{ width: '100%', padding: '0.75rem', border: '2px dashed var(--border)', borderRadius: '0.5rem', backgroundColor: 'transparent', color: 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            [+] Tocar aquí para abrir cámara
                                        </button>
                                    )}
                                </div>

                                <div style={{ height: '1px', backgroundColor: 'var(--border)', width: '100%' }}></div>

                                {/* Captura de Firma */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                                        <label className="text-xs font-bold text-white flex items-center gap-1">✍️ Firma Digital (Opcional)</label>
                                        <button type="button" onClick={limpiarFirma} style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', color: 'var(--primary)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Eraser size={12} /> Limpiar
                                        </button>
                                    </div>
                                    <div style={{ border: '2px solid #ccc', borderRadius: '0.5rem', backgroundColor: 'white', overflow: 'hidden', height: '220px', position: 'relative' }}>
                                        <SignatureCanvas
                                            ref={sigCanvas}
                                            penColor="black"
                                            canvasProps={{ style: { width: '100%', height: '100%', display: 'block' } }}
                                            backgroundColor="white"
                                        />
                                    </div>
                                    <p style={{ fontSize: '10px', textAlign: 'center', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', marginTop: '0.5rem' }}>
                                        Firmar con el dedo arriba
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                style={{ backgroundColor: 'var(--primary)', color: 'black', fontWeight: 900, textTransform: 'uppercase', padding: '1rem', borderRadius: '0.5rem', border: 'none', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1rem', marginTop: '0.5rem', boxShadow: '0 4px 14px 0 rgba(234, 179, 8, 0.39)' }}
                            >
                                <CheckCircle2 size={24} /> Guardar Entrega
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

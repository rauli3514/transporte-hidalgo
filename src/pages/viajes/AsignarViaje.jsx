import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Truck, ArrowLeft, Calendar, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export default function AsignarViaje() {
    const { id } = useParams(); // ID del remito
    const navigate = useNavigate();

    const [remito, setRemito] = useState(null);
    const [choferes, setChoferes] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', isDestructive: false, onConfirm: null, confirmText: 'Confirmar' });

    const showAlert = (title, message, isDestructive = false, onConfirm = null) => {
        setDialog({
            isOpen: true,
            title,
            message,
            isDestructive,
            isAlert: true,
            onConfirm: onConfirm || (() => setDialog({ ...dialog, isOpen: false }))
        });
    };

    const [formData, setFormData] = useState({
        chofer_id: '',
        vehiculo_id: '',
        fecha: new Date().toISOString().split('T')[0],
        turno: 'Mañana',
        notas: ''
    });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Obtener el remito
            const { data: remitoData, error: remitoErr } = await supabase.from('remitos').select('*').eq('id', id).single();
            if (remitoErr) throw remitoErr;
            setRemito(remitoData);

            // 2. Obtener choferes disponibles
            const { data: choferesData, error: chofErr } = await supabase.from('choferes').select('*').eq('estado', 'activo');
            if (chofErr) throw chofErr;
            setChoferes(choferesData || []);

            // 3. Obtener vehículos disponibles
            const { data: vehiculosData, error: vehErr } = await supabase.from('vehiculos').select('*').eq('estado', 'activo');
            if (vehErr) throw vehErr;
            setVehiculos(vehiculosData || []);

            // Setear el primero por defecto si hay
            if (choferesData?.length > 0 && vehiculosData?.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    chofer_id: choferesData[0].id,
                    vehiculo_id: vehiculosData[0].id
                }));
            }
        } catch (error) {
            console.error('Error fetching data:', error.message);
            showAlert('Error', 'Error al cargar datos: ' + error.message, true);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.chofer_id || !formData.vehiculo_id) {
            showAlert('Atención', 'Debes seleccionar un chofer y un vehículo para poder asignar el viaje.', true);
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: userData } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();

            const nombreViaje = `Viaje ${formData.fecha.split('-').reverse().join('/')} - Turno ${formData.turno}`;

            // 1. Crear el Viaje Físico
            const { data: nuevoViaje, error: viajeErr } = await supabase.from('viajes').insert([{
                empresa_id: userData.empresa_id,
                nombre: nombreViaje,
                fecha: formData.fecha,
                turno: formData.turno,
                vehiculo_id: formData.vehiculo_id,
                chofer_id: formData.chofer_id,
                estado: 'en_curso',
                notas: formData.notas
            }]).select().single();

            if (viajeErr) throw viajeErr;

            // 2. Asignar el remito a este viaje y pasarlo a "En Tránsito"
            const { error: updateErr } = await supabase.from('remitos').update({
                viaje_id: nuevoViaje.id,
                estado: 'en_transito'
            }).eq('id', remito.id);

            if (updateErr) throw updateErr;

            showAlert('¡Éxito!', 'El Remito y el Viaje ya fueron asignados, ahora el Chofer lo puede gestionar.', false, () => {
                navigate('/remitos'); // Volvemos al historial al confirmar
            });

        } catch (error) {
            console.error('Error al asignar viaje:', error.message);
            showAlert('Error', 'Hubo un error en la asignación: ' + error.message, true);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-6 text-center text-muted">Cargando sistema de despachos...</div>;
    if (!remito) return <div className="p-6 text-center text-red-500">Error: No se encontró el remito.</div>;

    return (
        <div className="flex flex-col h-full pb-10">
            <header className="mb-6 flex justify-between items-center" style={{ padding: '0.5rem 0' }}>
                <div className="flex items-center gap-3">
                    <Link to="/remitos" className="text-muted" style={{ display: 'flex' }}>
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                        <Truck size={24} />
                        <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)' }}>Asignar Viaje</h1>
                    </div>
                </div>
            </header>

            {/* RESUMEN DEL REMITO */}
            <div className="card mb-6" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-muted" />
                    <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-muted">Resumen del Transporte</h3>
                </div>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xl font-bold mb-1">Guía: {remito.numero_guia || 'Sin Guía'}</div>
                        <div className="text-sm">
                            <span className="text-muted">De: </span> <b>{remito.remitente_nombre}</b> ({remito.remitente_localidad})
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">A: </span> <b>{remito.destinatario_nombre}</b> ({remito.destinatario_localidad})
                        </div>
                    </div>
                    <div className="text-right">
                        <label className="text-[10px] uppercase text-[var(--primary)] font-bold block mb-1">Contra Reembolso</label>
                        <div className="text-xl font-bold font-mono">
                            ${Number(remito.contra_reembolso).toLocaleString('es-AR')}
                        </div>
                    </div>
                </div>
            </div>

            {/* FORMULARIO DE ASIGNACION (LOGISTICA) */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 className="mb-4 text-[var(--text-main)]" style={{ fontSize: '0.9rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        Selección de Logística
                    </h3>

                    <div className="flex flex-col gap-4">
                        {/* SELECT CHOFER */}
                        <div>
                            <label className="text-xs uppercase font-bold text-muted mb-2 flex items-center gap-1"><User size={14} /> Chofer Asignado</label>
                            {choferes.length === 0 ? (
                                <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded border border-red-500/20">
                                    No tienes choferes en la nómina. Créalos en el panel primero.
                                </div>
                            ) : (
                                <select
                                    className="form-input w-full bg-[var(--background)] border border-[var(--border)] text-lg"
                                    name="chofer_id"
                                    value={formData.chofer_id}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="" disabled>-- Selecciona un chofer --</option>
                                    {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre} (DNI: {c.dni})</option>)}
                                </select>
                            )}
                        </div>

                        {/* SELECT VEHICULO */}
                        <div>
                            <label className="text-xs uppercase font-bold text-muted mb-2 flex items-center gap-1"><Truck size={14} /> Unidad de Transporte (Camioneta)</label>
                            {vehiculos.length === 0 ? (
                                <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded border border-red-500/20">
                                    No tienes vehículos en la flota. Créalos en el panel primero.
                                </div>
                            ) : (
                                <select
                                    className="form-input w-full bg-[var(--background)] border border-[var(--border)] text-lg"
                                    name="vehiculo_id"
                                    value={formData.vehiculo_id}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="" disabled>-- Selecciona un vehículo --</option>
                                    {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} • {v.modelo}</option>)}
                                </select>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            {/* FECHA */}
                            <div>
                                <label className="text-xs uppercase font-bold text-muted mb-2 flex items-center gap-1"><Calendar size={14} /> Fecha Salida</label>
                                <input type="date" className="form-input w-full bg-[var(--background)]" name="fecha" value={formData.fecha} onChange={handleInputChange} required />
                            </div>

                            {/* TURNO */}
                            <div>
                                <label className="text-xs uppercase font-bold text-muted mb-2 block">Turno</label>
                                <select className="form-input w-full bg-[var(--background)]" name="turno" value={formData.turno} onChange={handleInputChange}>
                                    <option value="Mañana">Mañana</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noche">Noche</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-2">
                            <label className="text-xs uppercase font-bold text-muted mb-2 block">Notas Internas de Despacho (Solo Admin)</label>
                            <input type="text" className="form-input w-full" name="notas" placeholder="Ej: Entregar primero el bulto en Formosa" value={formData.notas} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-full py-4 text-base shadow-lg"
                    style={{ position: 'sticky', bottom: '1rem', zIndex: 10, justifyContent: 'center' }}
                    disabled={isSubmitting || choferes.length === 0 || vehiculos.length === 0}
                >
                    {isSubmitting ? 'Buscando satélites...' : <><CheckCircle2 size={24} className="mr-2" /> Despachar e Iniciar Viaje</>}
                </button>

            </form>

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
        </div>
    );
}

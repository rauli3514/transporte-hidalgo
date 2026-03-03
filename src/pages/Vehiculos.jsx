import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Truck, Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Vehiculos() {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [patente, setPatente] = useState('');
    const [modelo, setModelo] = useState('');
    const [capacidad, setCapacidad] = useState('');
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', isDestructive: false, onConfirm: null, confirmText: 'Confirmar' });

    const showAlert = (title, message, isDestructive = false) => {
        setDialog({
            isOpen: true,
            title,
            message,
            isDestructive,
            isAlert: true,
            onConfirm: () => setDialog({ ...dialog, isOpen: false })
        });
    };

    const showConfirm = (title, message, confirmText, isDestructive, onConfirm) => {
        setDialog({
            isOpen: true,
            title,
            message,
            confirmText,
            isDestructive,
            isAlert: false,
            onConfirm
        });
    };

    useEffect(() => {
        fetchVehiculos();
    }, []);

    const fetchVehiculos = async () => {
        try {
            const { data, error } = await supabase.from('vehiculos').select('*').neq('estado', 'inactivo').order('created_at', { ascending: false });
            if (error) throw error;
            setVehiculos(data || []);
        } catch (error) {
            console.error('Error fetching vehiculos:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addVehiculo = async (e) => {
        e.preventDefault();
        try {
            // Get the current user's empresa_id first
            const { data: { user } } = await supabase.auth.getUser();
            const { data: userData, error: userError } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();

            if (userError) throw userError;

            const { data, error } = await supabase.from('vehiculos').insert([{
                empresa_id: userData.empresa_id,
                patente,
                modelo,
                capacidad_kg: parseFloat(capacidad) || 0
            }]).select();

            if (error) throw error;
            setVehiculos([data[0], ...vehiculos]);
            setPatente('');
            setModelo('');
            setCapacidad('');
        } catch (error) {
            console.error('Error al agregar vehículo:', error.message);
            showAlert('Error', 'Error al agregar vehículo. Asegúrate de que las credenciales de empresa estén configuradas.', true);
        }
    };

    const deleteVehiculo = (id) => {
        showConfirm(
            'Eliminar Vehículo',
            '¿Estás seguro de que deseas eliminar este vehículo de la flota permanentemente?',
            'Sí, Eliminar',
            true,
            async () => {
                try {
                    const { error } = await supabase.from('vehiculos').delete().eq('id', id);
                    if (error) {
                        // 23503: foreign_key_violation
                        if (error.code === '23503') {
                            const { error: softError } = await supabase.from('vehiculos').update({ estado: 'inactivo' }).eq('id', id);
                            if (softError) throw softError;

                            setVehiculos(vehiculos.filter(v => v.id !== id));
                            showAlert('Desvinculación Segura', 'El vehículo tiene viajes históricos asociados. Para evitar corrupción en la historia de despachos, fue correctamente marcado como "INACTIVO" y ya no se podrá usar.');
                            return;
                        }
                        throw error;
                    }
                    setVehiculos(vehiculos.filter(v => v.id !== id));
                    showAlert('Vehículo eliminado', 'El vehículo fue removido de la lista exitosamente.');
                } catch (error) {
                    console.error('Error al eliminar:', error.message);
                    showAlert('Error', 'No se pudo eliminar el vehículo: ' + error.message, true);
                }
            }
        );
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center" style={{ padding: '0.5rem 0' }}>
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="text-muted" style={{ display: 'flex' }}>
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                        <Truck size={24} />
                        <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)' }}>Vehículos</h1>
                    </div>
                </div>
            </header>

            <div className="card mb-6" style={{ padding: '1.5rem 1rem' }}>
                <h3 className="mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agregar Nuevo</h3>
                <form onSubmit={addVehiculo} className="flex flex-col gap-3">
                    <div className="form-group mb-0">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Patente (Ej: AF123YZ)"
                            value={patente}
                            onChange={(e) => setPatente(e.target.value.toUpperCase())}
                            required
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="form-group mb-0 flex-1">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Modelo / Marca"
                                value={modelo}
                                onChange={(e) => setModelo(e.target.value)}
                            />
                        </div>
                        <div className="form-group mb-0 w-24">
                            <input
                                type="number"
                                className="form-input"
                                placeholder="KG"
                                value={capacidad}
                                onChange={(e) => setCapacidad(e.target.value)}
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                        <Plus size={20} style={{ marginRight: '0.5rem' }} /> Add Vehículo
                    </button>
                </form>
            </div>

            <div className="flex flex-col gap-3">
                {loading ? (
                    <p className="text-muted text-center py-4">Cargando flota...</p>
                ) : vehiculos.length === 0 ? (
                    <p className="text-muted text-center py-4 text-sm">No hay vehículos registrados.</p>
                ) : (
                    vehiculos.map((v) => (
                        <div key={v.id} className="card flex items-center justify-between mb-0" style={{ padding: '1rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{v.patente}</h4>
                                <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>{v.modelo || 'Sin modelo'} • {v.capacidad_kg} kg</p>
                            </div>
                            <button onClick={() => deleteVehiculo(v.id)} style={{ background: 'transparent', border: 'none', color: 'var(--status-observed)', cursor: 'pointer', padding: '0.5rem' }}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))
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
        </div>
    );
}

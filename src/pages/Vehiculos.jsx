import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Truck, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Vehiculos() {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [patente, setPatente] = useState('');
    const [modelo, setModelo] = useState('');
    const [capacidad, setCapacidad] = useState('');

    useEffect(() => {
        fetchVehiculos();
    }, []);

    const fetchVehiculos = async () => {
        try {
            const { data, error } = await supabase.from('vehiculos').select('*').order('created_at', { ascending: false });
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
            alert('Error al agregar vehículo. Asegúrate de que las credenciales de empresa estén configuradas.');
        }
    };

    const deleteVehiculo = async (id) => {
        if (!window.confirm('¿Eliminar este vehículo?')) return;
        try {
            const { error } = await supabase.from('vehiculos').delete().eq('id', id);
            if (error) throw error;
            setVehiculos(vehiculos.filter(v => v.id !== id));
        } catch (error) {
            console.error('Error al eliminar:', error.message);
        }
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
        </div>
    );
}

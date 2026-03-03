import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Truck, ArrowLeft, Calendar, User, CheckCircle2 } from 'lucide-react';

export default function NuevoViaje() {
    const navigate = useNavigate();
    const [choferes, setChoferes] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        chofer_id: '',
        vehiculo_id: '',
        fecha: new Date().toISOString().split('T')[0],
        turno: 'Mañana',
        notas: ''
    });

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        const { data: choferesData } = await supabase.from('choferes').select('*').eq('estado', 'activo');
        const { data: vehiculosData } = await supabase.from('vehiculos').select('*').eq('estado', 'activo');
        setChoferes(choferesData || []);
        setVehiculos(vehiculosData || []);

        if (choferesData?.length > 0 && vehiculosData?.length > 0) {
            setFormData(prev => ({ ...prev, chofer_id: choferesData[0].id, vehiculo_id: vehiculosData[0].id }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: userData } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();

            const nombreViaje = `Planilla ${formData.fecha.split('-').reverse().join('/')} - ${formData.turno}`;

            const { error } = await supabase.from('viajes').insert([{
                empresa_id: userData.empresa_id,
                nombre: nombreViaje,
                fecha: formData.fecha,
                turno: formData.turno,
                vehiculo_id: formData.vehiculo_id,
                chofer_id: formData.chofer_id,
                estado: 'abierto', // Changed to 'abierto' so it can receive remitos without starting immediately
                notas: formData.notas
            }]);

            if (error) throw error;
            navigate('/viajes');
        } catch (error) {
            alert('Error al crear planilla: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            <header className="mb-6 flex items-center gap-3">
                <Link to="/viajes" className="text-muted"><ArrowLeft size={24} /></Link>
                <div className="flex items-center gap-2 text-[var(--primary)]">
                    <Truck size={24} />
                    <h1 className="text-xl m-0 uppercase text-[var(--text-main)]">Abrir Planilla / Viaje</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6" style={{ paddingBottom: '5rem' }}>
                <div className="card p-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs uppercase font-bold text-muted mb-2 flex items-center gap-1"><User size={14} /> Chofer Asignado</label>
                            <select className="form-input w-full bg-[var(--background)] border border-[var(--border)] text-lg" value={formData.chofer_id} onChange={e => setFormData({ ...formData, chofer_id: e.target.value })} required>
                                <option value="" disabled>Selecciona un chofer</option>
                                {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs uppercase font-bold text-muted mb-2 flex items-center gap-1"><Truck size={14} /> Vehículo</label>
                            <select className="form-input w-full bg-[var(--background)] border border-[var(--border)] text-lg" value={formData.vehiculo_id} onChange={e => setFormData({ ...formData, vehiculo_id: e.target.value })} required>
                                <option value="" disabled>Selecciona un vehículo</option>
                                {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} • {v.modelo}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-muted mb-2 flex items-center gap-1"><Calendar size={14} /> Fecha</label>
                                <input type="date" className="form-input w-full bg-[var(--background)]" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-muted mb-2 block">Turno</label>
                                <select className="form-input w-full bg-[var(--background)]" value={formData.turno} onChange={e => setFormData({ ...formData, turno: e.target.value })}>
                                    <option value="Mañana">Mañana</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noche">Noche</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs uppercase font-bold text-muted mb-2 block">Notas Internas</label>
                            <input type="text" className="form-input w-full" placeholder="Ej: Recorrido zona sur" value={formData.notas} onChange={e => setFormData({ ...formData, notas: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--background)] border-t border-[var(--border)] z-10 w-full max-w-md mx-auto">
                    <button type="submit" disabled={isSubmitting} className="btn bg-[var(--primary)] text-black font-bold w-full py-3 shadow-lg flex items-center justify-center gap-2">
                        {isSubmitting ? 'Abriendo...' : <><CheckCircle2 size={20} /> Crear Planilla</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

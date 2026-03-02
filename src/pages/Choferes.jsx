import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Users, Plus, Trash2, ArrowLeft, Key, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Cliente estricto y sin memoria (para crear choferes sin desloguear al Admin)
const supabaseTemp = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

export default function Choferes() {
    const [choferes, setChoferes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nombre, setNombre] = useState('');
    const [dni, setDni] = useState('');
    const [telefono, setTelefono] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchChoferes();
    }, []);

    const fetchChoferes = async () => {
        try {
            const { data, error } = await supabase.from('choferes').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setChoferes(data || []);
        } catch (error) {
            console.error('Error fetching choferes:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addChofer = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Obtener la empresa del dueño logueado
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const { data: userData } = await supabase.from('usuarios').select('empresa_id').eq('id', adminUser.id).single();

            const emailFalso = `${username}@hidalgo.com.ar`;

            // 2. Crear al usuario en Supabase Auth mediante el Cliente Temporal
            const { data: authData, error: authErr } = await supabaseTemp.auth.signUp({
                email: emailFalso,
                password: password
            });
            if (authErr) throw new Error(authErr.message);

            const newUserId = authData.user.id;

            // 3. (Opcional pero recomendado) Intenta agregarlo a la tabla pública 'usuarios'
            await supabase.from('usuarios').insert([{
                id: newUserId,
                empresa_id: userData.empresa_id,
                nombre: nombre,
                email: emailFalso,
                rol: 'transportista'
            }]).catch(() => { }); // Si falla por política RLS, lo evadimos ya que la Auth está hecha

            // 4. Agregar a la flota física de "Choferes"
            const { data, error } = await supabase.from('choferes').insert([{
                empresa_id: userData.empresa_id,
                nombre,
                dni,
                telefono
            }]).select();

            if (error) throw error;
            setChoferes([data[0], ...choferes]);
            setNombre(''); setDni(''); setTelefono(''); setUsername(''); setPassword('');
            alert('¡Chofer creado y habilitado para el sistema!');
        } catch (error) {
            console.error('Error al agregar chofer:', error.message);
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteChofer = async (id) => {
        if (!window.confirm('¿Eliminar este chofer?')) return;
        try {
            const { error } = await supabase.from('choferes').delete().eq('id', id);
            if (error) throw error;
            setChoferes(choferes.filter(c => c.id !== id));
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
                        <Users size={24} />
                        <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)' }}>Choferes</h1>
                    </div>
                </div>
            </header>

            <div className="card mb-6" style={{ padding: '1.5rem 1rem' }}>
                <h3 className="mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agregar Nuevo</h3>
                <form onSubmit={addChofer} className="flex flex-col gap-3">
                    <div className="form-group mb-0">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nombre Completo"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="form-group mb-0 flex-1">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="DNI"
                                value={dni}
                                onChange={(e) => setDni(e.target.value)}
                            />
                        </div>
                        <div className="form-group mb-0 flex-1">
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="Teléfono"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="form-group mb-0 flex-1">
                            <label className="text-muted text-xs mb-1 block">Acceso (Letras minúsculas)</label>
                            <div className="flex items-center" style={{ background: 'var(--surface)', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <UserPlus size={16} className="ml-2 text-muted" />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: martin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                                    style={{ border: 'none', background: 'transparent' }}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group mb-0 flex-1">
                            <label className="text-muted text-xs mb-1 block">Clave (PIN/Contraseña)</label>
                            <div className="flex items-center" style={{ background: 'var(--surface)', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <Key size={16} className="ml-2 text-muted" />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: martin123"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ border: 'none', background: 'transparent' }}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary mt-2" style={{ justifyContent: 'center' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Creando Acceso...' : <><Plus size={20} style={{ marginRight: '0.5rem' }} /> Add Chofer & Usuario</>}
                    </button>
                </form>
            </div>

            <div className="flex flex-col gap-3">
                {loading ? (
                    <p className="text-muted text-center py-4">Cargando flota...</p>
                ) : choferes.length === 0 ? (
                    <p className="text-muted text-center py-4 text-sm">No hay choferes registrados.</p>
                ) : (
                    choferes.map((c) => (
                        <div key={c.id} className="card flex items-center justify-between mb-0" style={{ padding: '1rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{c.nombre}</h4>
                                <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>DNI: {c.dni || '-'} • Tel: {c.telefono || '-'}</p>
                            </div>
                            <button onClick={() => deleteChofer(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--status-observed)', cursor: 'pointer', padding: '0.5rem' }}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Users, Plus, Trash2, ArrowLeft, Key, UserPlus, AlertCircle } from 'lucide-react';
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
        fetchChoferes();
    }, []);

    const fetchChoferes = async () => {
        try {
            const { data, error } = await supabase.from('choferes').select('*').neq('estado', 'inactivo').order('created_at', { ascending: false });
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
            const { error: insertUserError } = await supabase.from('usuarios').insert([{
                id: newUserId,
                empresa_id: userData.empresa_id,
                nombre: nombre,
                email: emailFalso,
                rol: 'transportista'
            }]);
            if (insertUserError) console.log('Aviso: No se pudo insertar en public.usuarios (probable RLS), ignorando...');

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
            showAlert('Éxito', '¡Chofer creado y habilitado para el sistema!');
        } catch (error) {
            console.error('Error al agregar chofer:', error.message);
            showAlert('Error', 'No se pudo crear el chofer: ' + error.message, true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteChofer = (id) => {
        showConfirm(
            'Eliminar Chofer',
            '¿Estás seguro de que deseas eliminar este chofer de la flota permanentemente?',
            'Sí, Eliminar',
            true,
            async () => {
                try {
                    const { error } = await supabase.from('choferes').delete().eq('id', id);
                    if (error) {
                        if (error.code === '23503') {
                            const { error: softError } = await supabase.from('choferes').update({ estado: 'inactivo' }).eq('id', id);
                            if (softError) throw softError;

                            setChoferes(choferes.filter(c => c.id !== id));
                            showAlert('Desvinculación Segura', 'El chofer tiene viajes históricos asociados. Para evitar corrupción en la historia de despachos, fue marcado como "INACTIVO" y ya no podrá tener viajes nuevos.');
                            return;
                        }
                        throw error;
                    }
                    setChoferes(choferes.filter(c => c.id !== id));
                    showAlert('Chofer eliminado', 'El chofer fue removido de la lista exitosamente.');
                } catch (error) {
                    console.error('Error al eliminar:', error.message);
                    showAlert('Error', 'No se pudo eliminar el chofer: ' + error.message, true);
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

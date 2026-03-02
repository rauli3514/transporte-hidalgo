import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PackagePlus, ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function NuevoRemito() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Datos principales del remito
    const [remito, setRemito] = useState({
        remitente_nombre: '',
        remitente_direccion: '',
        remitente_localidad: '',
        remitente_telefono: '',
        destinatario_nombre: '',
        destinatario_direccion: '',
        destinatario_localidad: '',
        observaciones: '',
        // Totales calculados automáticamente desde las filas más recargos extra
        valor_declarado_total: 0,
        flete_total: 0,
        seguro_total: 0,
        otros_cargos: 0,
        tipo_flete: 'pago_destino', // pago_destino, pago_origen, cta_cte
        contra_reembolso: 0
    });

    // Array dinámico de Bultos/Detalle
    const [bultos, setBultos] = useState([{
        cantidad: 1,
        detalle: 'Caja',
        peso_kg: 0,
        bul: 1,
        flete: 0,
        valor_declarado: 0
    }]);

    useEffect(() => {
        // Auto-cálculo simple (Totales de Flete y Valor de todos los bultos)
        const totalFleteItems = bultos.reduce((acc, b) => acc + (Number(b.flete) || 0), 0);
        const totalValItems = bultos.reduce((acc, b) => acc + (Number(b.valor_declarado) || 0), 0);

        setRemito(prev => ({
            ...prev,
            flete_total: totalFleteItems,
            valor_declarado_total: totalValItems
        }));
    }, [bultos]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setRemito(prev => ({ ...prev, [name]: value }));
    };

    const updateBulto = (index, field, value) => {
        const newBultos = [...bultos];
        newBultos[index][field] = value;
        setBultos(newBultos);
    };

    const addBultoRow = () => {
        setBultos([...bultos, { cantidad: 1, detalle: '', peso_kg: 0, bul: 1, flete: 0, valor_declarado: 0 }]);
    };

    const removeBultoRow = (index) => {
        if (bultos.length === 1) return;
        setBultos(bultos.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: userData } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();

            // 1. Crear el Remito Padre
            const { data: nuevoRemito, error: remitoError } = await supabase.from('remitos').insert([{
                empresa_id: userData.empresa_id,
                remitente_nombre: remito.remitente_nombre,
                remitente_direccion: remito.remitente_direccion,
                remitente_localidad: remito.remitente_localidad,
                remitente_telefono: remito.remitente_telefono,
                destinatario_nombre: remito.destinatario_nombre,
                destinatario_direccion: remito.destinatario_direccion,
                destinatario_localidad: remito.destinatario_localidad,
                observaciones: remito.observaciones,
                valor_declarado_total: remito.valor_declarado_total,
                flete_total: remito.flete_total,
                seguro_total: remito.seguro_total,
                otros_cargos: remito.otros_cargos,
                tipo_flete: remito.tipo_flete,
                contra_reembolso: remito.contra_reembolso,
                numero_guia: 'HYD-' + Date.now().toString().slice(-6), // Auto Guía Simple Test
                estado: 'pendiente'
            }]).select().single();

            if (remitoError) throw remitoError;

            // 2. Crear los Bultos correspondientes
            const bultosToInsert = bultos.map(b => ({
                remito_id: nuevoRemito.id,
                cantidad: b.cantidad,
                detalle: b.detalle,
                peso_kg: b.peso_kg,
                bul: b.bul,
                flete: b.flete,
                valor_declarado: b.valor_declarado
            }));

            const { error: bultosError } = await supabase.from('remitos_items').insert(bultosToInsert);

            if (bultosError) throw bultosError;

            alert(`Remito Nº ${nuevoRemito.numero_remito} generado correctamente.`);
            navigate('/dashboard'); // Volvemos al inicio o a la lista de remitos

        } catch (error) {
            console.error('Error guardando remito:', error.message);
            alert('Hubo un error al generar el remito: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto pb-10">
            <header className="mb-6 flex justify-between items-center" style={{ padding: '0.5rem 0' }}>
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="text-muted" style={{ display: 'flex' }}>
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                        <PackagePlus size={24} />
                        <h1 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-main)' }}>Nuevo Remito</h1>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* BLOQUE REMITENTE Y DESTINATARIO */}
                <div className="card mb-0" style={{ padding: '1.5rem 1rem' }}>
                    <h3 className="mb-4 text-primary" style={{ fontSize: '0.9rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>1. Remitente</h3>
                    <div className="flex flex-col gap-3 mb-6">
                        <input type="text" className="form-input" name="remitente_nombre" placeholder="Nombre completo o Empresa" value={remito.remitente_nombre} onChange={handleInputChange} required />
                        <input type="text" className="form-input" name="remitente_direccion" placeholder="Dirección" value={remito.remitente_direccion} onChange={handleInputChange} required />
                        <div className="flex gap-3">
                            <input type="text" className="form-input flex-1" name="remitente_localidad" placeholder="Localidad" value={remito.remitente_localidad} onChange={handleInputChange} required />
                            <input type="tel" className="form-input flex-1" name="remitente_telefono" placeholder="Teléfono" value={remito.remitente_telefono} onChange={handleInputChange} />
                        </div>
                    </div>

                    <h3 className="mb-4 text-primary" style={{ fontSize: '0.9rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>2. Destinatario</h3>
                    <div className="flex flex-col gap-3">
                        <input type="text" className="form-input" name="destinatario_nombre" placeholder="Nombre completo o Empresa" value={remito.destinatario_nombre} onChange={handleInputChange} required />
                        <input type="text" className="form-input" name="destinatario_direccion" placeholder="Dirección" value={remito.destinatario_direccion} onChange={handleInputChange} required />
                        <input type="text" className="form-input" name="destinatario_localidad" placeholder="Localidad" value={remito.destinatario_localidad} onChange={handleInputChange} required />
                    </div>
                </div>

                {/* BLOQUE DE BULTOS (GRILLA) */}
                <div className="card mb-0" style={{ padding: '1.5rem 1rem' }}>
                    <h3 className="mb-4" style={{ fontSize: '0.9rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>3. Detalle de Envío</h3>

                    <div className="flex flex-col gap-3 mb-4">
                        {bultos.map((b, idx) => (
                            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 items-end" style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                <div className="flex flex-col flex-1 min-w-[60px]">
                                    <label className="text-[10px] text-muted font-bold uppercase mb-1">Cant</label>
                                    <input type="number" min="1" className="form-input px-1 text-center" placeholder="1" value={b.cantidad} onChange={(e) => updateBulto(idx, 'cantidad', e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, padding: '0.25rem' }} required />
                                </div>
                                <div className="flex flex-col flex-[3] min-w-[120px]">
                                    <label className="text-[10px] text-muted font-bold uppercase mb-1">Detalle</label>
                                    <input type="text" className="form-input px-2" placeholder="Ej. Cajas M" value={b.detalle} onChange={(e) => updateBulto(idx, 'detalle', e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, padding: '0.25rem' }} required />
                                </div>
                                <div className="flex flex-col flex-1 min-w-[60px]">
                                    <label className="text-[10px] text-muted font-bold uppercase mb-1">Bultos</label>
                                    <input type="number" className="form-input px-1 text-center" placeholder="1" value={b.bul} onChange={(e) => updateBulto(idx, 'bul', e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, padding: '0.25rem' }} required />
                                </div>
                                <div className="flex flex-col flex-1 min-w-[80px]">
                                    <label className="text-[10px] text-[var(--primary)] font-bold uppercase mb-1">$ Flete</label>
                                    <input type="number" className="form-input px-1 text-right text-primary font-bold" placeholder="0" value={b.flete || ''} onChange={(e) => updateBulto(idx, 'flete', e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, padding: '0.25rem' }} />
                                </div>
                                <div className="flex flex-col flex-1 min-w-[80px]">
                                    <label className="text-[10px] text-muted font-bold uppercase mb-1">$ Val.Dec</label>
                                    <input type="number" className="form-input px-1 text-right text-muted font-bold" placeholder="0" value={b.valor_declarado || ''} onChange={(e) => updateBulto(idx, 'valor_declarado', e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, padding: '0.25rem' }} />
                                </div>

                                {bultos.length > 1 && (
                                    <button type="button" onClick={() => removeBultoRow(idx)} className="text-muted p-1 hover:text-red-400 mb-1" style={{ paddingBottom: '0.35rem' }}>
                                        <Trash2 size={24} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addBultoRow} className="btn w-full mb-4" style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                        <Plus size={18} className="mr-2" /> Agregar Fila
                    </button>

                    <div>
                        <input type="text" className="form-input w-full" name="observaciones" placeholder="Observaciones / Comentarios permitidos..." value={remito.observaciones} onChange={handleInputChange} />
                    </div>
                </div>

                {/* BLOQUE TARIFARIOS Y FINANZAS */}
                <div className="card mb-6" style={{ padding: '1.5rem 1rem' }}>
                    <h3 className="mb-4" style={{ fontSize: '0.9rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>4. Cargos y Tarifas</h3>

                    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <div className="form-group mb-0">
                            <label className="text-muted text-xs mb-1 block">Valor Declarado</label>
                            <input type="number" className="form-input" name="valor_declarado_total" value={remito.valor_declarado_total} onChange={handleInputChange} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-muted text-xs mb-1 block">Flete / Transporte</label>
                            <input type="number" className="form-input" name="flete_total" value={remito.flete_total} onChange={handleInputChange} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-muted text-xs mb-1 block">Seguro</label>
                            <input type="number" className="form-input" name="seguro_total" value={remito.seguro_total} onChange={handleInputChange} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-muted text-xs mb-1 block">Otros Cargos</label>
                            <input type="number" className="form-input" name="otros_cargos" value={remito.otros_cargos} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="flex gap-3 mb-4 p-3 rounded" style={{ background: 'var(--surface-hover)', border: '1px solid var(--primary)', alignOptions: 'center' }}>
                        <div className="flex-1">
                            <label className="text-[var(--primary)] text-xs font-bold mb-1 block uppercase">Suma Estimada Gastos</label>
                            <div className="text-xl font-bold text-[var(--primary)] text-opacity-80">
                                $ {(Number(remito.flete_total) + Number(remito.seguro_total) + Number(remito.otros_cargos)).toLocaleString('es-AR')}
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-muted text-xs mb-1 block uppercase">Contra Reembolso</label>
                            <input type="number" className="form-input bg-dark border-primary" style={{ color: 'var(--primary)', fontWeight: 'bold' }} name="contra_reembolso" placeholder="$0.00" value={remito.contra_reembolso} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="form-group mb-0">
                        <label className="text-muted text-xs mb-2 block uppercase">Condición de Flete</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setRemito({ ...remito, tipo_flete: 'pago_destino' })} className={`flex-1 py-2 px-1 text-center text-xs rounded transition-colors ${remito.tipo_flete === 'pago_destino' ? 'bg-primary text-black font-bold' : 'bg-surface text-muted border border-[var(--border)]'}`}>
                                Pago en Destino
                            </button>
                            <button type="button" onClick={() => setRemito({ ...remito, tipo_flete: 'pago_origen' })} className={`flex-1 py-2 px-1 text-center text-xs rounded transition-colors ${remito.tipo_flete === 'pago_origen' ? 'bg-primary text-black font-bold' : 'bg-surface text-muted border border-[var(--border)]'}`}>
                                Contado
                            </button>
                            <button type="button" onClick={() => setRemito({ ...remito, tipo_flete: 'cta_cte' })} className={`flex-1 py-2 px-1 text-center text-xs rounded transition-colors ${remito.tipo_flete === 'cta_cte' ? 'bg-primary text-black font-bold' : 'bg-surface text-muted border border-[var(--border)]'}`}>
                                CtaCte
                            </button>
                        </div>
                    </div>

                </div>

                {/* BOTON FINAL DE ACCION */}
                <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-lg" style={{ position: 'sticky', bottom: '1rem', zIndex: 10, justifyContent: 'center' }} disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando remito...' : <><Save size={20} className="mr-2" /> Guardar e Imprimir Remito</>}
                </button>

            </form>
        </div>
    );
}

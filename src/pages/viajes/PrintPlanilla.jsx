import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Printer, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function PrintPlanilla() {
    const { id } = useParams();
    const [viaje, setViaje] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlanilla = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('viajes')
                    .select(`
                        *,
                        vehiculos(patente, modelo),
                        choferes(nombre, dni),
                        remitos(*)
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                // Ordenamos remitos por fecha o como prefiera el cliente
                if (data.remitos) {
                    data.remitos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                }
                setViaje(data);
            } catch (err) {
                console.error("Error al buscar planilla:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPlanilla();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center p-10 bg-[var(--background)]">
                <Loader2 className="animate-spin text-[var(--primary)] mb-4" size={48} />
                <p className="text-muted">Generando Planilla Diaria A4...</p>
            </div>
        );
    }

    if (error || !viaje) {
        return (
            <div className="flex flex-col h-screen items-center justify-center p-10 text-center bg-[var(--background)]">
                <AlertCircle className="text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-bold mb-2">Error al cargar</h2>
                <p className="text-muted mb-6">{error || "No se encontró el viaje"}</p>
                <Link to="/viajes" className="btn btn-primary">Volver</Link>
            </div>
        );
    }

    const totalFletes = viaje.remitos?.reduce((acc, r) => acc + Number(r.flete_total), 0) || 0;
    const totalSeguros = viaje.remitos?.reduce((acc, r) => acc + Number(r.seguro_total), 0) || 0;
    const totalContra = viaje.remitos?.reduce((acc, r) => acc + Number(r.contra_reembolso), 0) || 0;
    const totalBultos = viaje.remitos?.reduce((acc, r) => acc + (r.remitos_items?.reduce((a, i) => a + i.bul, 0) || 0), 0) || 0; // Aproximacion simple si items no vienen en el join, sino contar el array principal

    return (
        <div className="print-wrapper min-h-screen text-black relative" style={{ backgroundColor: '#525252' }}>
            {/* BOTONERA FLOTANTE (No se imprime) */}
            <div className="no-print fixed top-4 right-4 flex gap-3 z-50">
                <Link to="/viajes" className="btn text-white shadow-lg px-4 flex items-center gap-2 hover:bg-gray-700" style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}>
                    <ArrowLeft size={18} /> Volver a Viajes
                </Link>
                <button onClick={() => window.print()} className="btn bg-[var(--primary)] text-black font-bold shadow-lg px-6 flex items-center gap-2 hover:scale-105 transition-transform" style={{ padding: '0.75rem 1.5rem' }}>
                    <Printer size={20} /> Imprimir Planilla A4
                </button>
            </div>

            {/* AREA A4 PLANILLA */}
            <div className="a4-page mx-auto overflow-visible flex flex-col p-8 text-black" style={{ backgroundColor: 'white', minHeight: '297mm', color: 'black' }}>
                {/* ENCABEZADO */}
                <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-4">
                    <div className="flex items-center gap-4">
                        <img src="/logo_pegasus.png" alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                        <div>
                            <h1 className="text-3xl font-black uppercase m-0 leading-none text-black">Transporte Hidalgo</h1>
                            <p className="text-sm font-bold m-0 mt-1 text-black">de Ramón Dolores Hidalgo</p>
                            <h2 className="text-xl font-bold mt-2 uppercase bg-black text-white px-3 py-1 inline-block">Planilla de Rendición / Hoja de Ruta</h2>
                        </div>
                    </div>
                    <div className="text-right border-2 border-black p-2 bg-gray-100">
                        <table className="text-sm text-left font-bold text-black border-collapse">
                            <tbody>
                                <tr><td className="pr-4 border-b border-gray-300">FECHA:</td><td className="border-b border-gray-300">{viaje.fecha.split('-').reverse().join('/')} ({viaje.turno})</td></tr>
                                <tr><td className="pr-4 border-b border-gray-300">CHOFER:</td><td className="border-b border-gray-300 uppercase">{viaje.choferes?.nombre}</td></tr>
                                <tr><td className="pr-4 border-b border-gray-300">DOMINIO:</td><td className="border-b border-gray-300 uppercase">{viaje.vehiculos?.patente}</td></tr>
                                <tr><td className="pr-4">ESTADO:</td><td className="uppercase">{viaje.estado}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TABLA DE REMITOS */}
                <table className="w-full text-[11px] border-collapse border-2 border-black mb-4 flex-grow">
                    <thead>
                        <tr className="bg-gray-200 border-b-2 border-black">
                            <th className="border-r border-black p-1">GUÍA N°</th>
                            <th className="border-r border-black p-1">REMITENTE</th>
                            <th className="border-r border-black p-1">DESTINATARIO</th>
                            <th className="border-r border-black p-1 text-center">FLETE</th>
                            <th className="border-r border-black p-1 text-center">SEGURO</th>
                            <th className="border-r border-black p-1 text-center">A COBRAR</th>
                            <th className="border-r border-black p-1 text-center">TIPO</th>
                            <th className="p-1 text-center w-24">FIRMA RECIBÍ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {viaje.remitos?.length > 0 ? (
                            viaje.remitos.map((r, i) => (
                                <tr key={r.id} className="border-b border-gray-400">
                                    <td className="border-r border-black p-1 font-mono font-bold whitespace-nowrap">{r.numero_guia || '-'}</td>
                                    <td className="border-r border-black p-1 uppercase leading-tight truncate max-w-[120px]">{r.remitente_nombre}</td>
                                    <td className="border-r border-black p-1 uppercase leading-tight">
                                        <b>{r.destinatario_nombre}</b><br />
                                        <span className="text-[10px] text-gray-700">{r.destinatario_direccion} - {r.destinatario_localidad}</span>
                                    </td>
                                    <td className="border-r border-black p-1 text-right font-mono">${Number(r.flete_total).toLocaleString('es-AR')}</td>
                                    <td className="border-r border-black p-1 text-right font-mono">${Number(r.seguro_total).toLocaleString('es-AR')}</td>
                                    <td className="border-r border-black p-1 text-right font-mono font-bold">${Number(r.contra_reembolso).toLocaleString('es-AR')}</td>
                                    <td className="border-r border-black p-1 text-center uppercase tracking-tighter text-[10px]">{r.tipo_flete.replace('_', ' ')}</td>
                                    <td className="p-1"></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="p-4 text-center font-bold text-gray-400">PLANILLA SIN REMITOS ASIGNADOS</td>
                            </tr>
                        )}
                        {/* Fill rows empty if needed could go here */}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold border-t-2 border-black">
                        <tr>
                            <td colSpan="3" className="border-r border-black p-2 text-right text-black">TOTALES PLANILLA ({viaje.remitos?.length} Envíos):</td>
                            <td className="border-r border-black p-1 text-right text-black font-mono text-sm">${totalFletes.toLocaleString('es-AR')}</td>
                            <td className="border-r border-black p-1 text-right text-black font-mono text-sm">${totalSeguros.toLocaleString('es-AR')}</td>
                            <td className="border-r border-black p-1 text-right text-black font-mono text-sm">${totalContra.toLocaleString('es-AR')}</td>
                            <td colSpan="2" className="p-1 bg-black text-white text-center">FIN HOJA DE RUTA</td>
                        </tr>
                    </tfoot>
                </table>

                {/* ESPACIO PARA FIRMAS DE RENDICION REDUCIDO PARA QUE ENTRE */}
                <div className="flex justify-around mt-4 pt-10 px-10 border-t border-gray-300">
                    <div className="text-center w-64">
                        <div className="border-t-2 border-black pt-2">
                            <span className="font-bold uppercase text-black">Firma Chofer (Rende)</span>
                        </div>
                    </div>
                    <div className="text-center w-64">
                        <div className="border-t-2 border-black pt-2">
                            <span className="font-bold uppercase text-black">Sello y Firma (Recepción en Base)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ESTILOS A4 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .print-wrapper {
                    padding: 2rem 1rem;
                }
                .a4-page {
                    width: 210mm;
                    background-color: white !important;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                }
                
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-wrapper { padding: 0; background-color: white !important; }
                    .a4-page { width: 100%; box-shadow: none; margin: 0; padding: 0; }
                }
            `}} />
        </div>
    );
}

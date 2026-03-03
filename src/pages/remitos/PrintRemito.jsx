import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Printer, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/Logo';

export default function PrintRemito() {
    const { id } = useParams();
    const [remito, setRemito] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRemito = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('remitos')
                    .select('*, remitos_items(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setRemito(data);
            } catch (err) {
                console.error("Error al buscar remito para imprimir:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchRemito();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-10">
                <Loader2 className="animate-spin text-[var(--primary)] mb-4" size={48} />
                <p className="text-muted">Preparando remito para impresión...</p>
            </div>
        );
    }

    if (error || !remito) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-10 text-center">
                <AlertCircle className="text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-bold mb-2">Error al cargar</h2>
                <p className="text-muted mb-6">{error || "No se encontró el remito"}</p>
                <Link to="/remitos" className="btn btn-primary">Volver al Historial</Link>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const fechaFormat = new Date(remito.created_at).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const CopiaRemito = ({ titulo }) => (
        <div className="print-copy flex flex-col justify-between" style={{ height: '148mm', padding: '10mm', borderBottom: titulo === 'ORIGINAL' ? '1px dashed #ccc' : 'none' }}>
            {/* ENCABEZADO A4 */}
            <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-4">
                <div className="flex items-center gap-4">
                    <img src="/logo_pegasus.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                    <div>
                        <h1 className="text-2xl font-black uppercase m-0 leading-none tracking-tight">Transporte Hidalgo</h1>
                        <p className="text-sm text-gray-600 m-0">Logística y Distribución - Tucumán</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="border-2 border-black p-2 bg-gray-100 text-center w-32 mb-1">
                        <span className="text-xs font-bold block">REMITO Nº</span>
                        <span className="font-mono font-bold text-lg">{remito.numero_guia || 'SN'}</span>
                    </div>
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded uppercase font-bold tracking-widest">{titulo}</span>
                    <span className="text-sm font-bold mt-1">Fecha: {fechaFormat}</span>
                </div>
            </div>

            {/* CUERPO DEL REMITO: REMITENTE Y DESTINATARIO */}
            <div className="flex gap-4 mb-4">
                <div className="flex-1 border border-gray-400 p-2 rounded">
                    <h3 className="text-xs font-bold bg-gray-200 uppercase p-1 -mx-2 -mt-2 mb-2 border-b border-gray-400">Datos del Remitente</h3>
                    <p className="text-sm m-0"><b>Nombre:</b> {remito.remitente_nombre.toUpperCase()}</p>
                    <p className="text-sm m-0"><b>Dirección:</b> {remito.remitente_direccion.toUpperCase()}</p>
                    <p className="text-sm m-0"><b>Localidad:</b> {remito.remitente_localidad.toUpperCase()}</p>
                    <p className="text-sm m-0"><b>Teléfono:</b> {remito.remitente_telefono || '-'}</p>
                </div>
                <div className="flex-1 border border-gray-400 p-2 rounded">
                    <h3 className="text-xs font-bold bg-gray-200 uppercase p-1 -mx-2 -mt-2 mb-2 border-b border-gray-400">Datos del Destinatario</h3>
                    <p className="text-sm m-0"><b>Nombre:</b> {remito.destinatario_nombre.toUpperCase()}</p>
                    <p className="text-sm m-0"><b>Dirección:</b> {remito.destinatario_direccion.toUpperCase()}</p>
                    <p className="text-sm m-0"><b>Localidad:</b> {remito.destinatario_localidad.toUpperCase()}</p>
                </div>
            </div>

            {/* TABLA DE BULTOS */}
            <div className="flex-1">
                <table className="w-full text-sm border-collapse border border-gray-400 mb-2">
                    <thead>
                        <tr className="bg-gray-200 text-left border-b border-gray-400">
                            <th className="p-1 border-r border-gray-400 w-12 text-center">Cant.</th>
                            <th className="p-1 border-r border-gray-400">Detalle</th>
                            <th className="p-1 border-r border-gray-400 w-16 text-center">Bultos</th>
                            <th className="p-1 border-r border-gray-400 w-24 text-right">Val. Dec.</th>
                            <th className="p-1 w-24 text-right">Flete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {remito.remitos_items && remito.remitos_items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-400 text-center">{item.cantidad}</td>
                                <td className="p-1 border-r border-gray-400">{item.detalle}</td>
                                <td className="p-1 border-r border-gray-400 text-center">{item.bul}</td>
                                <td className="p-1 border-r border-gray-400 text-right font-mono">${item.valor_declarado.toLocaleString('es-AR')}</td>
                                <td className="p-1 text-right font-mono">${item.flete.toLocaleString('es-AR')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {remito.observaciones && (
                    <div className="text-xs text-gray-600"><b>Observaciones:</b> {remito.observaciones}</div>
                )}
            </div>

            {/* TOTALES Y FIRMA */}
            <div className="flex gap-4 mt-auto">
                <div className="flex-1 flex flex-col justify-end text-center">
                    <div className="border-t border-black pt-1 w-3/4 mx-auto">
                        <span className="text-xs uppercase block">Firma y Aclaración Remitente</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col justify-end text-center">
                    <div className="border-t border-black pt-1 w-3/4 mx-auto">
                        <span className="text-xs uppercase block">Firma y Aclaración Destinatario</span>
                        <span className="text-[10px] text-gray-500">Recibí Conforme</span>
                    </div>
                </div>

                {/* Cuadro de Cobro Final */}
                <div className="w-48 border-2 border-black rounded p-1">
                    <div className="flex justify-between border-b border-gray-300 pb-1 mb-1 text-xs">
                        <span>Flete Total:</span>
                        <span className="font-mono">${Number(remito.flete_total).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-300 pb-1 mb-1 text-xs">
                        <span>Seguro:</span>
                        <span className="font-mono">${Number(remito.seguro_total).toLocaleString('es-AR')}</span>
                    </div>
                    {Number(remito.otros_cargos) > 0 && (
                        <div className="flex justify-between border-b border-gray-300 pb-1 mb-1 text-xs">
                            <span>Otros Cargos:</span>
                            <span className="font-mono">${Number(remito.otros_cargos).toLocaleString('es-AR')}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold bg-black text-white p-1 text-sm rounded-sm mb-1 mt-1">
                        <span className="uppercase">A Cobrar:</span>
                        <span className="font-mono">${Number(remito.contra_reembolso).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="text-[10px] text-center uppercase font-bold text-gray-700 bg-gray-200">
                        {remito.tipo_flete.replace('_', ' ')}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="print-wrapper bg-white min-h-screen text-black relative">
            {/* BOTONERA FLOTANTE (No se imprime por CSS) */}
            <div className="no-print fixed top-4 right-4 flex gap-3 z-50">
                <Link to="/remitos" className="btn bg-gray-800 text-white border border-gray-600 shadow-lg px-4 flex items-center gap-2 hover:bg-gray-700">
                    <ArrowLeft size={18} /> Volver
                </Link>
                <button onClick={handlePrint} className="btn bg-[var(--primary)] text-black font-bold shadow-lg px-6 flex items-center gap-2 hover:scale-105 transition-transform" style={{ padding: '0.75rem 1.5rem' }}>
                    <Printer size={20} /> Imprimir A4
                </button>
            </div>

            {/* AREA A4 */}
            <div className="a4-page bg-white mx-auto overflow-hidden">
                <CopiaRemito titulo="ORIGINAL" />
                <CopiaRemito titulo="DUPLICADO" />
            </div>

            {/* ESTILOS DE IMPRESION INYECTADOS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .print-wrapper {
                    background-color: #525252;
                    padding: 2rem 1rem;
                }
                .a4-page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    margin: 0 auto;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    display: flex;
                    flex-direction: column;
                }
                
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-wrapper {
                        padding: 0;
                        background-color: white;
                    }
                    .a4-page {
                        width: 100%;
                        height: 100%;
                        box-shadow: none;
                        margin: 0;
                    }
                }
            `}} />
        </div>
    );
}

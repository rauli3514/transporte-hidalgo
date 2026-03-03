import Dexie from 'dexie';

export const db = new Dexie('TransporteHidalgoDB');

db.version(1).stores({
    viajes: 'id, fecha, estado',
    entregasOffline: '++id, remitoId, estado, fecha_entrega'
});

export async function saveViajesOffline(viajes) {
    try {
        await db.viajes.clear();
        await db.viajes.bulkAdd(viajes);
    } catch (error) {
        console.error('Error guardando viajes offline:', error);
    }
}

export async function getViajesOffline() {
    try {
        return await db.viajes.toArray();
    } catch (error) {
        console.error('Error obteniendo viajes offline:', error);
        return [];
    }
}

export async function registrarEntregaOffline(payload) {
    try {
        await db.entregasOffline.add(payload);
    } catch (error) {
        console.error('Error guardando entrega en caché:', error);
    }
}

export async function getEntregasPendientes() {
    try {
        return await db.entregasOffline.toArray();
    } catch (error) {
        console.error('Error leyendo entregas pendientes:', error);
        return [];
    }
}

export async function limpiarEntregaSincronizada(id) {
    try {
        await db.entregasOffline.delete(id);
    } catch (error) {
        console.error('Error borrando entrega sincronizada:', error);
    }
}

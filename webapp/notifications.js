import { exec } from 'child_process';

/**
 * Módulo de Notificaciones CAMS v3
 * Interface con KDE Connect para el Ágora Federada
 */
export const notifyDevice = (deviceId, message) => {
    return new Promise((resolve, reject) => {
        const escapedMessage = message.replace(/"/g, '\\"');
        const command = `kdeconnect-cli --device "${deviceId}" --ping-msg "${escapedMessage}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.warn(`[Notificaciones] Error al notificar dispositivo ${deviceId}:`, error.message);
                return resolve(false);
            }
            console.log(`[Notificaciones] Mensaje enviado a ${deviceId}: ${message}`);
            resolve(true);
        });
    });
};

export const notifyAllStudents = async (nodes, message) => {
    console.log(`[Notificaciones] Difundiendo aviso general a la flota...`);
    const pings = nodes
        .filter(n => n.kde_id)
        .map(n => notifyDevice(n.kde_id, message));
    return Promise.all(pings);
};

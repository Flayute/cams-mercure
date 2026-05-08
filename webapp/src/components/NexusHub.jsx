import React, { useState, useEffect } from 'react';
import './NexusHub.css';

const NexusHub = ({ onSelect }) => {
    const [piStatus, setPiStatus] = useState('offline');

    // Comprobar estado de la Raspberry Pi 500
    useEffect(() => {
        const checkPi = async () => {
            try {
                // Intentamos conectar con el API de UMA-Mercure en la Pi
                const response = await fetch('http://100.95.137.80:8000/api/health', { 
                    method: 'GET',
                    mode: 'no-cors' // Para evitar problemas de CORS en el ping rápido
                });
                setPiStatus('online');
            } catch (e) {
                setPiStatus('offline');
            }
        };

        checkPi();
        const interval = setInterval(checkPi, 30000); // Cada 30 seg
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="nexus-container">
            {/* LADO IZQUIERDO: CAMS DAY MODE */}
            <div className="nexus-side side-day" onClick={() => onSelect('cams')}>
                <div className="nexus-bg-effect"></div>
                <div className="nexus-content">
                    <h1>DÍA</h1>
                    <p>CAMS MERCURE // THERAPY & RAG</p>
                    <div className="nexus-status">
                        <div className="status-dot"></div>
                        ACER HUB: ONLINE
                    </div>
                </div>
            </div>

            {/* CENTRO: NEXUS CONTROL */}
            <div className="nexus-side side-nexus" onClick={() => onSelect('nexus')}>
                <div className="nexus-bg-effect"></div>
                <div className="nexus-content">
                    <h1>NEXUS</h1>
                    <p>ECOSYSTEM CONTROL & MONITOR</p>
                    <div className="nexus-status">
                        <div className={`status-dot ${piStatus === 'offline' ? 'offline' : ''}`}></div>
                        SATELLITES: {piStatus === 'online' ? '1 ACTIVE' : 'CONNECTING...'}
                    </div>
                    <button 
                        className="nexus-lab-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect('marketing');
                        }}
                    >
                        🚀 MARKETING LAB
                    </button>
                </div>
            </div>

            {/* LADO DERECHO: UMA NIGHT MODE */}
            <div className="nexus-side side-night" onClick={() => onSelect('uma')}>
                <div className="nexus-bg-effect"></div>
                <div className="nexus-content">
                    <h1>NOCHE</h1>
                    <p>UMA ENGINE // MUSIC ANALYSIS</p>
                    <div className="nexus-status">
                        <div className={`status-dot ${piStatus === 'offline' ? 'offline' : ''}`}></div>
                        RPi 500: {piStatus.toUpperCase()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NexusHub;

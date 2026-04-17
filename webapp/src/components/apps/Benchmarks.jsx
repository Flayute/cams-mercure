import React, { useState, useEffect } from 'react';

const Benchmarks = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState({ llm: "checking", bridge: "checking" });

    const fetchStatus = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/services/status`);
            const data = await res.json();
            setServices(data);
        } catch (e) {}
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/benchmarks`);
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error("Error fetching metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchStatus();
        const interval = setInterval(() => {
            fetchStats();
            fetchStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const avgTPS = stats.length > 0 
        ? (stats.reduce((acc, curr) => acc + curr.tps, 0) / stats.length).toFixed(2)
        : 0;

    return (
        <div className="app-module benchmarks-view">
            <div className="module-header">
                <h2>📊 Métricas y Benchmarking</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className={`chip ${services.bridge === 'running' ? 'llm' : 'stopped'}`} style={{ fontSize: '0.7rem' }}>
                        {services.bridge === 'running' ? '📡 SISTEMA ACTIVO' : '💤 SISTEMA INACTIVO'}
                    </div>
                    <div className="metric-card">
                        <small>Promedio Velocidad</small>
                        <p>{avgTPS} <span>tk/s</span></p>
                    </div>
                    <button onClick={fetchStats} className="btn-start" style={{ padding: '0 1rem' }}>🔄</button>
                </div>
            </div>

            <div className="module-content">
                <div className="metrics-list" style={{ marginTop: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', opacity: 0.6 }}>
                                <th style={{ padding: '0.8rem' }}>Fecha</th>
                                <th style={{ padding: '0.8rem' }}>Agente</th>
                                <th style={{ padding: '0.8rem' }}>Consulta</th>
                                <th style={{ padding: '0.8rem' }}>Tiem.</th>
                                <th style={{ padding: '0.8rem' }}>Velo.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.length === 0 && !loading && (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No hay datos registrados aún. Lanza un agente primero.</td></tr>
                            )}
                            {stats.map((m, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(m.timestamp).toLocaleTimeString()}</td>
                                    <td style={{ padding: '0.8rem' }}><span className={`chip ${m.agent}`} style={{ fontSize: '0.7rem' }}>{m.agent.toUpperCase()}</span></td>
                                    <td style={{ padding: '0.8rem', opacity: 0.8 }}>{m.query}...</td>
                                    <td style={{ padding: '0.8rem' }}>{m.duration}s</td>
                                    <td style={{ padding: '0.8rem', fontWeight: 'bold', color: m.tps > 25 ? '#4a6741' : '#666' }}>{m.tps} tk/s</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="metrics-info-box" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9f8', borderRadius: '12px', border: '1px solid #eee' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>💡 Sobre estas métricas</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#666', lineHeight: '1.5rem' }}>
                        <li><strong>tk/s:</strong> Tokens por segundo estimados. Representa la "capacidad de razonamiento" bruta de tu hardware local.</li>
                        <li><strong>Tiem.:</strong> Latencia total desde que envías la pregunta hasta que recibes la destilación completa.</li>
                        <li><strong>Contexto:</strong> El rendimiento puede bajar si el contexto indexado (Wiki/Ágora) es muy extenso.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Benchmarks;

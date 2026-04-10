import React, { useState, useEffect } from 'react';
import './TradingDashboard.css';

const TradingDashboard = () => {
    // Estados para los 3 bots
    const [hybridState, setHybridState] = useState(null);
    const [futuresState, setFuturesState] = useState(null);
    const [martingaleState, setMartingaleState] = useState(null);

    const [selectedBot, setSelectedBot] = useState('HYBRID'); // HYBRID, FUTURES, MARTINGALE
    const [activityLog, setActivityLog] = useState([]);
    const [aiReport, setAiReport] = useState(null);

    // IP de Tailscale de WSL2 (donde corren los bots)
    const RPI_API = 'http://100.66.213.48:5000';

    useEffect(() => {
        const fetchData = async () => {
            try { // Main try block for fetchData
                // Hybrid (API original)
                const resHybrid = await fetch(`${RPI_API}/api/status`);
                setHybridState(await resHybrid.json());

                // Futures (Nuevo endpoint)
                try {
                    const resFutures = await fetch(`${RPI_API}/api/status/futures`);
                    if (resFutures.ok) setFuturesState(await resFutures.json());
                } catch (e) {
                    console.warn("Futures data not available");
                }

                // Martingale (Nuevo endpoint)
                try {
                    const resMartingale = await fetch(`${RPI_API}/api/status/martingale`);
                    if (resMartingale.ok) setMartingaleState(await resMartingale.json());
                } catch (e) {
                    console.warn("Martingale data not available");
                }

                // Logs unificados
                const resLogs = await fetch(`${RPI_API}/api/activity`);
                setActivityLog(await resLogs.json());

                // Reporte IA
                try {
                    const resReport = await fetch(`${RPI_API}/api/report`);
                    if (resReport.ok) {
                        const reportData = await resReport.json();
                        setAiReport(reportData.report);
                    }
                } catch (e) {
                    console.warn("AI Report not available");
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        const interval = setInterval(fetchData, 3000); // Polling cada 3s para evitar congelamiento
        fetchData(); // Primera llamada inmediata
        return () => clearInterval(interval);
    }, []);

    const getActiveBotState = () => {
        let state = {};
        switch (selectedBot) {
            case 'HYBRID':
                state = hybridState;
                break;
            case 'FUTURES':
                state = futuresState;
                if (state) state.balance_display = state.balance;
                break;
            case 'MARTINGALE':
                state = martingaleState;
                // Mapeo específico para Martingala
                if (state) {
                    state.balance_display = state.equity; // Mostrar Equity como balance total
                    state.currentPosition = {
                        type: state.invested > 0 ? 'LONG (DCA)' : 'WAITING',
                        entry_price: state.avgPrice,
                        currentPrice: state.avgPrice, // Falta precio actual en JSON
                        pnl: state.totalReturn, // O latente
                        amount: state.invested
                    };
                }
                break;
            default:
                state = hybridState;
        }
        return state || {};
    };

    const currentState = getActiveBotState() || {};

    const getStatusColor = () => {
        if (currentState.isPaused) return '#f59e0b'; // Naranja
        if (currentState.isRunning) return '#10b981'; // Verde
        return '#ef4444'; // Rojo
    };

    return (
        <div className="trading-dashboard">
            {/* Header con Selector de Bots */}
            <header className="dashboard-header">
                <div className="bot-selector">
                    <button
                        className={selectedBot === 'HYBRID' ? 'active' : ''}
                        onClick={() => setSelectedBot('HYBRID')}
                    >
                        🤖 SPOT HYBRID
                    </button>
                    <button
                        className={selectedBot === 'FUTURES' ? 'active' : ''}
                        onClick={() => setSelectedBot('FUTURES')}
                    >
                        🚀 FUTURES 2X
                    </button>
                    <button
                        className={selectedBot === 'MARTINGALE' ? 'active' : ''}
                        onClick={() => setSelectedBot('MARTINGALE')}
                    >
                        🐜 MARTINGALE
                    </button>
                </div>

                <div className="bot-status" style={{ backgroundColor: getStatusColor() }}>
                    {!currentState.isRunning && '⏹️ Detenido'}
                    {currentState.isRunning && !currentState.isPaused && '▶️ Activo'}
                    {currentState.isPaused && '⏸️ Pausado'}
                </div>
            </header>

            {/* AI Supervisor Insight */}
            <div className="ai-insight-panel">
                <h3>🧠 SUPERVISOR AI INSIGHT</h3>
                <p>{aiReport || "Analizando mercado y comportamiento de bots... (Esperando reporte de Ollama)"}</p>
            </div>

            <main className="dashboard-grid">
                {/* Panel Principal: P&L y Balance */}
                <div className="card balance-card">
                    <h2>Balance Total (Equity)</h2>
                    <div className="big-number">
                        ${(currentState.balance_display || currentState.balance)?.toFixed(2) || '---'}
                        <span className="currency">USDT</span>
                    </div>
                    <div className={`profit-indicator ${currentState.totalReturn >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                        {currentState.totalReturn >= 0 ? '▲' : '▼'} {currentState.totalReturn?.toFixed(2)}%
                    </div>
                </div>

                {/* Posición Actual */}
                <div className="card position-card">
                    <h2>Posición Actual</h2>
                    {currentState.currentPosition ? (
                        <div className="position-details">
                            <div className="pos-type" data-type={currentState.currentPosition.type}>
                                {currentState.currentPosition.type}
                            </div>
                            <div className="pos-stats">
                                <div className="stat-row">
                                    <span>Entrada:</span>
                                    <span>${currentState.currentPosition.entry_price?.toFixed(2)}</span>
                                </div>
                                <div className="stat-row">
                                    <span>Actual:</span>
                                    <span>${currentState.currentPosition.currentPrice?.toFixed(2)}</span>
                                </div>
                                <div className="stat-row pnl">
                                    <span>P&L:</span>
                                    <span className={currentState.currentPosition.pnl >= 0 ? 'text-green' : 'text-red'}>
                                        {currentState.currentPosition.pnl?.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-position">
                            <span className="pulse-dot"></span>
                            Buscando oportunidades...
                        </div>
                    )}
                </div>

                {/* Activity Log */}
                <div className="card log-card">
                    <h2>📋 Actividad Reciente</h2>
                    <div className="log-list">
                        {activityLog.map((log, index) => (
                            <div key={index} className={`log-item ${log.type}`}>
                                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className="log-msg">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="dashboard-footer">
                <small>APEX v2.0 | Multi-Strategy Architecture | Powered by Ollama</small>
            </footer>
        </div>
    );
};

export default TradingDashboard;

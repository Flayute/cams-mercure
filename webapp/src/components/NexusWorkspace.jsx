import React, { useState, useEffect } from 'react';
import './NexusWorkspace.css';

const NexusWorkspace = () => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [command, setCommand] = useState('');
    const [cmdResult, setCmdResult] = useState(null);

    const fetchStatus = async () => {
        try {
            const response = await fetch('http://127.0.0.1:3001/ecosystem/status');
            const data = await response.json();
            setNodes(data.nodes);
            setLoading(false);
        } catch (e) {
            console.error("Error fetching ecosystem status:", e);
        }
    };

    const runCommand = async (target, cmd) => {
        setLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:3001/ecosystem/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target, command: cmd })
            });
            const data = await response.json();
            setCmdResult(data);
        } catch (e) {
            setCmdResult({ status: 'error', message: e.toString() });
        }
        setLoading(false);
        fetchStatus();
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="nexus-workspace fade-in">
            <header className="workspace-header">
                <div className="header-title">
                    <h1>MERCURE NEXUS <span>CONTROL</span></h1>
                    <p>ECOSYSTEM ORCHESTRATOR v1.0</p>
                </div>
                <button className="refresh-btn" onClick={fetchStatus}>🔄 Sync</button>
            </header>

            <div className="nodes-grid">
                {nodes.map(node => (
                    <div key={node.name} className={`node-card ${node.status}`}>
                        <div className="node-header">
                            <span className="node-icon">{node.name.includes('PI') ? '🛰️' : '🏛️'}</span>
                            <div className="node-info">
                                <h3>{node.name}</h3>
                                <span className="node-status-label">{node.status.toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="node-stats">
                            <div className="stat">
                                <label>CPU</label>
                                <div className="stat-bar"><div style={{width: node.cpu}}></div></div>
                                <span>{node.cpu}</span>
                            </div>
                            <div className="stat">
                                <label>RAM</label>
                                <div className="stat-bar"><div style={{width: node.ram}}></div></div>
                                <span>{node.ram}</span>
                            </div>
                            {node.mode && (
                                <div className="node-mode">
                                    MODE: <span>{node.mode}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="command-center">
                <div className="card-header">
                    <h2>TERMINAL SSH REMOTA (PI-500)</h2>
                </div>
                <div className="command-input-group">
                    <input 
                        type="text" 
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="Ej: ./pi-agent.sh o lsusb..."
                        onKeyDown={(e) => e.key === 'Enter' && runCommand('pi', command)}
                    />
                    <button onClick={() => runCommand('pi', command)} disabled={loading}>
                        {loading ? '...' : 'EJECUTAR'}
                    </button>
                </div>
                {cmdResult && (
                    <div className={`cmd-result-container ${cmdResult.status}`}>
                        <div className="cmd-status-bar">
                            STATUS: {cmdResult.status.toUpperCase()}
                        </div>
                        <pre className="cmd-output">
                            {cmdResult.stdout || cmdResult.stderr || "Comando ejecutado (sin salida de texto)."}
                        </pre>
                    </div>
                )}
            </div>

            <div className="quick-actions">
                <h3>HERMES SKILL STORE (HABILIDADES DEL ECOSISTEMA)</h3>
                <div className="actions-btns">
                    {/* Estas se cargarán dinámicamente en el futuro, por ahora las mapeamos */}
                    <button onClick={() => runCommand('acer', 'bash ./skills/pi_monitor.sh')}>🛰️ Auditoría de Satélite</button>
                    <button onClick={() => runCommand('acer', 'python3 ./bridge/engine.py --reindex')}>🧠 Reindexar Caveman</button>
                    <button onClick={() => runCommand('pi', 'rm -rf /tmp/*')}>🧹 Limpiar Temporales Pi</button>
                </div>
            </div>
        </div>
    );
};

export default NexusWorkspace;

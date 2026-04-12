import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const AgoraConsole = () => {
    const [topic, setTopic] = useState("");
    const [agoraLog, setAgoraLog] = useState("");
    const [nodes, setNodes] = useState([]);
    const [cycles, setCycles] = useState(1);

    useEffect(() => {
        const fetchNodes = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:3001/api/agora/nodes`);
                const data = await res.json();
                setNodes(data.nodes);
            } catch (e) {}
        };
        const fetchLatestLog = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:3001/api/agora/latest`);
                const data = await res.json();
                if (data.content) setAgoraLog(data.content);
            } catch (e) {}
        };

        fetchNodes();
        fetchLatestLog();
        
        const nInterval = setInterval(fetchNodes, 5000);
        const lInterval = setInterval(fetchLatestLog, 3000);
        
        return () => {
            clearInterval(nInterval);
            clearInterval(lInterval);
        };
    }, []);

    const triggerAgora = async () => {
        if (!topic) return;
        try {
            await fetch(`http://${window.location.hostname}:3001/api/agora/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, cycles })
            });
            alert(`🏛️ Ágora Cuántica iniciada (${cycles} ciclo/s). El engrama comienza a destilar...`);
        } catch (e) {
            alert("Error al iniciar el Ágora.");
        }
    };

    const saveToObsidian = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/agora/save-note`, { method: 'POST' });
            const data = await res.json();
            if (data.status === "success") {
                alert("✅ Debate guardado en Obsidian:\n" + data.path);
            } else {
                alert("❌ Error al guardar: " + data.error);
            }
        } catch (e) {
            alert("Error de conexión al guardar.");
        }
    };

    return (
        <div className="app-module agora-module fade-in">
            <div className="module-header">
                <h2>🏛️ Ágora Cuántica v5.0</h2>
                <div className="agora-controls">
                    <input 
                        type="text" 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)} 
                        placeholder="Proponer tema para el diálogo cuántico..."
                    />
                    <div className="cycle-selector" title={cycles > 2 ? '⚠️ Cada ciclo consume contexto adicional' : 'Ciclos de refinamiento'}>
                        <label style={{ fontSize: '0.7rem', opacity: 0.5, marginRight: '0.4rem' }}>CICLOS</label>
                        <select value={cycles} onChange={(e) => setCycles(parseInt(e.target.value))} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <option key={n} value={n}>{n}{n > 2 ? ' ⚠️' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={triggerAgora} className="btn-agora">Iniciar</button>
                    <button onClick={saveToObsidian} className="btn-save-note" title="Guardar en notas">&#x1F4BE; Guardar</button>
                </div>
            </div>

            <div className="agora-layout">
                <div className="agora-display">
                    {agoraLog ? (
                        <div className="markdown-body">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{agoraLog}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="agora-empty">
                            <p>Esperando la sesión diaria (10:00 AM)...</p>
                            <small>En el Ágora, los nodos satélite debaten temas complejos coordinados por el Maestro.</small>
                        </div>
                    )}
                </div>

                <div className="nodes-sidebar">
                    <h3 style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem' }}>FLOTA TAILSCALE</h3>
                    {nodes.map(node => (
                        <div key={node.id} className={`node-card ${node.ip === '100.X.Y.Z' ? 'offline' : 'online'}`}>
                            <h4>{node.name}</h4>
                            <small>{node.ip !== '100.X.Y.Z' ? node.ip : 'Desconectado'}</small>
                            <div className="node-role">{node.role.toUpperCase()}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AgoraConsole;

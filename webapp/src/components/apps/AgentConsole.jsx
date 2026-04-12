import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const AgentConsole = () => {
    const [query, setQuery] = useState("");
    const [agent, setAgent] = useState("bibliotecario");
    const [sessionMode, setSessionMode] = useState(false);
    const [response, setResponse] = useState(() => {
        return localStorage.getItem('cams-last-response') || "";
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [services, setServices] = useState({ llm: "checking", bridge: "checking" });
    const [models, setModels] = useState({});
    const [selectedModel, setSelectedModel] = useState("qwen35-9b");
    const [selectedFile, setSelectedFile] = useState(null);
    const [wikiPath, setWikiPath] = useState("");
    const [wikiFolders, setWikiFolders] = useState([]);
    const [wikiScanStatus, setWikiScanStatus] = useState(null);
    const [showWikiPanel, setShowWikiPanel] = useState(false);
    const fileInputRef = useRef(null);
    const responseRef = useRef(null);
    const [lastSentQuery, setLastSentQuery] = useState("");

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:3001/api/services/status`);
                const data = await res.json();
                setServices(data);
            } catch (e) {
                setServices({ llm: "error", bridge: "error" });
            }
        };

        const fetchModels = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:3001/api/services/models`);
                const data = await res.json();
                setModels(data);
            } catch (e) {}
        };

        const fetchWikiFolders = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:3001/api/wiki/folders`);
                const data = await res.json();
                setWikiFolders(data.folders || []);
            } catch (e) {}
        };

        fetchStatus();
        fetchModels();
        fetchWikiFolders();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Persistir respuesta en localStorage como capa extra de seguridad
    useEffect(() => {
        if (response) localStorage.setItem('cams-last-response', response);
    }, [response]);

    const startService = async () => {
        setLoading(true);
        try {
            await fetch(`http://${window.location.hostname}:3001/api/services/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelId: selectedModel })
            });
        } catch (e) {
            setError("Error al iniciar motores.");
        } finally {
            setLoading(false);
        }
    };

    const stopService = async () => {
        setLoading(true);
        try {
            await fetch(`http://${window.location.hostname}:3001/api/services/stop`, { method: 'POST' });
        } catch (e) {
            setError("Error al detener motores.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };

    const handleSend = async (intent = "fast") => {
        if (!query.trim() && !selectedFile) return;
        if (loading) return;
        if (services.bridge !== "running") {
            setError("El Bridge no está activo. Enciende los motores primero.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let payload = {
                query: query,
                agent: agent,
                session_mode: sessionMode,
                persistence: intent
            };

            if (selectedFile) {
                const reader = new FileReader();
                reader.readAsDataURL(selectedFile);
                reader.onload = async () => {
                    payload.file = {
                        name: selectedFile.name,
                        data: reader.result,
                        type: selectedFile.type
                    };
                    await executeQuery(payload);
                };
            } else {
                await executeQuery(payload);
            }
        } catch (err) {
            setError("Error en la consulta. Revisa los servicios.");
        } finally {
            setLoading(false);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const executeQuery = async (payload) => {
        setLastSentQuery(payload.query);
        const endpoint = `http://${window.location.hostname}:3001/api/agent/query`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setResponse(data.response);
        setQuery("");
    };

    // Recuperar la última respuesta del backup si la pantalla está vacía
    const recoverFromBackup = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/agent/backup/${agent}`);
            const data = await res.json();
            if (data.content) {
                setResponse(data.content);
                setError(null);
            } else {
                setError("Sin backup para este modo todavía.");
            }
        } catch (e) {
            setError("No se pudo recuperar el backup.");
        }
    };

    const handleSaveResponse = async () => {
        try {
            const cleanTitle = lastSentQuery.substring(0, 30).replace(/[/\\?%*:|"<>]/g, '-').trim() || "Respuesta-IA";
            const res = await fetch(`http://${window.location.hostname}:3001/api/blog/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: response, title: cleanTitle, agent: agent })
            });
            if (res.ok) alert("✅ Respuesta guardada en tu bóveda");
            else alert("❌ Error al guardar");
        } catch (err) {
            alert("❌ No se pudo conectar con el servidor");
        }
    };

    const handleWikiScan = async () => {
        if (!wikiPath.trim()) return;
        setWikiScanStatus("scanning");
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/wiki/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath: wikiPath.trim() })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setWikiScanStatus(`✅ ${data.files} archivos indexados`);
                setWikiFolders(prev => [...prev.filter(f => f.path !== data.folder), { path: data.folder, files: data.files, scanned: new Date().toISOString() }]);
                setWikiPath("");
            } else {
                setWikiScanStatus("❌ " + (data.error || "Error desconocido"));
            }
        } catch (e) {
            setWikiScanStatus("❌ Error de conexión");
        }
    };

    const handleWikiRemove = async (folderPath) => {
        await fetch(`http://${window.location.hostname}:3001/api/wiki/folders`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath })
        });
        setWikiFolders(prev => prev.filter(f => f.path !== folderPath));
    };

    return (
        <div className={`app-module agent-console ${agent === 'explorador' ? 'explorer-mode' : ''}`}>
            <div className="module-header agent-header">
                {/* Panel de Control de Servicios */}
                <div className="service-orchestrator">
                    <div className="status-chips">
                        <span className={`chip ${services.llm}`}>LLM: {services.llm.toUpperCase()}</span>
                        <span className={`chip ${services.bridge}`}>BRIDGE: {services.bridge.toUpperCase()}</span>
                    </div>
                    <div className="service-actions">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="model-picker"
                            disabled={services.llm === "running"}
                        >
                            {Object.entries(models).map(([id, m]) => (
                                <option key={id} value={id}>{m.name}</option>
                            ))}
                        </select>
                        {services.llm === "running" ? (
                            <button onClick={stopService} className="btn-stop">Detener</button>
                        ) : (
                            <button onClick={startService} className="btn-start">Encender Cerebro</button>
                        )}
                        <button
                            onClick={() => setShowWikiPanel(v => !v)}
                            className="btn-start"
                            title="Gestionar carpetas del Wiki LLM"
                            style={{ background: showWikiPanel ? '#2c3e50' : undefined }}
                        >
                            📁 Wiki
                        </button>
                    </div>
                </div>

                <div className="agent-identity">
                    <div className={`agent-icon ${agent}`}>
                        {agent === 'bibliotecario' ? '📚' :
                         agent === 'investigador' ? '🔍' :
                         agent === 'explorador' ? '🧭' :
                         agent === 'arquitecto' ? '💻' : '🎙️'}
                    </div>
                    <div className="agent-meta">
                        <h2>
                            {agent === 'bibliotecario' ? 'El Bibliotecario' :
                             agent === 'investigador' ? 'El Investigador' :
                             agent === 'explorador' ? 'El Explorador' :
                             agent === 'arquitecto' ? 'Arquitecto IT' : 'Debate Socrático'}
                        </h2>
                    </div>
                </div>

                <div className="console-controls">
                    <select
                        value={agent}
                        onChange={(e) => setAgent(e.target.value)}
                        className="agent-selector"
                    >
                        <option value="bibliotecario">📚 Bibliotecario</option>
                        <option value="investigador">🔍 Investigador</option>
                        <option value="explorador">🧭 Explorador</option>
                        <option value="arquitecto">💻 Arquitecto IT</option>
                        <option value="debate">🎙️ Debate Socrático</option>
                    </select>

                    <label className="session-toggle">
                        <input
                            type="checkbox"
                            checked={sessionMode}
                            onChange={(e) => setSessionMode(e.target.checked)}
                        />
                        <span>Modo Sesión</span>
                    </label>
                </div>
            </div>

            {/* Panel Wiki LLM */}
            {showWikiPanel && (
                <div className="wiki-panel fade-in" style={{
                    background: '#f8f9f8', borderBottom: '1px solid #eee',
                    padding: '1rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem'
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={wikiPath}
                            onChange={e => setWikiPath(e.target.value)}
                            placeholder="Ruta de carpeta: /home/user/Documentos/MisNotas"
                            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                            onKeyDown={e => e.key === 'Enter' && handleWikiScan()}
                        />
                        <button onClick={handleWikiScan} className="btn-start" style={{ whiteSpace: 'nowrap' }}>
                            🔍 Escanear
                        </button>
                    </div>
                    {wikiScanStatus && (
                        <small style={{ color: wikiScanStatus.startsWith('✅') ? '#4a6741' : '#c00' }}>
                            {wikiScanStatus}
                        </small>
                    )}
                    {wikiFolders.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {wikiFolders.map(f => (
                                <span key={f.path} style={{
                                    background: '#e8f0e8', borderRadius: '20px', padding: '0.3rem 0.8rem',
                                    fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}>
                                    📁 {f.path.split('/').pop()} <em style={{ opacity: 0.6 }}>({f.files} md)</em>
                                    <button onClick={() => handleWikiRemove(f.path)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: '0.8rem' }}>✕</button>
                                </span>
                            ))}
                        </div>
                    )}
                    <small style={{ opacity: 0.5, fontSize: '0.7rem' }}>
                        Las carpetas escaneadas se añaden al contexto RAG del Bibliotecario e Investigador. Compatible con Obsidian, Logseq, Joplin y cualquier vault .md.
                    </small>
                </div>
            )}

            <div className="module-content console-content">
                <div className="response-area" ref={responseRef}>
                    {response ? (
                        <div className="markdown-body fade-in">
                            <div className="response-actions-top">
                                <button onClick={handleSaveResponse} className="btn-save-note">
                                    💾 Guardar ({agent})
                                </button>
                            </div>
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{response}</ReactMarkdown>
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            {error}
                            <button onClick={recoverFromBackup} style={{
                                display: 'block', marginTop: '0.8rem',
                                background: '#f0f0f0', border: 'none', borderRadius: '8px',
                                padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem'
                            }}>
                                🔄 Recuperar última respuesta ({agent})
                            </button>
                        </div>
                    ) : (
                        <div className="console-welcome">
                            <p>CAMS Mercure ⚗️</p>
                            <small>Enciende los motores e inicia tu activación neuronal.</small>
                            <button onClick={recoverFromBackup} style={{
                                display: 'block', marginTop: '1rem',
                                background: 'transparent', border: '1px solid #ddd',
                                borderRadius: '8px', padding: '0.4rem 1rem',
                                cursor: 'pointer', fontSize: '0.75rem', color: '#888'
                            }}>
                                🔄 Recuperar respuesta anterior
                            </button>
                        </div>
                    )}
                </div>

                {selectedFile && (
                    <div className="file-preview-bar fade-in">
                        <span>📎 {selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)}>✕</button>
                    </div>
                )}

                <form className="input-area" onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button type="button" className="btn-attach" onClick={() => fileInputRef.current.click()}>
                        📎
                    </button>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={agent === 'explorador' ? "Explora rápido..." : `Consulta al ${agent}...`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend("fast");
                            }
                        }}
                    />
                    <div className="send-actions">
                        <button
                            type="button"
                            className="btn-send fast"
                            title="Consulta Volátil"
                            onClick={() => handleSend("fast")}
                            disabled={loading || (!query.trim() && !selectedFile) || services.bridge !== 'running'}
                        >
                            {loading ? '...' : '⚡'}
                        </button>
                        <button
                            type="button"
                            className="btn-send mem"
                            title="Añadir a Memoria y Consultar"
                            onClick={() => handleSend("mem")}
                            disabled={loading || (!query.trim() && !selectedFile) || services.bridge !== 'running'}
                        >
                            🧠
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgentConsole;

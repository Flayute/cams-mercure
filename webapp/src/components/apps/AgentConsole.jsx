import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const AgentConsole = ({ agent, setAgent, state, updateState, isQuerying, setIsQuerying, onAbort }) => {
    const [query, setQuery] = useState("");
    const [sessionMode, setSessionMode] = useState(false);
    const [error, setError] = useState(null);
    const [services, setServices] = useState({ llm: "checking", bridge: "checking" });
    const [models, setModels] = useState({});
    const [selectedModel, setSelectedModel] = useState("qwen35-9b");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [wikiPath, setWikiPath] = useState("");
    const [wikiFolders, setWikiFolders] = useState([]);
    const [wikiScanStatus, setWikiScanStatus] = useState(null);
    const [showWikiPanel, setShowWikiPanel] = useState(false);
    const fileInputRef = useRef(null);
    const responseRef = useRef(null);
    const abortControllerRef = useRef(null);

    const response = state.response;
    const lastSentQuery = state.lastQuery;
    const lastMetrics = state.metrics;

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

    useEffect(() => {
        fetchStatus();
        fetchModels();
        fetchWikiFolders();

        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const startService = async () => {
        setIsQuerying(true);
        try {
            await fetch(`http://${window.location.hostname}:3001/api/services/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelId: selectedModel })
            });
        } catch (e) {
            setError("Error al iniciar motores.");
        } finally {
            setIsQuerying(false);
        }
    };

    const stopService = async () => {
        setIsQuerying(true);
        try {
            await fetch(`http://${window.location.hostname}:3001/api/services/stop`, { method: 'POST' });
        } catch (e) {
            setError("Error al detener motores.");
        } finally {
            setIsQuerying(false);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
    };

    const handleSend = async (intent = "fast") => {
        if (!query.trim() && selectedFiles.length === 0) return;
        if (isQuerying) return;
        if (services.bridge !== "running") {
            setError("El Bridge no está activo. Enciende los motores primero.");
            return;
        }

        setIsQuerying(true);
        setError(null);

        try {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();

            const fileDataPromises = selectedFiles.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve({
                        name: file.name,
                        data: reader.result,
                        type: file.type
                    });
                });
            });

            const encodedFiles = await Promise.all(fileDataPromises);

            let payload = {
                query: query,
                agent: agent,
                session_mode: sessionMode,
                persistence: intent,
                sessionId: 'main-console',
                files: encodedFiles
            };

            await executeQuery(payload, abortControllerRef.current.signal);
        } catch (err) {
            if (err.name === 'AbortError') return;
            setError("Error en la consulta. Revisa los servicios.");
        } finally {
            setIsQuerying(false);
            setSelectedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleAbortLocal = async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        await onAbort();
        setError("Consulta cancelada por el usuario.");
    };

    const executeQuery = async (payload, signal) => {
        updateState({ lastQuery: payload.query });
        const endpoint = `http://${window.location.hostname}:3001/api/agent/query`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        updateState({ 
            response: data.response,
            metrics: data.metrics || null
        });
        setQuery("");
    };

    // Recuperar la última respuesta del backup si la pantalla está vacía
    const recoverFromBackup = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/agent/backup/${agent}`);
            const data = await res.json();
            if (data.content) {
                updateState({ response: data.content });
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

    const handlePickDirectory = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/system/pick-directory`);
            const data = await res.json();
            if (data.path) {
                setWikiPath(data.path);
            }
        } catch (e) {}
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
                        {/* Métricas movidas al área de respuesta para mayor visibilidad */}
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
                        <button onClick={handlePickDirectory} className="btn-start" style={{ background: '#eee', color: '#333' }}>
                            📁 Buscar
                        </button>
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
                                {lastMetrics && (
                                    <div className="metrics-hud fade-in" style={{
                                        display: 'flex', gap: '15px', padding: '5px 15px',
                                        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(5px)',
                                        borderRadius: '20px', fontSize: '0.75rem', color: '#4a6741',
                                        border: '1px solid #e8f0e8', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                        marginRight: 'auto'
                                    }}>
                                        <span>⏱️ {lastMetrics.duration}s</span>
                                        <span>⚡ {lastMetrics.tps} tk/s</span>
                                        <span>🧠 {lastMetrics.tokens} tokens</span>
                                    </div>
                                )}
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

                {selectedFiles.length > 0 && (
                    <div className="file-preview-bar fade-in" style={{ flexWrap: 'wrap', gap: '5px' }}>
                        {selectedFiles.map((file, idx) => (
                            <div key={idx} style={{ background: '#f0f4f0', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>📎 {file.name}</span>
                                <button onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'transparent', margin: 0, padding: 0 }}>✕</button>
                            </div>
                        ))}
                    </div>
                )}

                <form className="input-area" onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        multiple
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
                        {isQuerying ? (
                            <button
                                type="button"
                                className="btn-send"
                                style={{ background: '#c00' }}
                                onClick={handleAbortLocal}
                                title="Detener Consulta"
                            >
                                🛑
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="btn-send fast"
                                    title="Consulta Volátil"
                                    onClick={() => handleSend("fast")}
                                    disabled={isQuerying || (!query.trim() && selectedFiles.length === 0) || services.bridge !== 'running'}
                                >
                                    ⚡
                                </button>
                                <button
                                    type="button"
                                    className="btn-send mem"
                                    title="Añadir a Memoria y Consultar"
                                    onClick={() => handleSend("mem")}
                                    disabled={isQuerying || (!query.trim() && selectedFiles.length === 0) || services.bridge !== 'running'}
                                >
                                    🧠
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgentConsole;

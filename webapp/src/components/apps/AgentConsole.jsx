import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const AgentConsole = ({ agent, setAgent, state, updateState, isQuerying, setIsQuerying, onAbort, onProject, hideSidebar = false }) => {
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
    const [contextSize, setContextSize] = useState(32768);
    const [useDraft, setUseDraft] = useState(false);
    const [thinking, setThinking] = useState(false);
    const [sessionActive, setSessionActive] = useState(false);
    const [activeClient, setActiveClient] = useState(null);
    const [allClients, setAllClients] = useState([]);
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
            // Sincronizar selección inicial si el modelo por defecto no existe en la lista nueva
            if (Object.keys(data).length > 0 && !data[selectedModel]) {
                setSelectedModel(Object.keys(data)[0]);
            }
        } catch (e) {}
    };

    const fetchWikiFolders = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/wiki/folders`);
            const data = await res.json();
            setWikiFolders(data.folders || []);
        } catch (e) {}
    };

    const fetchSessionStatus = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/session/status`);
            const data = await res.json();
            setSessionActive(data.active);
        } catch (e) {}
    };

    const fetchActiveClient = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/session/active-client`);
            const data = await res.json();
            if (data.activeClient) {
                const cRes = await fetch(`http://${window.location.hostname}:3001/api/clients`);
                const cData = await cRes.json();
                setAllClients(cData);
                const client = cData.find(c => c.id === data.activeClient);
                setActiveClient(client);
            } else {
                setActiveClient(null);
                // Si no hay activo, igualmente cargar la lista para el selector
                const cRes = await fetch(`http://${window.location.hostname}:3001/api/clients`);
                const cData = await cRes.json();
                setAllClients(cData);
            }
        } catch (e) {}
    };

    const handleQuickSwitchCase = async (clientId) => {
        if (!clientId) {
            setActiveClient(null);
            await fetch(`http://${window.location.hostname}:3001/api/session/active-client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: null })
            });
        } else {
            const client = allClients.find(c => c.id === clientId);
            setActiveClient(client);
            await fetch(`http://${window.location.hostname}:3001/api/session/active-client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: clientId })
            });
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchModels();
        fetchWikiFolders();
        fetchSessionStatus();
        fetchActiveClient();

        // Solo hacer polling de servicios si la UI técnica está visible
        if (!hideSidebar) {
            const interval = setInterval(() => {
                fetchStatus();
                fetchSessionStatus();
            }, 5000);
            return () => clearInterval(interval);
        }
        // Si hideSidebar, solo actualizar el cliente activo periódicamente
        const interval = setInterval(() => {
            fetchActiveClient();
        }, 10000);
        return () => clearInterval(interval);
    }, [hideSidebar]);

    const startService = async () => {
        setIsQuerying(true);
        try {
            await fetch(`http://${window.location.hostname}:3001/api/services/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelId: selectedModel, context: contextSize, useDraft })
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
        if (!hideSidebar && services.bridge !== "running") {
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
                files: encodedFiles,
                thinking: thinking
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
        fetchSessionStatus();
    };

    const handleDiscardSession = async () => {
        if (!confirm("¿Seguro que quieres descartar el Wiki efímero de esta sesión?")) return;
        try {
            await fetch(`http://${window.location.hostname}:3001/api/session/discard`, { method: 'POST' });
            setSessionActive(false);
            alert("🧹 Memoria de sesión limpiada.");
        } catch (e) {
            alert("❌ Error al descartar");
        }
    };

    const handleIndexSession = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/session/index`, { method: 'POST' });
            const data = await res.json();
            if (data.status === 'indexed') {
                setSessionActive(false);
                alert(`✅ Sesión indexada en: ${data.path}`);
            } else {
                alert("❌ " + (data.error || "Error al indexar"));
            }
        } catch (e) {
            alert("❌ Error de conexión");
        }
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

    const handleAppendHistory = async () => {
        if (!activeClient) {
            alert("⚠️ Selecciona un Proyecto/Cliente en el Session Master primero.");
            return;
        }
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/client/append-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: activeClient.id, content: response })
            });
            if (res.ok) alert(`✅ Integrado en el historial de ${activeClient.name}`);
            else alert("❌ Error al integrar en el historial");
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
                    {!hideSidebar && (
                        <div className="status-chips">
                            <span className={`chip ${services.llm}`}>LLM: {services.llm.toUpperCase()}</span>
                            <span className={`chip ${services.bridge}`}>BRIDGE: {services.bridge.toUpperCase()}</span>
                        </div>
                    )}
                    <div className="service-actions" style={{ alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            {!hideSidebar && (
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="model-picker"
                                        disabled={services.llm === "running"}
                                        style={{ flex: 1 }}
                                    >
                                        {Object.entries(models).map(([id, m]) => (
                                            <option key={id} value={id}>{m.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={contextSize}
                                        onChange={(e) => setContextSize(Number(e.target.value))}
                                        className="model-picker-mini"
                                        disabled={services.llm === "running"}
                                        style={{ 
                                            width: '80px', padding: '0.3rem', borderRadius: '6px', 
                                            border: '1px solid #ddd', fontSize: '0.7rem', 
                                            color: '#4a6741', fontWeight: 'bold'
                                        }}
                                        title="Límite de Contexto (Tokens)"
                                    >
                                        <option value={8192}>8k</option>
                                        <option value={16384}>16k</option>
                                        <option value={32768}>32k</option>
                                        <option value={65536}>64k</option>
                                        <option value={131072}>128k</option>
                                    </select>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                <select
                                    value={agent}
                                    onChange={(e) => setAgent(e.target.value)}
                                    className="agent-selector"
                                    style={{ flex: 1 }}
                                >
                                    <option value="bibliotecario">📚 BIB</option>
                                    <option value="investigador">🔍 INV</option>
                                    <option value="explorador">🧭 EXP</option>
                                    <option value="arquitecto">💻 ARQ</option>
                                    <option value="heraldo">📣 HER</option>
                                    <option value="cartografo">🗺️ CAR</option>
                                    <option value="debate">🎙️ JUN</option>
                                </select>
                                <select 
                                    className="case-quick-selector"
                                    value={activeClient?.id || ""}
                                    onChange={(e) => handleQuickSwitchCase(e.target.value)}
                                    style={{ 
                                        padding: '0.4rem', fontSize: '0.75rem', borderRadius: '8px', 
                                        border: '1px solid #e8f0e8',
                                        background: activeClient ? '#e8f0e8' : '#fff',
                                        color: activeClient ? '#4a6741' : '#666',
                                        fontWeight: activeClient ? 'bold' : 'normal',
                                        maxWidth: '120px'
                                    }}
                                >
                                    <option value="">🚫 Sin Caso</option>
                                    {allClients.map(c => (
                                        <option key={c.id} value={c.id}>🧬 {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {!hideSidebar && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#ccc', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={useDraft} 
                                        onChange={(e) => setUseDraft(e.target.checked)} 
                                        disabled={services.llm === "running"} 
                                    /> DFlash
                                </label>
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
                        )}
                    </div>
                </div>

                {!hideSidebar && (
                    <div className="agent-identity">
                        <div className={`agent-icon ${agent}`}>
                            {agent === 'bibliotecario' ? '📚' :
                             agent === 'investigador' ? '🔍' :
                             agent === 'explorador' ? '🧭' :
                             agent === 'arquitecto' ? '💻' : 
                             agent === 'cartografo' ? '🗺️' : '🎙️'}
                        </div>
                        <div className="agent-meta">
                            <h2>
                                {agent === 'bibliotecario' ? 'El Bibliotecario' :
                                 agent === 'investigador' ? 'El Investigador' :
                                 agent === 'explorador' ? 'El Explorador' :
                                 agent === 'arquitecto' ? 'Arquitecto IT' : 
                                 agent === 'cartografo' ? 'Cartógrafo Visual' : 'Junta de Expertos'}
                            </h2>
                            {activeClient && (
                                <small style={{ fontSize: '0.6rem', color: '#4a6741', opacity: 0.8, fontWeight: 'bold' }}>
                                    🧬 {activeClient.name}
                                </small>
                            )}
                        </div>
                    </div>
                )}

                <div className="console-controls">


                    <label className="session-toggle" title="Acumula el historial en un Wiki efímero compartido entre agentes">
                        <input
                            type="checkbox"
                            checked={sessionMode}
                            onChange={(e) => setSessionMode(e.target.checked)}
                        />
                        <span>Modo Sesión</span>
                    </label>

                    <label className="session-toggle" title="Activa el razonamiento profundo del modelo (Chain of Thought)">
                        <input
                            type="checkbox"
                            checked={thinking}
                            onChange={(e) => setThinking(e.target.checked)}
                        />
                        <span style={{ color: thinking ? '#8e44ad' : 'inherit', fontWeight: thinking ? 'bold' : 'normal' }}>🧠 Thinking</span>
                    </label>

                    {sessionActive && (
                        <div className="session-controls fade-in" style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={handleDiscardSession} className="btn-start" style={{ background: '#f44336', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>
                                🗑️ Descartar
                            </button>
                            <button onClick={handleIndexSession} className="btn-start" style={{ background: '#4a6741', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} title="Mueve esta sesión a la Wiki persistente y la indexa inmediatamente">
                                🧠 Fijar en Memoria
                            </button>
                        </div>
                    )}
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
                                <button onClick={() => onProject(response, agent)} className="btn-save-note" style={{ background: '#9b59b6', color: 'white', marginLeft: '5px' }}>
                                    🎨 Proyectar al Canvas
                                </button>
                                {activeClient && (
                                    <button onClick={handleAppendHistory} className="btn-save-note" style={{ background: '#4a6741', color: 'white', marginLeft: '5px' }}>
                                        🧠 Integrar en Historia
                                    </button>
                                )}
                            </div>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{response}</ReactMarkdown>
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
                            <button 
                                onClick={recoverFromBackup} 
                                className="btn-recover-welcome"
                                style={{
                                    display: 'block', margin: '1.5rem auto 0',
                                    background: 'rgba(74, 103, 65, 0.1)', border: '1px solid rgba(74, 103, 65, 0.2)',
                                    borderRadius: '20px', padding: '0.6rem 1.2rem',
                                    cursor: 'pointer', fontSize: '0.8rem', color: '#4a6741',
                                    transition: 'all 0.3s'
                                }}
                            >
                                🔄 Recuperar última respuesta ({agent})
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
                                handleSend(sessionMode ? "mem" : "fast");
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
                                    disabled={isQuerying || (!query.trim() && selectedFiles.length === 0) || (!hideSidebar && services.bridge !== 'running')}
                                >
                                    ⚡
                                </button>
                                <button
                                    type="button"
                                    className="btn-send mem"
                                    title="Añadir a Memoria y Consultar"
                                    onClick={() => handleSend("mem")}
                                    disabled={isQuerying || (!query.trim() && selectedFiles.length === 0) || (!hideSidebar && services.bridge !== 'running')}
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

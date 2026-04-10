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
    const responseRef = useRef(null);

    useEffect(() => {
        if (response) {
            localStorage.setItem('cams-last-response', response);
        }
    }, [response]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim() || loading) return;

        setLoading(true);
        setError(null);
        
        try {
            const endpoint = `http://${window.location.hostname}:3001/api/agent/query`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    agent: agent,
                    session_mode: sessionMode
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            setResponse(data.response);
            setQuery(""); // Limpiar query después de enviar
        } catch (err) {
            setError("Error conectando con el Bibliotecario. Verifica que el servidor puente esté activo.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-module agent-console">
            <div className="module-header agent-header">
                <div className="agent-identity">
                    <div className={`agent-icon ${agent}`}>
                        {agent === 'bibliotecario' ? '📚' : 
                         agent === 'investigador' ? '🔍' : 
                         agent === 'explorador' ? '🧭' : '🎙️'}
                    </div>
                    <div className="agent-meta">
                        <h2>
                            {agent === 'bibliotecario' ? 'El Bibliotecario' : 
                             agent === 'investigador' ? 'El Investigador' : 
                             agent === 'explorador' ? 'El Explorador' : 'Debate Socrático'}
                        </h2>
                        <p>
                            {agent === 'bibliotecario' ? 'Memoria Longitudinal (Obsidian)' : 
                             agent === 'investigador' ? 'Búsqueda & Bibliografía' : 
                             agent === 'explorador' ? 'Asistente Ágil (WEB/Perfil)' :
                             'Diálogo Dialéctico Local vs Global'}
                        </p>
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

            <div className="module-content console-content">
                <div className="response-area" ref={responseRef}>
                    {response ? (
                        <div className="markdown-body fade-in">
                           <ReactMarkdown rehypePlugins={[rehypeRaw]}>{response}</ReactMarkdown>
                        </div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <div className="console-welcome">
                            <p>Bienvenido a CAMS Neuro-Engram</p>
                            <small>Selecciona un agente para comenzar la activación neuronal.</small>
                        </div>
                    )}
                </div>

                <form className="input-area" onSubmit={handleSend}>
                    <textarea 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={
                            agent === 'bibliotecario' ? "Consulta tu memoria..." : 
                            agent === 'investigador' ? "Investiga en la web..." : 
                            agent === 'explorador' ? "Explora rápido..." :
                            "Inicia un debate profundo..."
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button type="submit" disabled={loading || !query.trim()}>
                        {loading ? '...' : '→'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AgentConsole;

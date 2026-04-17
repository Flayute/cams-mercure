import React, { useState } from 'react';
import AgentConsole from './apps/AgentConsole';
import AgoraConsole from './apps/AgoraConsole';
import Benchmarks from './apps/Benchmarks';

const MercureConsole = () => {
    const [activeView, setActiveView] = useState('console');
    const [selectedAgent, setSelectedAgent] = useState('bibliotecario');
    const [isQuerying, setIsQuerying] = useState(false);
    const [agentStates, setAgentStates] = useState({
        bibliotecario: { response: "", lastQuery: "", metrics: null },
        investigador: { response: "", lastQuery: "", metrics: null },
        explorador: { response: "", lastQuery: "", metrics: null },
        arquitecto: { response: "", lastQuery: "", metrics: null },
        debate: { response: "", lastQuery: "", metrics: null }
    });

    const handleAbort = async () => {
        try {
            await fetch(`http://${window.location.hostname}:3001/api/agent/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: 'main-console' })
            });
        } catch (e) {}
        setIsQuerying(false);
    };

    const updateAgentState = (agentId, newState) => {
        setAgentStates(prev => ({
            ...prev,
            [agentId]: { ...prev[agentId], ...newState }
        }));
    };

    return (
        <div className="therapy-app-layout">
            <aside className="therapy-sidebar">
                <div className="sidebar-logo">
                    CAMS <span>Mercure</span>
                    <small style={{ display: 'block', fontSize: '0.6rem', opacity: 0.4, fontWeight: 400, marginTop: '4px', letterSpacing: '0.1rem' }}>
                        FEDERATED AGENT SYSTEM
                    </small>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-group-label">OPERATIVA</div>

                    <button
                        className={`nav-item ${activeView === 'console' ? 'active' : ''}`}
                        onClick={() => setActiveView('console')}
                    >
                        <span className="nav-icon">🤖</span> Consola de Agentes
                    </button>

                    <button
                        className={`nav-item ${activeView === 'agora' ? 'active' : ''}`}
                        onClick={() => setActiveView('agora')}
                    >
                        <span className="nav-icon">🏛️</span> El Ágora Cuántica
                    </button>
                    
                    <button
                        className={`nav-item ${activeView === 'benchmarks' ? 'active' : ''}`}
                        onClick={() => setActiveView('benchmarks')}
                    >
                        <span className="nav-icon">📊</span> Métricas y Benchmarks
                    </button>

                    <div className="nav-info-block">
                        <p>LIB: Bibliotecario</p>
                        <p>RES: Investigador</p>
                        <p>EXP: Explorador</p>
                        <p>DEB: Debate Socrático</p>
                    </div>
                </nav>

                <div className="sidebar-logo-container" style={{ padding: '0 1rem', marginBottom: '1rem', textAlign: 'center' }}>
                    <img 
                        src="/logo.png" 
                        alt="CAMS Mercure Logo" 
                        style={{ width: '100%', borderRadius: '12px', opacity: 0.8, border: '1px solid #eee' }} 
                    />
                </div>

                <div className="sidebar-footer">
                    <p>{isQuerying ? "Razonando..." : "System Online"}</p>
                    <div className={`status-indicator ${isQuerying ? 'llm' : 'active'}`}></div>
                    {isQuerying && (
                        <button onClick={handleAbort} className="btn-stop" style={{ marginTop: '10px', width: '100%', fontSize: '0.7rem' }}>
                            🛑 Detener
                        </button>
                    )}
                </div>
            </aside>

            <main className="therapy-main-content">
                <div className="therapy-dashboard fade-in">
                    {activeView === 'console' ? (
                        <AgentConsole 
                            agent={selectedAgent} 
                            setAgent={setSelectedAgent}
                            state={agentStates[selectedAgent]}
                            updateState={(newState) => updateAgentState(selectedAgent, newState)}
                            isQuerying={isQuerying}
                            setIsQuerying={setIsQuerying}
                            onAbort={handleAbort}
                        />
                    ) : 
                     activeView === 'agora' ? <AgoraConsole /> : <Benchmarks />}
                </div>
            </main>
        </div>
    );
};

export default MercureConsole;

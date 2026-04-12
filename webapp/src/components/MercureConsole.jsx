import React, { useState } from 'react';
import AgentConsole from './apps/AgentConsole';
import AgoraConsole from './apps/AgoraConsole';

const MercureConsole = () => {
    const [activeView, setActiveView] = useState('console');

    return (
        <div className="therapy-app-layout">
            <aside className="therapy-sidebar">
                <div className="sidebar-logo">
                    CAMS <span>Mercure</span>
                    <small style={{ display: 'block', fontSize: '0.6rem', opacity: 0.4, fontWeight: 400, marginTop: '4px', letterSpacing: '0.1rem' }}>
                        FEDERATED AGENT SYSTEM v4.0
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

                    <div className="nav-info-block">
                        <p>LIB: Bibliotecario</p>
                        <p>RES: Investigador</p>
                        <p>EXP: Explorador</p>
                        <p>DEB: Debate Socrático</p>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <p>System Online</p>
                    <div className="status-indicator active"></div>
                </div>
            </aside>

            <main className="therapy-main-content">
                <div className="therapy-dashboard fade-in">
                    {activeView === 'console' ? <AgentConsole /> : <AgoraConsole />}
                </div>
            </main>
        </div>
    );
};

export default MercureConsole;

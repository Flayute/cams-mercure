import React from 'react';
import AgentConsole from './apps/AgentConsole';

const TherapyApp = () => {
    return (
        <div className="therapy-app-layout">
            <aside className="therapy-sidebar">
                <div className="sidebar-logo">
                    CAMS <span>Neuro-Engram</span>
                    <small style={{ display: 'block', fontSize: '0.6rem', opacity: 0.4, fontWeight: 400, marginTop: '4px', letterSpacing: '0.1rem' }}>
                        FEDERATED AGENT SYSTEM v1
                    </small>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-group-label">OPERATIVA DÍA</div>
                    <button className="nav-item active">
                        <span className="nav-icon">🤖</span> Consola de Agentes
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
                    <AgentConsole />
                </div>
            </main>
        </div>
    );
};

export default TherapyApp;

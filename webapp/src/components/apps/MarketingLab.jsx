import React, { useState } from 'react';
import AgentConsole from './AgentConsole';
import VisualCanvas from './VisualCanvas';
import './MarketingLab.css';

const MarketingLab = () => {
    const [currentAgent, setCurrentAgent] = useState('debate');
    const [agentStates, setAgentStates] = useState({
        heraldo: { response: "", lastQuery: "", metrics: null },
        arquitecto: { response: "", lastQuery: "", metrics: null },
        cartografo: { response: "", lastQuery: "", metrics: null },
        debate: { response: "", lastQuery: "", metrics: null },
        bibliotecario: { response: "", lastQuery: "", metrics: null },
        investigador: { response: "", lastQuery: "", metrics: null },
        explorador: { response: "", lastQuery: "", metrics: null }
    });
    const [isQuerying, setIsQuerying] = useState(false);
    const [pendingProjection, setPendingProjection] = useState(null);

    const handleProject = (content, agent) => {
        setPendingProjection({ content, agent });
    };

    return (
        <div className="marketing-lab-container fade-in">
            <div className="marketing-sidebar-info">
                <h2>JUNTA DE MARKETING</h2>
                <p>Heraldo (Estrategia) + Arquitecto (Implementación)</p>
            </div>
            
            <div className="marketing-split-layout">
                {/* LADO IZQUIERDO: CONSOLA DE DIÁLOGO */}
                <div className="marketing-chat-pane">
                    <AgentConsole 
                        agent={currentAgent}
                        setAgent={setCurrentAgent}
                        state={agentStates[currentAgent] || { response: "", lastQuery: "", metrics: null }}
                        updateState={(newState) => setAgentStates(prev => ({ 
                            ...prev, 
                            [currentAgent]: { ...prev[currentAgent], ...newState } 
                        }))}
                        isQuerying={isQuerying}
                        setIsQuerying={setIsQuerying}
                        onAbort={() => setIsQuerying(false)}
                        onProject={handleProject}
                        hideSidebar={true} // Limpia la UI técnica
                    />
                </div>

                {/* LADO DERECHO: CANVAS VISUAL */}
                <div className="marketing-canvas-pane">
                    <VisualCanvas 
                        incomingProjection={pendingProjection}
                        clearProjection={() => setPendingProjection(null)}
                    />
                </div>
            </div>
        </div>
    );
};

export default MarketingLab;

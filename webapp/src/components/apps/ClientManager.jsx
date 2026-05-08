import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const ClientManager = () => {
    const [clients, setClients] = useState([]);
    const [activeClient, setActiveClient] = useState(null);
    const [history, setHistory] = useState("");
    const [newClientName, setNewClientName] = useState("");
    const [newNote, setNewNote] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchClients = async () => {
        const res = await fetch(`http://${window.location.hostname}:3001/api/clients`);
        const data = await res.json();
        setClients(data);
    };

    const fetchActiveClient = async () => {
        const res = await fetch(`http://${window.location.hostname}:3001/api/session/active-client`);
        const data = await res.json();
        if (data.activeClient) {
            const client = clients.find(c => c.id === data.activeClient);
            if (client) setActiveClient(client);
        }
    };

    const fetchHistory = async (id) => {
        const res = await fetch(`http://${window.location.hostname}:3001/api/clients/${id}/history`);
        const data = await res.json();
        setHistory(data.content);
    };

    useEffect(() => {
        fetchClients();
        fetchActiveClient();
    }, []);

    useEffect(() => {
        if (activeClient) fetchHistory(activeClient.id);
    }, [activeClient]);

    const handleCreateClient = async () => {
        if (!newClientName.trim()) return;
        setLoading(true);
        try {
            await fetch(`http://${window.location.hostname}:3001/api/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newClientName })
            });
            setNewClientName("");
            fetchClients();
        } catch (e) {
            alert("Error al crear cliente");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectClient = async (client) => {
        setActiveClient(client);
        await fetch(`http://${window.location.hostname}:3001/api/session/active-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: client.id })
        });
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !activeClient) return;
        setLoading(true);
        try {
            await fetch(`http://${window.location.hostname}:3001/api/clients/${activeClient.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: newNote, agent: 'Manual' })
            });
            setNewNote("");
            fetchHistory(activeClient.id);
        } catch (e) {
            alert("Error al añadir nota");
        } finally {
            setLoading(false);
        }
    };

    const handleClearSession = async () => {
        setActiveClient(null);
        setHistory("");
        await fetch(`http://${window.location.hostname}:3001/api/session/active-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: null })
        });
    };

    return (
        <div className="app-module client-manager">
            <div className="module-header">
                <h2>🧬 Somatic Session Master</h2>
                <div className="session-status-badge">
                    {activeClient ? (
                        <span className="badge active">CASO ACTIVO: {activeClient.name}</span>
                    ) : (
                        <span className="badge inactive">SIN SESIÓN CLÍNICA ACTIVA</span>
                    )}
                </div>
            </div>

            <div className="client-manager-layout" style={{ display: 'flex', gap: '2rem', height: 'calc(100% - 60px)' }}>
                {/* Sidebar de Clientes */}
                <div className="client-list-panel" style={{ width: '300px', borderRight: '1px solid #eee', paddingRight: '1rem' }}>
                    <div className="add-client-form" style={{ marginBottom: '1.5rem' }}>
                        <input 
                            type="text" 
                            placeholder="Nuevo Paciente/Caso..." 
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <button 
                            onClick={handleCreateClient}
                            disabled={loading}
                            className="btn-start" 
                            style={{ width: '100%' }}
                        >
                            ➕ Dar de Alta
                        </button>
                    </div>

                    <div className="clients-scroll" style={{ overflowY: 'auto', maxHeight: '400px' }}>
                        {clients.map(client => (
                            <div 
                                key={client.id}
                                className={`client-card ${activeClient?.id === client.id ? 'active' : ''}`}
                                onClick={() => handleSelectClient(client)}
                                style={{
                                    padding: '0.8rem',
                                    borderRadius: '10px',
                                    background: activeClient?.id === client.id ? '#e8f0e8' : '#f9f9f9',
                                    marginBottom: '0.5rem',
                                    cursor: 'pointer',
                                    border: activeClient?.id === client.id ? '1px solid #4a6741' : '1px solid transparent'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>{client.name}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>ID: {client.id}</div>
                            </div>
                        ))}
                    </div>
                    
                    {activeClient && (
                        <button 
                            onClick={handleClearSession}
                            style={{ width: '100%', marginTop: '1rem', background: '#f44336', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            🚫 Cerrar Sesión
                        </button>
                    )}
                </div>

                {/* Historial y Notas */}
                <div className="client-detail-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {activeClient ? (
                        <>
                            <div className="history-area" style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eee', marginBottom: '1rem' }}>
                                <h3>📋 Historial de {activeClient.name}</h3>
                                {history ? (
                                    <ReactMarkdown className="markdown-body">{history}</ReactMarkdown>
                                ) : (
                                    <p style={{ opacity: 0.5 }}>Sin registros previos. Inicia la toma de datos.</p>
                                )}
                            </div>

                            <div className="note-input-area" style={{ display: 'flex', gap: '0.5rem' }}>
                                <textarea 
                                    placeholder="Añadir nota clínica, observación o hito..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', height: '80px', resize: 'none' }}
                                />
                                <button 
                                    onClick={handleAddNote}
                                    disabled={loading || !newNote.trim()}
                                    className="btn-start"
                                    style={{ width: '120px' }}
                                >
                                    📝 Anotar
                                </button>
                            </div>
                            <small style={{ marginTop: '0.5rem', opacity: 0.5 }}>
                                * El historial será inyectado automáticamente en el contexto de los Agentes mientras esta sesión esté activa.
                            </small>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3, flexDirection: 'column' }}>
                            <span style={{ fontSize: '4rem' }}>🧬</span>
                            <p>Selecciona un caso para activar el flujo somático.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientManager;

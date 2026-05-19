import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './CoachDashboard.css';

const CoachDashboard = () => {
  const [mode, setMode] = useState('proactive');
  const [subMode, setSubMode] = useState('morning');
  const [isQuerying, setIsQuerying] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [context, setContext] = useState('');
  const [history, setHistory] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response]);

  const handleConsult = async () => {
    if (!query.trim()) return;
    if (isQuerying) return;

    setIsQuerying(true);
    setResponse('');

    try {
      const alma = mode;
      const modeLabel = subMode === 'morning' ? 'Mañana' :
                       subMode === 'evening' ? 'Cierre' :
                       subMode === 'weekly' ? 'Semana' :
                       subMode === 'blocked' ? 'Bloqueo' :
                       subMode === 'skills' ? 'Habilidades' : 'General';

      const BACKEND_URL = `http://${window.location.hostname}:3001`;
      const apiUrl = `${BACKEND_URL}/api/coach/consult`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, alma, mode: subMode, context: '' })
      });

      const data = await res.json();

      if (!data.response) {
        setResponse('Error: no se recibió respuesta del backend. Verifica que el Bridge esté activo.');
        return;
      }

      setResponse(data.response);
      setContext(`${alma.toUpperCase()} | ${modeLabel} | ${data.duration ? data.duration.toFixed(1) + 's' : ''}`);

      setHistory(prev => [
        { content: query, response: data.response, timestamp: new Date().toISOString() },
        ...prev.slice(0, 19)
      ]);

      setQuery('');

    } catch (error) {
      setResponse('Error de conexión. Verifica que los motores estén activos.');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleAbort = () => {
    setIsQuerying(false);
    setResponse('');
  };

  const handleNewChat = () => {
    setResponse('');
    setContext('');
    setQuery('');
  };

  return (
    <div className={`coach-dashboard ${isMobile ? 'mobile-first' : ''}`}>
      {/* Encabezado */}
      <div className="coach-header">
        <h1>COACH PERSONAL</h1>
        <small>CAMS MERCURE // ASISTENCIA PERSONAL</small>
      </div>

      {/* Toggle de modo (Proactivo vs Reactivo) */}
      <div className="mode-toggle">
        <div 
          className={`mode-toggle-label ${mode === 'proactive' ? 'active' : ''}`}
          onClick={() => setMode('proactive')}
        >
          🧠 ESTRATEGA (Proactivo)
        </div>
        <div 
          className={`mode-toggle-label ${mode === 'reactive' ? 'active' : ''}`}
          onClick={() => setMode('reactive')}
        >
          🧘 REACTIVA (Emocional)
        </div>
        <div 
          className="mode-toggle-label"
          onClick={handleNewChat}
          style={{ background: '#e74c3c', color: 'white', border: 'none', maxWidth: '120px' }}
        >
          🧹 Nuevo Chat
        </div>
      </div>

      {/* Sub-modos (solo para Estratega) */}
      {mode === 'proactive' && (
        <div className="sub-mode-selector">
          <div className={`sub-mode-label ${subMode === 'morning' ? 'active' : ''}`} onClick={() => setSubMode('morning')}>
            ☀️ MAÑANA
          </div>
          <div className={`sub-mode-label ${subMode === 'evening' ? 'active' : ''}`} onClick={() => setSubMode('evening')}>
            🌙 CIERRE
          </div>
          <div className={`sub-mode-label ${subMode === 'weekly' ? 'active' : ''}`} onClick={() => setSubMode('weekly')}>
            📅 SEMANA
          </div>
          <div className={`sub-mode-label ${subMode === 'blocked' ? 'active' : ''}`} onClick={() => setSubMode('blocked')}>
            🚫 BLOQUEO
          </div>
          <div className={`sub-mode-label ${subMode === 'skills' ? 'active' : ''}`} onClick={() => setSubMode('skills')}>
            💪 HABILIDADES
          </div>
          <div className={`sub-mode-label ${subMode === 'general' ? 'active' : ''}`} onClick={() => setSubMode('general')}>
            💬 GENERAL
          </div>
        </div>
      )}

      {/* Área de respuesta */}
      <div className="response-area" ref={scrollRef}>
        {response ? (
          <div className="response-content fade-in">
            {context && (
              <div className="context-bar fade-in">
                <span>📊 {context}</span>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
          </div>
        ) : (
          <div className="welcome-message">
            <h2>{mode === 'proactive' ? '🧠 Estratega Personal' : '🧘 Alma Reactiva'}</h2>
            <p>{mode === 'proactive' ? '¿Qué te gustaría lograr hoy?' : '¿En qué puedo ayudarte?'}</p>
          </div>
        )}
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div className="history-section">
          <h3>📜 Historial reciente</h3>
          {history.slice(0, 5).map((item, index) => (
            <div key={index} className="history-item fade-in">
              <div className="history-question">{item.content}</div>
              <div className="history-answer">{item.response.substring(0, 150)}...</div>
              <small className="history-timestamp">{new Date(item.timestamp).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
      )}

      {/* Área de entrada */}
      <div className="input-area">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'proactive' ? "¿Qué quieres lograr hoy?" : "Escribe tu duda aquí..."}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleConsult();
            }
          }}
        />
        <div className="send-actions">
          {isQuerying ? (
            <button onClick={handleAbort} className="btn-stop" title="Detener Consulta">
              🛑
            </button>
          ) : (
            <button
              onClick={() => handleConsult()}
              className="btn-send"
              disabled={!query.trim() || isQuerying}
            >
              ➤ Enviar
            </button>
          )}
        </div>
      </div>

      {/* Botones rápidos de ritual (solo para Estratega) */}
      {mode === 'proactive' && (
        <div className="quick-actions">
          <button onClick={() => { setQuery('¿Qué te gustaría lograr hoy?'); setSubMode('morning'); }} className="quick-action-btn">
            ☀️ Ritual Mañana
          </button>
          <button onClick={() => { setQuery('¿Qué lograste hoy?'); setSubMode('evening'); }} className="quick-action-btn">
            🌙 Ritual Cierre
          </button>
          <button onClick={() => { setQuery('¿Qué te frustró esta semana?'); setSubMode('weekly'); }} className="quick-action-btn">
            📅 Audit Semana
          </button>
          <button onClick={() => { setQuery('¿Qué te bloquea ahora?'); setSubMode('blocked'); }} className="quick-action-btn">
            🚫 Romper Bloqueo
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="coach-footer">
        <small>
          CAMS Mercure // Coach Personal
          {isMobile && ' // Usa la app en tu móvil'}
        </small>
      </div>
    </div>
  );
};

export default CoachDashboard;

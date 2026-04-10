import React, { useState, useEffect } from 'react';

const AnaSuggestions = () => {
    const [suggestions, setSuggestions] = useState(() => {
        return localStorage.getItem('ana-suggestions') || "";
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (suggestions) {
            localStorage.setItem('ana-suggestions', suggestions);
        }
    }, [suggestions]);

    const fetchSuggestions = async (e) => {
        if (e) e.stopPropagation();
        console.log("Fetching local suggestions...");
        setLoading(true);
        setError(null);
        try {
            const endpoint = `http://${window.location.hostname}:3001/api/suggestions`;
            const response = await fetch(endpoint);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setSuggestions(data.suggestions);
        } catch (err) {
            setError("No se pudo conectar con Ana. Asegúrate de que el servidor y Ollama estén activos.");
            console.error("Error in fetchSuggestions:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorldSuggestions = async (e) => {
        if (e) e.stopPropagation();
        console.log("Fetching world suggestions...");
        setLoading(true);
        setError(null);
        try {
            const endpoint = `http://${window.location.hostname}:3001/api/suggestions/world`;
            const response = await fetch(endpoint);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setSuggestions(data.suggestions);
        } catch (err) {
            setError("No se pudo conectar con el mundo exterior. Verifica la API de Open WebUI.");
            console.error("Error in fetchWorldSuggestions:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-module ana-suggestions">
            <div className="module-header">
                <div className="ana-avatar">A</div>
                <div className="module-title">
                    <h2>Inspiración de Ana</h2>
                    <p>Sugerencias personalizadas para tu contenido</p>
                </div>
                <div className="button-group">
                    <button className="refresh-button" onClick={fetchSuggestions} disabled={loading}>
                        {loading ? 'Pensando...' : 'Ideas locales'}
                    </button>
                    <button className="refresh-button world-btn" onClick={fetchWorldSuggestions} disabled={loading}>
                        {loading ? 'Buscando...' : 'Ideas del Mundo'}
                    </button>
                </div>
            </div>

            <div className="module-content">
                {suggestions ? (
                    <div className="suggestions-display fade-in">
                        {suggestions.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : (
                    <div className="placeholder-message">
                        Haz clic en uno de los botones para que Ana empiece a trabajar.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnaSuggestions;

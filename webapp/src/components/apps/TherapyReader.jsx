import React, { useState, useEffect } from 'react';

const TherapyReader = ({ topic, onBack }) => {
    const [fullContent, setFullContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!topic || !topic.id) return;

        const loadContent = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://${window.location.hostname}:3001/api/blog/read/${topic.id}`);
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                setFullContent(data.content);
            } catch (err) {
                console.error("Error loading full content:", err);
                setFullContent("No se pudo cargar el archivo completo. Verifica que el servidor esté activo.");
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [topic]);

    if (!topic) return null;

    return (
        <div className="reader-overlay fade-in">
            <div className="reader-controls">
                <button className="reader-close" onClick={onBack}>✕ Cerrar Lectura</button>
            </div>
            <div className="reader-container">
                <header className="reader-header">
                    <p className="reader-category">Documento Completo</p>
                    <h1>{topic.title}</h1>
                    <h4 className="reader-subtitle">{topic.subtitle}</h4>
                    <div className="reader-separator"></div>
                </header>
                <article className="reader-content">
                    {loading ? (
                        <p className="loading-text">Cargando archivo original...</p>
                    ) : (
                        fullContent.split('\n\n').map((para, i) => (
                            <p key={i}>{para}</p>
                        ))
                    )}
                </article>
            </div>
        </div>
    );
};

export default TherapyReader;

import React, { useState, useEffect } from 'react';

const TherapyLibrary = ({ onSelectTopic }) => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:3001/api/blog/files`);
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                setBlogs(data.files);
            } catch (err) {
                console.error("Error fetching blogs:", err);
                setError("No se pudo cargar la biblioteca de archivos locales.");
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    return (
        <div className="app-module library-module">
            <div className="module-header">
                <div className="module-title">
                    <h2>Tu Biblioteca (Archivos Locales)</h2>
                    <p>Contenido completo extraído de tu carpeta Blog</p>
                </div>
            </div>

            {loading ? (
                <div className="placeholder-message">Sincronizando archivos...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : (
                <div className="module-grid">
                    {blogs.map(topic => (
                        <div
                            key={topic.id}
                            className="library-card"
                            onClick={() => onSelectTopic(topic)}
                        >
                            <div className="card-accent"></div>
                            <h3>{topic.title}</h3>
                            <p>{topic.subtitle}</p>
                            <span className="read-more">Leer archivo completo →</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TherapyLibrary;

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const DocumentFormatter = () => {
    // Persistent state initialization
    const [markdown, setMarkdown] = useState(() => localStorage.getItem('formatter_md') || "# Título de tu Documento\n\nEmpieza a escribir aquí...");
    const [format, setFormat] = useState(() => localStorage.getItem('formatter_format') || 'A4');
    const [zoom, setZoom] = useState(() => Number(localStorage.getItem('formatter_zoom')) || 100);
    const [currentFilePath, setCurrentFilePath] = useState(() => localStorage.getItem('formatter_path') || null);

    // Text formatting states
    const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('formatter_fontFamily') || 'Arial, sans-serif');
    const [fontSize, setFontSize] = useState(() => localStorage.getItem('formatter_fontSize') || '14px');
    const [textAlign, setTextAlign] = useState(() => localStorage.getItem('formatter_textAlign') || 'left');
    const [marginSize, setMarginSize] = useState(() => Number(localStorage.getItem('formatter_margin')) || 20);

    // UI state
    const [showLegend, setShowLegend] = useState(false);
    const [viewMode, setViewMode] = useState('split'); // 'editor' | 'split' | 'preview'
    const [isMermaidReady, setIsMermaidReady] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isRendering, setIsRendering] = useState(false);

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem('formatter_md', markdown);
        localStorage.setItem('formatter_format', format);
        localStorage.setItem('formatter_zoom', zoom);
        if (currentFilePath) localStorage.setItem('formatter_path', currentFilePath);
        localStorage.setItem('formatter_fontFamily', fontFamily);
        localStorage.setItem('formatter_fontSize', fontSize);
        localStorage.setItem('formatter_textAlign', textAlign);
        localStorage.setItem('formatter_margin', marginSize);
    }, [markdown, format, zoom, currentFilePath, fontFamily, fontSize, textAlign, marginSize]);

    // Contador global para IDs únicos de Mermaid (nunca se repite)
    const mermaidCounter = React.useRef(0);

    // Mermaid initialization
    useEffect(() => {
        if (!document.getElementById('mermaid-script')) {
            const script = document.createElement('script');
            script.id = 'mermaid-script';
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            script.async = true;
            script.onload = () => {
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: 'neutral',
                    securityLevel: 'loose',
                    fontFamily: 'Inter, Arial',
                    flowchart: { htmlLabels: false },
                    sequence: { useMaxWidth: true }
                });
                setIsMermaidReady(true);
            };
            document.body.appendChild(script);
        } else if (window.mermaid) {
            setIsMermaidReady(true);
        }
    }, []);

    const MermaidCode = ({ children }) => {
        const [svg, setSvg] = useState('');
        const [error, setError] = useState(null);

        useEffect(() => {
            if (!isMermaidReady || !window.mermaid) return;

            // Cada llamada a render obtiene un ID único e irrepetible
            mermaidCounter.current += 1;
            const uniqueId = `mmd_${mermaidCounter.current}`;

            const renderChart = async () => {
                try {
                    const { svg: generatedSvg } = await window.mermaid.render(uniqueId, children);
                    setSvg(generatedSvg);
                    setError(null);
                } catch (e) {
                    console.error("Mermaid Render Error:", e);
                    setError(e.message || "Error de sintaxis en el diagrama");
                    // Limpiamos el elemento temporal que Mermaid deja en el DOM
                    const errorEl = document.getElementById(`d${uniqueId}`);
                    if (errorEl) errorEl.remove();
                }
            };
            renderChart();
        }, [children, isMermaidReady]);

        if (error) return (
            <div className="mermaid-error">
                <small style={{ color: '#e74c3c' }}>⚠️ {error}</small>
                <pre style={{ fontSize: '0.7rem', background: '#fff5f5' }}>{children}</pre>
            </div>
        );

        if (!svg && isMermaidReady) return <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>🎨 Dibujando diagrama...</div>;

        return <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} />;
    };

    const handlePickFile = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/system/pick-file`);
            if (!res.ok) {
                const errData = await res.json();
                if (errData.error === "Selección cancelada o fallida") return; // Silencioso si cancela
                throw new Error(errData.error || "Fallo en el selector");
            }

            const data = await res.json();
            if (data.path) {
                console.log("[Formatter] Archivo seleccionado:", data.path);
                const readRes = await fetch(`http://${window.location.hostname}:3001/api/system/read-file`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: data.path })
                });

                if (!readRes.ok) {
                    const errorJson = await readRes.json();
                    throw new Error(errorJson.error || "No se pudo leer el contenido del archivo.");
                }

                const readData = await readRes.json();
                if (readData.content !== undefined) {
                    setMarkdown(readData.content);
                    setCurrentFilePath(data.path);
                    alert("✅ Archivo cargado correctamente");
                }
            }
        } catch (e) {
            console.error("[PickFile Error]", e);
            alert("❌ " + e.message);
        }
    };

    const handleSaveFile = async (forceNew = false) => {
        let targetPath = currentFilePath;
        if (!targetPath || forceNew) {
            // Intentar usar un nombre basado en la primera línea del markdown
            const firstLine = markdown.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 20) || 'documento';
            const name = window.prompt('Nombre del archivo .md:', firstLine);
            if (!name) return;
            targetPath = `~/Documents/CAMS-Mercure/drafts/${name.trim()}.md`;
        }
        try {
            const res = await fetch(`http://${window.location.hostname}:3001/api/system/write-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: targetPath, content: markdown })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setCurrentFilePath(targetPath);
                alert(`✅ Guardado en: ${targetPath.replace('~/Documents/CAMS-Mercure/', '')}`);
            } else {
                alert("❌ Error al guardar: " + (data.error || "Desconocido"));
            }
        } catch (e) {
            alert("❌ Error de conexión al guardar");
        }
    };

    const handleRenderPDF = async () => {
        setIsRendering(true);
        try {
            // Capturamos el HTML ya renderizado por el navegador (incluye Mermaid SVGs)
            const previewElement = document.getElementById('preview-content');
            const renderedHtml = previewElement ? previewElement.innerHTML : "";

            const res = await fetch(`http://${window.location.hostname}:3001/api/render/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: renderedHtml,
                    title: currentFilePath ? currentFilePath.split('/').pop() : "Documento CAMS",
                    font_size: fontSize === '12px' ? '11pt' : (fontSize === '14px' ? '12pt' : '14pt')
                })
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } else {
                alert("Error generando PDF");
            }
        } catch (e) {
            alert("Error de conexión con el Bridge");
        } finally {
            setIsRendering(false);
        }
    };

    return (
        <div className="app-module document-formatter fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="module-header" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <h2>📄 Maquetador Pro</h2>
                        <span style={{ fontSize: '0.75rem', background: isMermaidReady ? '#e8f0e8' : '#ffebee', color: isMermaidReady ? '#2e7d32' : '#c62828', padding: '2px 8px', borderRadius: '4px' }}>
                            {isMermaidReady ? 'MERMAID ACTIVE' : 'LOADING PLUGINS...'}
                        </span>
                    </div>

                    <div className="service-actions" style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handlePickFile} className="btn-start" style={{ background: '#2c3e50' }} title="Abrir archivo existente">📁</button>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <button onClick={() => handleSaveFile(false)} className="btn-start" style={{ background: '#27ae60', borderRadius: '6px 0 0 6px' }}>💾 Guardar</button>
                            <button onClick={() => handleSaveFile(true)} className="btn-start" style={{ background: '#219150', borderRadius: '0 6px 6px 0', padding: '4px 8px' }} title="Guardar como...">+</button>
                        </div>
                        <button onClick={handleRenderPDF} className="btn-start" style={{ background: '#8e44ad' }} disabled={isRendering}>
                            {isRendering ? '⌛ Generando...' : '📖 Vista Editorial Pro'}
                        </button>

                        <div style={{ display: 'flex', border: '1px solid #ccc', borderRadius: '6px', overflow: 'hidden' }}>
                            {[['editor', '📝'], ['split', '↕'], ['preview', '📄']].map(([mode, icon]) => (
                                <button key={mode} onClick={() => setViewMode(mode)} style={{ background: viewMode === mode ? '#2c3e50' : '#f5f5f5', color: viewMode === mode ? '#fff' : '#555', border: 'none', padding: '4px 12px' }}>{icon}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#f8f9fa', padding: '8px 15px', borderRadius: '8px', flexWrap: 'wrap' }}>
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="model-picker-mini">
                        <option value="'Arial', sans-serif">Arial</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="system-ui, sans-serif">System UI</option>
                    </select>

                    <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="model-picker-mini">
                        <option value="12px">12px</option>
                        <option value="14px">14px</option>
                        <option value="16px">16px</option>
                        <option value="18px">18px</option>
                    </select>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderLeft: '1px solid #ddd', paddingLeft: '10px' }}>
                        <label style={{ fontSize: '0.75rem' }}>Márgenes: {marginSize}mm</label>
                        <input type="range" min="5" max="50" value={marginSize} onChange={(e) => setMarginSize(Number(e.target.value))} style={{ width: '80px' }} />
                    </div>

                    <select value={format} onChange={(e) => setFormat(e.target.value)} className="model-picker-mini">
                        <option value="A4">A4</option>
                        <option value="A5">A5</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#f0f2f5' }}>
                {(viewMode === 'editor' || viewMode === 'split') && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #ddd' }}>
                        <textarea
                            value={markdown}
                            onChange={(e) => setMarkdown(e.target.value)}
                            placeholder="Escribe aquí tu documento..."
                            style={{
                                flex: 1,
                                padding: '40px 60px',
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                fontFamily: 'monospace',
                                fontSize: '15px',
                                lineHeight: '1.6',
                                color: '#2c3e50'
                            }}
                        />
                    </div>
                )}

                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fa', padding: '40px' }}>
                        <div
                            id="preview-content"
                            className="markdown-body"
                            style={{
                                background: '#fff',
                                padding: `${marginSize}mm`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                borderRadius: '4px',
                                minHeight: '100%',
                                fontFamily: fontFamily,
                                fontSize: fontSize,
                                textAlign: textAlign,
                                maxWidth: '900px',
                                margin: '0 auto'
                            }}
                        >
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                                code({ inline, className, children }) {
                                    const match = /language-mermaid/.exec(className || '');
                                    const content = String(children).replace(/\n$/, '');
                                    return !inline && match ? (
                                        <MermaidCode key={content}>{content}</MermaidCode>
                                    ) : (
                                        <code className={className}>{children}</code>
                                    );
                                }
                            }}>{markdown}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {pdfUrl && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', flexDirection: 'column', padding: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <button onClick={() => { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>CERRAR VISTA PREVIA [X]</button>
                    </div>
                    <iframe src={pdfUrl} style={{ flex: 1, border: 'none', borderRadius: '10px', background: 'white' }} title="PDF Preview" />
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .mermaid-container { background: #fff; padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: center; border: 1px solid #eee; break-inside: avoid; }
                .mermaid-container svg { max-width: 100%; height: auto; }
                
                @media print {
                    @page { margin: 20mm; }
                    body * { visibility: hidden; }
                    #preview-content, #preview-content * { visibility: visible; }
                    #preview-content { 
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                }
            `}} />
        </div>
    );
};

export default DocumentFormatter;

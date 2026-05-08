import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  applyEdgeChanges, 
  applyNodeChanges,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import './VisualCanvas.css';

// --- NODOS PERSONALIZADOS ---

const AgentNode = ({ data }) => {
  const agentColors = {
    bibliotecario: '#3498db',
    investigador: '#2ecc71',
    explorador: '#9b59b6',
    arquitecto: '#e67e22',
    heraldo: '#f1c40f',
    debate: '#e74c3c'
  };

  const color = agentColors[data.agent] || '#4a6741';

  return (
    <div className="neuro-node" style={{ borderTop: `4px solid ${color}` }}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="node-icon">{data.icon || '🧠'}</span>
        <span className="node-title">{data.label}</span>
      </div>
      <div className="node-body">
        {data.content || 'Sin contenido'}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  agentNode: AgentNode,
};

// --- COMPONENTE PRINCIPAL ---

const initialNodes = [
  { 
    id: '1', 
    type: 'agentNode',
    data: { label: 'Mercure Core', agent: 'arquitecto', content: 'Inicia tu mapa mental aquí.', icon: '⚗️' }, 
    position: { x: 250, y: 50 } 
  },
];

const initialEdges = [];

const VisualCanvas = ({ incomingProjection, clearProjection }) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [canvasList, setCanvasList] = useState([]);
  const [currentCanvasId, setCurrentCanvasId] = useState(null);
  const [canvasName, setCanvasName] = useState('Nuevo Mapa');

  const fetchCanvasList = useCallback(async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/canvases`);
      const data = await res.json();
      setCanvasList(data);
    } catch (e) { console.error(e); }
  }, []);

  const loadCanvas = async (id) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/canvases/${id}`);
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setCurrentCanvasId(id);
      setCanvasName(id.replace('.canvas', ''));
    } catch (e) { console.error(e); }
  };

  const saveCanvas = async () => {
    let name = currentCanvasId ? currentCanvasId : `${canvasName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.canvas`;
    if (name.endsWith('.neuro')) name = name.replace('.neuro', '.canvas');
    try {
      await fetch(`http://${window.location.hostname}:3001/api/canvases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: name,
          name: canvasName,
          content: { nodes, edges }
        })
      });
      setCurrentCanvasId(name);
      fetchCanvasList();
      alert('✅ Guardado en la bóveda');
    } catch (e) { alert('❌ Error al guardar'); }
  };

  const createNew = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentCanvasId(null);
    setCanvasName('Nuevo Mapa');
  };

  React.useEffect(() => {
    fetchCanvasList();
  }, [fetchCanvasList]);

  React.useEffect(() => {
    if (incomingProjection) {
      if (incomingProjection.agent === 'cartografo') {
        // El cartógrafo envía JSON estructural, no texto para un nodo simple
        try {
          // Extraer el JSON puro, ignorando títulos (ej. # 🗺️ Cartógrafo Visual) o formato markdown
          const text = incomingProjection.content;
          const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/) || 
                            text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          const rawJson = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
          
          const parsed = JSON.parse(rawJson);
          if (parsed.nodes) {
            setNodes(parsed.nodes);
            if (parsed.edges) setEdges(parsed.edges);
          } else {
             // Fallback si no tiene nodes, intentar proyectar como texto
             throw new Error("Sin estructura nodes/edges");
          }
        } catch (e) {
          console.error("No se pudo parsear el JSON del Cartógrafo:", e);
          alert("⚠️ El Cartógrafo no devolvió un JSON válido. Revisa su respuesta.");
        }
      } else {
        // Proyección estándar (un nodo para Heraldo, Investigador, etc)
        const id = `node_${Date.now()}`;
        const labels = {
          bibliotecario: 'Dato Proyectado',
          investigador: 'Hallazgo Proyectado',
          explorador: 'Ruta Proyectada',
          arquitecto: 'Estructura Proyectada',
          heraldo: 'Estrategia Proyectada'
        };
        const icons = {
          bibliotecario: '📚',
          investigador: '🔍',
          explorador: '🧭',
          arquitecto: '💻',
          heraldo: '📣'
        };

        const newNode = {
          id,
          type: 'agentNode',
          data: { 
            label: labels[incomingProjection.agent] || 'Proyección IA', 
            agent: incomingProjection.agent,
            content: incomingProjection.content,
            icon: icons[incomingProjection.agent] || '🧠'
          },
          position: { x: 200, y: 200 },
        };
        setNodes((nds) => nds.concat(newNode));
      }
      clearProjection();
    }
  }, [incomingProjection, clearProjection]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const addNode = (agentType) => {
    const id = `node_${Date.now()}`;
    const labels = {
      bibliotecario: 'Dato de Biblioteca',
      investigador: 'Hallazgo de Investigación',
      explorador: 'Ruta de Exploración',
      arquitecto: 'Estructura Técnica',
      heraldo: 'Estrategia Heraldo'
    };
    const icons = {
      bibliotecario: '📚',
      investigador: '🔍',
      explorador: '🧭',
      arquitecto: '💻',
      heraldo: '📣'
    };

    const newNode = {
      id,
      type: 'agentNode',
      data: { 
        label: labels[agentType] || 'Nuevo Nodo', 
        agent: agentType,
        content: 'Escribe aquí tu idea...',
        icon: icons[agentType] || '🧠'
      },
      position: { 
        x: 100, 
        y: 100 
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="visual-canvas-container fade-in">
      <div className="canvas-toolbar">
        <div className="canvas-file-controls">
          <input 
            type="text" 
            value={canvasName} 
            onChange={(e) => setCanvasName(e.target.value)}
            className="canvas-name-input"
            placeholder="Nombre del mapa..."
          />
          <select 
            onChange={(e) => loadCanvas(e.target.value)} 
            value={currentCanvasId || ''}
            className="canvas-selector"
          >
            <option value="">📂 Cargar mapa...</option>
            {canvasList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={createNew} title="Nuevo Lienzo">📄</button>
          <button onClick={saveCanvas} className="btn-save-canvas">💾 Guardar</button>
        </div>

        <div className="toolbar-separator"></div>

        <div className="agent-node-spawner">
          <button onClick={() => addNode('bibliotecario')} style={{ borderColor: '#3498db' }}>📚 LIB</button>
          <button onClick={() => addNode('investigador')} style={{ borderColor: '#2ecc71' }}>🔍 RES</button>
          <button onClick={() => addNode('explorador')} style={{ borderColor: '#9b59b6' }}>🧭 EXP</button>
          <button onClick={() => addNode('arquitecto')} style={{ borderColor: '#e67e22' }}>💻 ARQ</button>
          <button onClick={() => addNode('heraldo')} style={{ borderColor: '#f1c40f' }}>📣 HER</button>
        </div>
      </div>

      <div className="flow-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          aria-label="Neuro-Canvas Mercure"
        >
          <Background color="#333" gap={20} />
          <Controls />
          <MiniMap 
            nodeColor={(n) => {
              if (n.type === 'agentNode') return '#4a6741';
              return '#eee';
            }}
            maskColor="rgba(0,0,0,0.2)"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default VisualCanvas;

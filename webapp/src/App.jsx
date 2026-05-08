import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import MercureConsole from './components/MercureConsole';
import NexusHub from './components/NexusHub';
import NexusWorkspace from './components/NexusWorkspace';
import MarketingLab from './components/apps/MarketingLab';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelect = (selectedView) => {
    if (selectedView === 'uma') {
      window.open('http://100.95.137.80:8000', '_blank');
    } else if (selectedView === 'cams') {
      navigate('/console');
    } else {
      navigate('/' + selectedView);
    }
  };

  const isHome = location.pathname === '/';

  return (
    <div className="app-container">
      {!isHome && (
        <button 
          className="nexus-back-btn" 
          onClick={() => navigate('/')}
          title="Volver al Nexus Hub"
          style={{
              position: 'fixed',
              top: '10px',
              right: '10px',
              zIndex: 9999,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(5px)'
          }}
        >
          🌀
        </button>
      )}

      <Routes>
        <Route path="/" element={<NexusHub onSelect={handleSelect} />} />
        <Route path="/console" element={<MercureConsole />} />
        <Route path="/nexus" element={<NexusWorkspace />} />
        <Route path="/marketing" element={<MarketingLab />} />
      </Routes>
    </div>
  );
};

export default App;

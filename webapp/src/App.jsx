import React, { useState, useEffect } from 'react';
import './index.css';
import TherapyApp from './components/TherapyApp';
import NightApp from './components/NightApp';
import TradingDashboard from './components/TradingDashboard';

function App() {
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('cams-mode') || null;
  });

  useEffect(() => {
    if (activeMode) {
      localStorage.setItem('cams-mode', activeMode);
    } else {
      localStorage.removeItem('cams-mode');
    }
  }, [activeMode]);

  const handleModeSelect = (mode) => {
    if (!activeMode) {
      setActiveMode(mode);
    }
  };

  const handleBackToMenu = (e) => {
    e.stopPropagation();
    setActiveMode(null);
  };

  // Si está en modo APEX (trading), mostrar solo ese dashboard
  if (activeMode === 'trading') {
    return (
      <div className="app-container trading-mode">
        <button
          className="back-to-menu-btn visible"
          onClick={handleBackToMenu}
        >
          ✕ Salir de APEX
        </button>
        <TradingDashboard />
      </div>
    );
  }

  return (
    <div className={`app-container ${activeMode || 'trio'}`}>
      <button
        className={`back-to-menu-btn ${activeMode ? 'visible' : ''}`}
        onClick={handleBackToMenu}
      >
        ✕ Salir de Modo
      </button>

      {/* Music Side (Noche) */}
      <div
        className={`side music-side ${activeMode === 'music' ? 'expanded' : activeMode ? 'collapsed' : ''}`}
        onClick={() => !activeMode && handleModeSelect('music')}
      >
        <div className="music-bg-effect"></div>
        {activeMode === 'music' ? (
          <NightApp />
        ) : (
          <div className="side-content">
            <h1>MODO NOCHE</h1>
            <p>UMA SYSTEM // DJ ASSISTANT</p>
          </div>
        )}
      </div>

      {/* Therapy Side (Día) */}
      <div
        className={`side therapy-side ${activeMode === 'therapy' ? 'expanded' : activeMode ? 'collapsed' : ''}`}
        onClick={() => !activeMode && handleModeSelect('therapy')}
      >
        <div className="therapy-bg-effect"></div>

        {activeMode === 'therapy' ? (
          <TherapyApp />
        ) : (
          <div className="side-content">
            <h1>MODO DÍA</h1>
            <p>COGNITIVE ADAPTIVE MODULAR SYSTEM</p>
          </div>
        )}
      </div>

      {/* APEX Trading Side */}
      <div
        className={`side trading-side ${activeMode === 'trading' ? 'expanded' : activeMode ? 'collapsed' : ''}`}
        onClick={() => !activeMode && handleModeSelect('trading')}
      >
        <div className="trading-bg-effect"></div>

        {activeMode === 'trading' ? (
          <TradingDashboard />
        ) : (
          <div className="side-content">
            <h1>🤖 APEX</h1>
            <p>AUTOMATED PORTFOLIO EXCHANGE</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

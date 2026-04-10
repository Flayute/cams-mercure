import React, { useState, useEffect } from 'react';
import UMADashboard from './apps/UMADashboard';

const NightApp = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="night-app-layout fade-in">
            {/* Top Bar - Cockpit Info */}
            <header className="night-header">
                <div className="header-left">
                    <div className="system-orb neon-pulse"></div>
                    <div className="logo-section">
                        <h1>UMA <span>SYSTEM</span></h1>
                        <small>UNIVERSAL MUSIC ANALYSER</small>
                    </div>
                </div>

                <div className="header-center">
                    <div className="status-badge">
                        <span className="blink">●</span> RPi 500 LINK ACTIVE
                    </div>
                </div>

                <div className="header-right">
                    <div className="clock-display">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="latency-info">LATENCY: 12ms</div>
                </div>
            </header>

            <main className="night-main-content">
                <UMADashboard />
            </main>

            {/* Bottom Info Bar */}
            <footer className="night-footer">
                <div className="footer-item">
                    <span className="label">ENGINE:</span>
                    <span className="value">MIXXX 2.3.5</span>
                </div>
                <div className="footer-item">
                    <span className="label">PORT:</span>
                    <span className="value">8085</span>
                </div>
                <div className="footer-item">
                    <span className="label">COGNITIVE STACK:</span>
                    <span className="value">UMA COCKPIT v1.0</span>
                </div>
            </footer>
        </div>
    );
};

export default NightApp;

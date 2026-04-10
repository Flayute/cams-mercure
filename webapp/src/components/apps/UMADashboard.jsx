import React, { useState, useEffect } from 'react';

const UMADashboard = () => {
    const [state, setState] = useState({
        deck1: { title: "Empty", artist: "", bpm: 0, key: "", playing: false },
        deck2: { title: "Empty", artist: "", bpm: 0, key: "", playing: false },
        suggestions: [],
        intensity: 3
    });
    const [error, setError] = useState(null);
    const [umaIP, setUmaIP] = useState(window.location.hostname); // Default to current host

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(`http://${umaIP}:8085/api/status`);
                const data = await response.json();
                setState(data);
                setError(null);
            } catch (err) {
                console.error("UMA link lost:", err);
                setError("UMA Engine Not Detected. Check if app.py is running on RPi.");
            }
        };

        const interval = setInterval(fetchStatus, 1500);
        return () => clearInterval(interval);
    }, [umaIP]);

    const handleLoad = async (deck) => {
        try {
            await fetch(`http://${umaIP}:8085/api/load/${deck}`, { method: 'POST' });
        } catch (err) {
            console.error("Load failed:", err);
        }
    };

    const handleIntensity = async (level) => {
        try {
            await fetch(`http://${umaIP}:8085/api/intensity/${level}`, { method: 'POST' });
        } catch (err) {
            console.error("Intensity update failed:", err);
        }
    };

    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await fetch(`http://${umaIP}:8085/api/sync`, { method: 'POST' });
            setTimeout(() => setSyncing(false), 3000); // Visual feedback
        } catch (err) {
            console.error("Sync trigger failed:", err);
            setSyncing(false);
        }
    };

    return (
        <div className="uma-dashboard">
            {error && <div className="uma-alert">{error}</div>}

            <div className="cockpit-grid">
                {/* Deck 1 */}
                <div className={`deck-module ${state.deck1.playing ? 'playing' : ''}`}>
                    <div className="deck-header">DECK A</div>
                    <div className="track-info">
                        <h2>{state.deck1.title || "---"}</h2>
                        <p>{state.deck1.artist || "No track loaded"}</p>
                    </div>
                    <div className="deck-stats">
                        <div className="stat">BPM: <span>{Math.round(state.deck1.bpm)}</span></div>
                        <div className="stat">KEY: <span>{state.deck1.key || "N/A"}</span></div>
                    </div>
                    <div className="deck-visualizer">
                        <div className="bar"></div><div className="bar"></div><div className="bar"></div>
                    </div>
                </div>

                {/* Mixer / Controls Center */}
                <div className="center-module">
                    <div className="intensity-selector">
                        <label>SUGGESTION INTENSITY</label>
                        <div className="intensity-steps">
                            {[1, 2, 3, 4, 5].map(lvl => (
                                <button
                                    key={lvl}
                                    className={state.intensity === lvl ? 'active' : ''}
                                    onClick={() => handleIntensity(lvl)}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="load-controls">
                        <button className="load-btn" onClick={() => handleLoad(1)}>LOAD TO A</button>
                        <button className="load-btn" onClick={() => handleLoad(2)}>LOAD TO B</button>
                    </div>

                    <div className="sync-section">
                        <button
                            className={`sync-btn ${syncing ? 'syncing pulse' : ''}`}
                            onClick={handleSync}
                            disabled={syncing}
                        >
                            {syncing ? 'RE-MAPPING...' : 'SYNC KNOWLEDGE'}
                        </button>
                        <small className="sync-hint">Sync tags from files to UMA memory</small>
                    </div>
                </div>

                {/* Deck 2 */}
                <div className={`deck-module ${state.deck2.playing ? 'playing' : ''}`}>
                    <div className="deck-header">DECK B</div>
                    <div className="track-info">
                        <h2>{state.deck2.title || "---"}</h2>
                        <p>{state.deck2.artist || "No track loaded"}</p>
                    </div>
                    <div className="deck-stats">
                        <div className="stat">BPM: <span>{Math.round(state.deck2.bpm)}</span></div>
                        <div className="stat">KEY: <span>{state.deck2.key || "N/A"}</span></div>
                    </div>
                    <div className="deck-visualizer reverse">
                        <div className="bar"></div><div className="bar"></div><div className="bar"></div>
                    </div>
                </div>
            </div>

            {/* Suggestions Engine */}
            <div className="suggestions-terminal">
                <div className="terminal-header">UMA COGNITIVE ENGINE // NEXT TRACK SUGGESTIONS</div>
                <div className="suggestions-list">
                    {state.suggestions.length > 0 ? (
                        state.suggestions.map((s, i) => (
                            <div key={i} className="suggestion-row fade-in">
                                <div className="s-rank">0{i + 1}</div>
                                <div className="s-details">
                                    <span className="s-artist">{s.artist}</span>
                                    <span className="s-title">{s.title}</span>
                                </div>
                                <div className="s-meta">
                                    <span className="s-bpm">{Math.round(s.bpm)} BPM</span>
                                    <span className="s-key">{s.key}</span>
                                </div>
                                <div className="s-reason">{s.reason}</div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-suggestions">
                            SYSTEM READY. LOAD TRACK TO GENERATE COGNITIVE MAPPINGS.
                        </div>
                    )}
                </div>
            </div>

            {/* IP Configuration (Hidden but accessible) */}
            <div className="net-config">
                <small>Link: {umaIP}:8085</small>
                <input
                    type="text"
                    placeholder="Set RPi IP"
                    onBlur={(e) => e.target.value && setUmaIP(e.target.value)}
                />
            </div>
        </div>
    );
};

export default UMADashboard;

import { useState, useEffect, useRef, useCallback } from 'react';

// VITE_API_URL should be set (e.g. https://egg-backend.my.workers.dev)
// If local, http://localhost:8787/api -> ws://localhost:8787/ws
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

// Improved URL construction
const getWsUrl = (apiUrl) => {
    let url = apiUrl;
    if (url.endsWith('/api')) {
        url = url.substring(0, url.length - 4); // Remove /api
    }
    if (url.endsWith('/')) {
        url = url.substring(0, url.length - 1);
    }
    return url.replace(/^http/, 'ws') + "/ws";
};

const WS_URL = getWsUrl(API_URL);

export function useGameState() {
  const [serverState, setServerState] = useState({
    hp: 1000000,
    maxHp: 1000000,
    round: 1,
    status: 'PLAYING',
    clicksByCountry: {},
    onlinePlayers: 0,
    onlineSpectatorsApprox: 0,
    announcement: "",
    prize: "",
    prizeUrl: "",
    adUrl: "",
    rev: 0,
    lastUpdatedAt: 0,
    recentWinners: [] // added to initial state to prevent undefined
  });
  
  const [role, setRole] = useState(null); // 'player' | 'spectator'
  const [queuePos, setQueuePos] = useState(null);
  const [etaSec, setEtaSec] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [winningToken, setWinningToken] = useState(null); // Store winning token

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const clickAccumulator = useRef(0);
  const lastDeltaSentTime = useRef(0);
  const clientIdRef = useRef(crypto.randomUUID());

  // Detect Country (Simple)
  const countryRef = useRef("UN");

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Determine Mode
    // Logic: Try to be a player initially. If server returns 'spectator' + queue, we handle it.
    const url = `${WS_URL}?mode=player`;
    
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setConnected(true);
      setError(null);
      
      // Send JOIN
      ws.send(JSON.stringify({
          type: "join",
          mode: "player",
          clientId: clientIdRef.current,
          country: countryRef.current
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
            case 'join_ok':
                setRole(msg.role);
                setQueuePos(msg.queuePos);
                console.log(`[WS] Joined as ${msg.role}. Queue: ${msg.queuePos}`);
                break;
            
            case 'state':
                // Update State
                setServerState(prev => {
                    // Check revision/ts if strictly required, but usually just taking latest state is fine for simple games
                    // Prompt "D) server state version... client uses rev/lastUpdatedAt"
                    if (msg.lastUpdatedAt < prev.lastUpdatedAt && msg.round === prev.round) {
                        return prev; // Ignore old state
                    }
                    return msg;
                });
                break;

            case 'queue_update':
                setQueuePos(msg.queuePos);
                setEtaSec(msg.etaSec);
                break;

            case 'you_won':
                console.log("🎉 I WON!", msg.token);
                setWinningToken(msg.token);
                break;

            case 'error':
                console.error("[WS] Error:", msg.message);
                if (msg.code === 'FULL') {
                    setError('full');
                }
                break;
            
            default:
                break;
        }
      } catch (e) {
          console.error("[WS] Parse Error", e);
      }
    };

    ws.onclose = () => {
        console.log("[WS] Closed");
        setConnected(false);
        setRole(null);
        // Reconnect logic
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
        console.error("[WS] Error", err);
        ws.close();
    };

  }, []);

  useEffect(() => {
    // Detect country first? Or just connect.
    // Let's rely on App.jsx setting country in localStorage or similar?
    // For now, default UN.
    connect();

    // 5s Delta Sender Loop
    const interval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && clickAccumulator.current > 0) {
            const now = Date.now();
            // Ensure 5s gap? Server enforces it. Client just sends every 5s.
            // But we should sync with wall clock? No, just interval is fine.
            
            wsRef.current.send(JSON.stringify({
                type: 'click_delta',
                clientId: clientIdRef.current,
                delta: clickAccumulator.current,
                country: countryRef.current,
                ts: now
            }));
            
            console.log(`[WS] Sent Delta: ${clickAccumulator.current}`);
            clickAccumulator.current = 0;
            lastDeltaSentTime.current = now;
        }
    }, 5000);

    return () => {
        clearInterval(interval);
        if (wsRef.current) wsRef.current.close();
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const addClick = (power, country) => {
      clickAccumulator.current += power;
      if (country) countryRef.current = country;
  };

  return { 
      serverState, 
      API_URL, 
      error, 
      connected, 
      role, 
      queuePos, 
      etaSec,
      addClick,
      clientId: clientIdRef.current,
      winningToken
  };
}

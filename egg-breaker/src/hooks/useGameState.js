import { useState, useEffect, useRef, useCallback } from 'react';

// VITE_API_URL should be set
let rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
// Normalize URL: remove trailing /api or /
if (rawApiUrl.endsWith('/api')) {
    rawApiUrl = rawApiUrl.substring(0, rawApiUrl.length - 4);
}
if (rawApiUrl.endsWith('/')) {
    rawApiUrl = rawApiUrl.substring(0, rawApiUrl.length - 1);
}
const API_URL = rawApiUrl;

const getWsUrl = (apiUrl) => {
    return apiUrl.replace(/^http/, 'ws') + "/ws";
};

const WS_URL = getWsUrl(API_URL);

export function useGameState() {
  const [serverState, setServerState] = useState({
    hp: 1000000,
    maxHp: 1000000,
    round: 1,
    status: 'LOADING', // Changed from FINISHED to debug
    clicksByCountry: {},
    onlinePlayers: 0,
    onlineSpectatorsApprox: 0,
    announcement: "",
    prize: "",
    prizeUrl: "",
    adUrl: "",
    rev: 0,
    lastUpdatedAt: 0,
    recentWinners: []
  });
  
  const [role, setRole] = useState(null); // 'player' | 'spectator' | null (polling)
  const [queuePos, setQueuePos] = useState(null);
  const [etaSec, setEtaSec] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [winningToken, setWinningToken] = useState(null);
  const [rewardEvent, setRewardEvent] = useState(null);

  const wsRef = useRef(null);
  const clickAccumulator = useRef(0);
  const lastDeltaSentTime = useRef(0);
  
  // Persist Client ID across reloads/tabs
  const clientIdRef = useRef(() => {
      let stored = localStorage.getItem('egg_game_client_id');
      if (!stored) {
          stored = crypto.randomUUID();
          localStorage.setItem('egg_game_client_id', stored);
      }
      return stored;
  });
  
  // Fix: useRef value initialization needs to be called if function
  const clientId = typeof clientIdRef.current === 'function' ? clientIdRef.current() : clientIdRef.current;
  clientIdRef.current = clientId; // Ensure ref holds the string value

  const countryRef = useRef("UN");
  const pollingIntervalRef = useRef(null);

  // --- 1. Polling Logic (Default) ---
  const fetchState = async () => {
      try {
          // console.log(`[Polling] Fetching ${API_URL}/api/state`); // Log attempt
          const res = await fetch(`${API_URL}/api/state`);
          if (res.ok) {
              const data = await res.json();
              // console.log("[Polling] Success:", data); // Log success
              setServerState(prev => {
                  if (data.lastUpdatedAt < prev.lastUpdatedAt && data.round === prev.round) return prev;
                  return data;
              });
          } else {
             console.error(`[Polling] Failed: ${res.status}`);
          }
      } catch (e) {
          console.error("[Polling] Error:", e); // Log specific error
          setServerState(prev => ({ ...prev, status: 'ERROR', announcement: e.message }));
      }
  };

  useEffect(() => {
      // Start polling if NOT connected
      if (!connected) {
          fetchState(); // Initial fetch
          pollingIntervalRef.current = setInterval(fetchState, 10000);
      } else {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      }

      return () => {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      };
  }, [connected]);


  // --- 2. WebSocket Logic (On-Demand) ---
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}?mode=player`; // Always try to be player/queue
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setConnected(true);
      setError(null);
      
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
                console.log(`[WS] Joined as ${msg.role}`);
                break;
            case 'state':
                setServerState(prev => {
                   if (msg.lastUpdatedAt < prev.lastUpdatedAt && msg.round === prev.round) return prev;
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
            case 'invite_reward':
                console.log("🎁 Invite Reward!", msg.amount);
                setRewardEvent({ amount: msg.amount, msg: msg.msg, id: Date.now() });
                break;
            case 'error':
                console.error("[WS] Error:", msg.message);
                if (msg.code === 'FULL' || msg.code === 'ROUND_NOT_STARTED') {
                    setError(msg.code);
                    ws.close(); // Close immediately if rejected
                }
                break;
            default: break;
        }
      } catch (e) { console.error(e); }
    };

    ws.onclose = () => {
        console.log("[WS] Closed");
        setConnected(false);
        setRole(null);
        setQueuePos(null);
        // Do NOT auto-reconnect. Fallback to polling.
    };

    ws.onerror = (err) => {
        console.error("[WS] Error", err);
        ws.close();
    };
  }, []);

  const disconnect = useCallback(() => {
      if (wsRef.current) {
          wsRef.current.close();
      }
  }, []);

  // --- 3. Click Sender ---
  useEffect(() => {
    const interval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && clickAccumulator.current > 0) {
            const now = Date.now();
            wsRef.current.send(JSON.stringify({
                type: 'click_delta',
                clientId: clientIdRef.current,
                delta: clickAccumulator.current,
                country: countryRef.current,
                ts: now
            }));
            clickAccumulator.current = 0;
            lastDeltaSentTime.current = now;
        }
    }, 5000); // 5s Buffer

    return () => clearInterval(interval);
  }, []);

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
      connect, // Expose connect function
      disconnect,
      clientId: clientIdRef.current,
      winningToken,
      rewardEvent
  };
}

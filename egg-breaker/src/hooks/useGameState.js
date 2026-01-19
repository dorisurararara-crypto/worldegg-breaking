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

// [Config] Replace this with your actual R2 Public Bucket URL
// e.g. "https://pub-xxxxxxxx.r2.dev" or "https://state.your-domain.com"
// If not set, it falls back to the Worker API (Costly for high traffic).
const R2_URL = import.meta.env.VITE_R2_URL || "";

export function useGameState() {
  const [serverState, setServerState] = useState({
    hp: 1000000,
    maxHp: 1000000,
    round: 1,
    status: 'LOADING', 
    clicksByCountry: {},
    onlinePlayers: 0,
    onlineSpectatorsApprox: 0,
    maxAtk: 0,
    maxAtkCountry: "UN",
    maxPoints: 0,
    maxClicks: 0,
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
  const [winStartTime, setWinStartTime] = useState(null); 
  const [prizeSecretImageUrl, setPrizeSecretImageUrl] = useState(null);
  const [rewardEvent, setRewardEvent] = useState(null);

  const wsRef = useRef(null);
  const clickAccumulator = useRef(0);
  const maxPowerInBatch = useRef(0);
  const latestPoints = useRef(0);
  const latestTotalClicks = useRef(0);
  
  // Persist Client ID across reloads/tabs
  const clientIdRef = useRef(() => {
      let stored = localStorage.getItem('egg_game_client_id');
      if (!stored) {
          stored = crypto.randomUUID();
          localStorage.setItem('egg_game_client_id', stored);
      }
      return stored;
  });
  
  const clientId = typeof clientIdRef.current === 'function' ? clientIdRef.current() : clientIdRef.current;
  clientIdRef.current = clientId; 

  const countryRef = useRef("UN");
  const pollingTimeoutRef = useRef(null);
  const r2FailCount = useRef(0);

  // --- 1. Polling Logic (Dynamic with Backoff) ---
  const fetchState = useCallback(async () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

      let nextDelay = 5000; // Default 5s
      let usedR2 = false;

      try {
          // Determine Target URL
          let targetUrl = `${API_URL}/api/state`;
          
          // Use R2 if configured and not failing too much
          if (R2_URL && r2FailCount.current < 3) {
              targetUrl = `${R2_URL}/state.json`;
              usedR2 = true;
          } else if (R2_URL) {
              // R2 failed 3+ times. Fallback to API but slow down to save cost.
              // Also try to reset fail count after a successful API hit? 
              // No, let's try R2 again after some time (handled by nextDelay logic implicitly if we reset)
              // But here we just stick to API for this turn.
              // If we want to retry R2 later, we can decrement fail count occasionally or reset it after N success.
              // For safety, let's keep using API for a while (handled by nextDelay).
              // Simple Reset: Try R2 again after 1 minute?
              // Let's implement simple backoff: If API works, we stay on API for safety? 
              // Guide says: "fallback backoff". 
              // Let's reset fail count with 10% chance to retry R2?
              if (Math.random() < 0.1) r2FailCount.current = 0; 
              
              targetUrl = `${API_URL}/api/state`;
              nextDelay = 20000; // Slow polling on API (20s)
          } else {
              // No R2 configured. Always API.
              // If we want to save cost here too, use 20s. But default to 5s for responsiveness if no R2.
              // Guide says: "R2_URL 없으면 20~30초"
              nextDelay = 20000; 
          }

          const res = await fetch(targetUrl);
          
          if (res.ok) {
              const data = await res.json();
              setServerState(prev => {
                  if (data.lastUpdatedAt < prev.lastUpdatedAt && data.round === prev.round) return prev;
                  return data;
              });
              
              if (usedR2) {
                  r2FailCount.current = 0; // Success!
                  nextDelay = 5000; // Fast polling on R2 (free/cheap)
              } else {
                  // API Success. Keep slow polling.
                  nextDelay = 20000; 
              }
          } else {
              console.warn(`[Polling] Failed: ${res.status} (${usedR2 ? 'R2' : 'API'})`);
              if (usedR2) {
                  r2FailCount.current++;
                  nextDelay = 1000; // Retry quickly (will likely fall to API next time)
              } else {
                  nextDelay = 30000; // API failed? Wait longer.
              }
          }
      } catch (e) {
          console.error("[Polling] Error:", e);
          if (usedR2) {
              r2FailCount.current++;
              nextDelay = 1000;
          } else {
              nextDelay = 30000;
          }
      }

      // Schedule Next Poll
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          pollingTimeoutRef.current = setTimeout(fetchState, nextDelay);
      }
  }, [API_URL]);

  useEffect(() => {
      // Start polling if NOT connected
      if (!connected) {
          fetchState(); 
      } else {
          if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
      }

      return () => {
          if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
      };
  }, [connected, fetchState]);


  // --- 2. WebSocket Logic (On-Demand) ---
  const connect = useCallback(() => {
    // If connecting, wait.
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        return;
    }

    // If already connected, just resend join (retry logic)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log("[WS] Resending join...");
        wsRef.current.send(JSON.stringify({
            type: "join",
            mode: "player",
            clientId: clientIdRef.current,
            country: countryRef.current
        }));
        return;
    }

    const url = `${WS_URL}?mode=player`; // Always try to be player/queue
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setConnected(true);
      setError(null);
      // Stop polling immediately
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
      
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
                // Clear error if we successfully joined (even if it was FULL before)
                setError(null); 
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
                if (msg.startTime) setWinStartTime(msg.startTime); // [Sync]
                if (msg.prizeSecretUrl) setPrizeSecretImageUrl(msg.prizeSecretUrl);
                break;
            case 'invite_reward':
                console.log("🎁 Invite Reward!", msg.amount);
                setRewardEvent({ amount: msg.amount, msg: msg.msg, id: Date.now() });
                break;
            case 'error':
                if (msg.code === 'GAME_OVER') {
                    console.log("[WS] Round Ended:", msg.message);
                    // Do not close connection here, wait for server close or manual handling
                } else {
                    console.error("[WS] Error:", msg.message);
                    if (msg.code === 'FULL' || msg.code === 'ROUND_NOT_STARTED') {
                        setError(msg.code);
                        ws.close(); 
                    }
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
        // Fallback to polling
        fetchState();
    };

    ws.onerror = (err) => {
        console.error("[WS] Error", err);
        ws.close();
    };
  }, [fetchState]);

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
                atk: maxPowerInBatch.current,
                points: latestPoints.current,
                totalClicks: latestTotalClicks.current,
                country: countryRef.current,
                ts: now
            }));
            clickAccumulator.current = 0;
            maxPowerInBatch.current = 0;
            // lastDeltaSentTime.current = now;
        }
    }, 5000); // 5s Buffer

    return () => clearInterval(interval);
  }, []);

  const addClick = (power, country, currentPoints, totalClicks) => {
      clickAccumulator.current += power;
      if (power > maxPowerInBatch.current) {
          maxPowerInBatch.current = power;
      }
      latestPoints.current = currentPoints;
      latestTotalClicks.current = totalClicks;
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
      winStartTime, // [New]
      prizeSecretImageUrl,
      rewardEvent
  };
}
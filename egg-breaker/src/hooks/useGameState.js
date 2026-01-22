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

// [Config] Fixed R2 URL
const R2_URL = "https://r2.egglest.com";

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
  const roundRef = useRef(1); // [New] Track round
  const pollingTimeoutRef = useRef(null);
  const r2FailCount = useRef(0);
  const consecFailures = useRef(0); // For exponential backoff

  // [New] Interaction & Idle Tracking
  const lastInteractionAt = useRef(Date.now());
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState(null); // 'idle_queue', 'hidden_player'

  useEffect(() => {
      const updateInteraction = () => {
          lastInteractionAt.current = Date.now();
          if (isPollingPaused) resumePolling(); // Auto-resume on interaction
      };
      
      window.addEventListener('mousemove', updateInteraction);
      window.addEventListener('keydown', updateInteraction);
      window.addEventListener('touchstart', updateInteraction);
      window.addEventListener('scroll', updateInteraction);
      window.addEventListener('click', updateInteraction);
      
      return () => {
          window.removeEventListener('mousemove', updateInteraction);
          window.removeEventListener('keydown', updateInteraction);
          window.removeEventListener('touchstart', updateInteraction);
          window.removeEventListener('scroll', updateInteraction);
          window.removeEventListener('click', updateInteraction);
      };
  }, [isPollingPaused]);

  // Update roundRef whenever serverState changes
  useEffect(() => {
      if (serverState.round) roundRef.current = serverState.round;
  }, [serverState.round]);

  const resumePolling = useCallback(() => {
      setIsPollingPaused(false);
      setDisconnectReason(null);
      fetchState();
  }, []);

  // --- 1. Polling Logic (Dynamic with Backoff) ---
  const fetchState = useCallback(async () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      if (isPollingPaused) return; // Stop if paused

      let nextDelay = 10000; // Default 10s
      let usedR2 = false;
      const jitter = Math.floor(Math.random() * 3000); // 0~3000ms Jitter

      // [New] Adaptive Backoff Calculation
      const now = Date.now();
      const idleTime = now - lastInteractionAt.current;
      const isHidden = document.hidden;
      
      // Hard Stop Check: Hidden > 2h OR Idle > 8h (Visible)
      const hardStopMs = isHidden ? 2 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
      if (idleTime > hardStopMs) {
          console.log("[Polling] Hard stop due to inactivity.");
          setIsPollingPaused(true);
          return;
      }

      try {
          // Determine Target URL
          let targetUrl = `${API_URL}/api/state`;
          
          // Use R2 if configured and not failing too much
          if (R2_URL && r2FailCount.current < 3) {
              targetUrl = `${R2_URL}/state.json`;
              usedR2 = true;
          } else {
              // R2 failed 3+ times. Fallback to API but slow down to save cost.
              // Occasionally retry R2 (10% chance) to see if it recovered
              if (Math.random() < 0.1) r2FailCount.current = 0; 
              
              targetUrl = `${API_URL}/api/state`;
          }

          const res = await fetch(targetUrl);
          
          if (res.ok) {
              const data = await res.json();
              setServerState(prev => {
                  if (data.lastUpdatedAt < prev.lastUpdatedAt && data.round === prev.round) return prev;
                  return data;
              });
              
              if (usedR2) {
                  r2FailCount.current = 0; 
                  consecFailures.current = 0;
                  
                  // Dynamic Polling Interval Logic
                  if (isHidden) {
                      const hiddenTime = idleTime; // Approx
                      if (hiddenTime < 10 * 60 * 1000) {
                          nextDelay = 60000; // 0-10m: 60s
                      } else if (hiddenTime < 60 * 60 * 1000) {
                          nextDelay = 180000; // 10-60m: 3m
                      } else {
                          nextDelay = 300000; // 60m+: 5m
                      }
                  } else if (!role || role === 'spectator') {
                      nextDelay = 45000; // Slower for spectators
                  } else {
                      nextDelay = 10000; // Normal
                  }
              } else {
                  // API Success. Keep slow polling.
                  consecFailures.current = 0;
                  nextDelay = 30000; 
              }
          } else {
              console.warn(`[Polling] Failed: ${res.status} (${usedR2 ? 'R2' : 'API'})`);
              if (usedR2) r2FailCount.current++;
              
              consecFailures.current++;
              
              // Exponential Backoff: 30s -> 45s -> 60s (Max)
              // 1st fail: 30s, 2nd: 45s, 3rd+: 60s
              const backoff = Math.min(60000, 30000 + (consecFailures.current - 1) * 15000);
              nextDelay = Math.max(30000, backoff);
          }
      } catch (e) {
          console.error("[Polling] Error:", e);
          if (usedR2) r2FailCount.current++;
          
          consecFailures.current++;
          
          const backoff = Math.min(60000, 30000 + (consecFailures.current - 1) * 15000);
          nextDelay = Math.max(30000, backoff);
      }

      // Add jitter to prevent thundering herd (Reduced if long interval)
      const finalJitter = nextDelay > 60000 ? Math.floor(Math.random() * (nextDelay * 0.1)) : jitter;
      nextDelay += finalJitter;

      // Schedule Next Poll
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          pollingTimeoutRef.current = setTimeout(fetchState, nextDelay);
      }
  }, [API_URL, isPollingPaused, role]);

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

  // --- [New] Heartbeat & Auto-Disconnect Logic ---
  useEffect(() => {
      if (!connected) return;

      const timer = setInterval(() => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

          const now = Date.now();
          const idleTime = now - lastInteractionAt.current;
          const isHidden = document.hidden;

          // 1. Heartbeat (Ping) every 30s roughly (timer is 10s, so every 3rd tick, or just always send ping if interval is 30s. 
          // Let's make a separate interval for ping or just check time.)
          // We'll use a simple approach: Send ping every execution if it's been 30s. 
          // Actually, let's just make the interval 30s for ping, and check disconnect logic there too?
          // No, disconnect needs faster check maybe? 10s is fine.
          
          // Send Ping
          // To avoid flooding, let's use a ref or modulo.
          // Or just separate intervals. Let's use separate intervals for clarity.
      }, 10000); // Placeholder, will replace with separate effects below.
      
      return () => clearInterval(timer);
  }, [connected]);

  // Actual Heartbeat (30s)
  useEffect(() => {
      if (!connected) return;
      const pingTimer = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
      }, 30000);
      return () => clearInterval(pingTimer);
  }, [connected]);

  // Actual Auto-Disconnect (Check every 10s)
  useEffect(() => {
      if (!connected) return;
      const checkTimer = setInterval(() => {
          const now = Date.now();
          const idleTime = now - lastInteractionAt.current;
          const isHidden = document.hidden; // Note: closure capture might be stale? No, document is global.
          
          // Queue Auto-Leave (30m)
          if (queuePos !== null) {
               if (idleTime > 30 * 60 * 1000 || (isHidden && idleTime > 30 * 60 * 1000)) {
                   console.log("[WS] Auto-leaving queue due to inactivity.");
                   if (wsRef.current) wsRef.current.close();
                   setDisconnectReason('idle_queue');
               }
          } 
          // Player Auto-Disconnect (Hidden > 10m)
          // Note: idleTime is not used for players, only hidden state for safety.
          else if (role === 'player') {
               // We need to track how long it's been hidden. 
               // Since we don't have a specific "hiddenStart" ref easily without more state,
               // we can use lastInteractionAt as a proxy if we assume hidden implies no interaction.
               // But background audio/network might keep it "active"? No, interaction is user input.
               // So if hidden AND idle > 10m, it's safe to say they are gone.
               if (isHidden && idleTime > 10 * 60 * 1000) {
                   console.log("[WS] Auto-disconnecting player due to hidden.");
                   if (wsRef.current) wsRef.current.close();
                   setDisconnectReason('hidden_player');
               }
          }
      }, 10000);
      return () => clearInterval(checkTimer);
  }, [connected, queuePos, role]);

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
                round: roundRef.current, // [New]
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
      rewardEvent,
      isPollingPaused, // [New]
      resumePolling,   // [New]
      disconnectReason // [New]
  };
}
import { DurableObject } from "cloudflare:workers";

interface GameState {
  hp: number;
  maxHp: number;
  round: number;
  status: 'PLAYING' | 'WINNER_CHECK' | 'FINISHED';
  winnerInfo: any;
  winnerCheckStartTime: number;
  winningClientId?: string; // ID of the winner (before email is set)
  winningToken?: string;    // Secret token for the winner to claim prize
  clicksByCountry: Record<string, number>;
  announcement: string;
  prize: string;
  prizeUrl: string;
  adUrl: string;
  recentWinners: any[];
  rev: number;
  lastUpdatedAt: number;
}

interface PlayerSession {
  ws: WebSocket;
  ip: string;
  clientId: string;
  country: string;
  lastSeen: number;
  lastDeltaTime: number; // For rate limiting
  role: 'player' | 'spectator';
  queueToken?: string;
}

interface QueueItem {
  token: string;
  clientId: string;
  joinedAt: number;
  ws: WebSocket; // We need WS ref to upgrade them
}

export class GameDO extends DurableObject {
  state: DurableObjectState;
  env: any;
  
  // In-memory state
  gameState: GameState;
  
  // Connections
  sessions: Map<WebSocket, PlayerSession> = new Map(); // Reverse lookup
  players: Map<string, PlayerSession> = new Map(); // clientId -> Session (Active Players)
  // Spectators are just in sessions with role='spectator'
  
  queue: QueueItem[] = [];
  
  // Constants
  MAX_PLAYERS = 1000;
  BROADCAST_INTERVAL_MS = 2000; // 2 seconds
  SAVE_INTERVAL_MS = 20000; // 20 seconds
  
  // Loop Handles
  broadcastInterval: any = null;
  saveInterval: any = null;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.state = state;
    this.env = env;

    // Default State
    this.gameState = {
      hp: 1000000,
      maxHp: 1000000,
      round: 1,
      status: 'PLAYING',
      winnerInfo: null,
      winnerCheckStartTime: 0,
      winningClientId: undefined,
      winningToken: undefined,
      clicksByCountry: {},
      announcement: "Welcome to Egg Pong!",
      prize: "Amazon Gift Card $50",
      prizeUrl: "https://amazon.com",
      adUrl: "",
      recentWinners: [],
      rev: 0,
      lastUpdatedAt: Date.now()
    };
    
    // Recovery
    this.state.blockConcurrencyWhile(async () => {
      const stored: any = await this.state.storage.get("fullState");
      if (stored) {
        this.gameState = { ...this.gameState, ...stored };
      }
      // Start loops
      this.startLoops();
    });
  }

  startLoops() {
      if (!this.broadcastInterval) {
          this.broadcastInterval = setInterval(() => this.broadcastState(), this.BROADCAST_INTERVAL_MS);
      }
      if (!this.saveInterval) {
          this.saveInterval = setInterval(() => this.saveState(), this.SAVE_INTERVAL_MS);
      }
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // WebSocket Upgrade
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }
      
      const { 0: client, 1: server } = new WebSocketPair();
      
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const mode = url.searchParams.get("mode") || "spectator"; // Default to spectator
      
      // Handle the connection
      this.handleSession(server, ip, mode);

      return new Response(null, { status: 101, webSocket: client });
    }

    // --- Admin HTTP API ---
    if (url.pathname.startsWith("/admin/")) {
        return this.handleAdmin(request, url);
    }
    
    // Legacy /winner Endpoint for Prize Claim (Now Secured)
    if (url.pathname === "/winner" && request.method === "POST") {
      const body: any = await request.json();
      
      // Security Check: Must be WINNER_CHECK and Token must match
      if (this.gameState.status !== 'WINNER_CHECK') {
          return new Response(JSON.stringify({ error: "Game not in winner check mode" }), { status: 400 });
      }
      if (!this.gameState.winningToken || body.token !== this.gameState.winningToken) {
          return new Response(JSON.stringify({ error: "Invalid winning token" }), { status: 403 });
      }
      
      try {
          await this.env.DB.prepare(
            "INSERT INTO winners (round, email, country, prize) VALUES (?, ?, ?, ?)"
          ).bind(this.gameState.round, body.email, body.country, this.gameState.prize).run();
      } catch (e) {
          // Ignore DB error
      }
      
      const maskedEmail = body.email.replace(/(^.{3}).+(@.+)/, "$1***$2");
      this.gameState.winnerInfo = { country: body.country, email: maskedEmail };
      this.gameState.status = 'FINISHED'; // Game ends, waits for admin reset
      
      // Clear sensitive info
      this.gameState.winningClientId = undefined;
      this.gameState.winningToken = undefined;

      this.gameState.recentWinners.unshift({
          round: this.gameState.round,
          prize: this.gameState.prize,
          date: new Date().toISOString()
      });
      if (this.gameState.recentWinners.length > 5) this.gameState.recentWinners.pop();

      this.gameState.lastUpdatedAt = Date.now();
      await this.saveState();
      this.broadcastState();

      return new Response(JSON.stringify({ success: true }));
    }
    
    // Simple state getter (for fallback/polling)
    if (url.pathname === "/state") {
        return new Response(JSON.stringify({
            ...this.gameState,
            onlinePlayers: this.players.size,
            onlineSpectatorsApprox: this.sessions.size - this.players.size,
            serverTs: Date.now()
        }), { headers: { "Content-Type": "application/json" }});
    }

    return new Response("Not Found", { status: 404 });
  }

  handleSession(ws: WebSocket, ip: string, requestedMode: string) {
    this.state.acceptWebSocket(ws);
    
    // Temporary session, wait for 'join' message to finalize
    // But we need to store it to handle 'join' message
    // actually, we can just wait for the first message? 
    // No, standard `webSocketMessage` handler will be called.
    // We attach metadata to the socket object or use a Map.
    // We use `sessions` Map.
    
    // We don't know clientId yet.
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
      
      // 1. JOIN
      if (msg.type === 'join') {
        const clientId = msg.clientId || crypto.randomUUID();
        const country = msg.country || "UN";
        const requestedMode = msg.mode || "spectator";
        
        let role: 'player' | 'spectator' = 'spectator';
        let queuePos: number | null = null;
        let queueToken: string | undefined;

        // Cleanup old session if same socket (unlikely)
        if (this.sessions.has(ws)) {
            this.cleanupSession(ws); 
        }

        // Logic
        if (requestedMode === 'player') {
            if (this.players.size < this.MAX_PLAYERS) {
                role = 'player';
                this.players.set(clientId, {
                    ws, ip: "unknown", clientId, country, 
                    lastSeen: Date.now(), lastDeltaTime: 0, role: 'player'
                });
            } else {
                role = 'spectator';
                queueToken = crypto.randomUUID();
                this.queue.push({ token: queueToken, clientId, joinedAt: Date.now(), ws });
                queuePos = this.queue.length;
            }
        } else {
            role = 'spectator';
        }

        const session: PlayerSession = {
            ws, ip: "unknown", clientId, country, 
            lastSeen: Date.now(), lastDeltaTime: 0, role, queueToken
        };
        this.sessions.set(ws, session);

        ws.send(JSON.stringify({
            type: 'join_ok',
            role,
            queuePos,
            serverTs: Date.now(),
            buildId: "v1.0.0"
        }));

        // Send initial state immediately
        this.sendStateTo(ws);
        return;
      }

      // Check session
      const session = this.sessions.get(ws);
      if (!session) return; // Ignore if not joined
      session.lastSeen = Date.now();

      // 2. CLICK_DELTA
      if (msg.type === 'click_delta') {
          if (session.role !== 'player') {
              ws.send(JSON.stringify({ type: 'error', code: 'NOT_PLAYER', message: 'You are a spectator' }));
              return;
          }

          // Rate Limit (Simple: 5s interval)
          const now = Date.now();
          if (now - session.lastDeltaTime < 4500) { // Allow slight drift (4.5s)
              // Too fast - ignore or warn
              // ws.send(JSON.stringify({ type: 'error', code: 'RATE_LIMIT', message: 'Too fast' }));
              return; 
          }

          const delta = Number(msg.delta);
          if (isNaN(delta) || delta <= 0 || delta > 500) { // Max 500 clicks per 5s (100 CPS limit)
              ws.send(JSON.stringify({ type: 'error', code: 'BAD_DELTA', message: 'Invalid delta' }));
              return;
          }
          
          session.lastDeltaTime = now;

          // Apply Damage
          if (this.gameState.status === 'PLAYING' && this.gameState.hp > 0) {
              this.gameState.hp = Math.max(0, this.gameState.hp - delta);
              this.gameState.clicksByCountry[session.country] = (this.gameState.clicksByCountry[session.country] || 0) + delta;
              this.gameState.lastUpdatedAt = now;
              // Rev is not incremented on every click to save bandwidth in checks, 
              // but purely timestamp based.
              // However, prompt says "rev++ or lastUpdatedAt".
              
              if (this.gameState.hp === 0) {
                  this.gameState.status = 'WINNER_CHECK';
                  this.gameState.winnerCheckStartTime = now;
                  
                  // 1. Identify Winner
                  this.gameState.winningClientId = session.clientId;
                  this.gameState.winningToken = crypto.randomUUID();

                  // Notify Winner Privately
                  session.ws.send(JSON.stringify({
                      type: 'you_won',
                      token: this.gameState.winningToken,
                      round: this.gameState.round
                  }));
                  
                  // 2. Rotate Players (Move current players to back of queue)
                  this.rotatePlayers();

                  this.saveState(); // Critical
                  this.broadcastState(); // Notify immediately
              }
          }
      }

      // 3. PING
      if (msg.type === 'ping') {
          // just updates lastSeen
      }

    } catch (e) {
      // console.error(e);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
      this.cleanupSession(ws);
  }
  
  async webSocketError(ws: WebSocket, error: any) {
      this.cleanupSession(ws);
  }

  cleanupSession(ws: WebSocket) {
      const session = this.sessions.get(ws);
      if (session) {
          if (session.role === 'player') {
              this.players.delete(session.clientId);
              this.promoteFromQueue(); // Slot opened!
          } else if (session.queueToken) {
              // Remove from queue
              this.queue = this.queue.filter(q => q.token !== session.queueToken);
              // Notify others in queue? No, too expensive. Just update them on broadcast/ping?
              // Actually queue positions change. Ideally notify.
              // But for cost, maybe lazily or only when they ask? 
              // Let's rely on periodic Queue Update? 
          }
          this.sessions.delete(ws);
      }
  }

  promoteFromQueue() {
      if (this.queue.length === 0) return;
      
      const next = this.queue.shift();
      if (!next) return;

      const session = this.sessions.get(next.ws);
      if (session) {
          session.role = 'player';
          session.queueToken = undefined;
          this.players.set(session.clientId, session);
          
          // Notify
          next.ws.send(JSON.stringify({
              type: 'join_ok',
              role: 'player',
              queuePos: null,
              serverTs: Date.now()
          }));
          
          // Notify remaining queue?
          this.broadcastQueueUpdate();
      } else {
          // Session dead, try next
          this.promoteFromQueue();
      }
  }

  rotatePlayers() {
      // 1. Move all current players to the BACK of the queue
      const currentPlayers = Array.from(this.players.values());
      
      // Sort by some criteria if needed, but random/insertion order is fine
      for (const p of currentPlayers) {
          p.role = 'spectator';
          const token = crypto.randomUUID();
          p.queueToken = token;
          this.queue.push({ 
              token, 
              clientId: p.clientId, 
              joinedAt: Date.now(), 
              ws: p.ws 
          });
          
          // Notify them they are now spectators (queued)
          if (p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(JSON.stringify({
                  type: 'join_ok',
                  role: 'spectator',
                  queuePos: this.queue.length,
                  serverTs: Date.now()
              }));
          }
      }
      
      // Clear active players list
      this.players.clear();

      // 2. Promote spectators from the FRONT of the queue to fill the slots
      // They become players for the NEXT round, but they can't play yet (status != PLAYING)
      while (this.players.size < this.MAX_PLAYERS && this.queue.length > 0) {
          this.promoteFromQueue();
      }
      
      this.broadcastQueueUpdate();
  }

  broadcastQueueUpdate() {
      // Send queue update to those with tokens
      this.queue.forEach((item, idx) => {
          if (item.ws.readyState === WebSocket.OPEN) {
              item.ws.send(JSON.stringify({
                  type: 'queue_update',
                  queuePos: idx + 1,
                  etaSec: (idx + 1) * 30 // Rough guess
              }));
          }
      });
  }

  broadcastState() {
      if (this.sessions.size === 0) return;

      const payload = JSON.stringify({
          type: 'state',
          hp: this.gameState.hp,
          maxHp: this.gameState.maxHp,
          round: this.gameState.round,
          status: this.gameState.status,
          winnerInfo: this.gameState.winnerInfo,
          winningClientId: this.gameState.winningClientId, // Send winner ID
          onlinePlayers: this.players.size,
          onlineSpectatorsApprox: this.sessions.size - this.players.size,
          announcement: this.gameState.announcement,
          prize: this.gameState.prize,
          prizeUrl: this.gameState.prizeUrl,
          adUrl: this.gameState.adUrl,
          rev: this.gameState.rev,
          lastUpdatedAt: this.gameState.lastUpdatedAt
      });

      // Simple broadcast to all
      for (const ws of this.sessions.keys()) {
          try {
            ws.send(payload);
          } catch(e) {
             // likely closed
             this.cleanupSession(ws);
          }
      }
  }

  async saveState() {
      await this.state.storage.put("fullState", this.gameState);
  }

  // --- Admin Logic ---
  async handleAdmin(request: Request, url: URL) {
      const authKey = request.headers.get("x-admin-key");
      if (authKey !== "egg1234") return new Response("Unauthorized", { status: 401 });
      
      const action = url.pathname.replace("/admin/", "");
      let details = "";
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";

      if (action === "reset-round") {
          this.gameState.hp = 1000000;
          this.gameState.round += 1;
          this.gameState.clicksByCountry = {};
          this.gameState.status = 'PLAYING';
          this.gameState.winnerInfo = null;
          this.gameState.lastUpdatedAt = Date.now();
          details = `Reset Round to ${this.gameState.round}`;
          await this.saveState();
          this.broadcastState();
      } else if (action === "set-hp" && request.method === "POST") {
          const body: any = await request.json();
          this.gameState.hp = body.hp;
          this.gameState.status = 'PLAYING';
          this.gameState.winnerInfo = null;
          this.gameState.lastUpdatedAt = Date.now();
          details = `Set HP to ${body.hp}`;
          await this.saveState();
          this.broadcastState();
      } else if (action === "config" && request.method === "POST") {
          const body: any = await request.json();
          if (body.announcement !== undefined) this.gameState.announcement = body.announcement;
          if (body.prize !== undefined) this.gameState.prize = body.prize;
          if (body.prizeUrl !== undefined) this.gameState.prizeUrl = body.prizeUrl;
          if (body.adUrl !== undefined) this.gameState.adUrl = body.adUrl;
          this.gameState.lastUpdatedAt = Date.now();
          details = `Config Updated`;
          await this.saveState();
          this.broadcastState();
      } else if (action === "winner" && request.method === "POST") {
           // Manual winner selection or verification?
           // Original had /winner in public API, but it should be protected or part of game logic
           // The previous code had public /winner. 
           // In new architecture, we should keep /winner logic but maybe secure it?
           // Actually, the prompt says "Admin: ... + audit log".
           // Client claims prize via /winner usually? 
           // In this design, client doesn't call /winner to WIN, client calls click_delta -> hp=0 -> WINNER_CHECK.
           // Then 'someone' sends the email?
           // Usually the person who clicked 0 sends a claim request.
           // Let's keep a separate handler for Prize Claiming, which is NOT admin.
      }

      // Audit Log
      if (details) {
          try {
             await this.env.DB.prepare("INSERT INTO audit_logs (action, details, ip) VALUES (?, ?, ?)")
             .bind(action, details, ip).run();
          } catch(e) {}
      }

      return new Response(JSON.stringify({ success: true }));
  }

  sendStateTo(ws: WebSocket) {
      ws.send(JSON.stringify({
          type: 'state',
          hp: this.gameState.hp,
          maxHp: this.gameState.maxHp,
          round: this.gameState.round,
          status: this.gameState.status,
          winnerInfo: this.gameState.winnerInfo,
          winningClientId: this.gameState.winningClientId,
          onlinePlayers: this.players.size,
          onlineSpectatorsApprox: this.sessions.size - this.players.size,
          announcement: this.gameState.announcement,
          prize: this.gameState.prize,
          prizeUrl: this.gameState.prizeUrl,
          adUrl: this.gameState.adUrl,
          rev: this.gameState.rev,
          lastUpdatedAt: this.gameState.lastUpdatedAt
      }));
  }
}

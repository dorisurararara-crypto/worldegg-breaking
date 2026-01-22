import { DurableObject } from "cloudflare:workers";

interface GameState {
  hp: number;
  maxHp: number;
  round: number;
  status: 'PLAYING' | 'WINNER_CHECK' | 'FINISHED';
  winnerInfo: any;
  winnerCheckStartTime: number;
  winningClientId?: string; 
  winningToken?: string;    
  clicksByCountry: Record<string, number>;
  maxAtk: number;          // [Sync] Added
  maxAtkCountry: string;   // [Sync] Added
  maxPoints: number;       // [Sync] Added
  maxClicks: number;       // [Sync] Added
  fakePlayers?: number;    // [Test]
  fakeQueue?: number;      // [Test]
  announcement: string;
  prize: string;
  prizeUrl: string;
  prizeImageUrl: string;   // [New] Public preview image
  prizeSecretUrl: string;  // [New] Secret image for winner only
  nextPrizeName?: string;  // [New] Next prize in queue
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
  lastDeltaTime: number; 
  warnings?: number;     
  role: 'player' | 'spectator';
  queueToken?: string;
}

interface QueueItem {
  token: string;
  clientId: string;
  joinedAt: number;
  ws: WebSocket; 
}

export class GameDO extends DurableObject {
  state: DurableObjectState;
  env: any;
  
  // In-memory state
  gameState: GameState;
  
  // Connections
  sessions: Map<WebSocket, PlayerSession> = new Map(); 
  players: Map<string, PlayerSession> = new Map(); 
  
  queue: QueueItem[] = [];
  
  // Invite System
  pendingRewards: Map<string, number> = new Map();
  inviteCooldowns: Map<string, number> = new Map(); // Rate limiting (Memory only)
  
  // Constants
  MAX_PLAYERS = 1000;
  MAX_QUEUE = 1000; 
  BROADCAST_INTERVAL_MS = 2000; 
  SAVE_INTERVAL_MS = 20000; 
  CLEANUP_INTERVAL_MS = 60000; // [New]
  
  // Loop Handles
  broadcastInterval: any = null;
  saveInterval: any = null;
  saveToR2Interval: any = null; // [New] R2 Upload Loop
  cleanupInterval: any = null; // [New]
  
  // Optimization
  lastBroadcastHp: number = -1;
  lastBroadcastTime: number = 0;
  lastBroadcastPlayers: number = -1;
  stateChanged: boolean = false; // [New] Track changes for R2 upload
  private stateVersion = 0; // [New] For R2 race condition prevention

  touchState() {
      this.stateVersion++;
      this.stateChanged = true;
      this.gameState.lastUpdatedAt = Date.now();
  }

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.state = state;
    this.env = env;

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
      maxAtk: 1,              // [Sync] Added
      maxAtkCountry: "UN",    // [Sync] Added
      maxPoints: 0,           // [Sync] Added
      maxClicks: 0,           // [Sync] Added
      fakePlayers: 0,         // [Test]
      fakeQueue: 0,           // [Test]
      announcement: "Welcome to Egg Pong!",
      prize: "Amazon Gift Card $50",
      prizeUrl: "https://amazon.com",
      prizeImageUrl: "",
      prizeSecretUrl: "",
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
        // [Sync] Ensure defaults for new fields if missing in stored state
        this.gameState.maxAtk = this.gameState.maxAtk || 1;
        this.gameState.maxAtkCountry = this.gameState.maxAtkCountry || "UN";
        this.gameState.maxPoints = this.gameState.maxPoints || 0;
        this.gameState.maxClicks = this.gameState.maxClicks || 0;
        this.gameState.prizeImageUrl = this.gameState.prizeImageUrl || "";
        this.gameState.prizeSecretUrl = this.gameState.prizeSecretUrl || "";
      }
      
      const storedRewards: any = await this.state.storage.get("pendingRewards");
      if (storedRewards) {
          this.pendingRewards = storedRewards;
      }
      
      try {
          const { results } = await this.env.DB.prepare(
              "SELECT round, prize, created_at as date FROM winners ORDER BY id DESC LIMIT 5"
          ).all();
          
          if (results && Array.isArray(results)) {
              this.gameState.recentWinners = results;
          }
      } catch (e) {
          console.error("[Recovery] Failed to load winners:", e);
      }

      this.startLoops();
      this.updateNextPrize();
      this.loadCurrentPrize(); // [New]
    });
  }

  async updateNextPrize() {
      try {
          const nextPrize: any = await this.env.DB.prepare(
              "SELECT name, link FROM prize_pool WHERE is_used = 0 ORDER BY id ASC LIMIT 1"
          ).first();
          
          if (nextPrize) {
               if (this.gameState.nextPrizeName !== nextPrize.name) {
                   this.gameState.nextPrizeName = nextPrize.name;
                   this.stateChanged = true;
               }
          } else {
               if (this.gameState.nextPrizeName !== undefined) {
                   this.gameState.nextPrizeName = undefined;
                   this.stateChanged = true;
               }
          }
      } catch (e) {}
  }

  // [New] Load Prize for New Round (Helper)
  async loadCurrentPrize() {
      try {
          const currentPrize: any = await this.env.DB.prepare(
              "SELECT name, image_url, secret_url, link FROM prize_pool WHERE is_used = 0 ORDER BY id ASC LIMIT 1"
          ).first();

          if (currentPrize) {
              this.gameState.prize = currentPrize.name;
              this.gameState.prizeUrl = currentPrize.link || ""; // [New] Link
              this.gameState.prizeImageUrl = currentPrize.image_url || "";
              this.gameState.prizeSecretUrl = currentPrize.secret_url || "";
          } else {
              // Fallback
              this.gameState.prize = "Mystery Prize";
              this.gameState.prizeUrl = "";
              this.gameState.prizeImageUrl = "";
              this.gameState.prizeSecretUrl = "";
          }
          this.stateChanged = true;
      } catch (e) {}
  }

  startLoops() {
      if (!this.broadcastInterval) {
          this.broadcastInterval = setInterval(() => this.broadcastState(), this.BROADCAST_INTERVAL_MS);
      }
      if (!this.saveInterval) {
          this.saveInterval = setInterval(() => this.saveState(), this.SAVE_INTERVAL_MS);
      }
      // [New] R2 Upload Loop (Adjusted to 5s, checking stateChanged)
      if (!this.saveToR2Interval) {
          // Upload immediately on start
          this.uploadStateToR2().catch(() => {});
          this.saveToR2Interval = setInterval(() => {
              if (this.stateChanged) {
                  this.uploadStateToR2();
              }
          }, 5000);
      }
      // [New] Cleanup Loop
      if (!this.cleanupInterval) {
          this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), this.CLEANUP_INTERVAL_MS);
      }
  }

  // [New] Cleanup Inactive Sessions
  cleanupInactiveSessions() {
      const now = Date.now();
      let changed = false;

      for (const [ws, session] of this.sessions.entries()) {
          const idleTime = now - session.lastSeen;
          let shouldRemove = false;

          if (session.role === 'player') {
              // Players: 10 min hard limit (even if connected, if no ping/activity)
              if (idleTime > 10 * 60 * 1000) {
                  shouldRemove = true;
                  try {
                      ws.send(JSON.stringify({ type: 'error', code: 'IDLE_TIMEOUT', message: 'Disconnected due to inactivity.' }));
                      ws.close(1000, "Idle Timeout");
                  } catch (e) {}
              }
          } else if (session.queueToken) {
              // Queue: 30 min limit
              if (idleTime > 30 * 60 * 1000) {
                  shouldRemove = true;
                  try {
                      ws.send(JSON.stringify({ type: 'error', code: 'IDLE_TIMEOUT', message: 'Removed from queue due to inactivity.' }));
                      ws.close(1000, "Idle Timeout");
                  } catch (e) {}
              }
          } else {
              // Spectators: 60 min limit (save server memory)
              if (idleTime > 60 * 60 * 1000) {
                  shouldRemove = true;
                  ws.close(1000, "Idle Timeout");
              }
          }

          if (shouldRemove) {
              this.cleanupSession(ws);
              changed = true;
          }
      }

      if (changed) {
          this.broadcastQueueUpdate(); // If queue changed
          this.touchState();
          this.broadcastState();
      }
  }
  
  // [New] Helper to build safe public state
  buildPublicState() {
      return {
          hp: this.gameState.hp,
          maxHp: this.gameState.maxHp,
          round: this.gameState.round,
          status: this.gameState.status,
          winnerInfo: this.gameState.winnerInfo,
          // winningClientId: EXCLUDED
          // winningToken: EXCLUDED
          clicksByCountry: this.gameState.clicksByCountry,
          maxAtk: this.gameState.maxAtk,
          maxAtkCountry: this.gameState.maxAtkCountry,
          maxPoints: this.gameState.maxPoints,
          maxClicks: this.gameState.maxClicks,
          announcement: this.gameState.announcement,
          nextPrizeName: this.gameState.nextPrizeName,
          prize: this.gameState.prize,
          prizeUrl: this.gameState.prizeUrl,
          prizeImageUrl: this.gameState.prizeImageUrl,
          // prizeSecretUrl: EXCLUDED
          adUrl: this.gameState.adUrl,
          recentWinners: this.gameState.recentWinners,
          lastUpdatedAt: this.gameState.lastUpdatedAt,

          onlinePlayers: (this.gameState.fakePlayers && this.gameState.fakePlayers > 0) ? this.gameState.fakePlayers : this.players.size,
          onlineSpectatorsApprox: this.sessions.size - this.players.size,
          queueLength: (this.gameState.fakeQueue && this.gameState.fakeQueue > 0) ? this.gameState.fakeQueue : this.queue.length,
          maxPlayers: this.MAX_PLAYERS, // [New]
          maxQueue: this.MAX_QUEUE, // [New]
          serverTs: Date.now()
      };
  }

  // [New] Upload Public State Snapshot to R2
  async uploadStateToR2() {
      if (!this.env.STATE_BUCKET) return; // Skip if no bucket binding
      if (!this.stateChanged) return; // Optimization

      const currentVersion = this.stateVersion;
      const publicState = this.buildPublicState();
      
      try {
          // Upload 'state.json'
          await this.env.STATE_BUCKET.put("state.json", JSON.stringify(publicState), {
              httpMetadata: {
                  contentType: "application/json",
                  // Cache: Public 20s, Stale 120s
                  cacheControl: "public, max-age=20, stale-while-revalidate=120",
              }
          });
          
          // Only reset if version hasn't changed (no new writes during upload)
          if (this.stateVersion === currentVersion) {
              this.stateChanged = false; 
          }
      } catch (e) {
          console.error("R2 Upload Failed:", e);
      }
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // [P3] Emergency Stop Logic
    // If EMERGENCY_STOP env is set, block expensive APIs
    if (this.env.EMERGENCY_STOP && (this.env.EMERGENCY_STOP === "1" || this.env.EMERGENCY_STOP === "true")) {
        // Allow /state (read-only, fallback) and /admin (control)
        // Block /ws (connection), /winner (write), /invite-reward (write)
        if (url.pathname === "/ws" || url.pathname === "/winner" || url.pathname === "/invite-reward") {
             return new Response(JSON.stringify({ 
                 error: "Service Temporarily Unavailable (Emergency Mode)",
                 retryAfter: 30
             }), { status: 503, headers: { "Retry-After": "30" } });
        }
    }

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }
      
      const { 0: client, 1: server } = new WebSocketPair();
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const mode = url.searchParams.get("mode") || "spectator"; 
      
      this.handleSession(server, ip, mode);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname.startsWith("/admin/")) {
        return this.handleAdmin(request, url);
    }
    
    // --- Invite Reward API ---
    if (url.pathname === "/invite-reward" && request.method === "POST") {
        try {
            const body: any = await request.json();
            const { from, to } = body; 
            
            if (!from || !to || from === to) {
                return new Response(JSON.stringify({ success: false, error: "Invalid Request (Self or Empty)" }), { status: 400 });
            }

            const ip = request.headers.get("CF-Connecting-IP") || "unknown";
            const ua = request.headers.get("User-Agent") || "unknown";

            // Hash IP and UA
            const hash = async (text: string) => {
                const msgBuffer = new TextEncoder().encode(text);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            };

            const ipHash = await hash(ip);
            const uaHash = await hash(ua);

            // Use KST (UTC+9) for date
            const now = new Date();
            const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            const today = kstDate.toISOString().split('T')[0];
            
            const { results } = await this.env.DB.prepare(
                `SELECT 
                    (SELECT COUNT(*) FROM invites WHERE from_user = ? AND date = ?) as daily_count, 
                    (SELECT COUNT(*) FROM invites WHERE from_user = ? AND to_user = ?) as pair_exists,
                    (SELECT COUNT(*) FROM invites WHERE from_user = ? AND date = ? AND to_ip_hash = ?) as ip_exists`
            ).bind(from, today, from, to, from, today, ipHash).all();
            
            const stats = results[0];
            
            if (stats.pair_exists > 0) {
                return new Response(JSON.stringify({ success: false, error: "Already invited this friend" }), { status: 400 });
            }
            if (stats.ip_exists > 0) {
                 return new Response(JSON.stringify({ success: false, error: "Duplicate IP invite" }), { status: 400 });
            }
            if (stats.daily_count >= 5) {
                return new Response(JSON.stringify({ success: false, error: "Daily limit exceeded" }), { status: 400 });
            }
            
            // Check Self-Referral via IP
            if (ip !== "unknown") {
                let referrerIp = "";
                for (const s of this.sessions.values()) {
                    if (s.clientId === from) {
                        referrerIp = s.ip;
                        break;
                    }
                }
                
                if (referrerIp && referrerIp === ip) {
                     return new Response(JSON.stringify({ success: false, error: "Self-referral suspected (IP)" }), { status: 400 });
                }
            }
            
            try {
                await this.env.DB.prepare(
                    "INSERT INTO invites (from_user, to_user, date, to_ip_hash, to_ua_hash) VALUES (?, ?, ?, ?, ?)"
                ).bind(from, to, today, ipHash, uaHash).run();
            } catch (dbErr) {
                return new Response(JSON.stringify({ success: false, error: "Duplicate or DB Error" }), { status: 400 });
            }
            
            const reward = 800;
            let sent = false;
            
            for (const session of this.sessions.values()) {
                if (session.clientId === from) {
                    if (session.ws.readyState === WebSocket.OPEN) {
                        session.ws.send(JSON.stringify({
                            type: 'invite_reward',
                            amount: reward,
                            msg: "INVITE_REWARD_MSG" // [Sync] Use code for translation
                        }));
                        sent = true;
                    }
                    break;
                }
            }
            
            if (!sent) {
                const currentPending = this.pendingRewards.get(from) || 0;
                this.pendingRewards.set(from, currentPending + reward);
                await this.state.storage.put("pendingRewards", this.pendingRewards);
            }
            
            return new Response(JSON.stringify({ success: true, sent }), { status: 200 });

        } catch (e) {
            console.error("Invite Error:", e);
            return new Response(JSON.stringify({ error: "Internal Error" }), { status: 500 });
        }
    }
    
    if (url.pathname === "/winner" && request.method === "POST") {
      const body: any = await request.json();
      
      if (this.gameState.status !== 'WINNER_CHECK') {
          return new Response(JSON.stringify({ error: "Game not in winner check mode" }), { status: 400 });
      }
      
      // [New] Check 5-minute time limit
      const WIN_TIMEOUT = 5 * 60 * 1000;
      if (Date.now() - this.gameState.winnerCheckStartTime > WIN_TIMEOUT) {
           return new Response(JSON.stringify({ error: "Time expired" }), { status: 403 });
      }

      if (!this.gameState.winningToken || body.token !== this.gameState.winningToken) {
          return new Response(JSON.stringify({ error: "Invalid winning token" }), { status: 403 });
      }
      
      // [New] Fetch specific prize from pool for this round
      let finalPrizeName = this.gameState.prize;
      let finalPrizeSecret = this.gameState.prizeSecretUrl;
      
      try {
          // 아직 사용되지 않은 상품 중 가장 먼저 등록된 것 하나를 가져옵니다.
          const prizeData: any = await this.env.DB.prepare(
              "SELECT id, name, secret_url FROM prize_pool WHERE is_used = 0 ORDER BY id ASC LIMIT 1"
          ).first();
          
          if (prizeData) {
              finalPrizeName = prizeData.name;
              finalPrizeSecret = prizeData.secret_url;
              // 상품 사용 완료 처리
              await this.env.DB.prepare(
                  "UPDATE prize_pool SET is_used = 1, winner_id = ?, round = ? WHERE id = ?"
              ).bind(this.gameState.winningClientId, this.gameState.round, prizeData.id).run();
          }
          
          await this.env.DB.prepare(
            "INSERT INTO winners (round, email, country, prize) VALUES (?, ?, ?, ?)"
          ).bind(this.gameState.round, body.email, body.country, finalPrizeName).run();
      } catch (e) {
          console.error("DB Error in winner process:", e);
      }
      
      const maskedEmail = body.email.replace(/(^.{3}).+(@.+)/, "$1***$2");
      this.gameState.winnerInfo = { country: body.country, email: maskedEmail };
      this.gameState.status = 'FINISHED'; 
      this.gameState.prize = finalPrizeName; // 실제 지급된 상품명으로 업데이트
      
      this.gameState.winningClientId = undefined;
      this.gameState.winningToken = undefined;

      this.gameState.recentWinners.unshift({
          round: this.gameState.round,
          prize: finalPrizeName,
          date: new Date().toISOString()
      });
      if (this.gameState.recentWinners.length > 5) this.gameState.recentWinners.pop();

      this.kickAllPlayers();

      this.gameState.lastUpdatedAt = Date.now();
      this.stateChanged = true;
      await this.saveState();
      await this.updateNextPrize(); // [New] Prize used, find next
      this.broadcastState();

      return new Response(JSON.stringify({ success: true }));
    }
    
    if (url.pathname === "/state") {
        const totalUsers = this.sessions.size;
        return new Response(JSON.stringify(this.buildPublicState()), { 
            headers: { 
                "Content-Type": "application/json",
                "X-Online-Users": totalUsers.toString() // [New] For caching logic
            }
        });
    }

    return new Response("Not Found", { status: 404 });
  }

  handleSession(ws: WebSocket, ip: string, requestedMode: string) {
    (ws as any)._ip = ip;
    this.state.acceptWebSocket(ws);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
      
      if (msg.type === 'join') {
        const clientId = msg.clientId || crypto.randomUUID();
        const country = msg.country || "UN";
        const realIp = (ws as any)._ip || "unknown";
        
        if (this.gameState.status !== 'PLAYING') {
             if (this.gameState.status === 'WINNER_CHECK' && clientId === this.gameState.winningClientId) {
                 // OK
             } else {
                 ws.send(JSON.stringify({ type: 'error', code: 'ROUND_NOT_STARTED', message: 'Round not started yet.' }));
                 ws.close(1008, "Round not started");
                 return;
             }
        }

        let role: 'player' | 'spectator' = 'spectator';
        let queuePos: number | null = null;
        let queueToken: string | undefined;

        if (this.sessions.has(ws)) {
            this.cleanupSession(ws); 
        }

        if (this.players.size < this.MAX_PLAYERS) {
            role = 'player';
            this.players.set(clientId, {
                ws, ip: realIp, clientId, country, 
                lastSeen: Date.now(), lastDeltaTime: 0, role: 'player'
            });
        } else {
            if (this.queue.length < this.MAX_QUEUE) {
                role = 'spectator';
                queueToken = crypto.randomUUID();
                this.queue.push({ token: queueToken, clientId, joinedAt: Date.now(), ws });
                queuePos = this.queue.length;
            } else {
                ws.send(JSON.stringify({ type: 'error', code: "FULL", message: 'Server is full (Queue Max Reached)' }));
                ws.close(1008, "Server Full");
                return;
            }
        }

        const session: PlayerSession = {
            ws, ip: realIp, clientId, country, 
            lastSeen: Date.now(), lastDeltaTime: 0, role, queueToken, warnings: 0
        };
        this.sessions.set(ws, session);

        ws.send(JSON.stringify({
            type: 'join_ok',
            role,
            queuePos,
            serverTs: Date.now(),
            buildId: "v1.0.0"
        }));

        if (this.gameState.status === 'WINNER_CHECK' && clientId === this.gameState.winningClientId) {
             ws.send(JSON.stringify({
                  type: 'you_won',
                  token: this.gameState.winningToken,
                  round: this.gameState.round,
                  prizeSecretUrl: this.gameState.prizeSecretUrl,
                  startTime: this.gameState.winnerCheckStartTime
             }));
        }
        
        const pending = this.pendingRewards.get(clientId);
        if (pending && pending > 0) {
            ws.send(JSON.stringify({
                type: 'invite_reward',
                amount: pending,
                msg: "INVITE_REWARD_WELCOME"
            }));
            this.pendingRewards.delete(clientId);
            this.state.storage.put("pendingRewards", this.pendingRewards);
        }

        this.sendStateTo(ws);
        return;
      }

      const session = this.sessions.get(ws);
      if (!session) return; 
      session.lastSeen = Date.now();

      if (msg.type === 'click_delta') {
          if (session.role !== 'player') {
              ws.send(JSON.stringify({ type: 'error', code: 'NOT_PLAYER', message: 'You are a spectator' }));
              return;
          }

          const now = Date.now();
          const timeSinceLast = now - session.lastDeltaTime;
          
          if (timeSinceLast < 4500) { 
              session.warnings = (session.warnings || 0) + 1;
              if (session.warnings > 3) {
                  try {
                      ws.send(JSON.stringify({ type: 'error', code: 'RATE_LIMIT_EXCEEDED', message: 'Kicked due to rate limit abuse.' }));
                      ws.close(1008, "Rate Limit Exceeded");
                  } catch(e) {}
                  return;
              }
              ws.send(JSON.stringify({ type: 'error', code: 'TOO_FAST', message: `Too fast! Wait ${Math.ceil((4500 - timeSinceLast) / 1000)}s` }));
              return; 
          }
          
          session.warnings = 0;
          session.lastDeltaTime = now;

          const delta = Number(msg.delta);
          const userAtk = Number(msg.atk || 1);
          const userPoints = Number(msg.points || 0);
          const userTotalClicks = Number(msg.totalClicks || 0);
          
          if (isNaN(delta) || delta <= 0 || delta > 100000) { 
              ws.send(JSON.stringify({ type: 'error', code: 'BAD_DELTA', message: 'Invalid delta' }));
              return;
          }
          
          if (this.gameState.status === 'PLAYING' && this.gameState.hp > 0) {
              this.gameState.hp = Math.max(0, this.gameState.hp - delta);
              this.gameState.clicksByCountry[session.country] = (this.gameState.clicksByCountry[session.country] || 0) + delta;
              
              if (userAtk > this.gameState.maxAtk) {
                  this.gameState.maxAtk = userAtk;
                  this.gameState.maxAtkCountry = session.country;
              }
              
              if (msg.round === this.gameState.round) {
                  if (userPoints > this.gameState.maxPoints) {
                      this.gameState.maxPoints = userPoints;
                  }
                  if (userTotalClicks > this.gameState.maxClicks) {
                      this.gameState.maxClicks = userTotalClicks;
                  }
              }

              this.touchState();
              
              if (this.gameState.hp === 0) {
                  this.gameState.status = 'WINNER_CHECK';
                  this.gameState.winnerCheckStartTime = now;
                  this.gameState.winningClientId = session.clientId;
                  this.gameState.winningToken = crypto.randomUUID();

                  try {
                      const prizeData: any = await this.env.DB.prepare(
                          "SELECT id, name, secret_url FROM prize_pool WHERE is_used = 0 ORDER BY id ASC LIMIT 1"
                      ).first();
                      
                      if (prizeData) {
                          this.gameState.prize = prizeData.name;
                          this.gameState.prizeSecretUrl = prizeData.secret_url;
                      }
                  } catch (e) {
                      console.error("Failed to fetch prize pool", e);
                  }

                  session.ws.send(JSON.stringify({
                      type: 'you_won',
                      token: this.gameState.winningToken,
                      round: this.gameState.round,
                      prizeSecretUrl: this.gameState.prizeSecretUrl,
                      startTime: this.gameState.winnerCheckStartTime
                  }));
                  
                  this.saveState(); 
                  this.broadcastState(); 
              }
          }
      }
    } catch (e) {}
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
              this.promoteFromQueue(); 
          } else if (session.queueToken) {
              this.queue = this.queue.filter(q => q.token !== session.queueToken);
          }
          this.sessions.delete(ws);
      }
  }

  promoteFromQueue() {
      while (this.queue.length > 0) {
          const next = this.queue.shift();
          if (!next) continue;
          
          const session = this.sessions.get(next.ws);
          if (session) {
              session.role = 'player';
              session.queueToken = undefined;
              this.players.set(session.clientId, session);
              
              if (next.ws.readyState === WebSocket.OPEN) {
                next.ws.send(JSON.stringify({
                    type: 'join_ok',
                    role: 'player',
                    queuePos: null,
                    serverTs: Date.now()
                }));
              }
              this.broadcastQueueUpdate();
              return;
          }
      }
  }

  kickAllPlayers() {
      for (const p of this.players.values()) {
          try {
              p.ws.send(JSON.stringify({ type: 'error', code: 'GAME_OVER', message: 'Round finished. Thanks for playing!' }));
              p.ws.close(1000, "Round Finished");
          } catch(e) {}
      }
      this.players.clear();
  }

  broadcastQueueUpdate() {
      this.queue.forEach((item, idx) => {
          if (item.ws.readyState === WebSocket.OPEN) {
              item.ws.send(JSON.stringify({
                  type: 'queue_update',
                  queuePos: idx + 1,
                  etaSec: (idx + 1) * 30 
              }));
          }
      });
  }

  broadcastState() {
      // [New] Auto-disqualify if timeout (5 min)
      if (this.gameState.status === 'WINNER_CHECK') {
          const WIN_TIMEOUT = 5 * 60 * 1000;
          if (Date.now() - this.gameState.winnerCheckStartTime > WIN_TIMEOUT) {
              console.log("[Auto] Winner timeout. Ending round.");
              this.gameState.status = 'FINISHED';
              this.gameState.winnerInfo = { country: "UN", email: "TIMEOUT", prize: "None (Time Expired)" };
              this.gameState.winningClientId = undefined;
              this.gameState.winningToken = undefined;
              this.gameState.lastUpdatedAt = Date.now();
              this.stateChanged = true;
              this.saveState();
              this.kickAllPlayers();
              // Continue to broadcast the FINISHED state to anyone remaining (though kicked)
          }
      }

      if (this.sessions.size === 0) return;

      const now = Date.now();
      const hpChanged = this.gameState.hp !== this.lastBroadcastHp;
      const playersChanged = this.players.size !== this.lastBroadcastPlayers;
      const timeElapsed = now - this.lastBroadcastTime > 10000;
      const statusChanged = this.gameState.status !== 'PLAYING';

      if (!hpChanged && !playersChanged && !timeElapsed && !statusChanged) {
          return;
      }

      this.lastBroadcastHp = this.gameState.hp;
      this.lastBroadcastPlayers = this.players.size;
      this.lastBroadcastTime = now;

      const payload = JSON.stringify({
          type: 'state',
          ...this.buildPublicState()
      });
      for (const ws of this.sessions.keys()) {
          try { ws.send(payload); } catch(e) { this.cleanupSession(ws); }
      }
  }

  async saveState() {
      await this.state.storage.put("fullState", this.gameState);
  }

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
          this.gameState.maxAtk = 1; // [Sync]
          this.gameState.maxAtkCountry = "UN"; // [Sync]
          this.gameState.maxPoints = 0;
          this.gameState.maxClicks = 0;
          this.gameState.status = 'PLAYING';
          this.gameState.winnerInfo = null;
          this.gameState.lastUpdatedAt = Date.now();
          this.stateChanged = true;
          
          // Clear invites table for the new round
          let clearMsg = "";
          // [Changed] Invites are permanent (one per friend forever), so do NOT delete invites.
          /*
          try {
              // Simply try to delete. If table missing, it will throw, which is fine (we catch it).
              const { meta } = await this.env.DB.prepare("DELETE FROM invites").run();
              clearMsg = ` (Invites cleared: ${meta.changes || 0} rows)`;
          } catch (e) {
              console.error("Failed to clear invites:", e);
              // If delete fails, try creating table ONLY if needed, with simple schema
              try {
                  await this.env.DB.prepare("CREATE TABLE IF NOT EXISTS invites (id INTEGER PRIMARY KEY, from_user TEXT, to_user TEXT, date TEXT, to_ip_hash TEXT, to_ua_hash TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(from_user, to_user), UNIQUE(from_user, date, to_ip_hash))").run();
                  const { meta } = await this.env.DB.prepare("DELETE FROM invites").run();
                  clearMsg = ` (Invites table created & cleared: ${meta.changes || 0} rows)`;
              } catch (e2) {
                  clearMsg = ` (Invites clear FAILED: ${e.message})`;
              }
          }
          */
          
          // Promote all possible players
          while (this.players.size < this.MAX_PLAYERS && this.queue.length > 0) {
              this.promoteFromQueue();
          }
          
          await this.loadCurrentPrize(); // [New]

          details = `Reset Round to ${this.gameState.round}${clearMsg}`;
          await this.saveState();
          this.broadcastState();

      } else if (action === "set-round" && request.method === "POST") {
          const body: any = await request.json();
          this.gameState.round = body.round;
          this.gameState.lastUpdatedAt = Date.now();
          this.stateChanged = true;
          details = `Set Round to ${body.round}`;
          await this.saveState();
          this.broadcastState();

      } else if (action === "set-hp" && request.method === "POST") {
          const body: any = await request.json();
          this.gameState.hp = body.hp;
          this.gameState.status = 'PLAYING';
          this.gameState.winnerInfo = null;
          this.gameState.lastUpdatedAt = Date.now();
          this.stateChanged = true;
          details = `Set HP to ${body.hp}`;
          await this.saveState();
          this.broadcastState();

      } else if (action === "config" && request.method === "POST") {
          const body: any = await request.json();
          if (body.announcement !== undefined) this.gameState.announcement = body.announcement;
          if (body.prize !== undefined) this.gameState.prize = body.prize;
          if (body.prizeUrl !== undefined) this.gameState.prizeUrl = body.prizeUrl;
          if (body.prizeImageUrl !== undefined) this.gameState.prizeImageUrl = body.prizeImageUrl;
          if (body.prizeSecretUrl !== undefined) this.gameState.prizeSecretUrl = body.prizeSecretUrl;
          if (body.adUrl !== undefined) this.gameState.adUrl = body.adUrl;
          if (body.fakePlayers !== undefined) this.gameState.fakePlayers = Number(body.fakePlayers);
          if (body.fakeQueue !== undefined) this.gameState.fakeQueue = Number(body.fakeQueue);
          this.gameState.lastUpdatedAt = Date.now();
          this.stateChanged = true;
          details = `Config Updated`;
          await this.saveState();
          this.broadcastState();

      } else if (action === "winners" && request.method === "GET") {
          try {
              const { results } = await this.env.DB.prepare("SELECT * FROM winners ORDER BY id DESC LIMIT 50").all();
              return new Response(JSON.stringify(results));
          } catch(e) {
              return new Response(JSON.stringify([]));
          }

      } else if (action === "prize-pool" && request.method === "GET") {
          try {
              const { results } = await this.env.DB.prepare("SELECT * FROM prize_pool ORDER BY id ASC").all();
              return new Response(JSON.stringify(results));
          } catch(e) {
              return new Response(JSON.stringify([]));
          }

      } else if (action === "add-prize" && request.method === "POST") {
          const body: any = await request.json();
          
          const runInsert = async () => {
             await this.env.DB.prepare(
                  "INSERT INTO prize_pool (name, image_url, secret_url, link) VALUES (?, ?, ?, ?)"
              ).bind(body.name, body.image_url, body.secret_url, body.link || "").run();
          };

          try {
              await runInsert();
              details = `Added prize: ${body.name}`;
          } catch(e: any) {
              // Self-healing: Check if error is due to missing 'link' column
              if (e.message && (e.message.includes("no such column: link") || e.message.includes("has no column named link"))) {
                   try {
                       await this.env.DB.prepare("ALTER TABLE prize_pool ADD COLUMN link TEXT").run();
                       await runInsert(); // Retry
                       details = `Added prize: ${body.name} (Schema Updated)`;
                   } catch (e2) {
                       return new Response("DB Error (Retry failed): " + e2, { status: 500 });
                   }
              } else {
                  return new Response("DB Error: " + e, { status: 500 });
              }
          }

          if (details) {
              await this.updateNextPrize(); 
              // If current prize is fallback, try loading this new one immediately
              if (this.gameState.prize === "Mystery Prize") {
                  await this.loadCurrentPrize();
              }
          }

      } else if (action === "update-winner-prize" && request.method === "POST") {
          const body: any = await request.json();
          if (!body.id || !body.prize) return new Response("Missing id or prize", { status: 400 });
          
          try {
              await this.env.DB.prepare("UPDATE winners SET prize = ? WHERE id = ?").bind(body.prize, body.id).run();
              details = `Updated winner ${body.id} prize to ${body.prize}`;
              
              // Refresh recent winners cache
              const { results } = await this.env.DB.prepare(
                  "SELECT round, prize, created_at as date FROM winners ORDER BY id DESC LIMIT 5"
              ).all();
              if (results) this.gameState.recentWinners = results;
              this.broadcastState();
          } catch(e) {
              return new Response("DB Error: " + e, { status: 500 });
          }

      } else if (action.startsWith("prize-pool/") && request.method === "DELETE") {
          const id = action.split("/")[1];
          try {
              await this.env.DB.prepare("DELETE FROM prize_pool WHERE id = ?").bind(id).run();
              details = `Deleted prize ID ${id}`;
          } catch(e) {
              return new Response("DB Error: " + e, { status: 500 });
          }

      } else if (action.startsWith("winners/") && request.method === "DELETE") {
          const id = action.split("/")[1];
          if (!id) return new Response("Missing ID", { status: 400 });
          try {
              await this.env.DB.prepare("DELETE FROM winners WHERE id = ?").bind(id).run();
              details = `Deleted winner ID ${id}`;
              // Refresh recent winners cache
              const { results } = await this.env.DB.prepare(
                  "SELECT round, prize, created_at as date FROM winners ORDER BY id DESC LIMIT 5"
              ).all();
              if (results) this.gameState.recentWinners = results;
              this.broadcastState();
          } catch(e) {
              return new Response("DB Error: " + e, { status: 500 });
          }
      }
      
      // [Sync] Audit Log
      if (details) {
          try {
              await this.env.DB.prepare("INSERT INTO audit_logs (action, details, ip) VALUES (?, ?, ?)").bind(action, details, ip).run();
          } catch(e) {}
      }

      return new Response(JSON.stringify({ success: true, details })); // details 추가
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
          onlinePlayers: (this.gameState.fakePlayers && this.gameState.fakePlayers > 0) ? this.gameState.fakePlayers : this.players.size,
          onlineSpectatorsApprox: this.sessions.size - this.players.size,
          queueLength: (this.gameState.fakeQueue && this.gameState.fakeQueue > 0) ? this.gameState.fakeQueue : this.queue.length,
          maxAtk: this.gameState.maxAtk,
          maxAtkCountry: this.gameState.maxAtkCountry,
          maxPoints: this.gameState.maxPoints,
          maxClicks: this.gameState.maxClicks,
          announcement: this.gameState.announcement,
          prize: this.gameState.prize,
          prizeUrl: this.gameState.prizeUrl,
          adUrl: this.gameState.adUrl,
          recentWinners: this.gameState.recentWinners,
          rev: this.gameState.rev,
          lastUpdatedAt: this.gameState.lastUpdatedAt
      }));
  }
}

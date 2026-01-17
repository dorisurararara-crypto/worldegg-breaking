var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/gameDO.ts
import { DurableObject } from "cloudflare:workers";
var GameDO = class extends DurableObject {
  static {
    __name(this, "GameDO");
  }
  state;
  env;
  // In-memory state
  gameState;
  // Connections
  sessions = /* @__PURE__ */ new Map();
  // Reverse lookup
  players = /* @__PURE__ */ new Map();
  // clientId -> Session (Active Players)
  // Spectators are just in sessions with role='spectator'
  queue = [];
  // Invite System
  pendingRewards = /* @__PURE__ */ new Map();
  // Key: userId, Value: points (Load from storage)
  // Constants
  MAX_PLAYERS = 1e3;
  MAX_QUEUE = 1e3;
  // Limit queue size to save cost
  BROADCAST_INTERVAL_MS = 2e3;
  // 2 seconds
  SAVE_INTERVAL_MS = 2e4;
  // 20 seconds
  // Loop Handles
  broadcastInterval = null;
  saveInterval = null;
  constructor(state, env) {
    super(state, env);
    this.state = state;
    this.env = env;
    this.gameState = {
      hp: 1e6,
      maxHp: 1e6,
      round: 1,
      status: "PLAYING",
      winnerInfo: null,
      winnerCheckStartTime: 0,
      winningClientId: void 0,
      winningToken: void 0,
      clicksByCountry: {},
      maxAtk: 1,
      maxAtkCountry: "UN",
      announcement: "Welcome to Egg Pong!",
      prize: "Amazon Gift Card $50",
      prizeUrl: "https://amazon.com",
      adUrl: "",
      recentWinners: [],
      rev: 0,
      lastUpdatedAt: Date.now()
    };
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get("fullState");
      if (stored) {
        this.gameState = { ...this.gameState, ...stored };
      }
      const storedRewards = await this.state.storage.get("pendingRewards");
      if (storedRewards) {
        this.pendingRewards = storedRewards;
      }
      try {
        const { results } = await this.env.DB.prepare(
          "SELECT round, prize, created_at as date FROM winners ORDER BY id DESC LIMIT 5"
        ).all();
        console.log("[Recovery] Loaded winners from DB:", JSON.stringify(results));
        if (results && Array.isArray(results)) {
          this.gameState.recentWinners = results;
        }
      } catch (e) {
        console.error("[Recovery] Failed to load winners:", e);
      }
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
  async fetch(request) {
    const url = new URL(request.url);
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
    if (url.pathname === "/invite-reward" && request.method === "POST") {
      try {
        const body = await request.json();
        const { from, to } = body;
        if (!from || !to || from === to) {
          return new Response(JSON.stringify({ success: false, error: "Invalid Request (Self or Empty)" }), { status: 400 });
        }
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const { results } = await this.env.DB.prepare(
          "SELECT (SELECT COUNT(*) FROM invites WHERE from_user = ? AND date = ?) as daily_count, (SELECT COUNT(*) FROM invites WHERE from_user = ? AND to_user = ?) as pair_exists"
        ).bind(from, today, from, to).all();
        const stats = results[0];
        if (stats.pair_exists > 0) {
          return new Response(JSON.stringify({ success: false, error: "Already invited this friend" }), { status: 400 });
        }
        if (stats.daily_count >= 5) {
          return new Response(JSON.stringify({ success: false, error: "Daily limit exceeded" }), { status: 400 });
        }
        try {
          await this.env.DB.prepare(
            "INSERT INTO invites (from_user, to_user, date) VALUES (?, ?, ?)"
          ).bind(from, to, today).run();
        } catch (dbErr) {
          return new Response(JSON.stringify({ success: false, error: "Duplicate or DB Error" }), { status: 400 });
        }
        const reward = 800;
        let sent = false;
        for (const session of this.sessions.values()) {
          if (session.clientId === from) {
            if (session.ws.readyState === WebSocket.OPEN) {
              session.ws.send(JSON.stringify({
                type: "invite_reward",
                amount: reward,
                msg: "Friend joined! +800P"
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
      const body = await request.json();
      if (this.gameState.status !== "WINNER_CHECK") {
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
      }
      const maskedEmail = body.email.replace(/(^.{3}).+(@.+)/, "$1***$2");
      this.gameState.winnerInfo = { country: body.country, email: maskedEmail };
      this.gameState.status = "FINISHED";
      this.gameState.winningClientId = void 0;
      this.gameState.winningToken = void 0;
      this.gameState.recentWinners.unshift({
        round: this.gameState.round,
        prize: this.gameState.prize,
        date: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (this.gameState.recentWinners.length > 5) this.gameState.recentWinners.pop();
      this.kickAllPlayers();
      this.gameState.lastUpdatedAt = Date.now();
      await this.saveState();
      this.broadcastState();
      return new Response(JSON.stringify({ success: true }));
    }
    if (url.pathname === "/state") {
      return new Response(JSON.stringify({
        ...this.gameState,
        onlinePlayers: this.players.size,
        onlineSpectatorsApprox: this.sessions.size - this.players.size,
        serverTs: Date.now()
      }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response("Not Found", { status: 404 });
  }
  handleSession(ws, ip, requestedMode) {
    this.state.acceptWebSocket(ws);
  }
  async webSocketMessage(ws, message) {
    try {
      const msg = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
      if (msg.type === "join") {
        const clientId = msg.clientId || crypto.randomUUID();
        const country = msg.country || "UN";
        if (this.gameState.status !== "PLAYING") {
          ws.send(JSON.stringify({ type: "error", code: "ROUND_NOT_STARTED", message: "Round not started yet." }));
          ws.close(1008, "Round not started");
          return;
        }
        let role = "spectator";
        let queuePos = null;
        let queueToken;
        if (this.sessions.has(ws)) {
          this.cleanupSession(ws);
        }
        if (this.players.size < this.MAX_PLAYERS) {
          role = "player";
          this.players.set(clientId, {
            ws,
            ip: "unknown",
            clientId,
            country,
            lastSeen: Date.now(),
            lastDeltaTime: 0,
            role: "player"
          });
        } else {
          if (this.queue.length < this.MAX_QUEUE) {
            role = "spectator";
            queueToken = crypto.randomUUID();
            this.queue.push({ token: queueToken, clientId, joinedAt: Date.now(), ws });
            queuePos = this.queue.length;
          } else {
            ws.send(JSON.stringify({ type: "error", code: "FULL", message: "Server is full (Queue Max Reached)" }));
            ws.close(1008, "Server Full");
            return;
          }
        }
        const session2 = {
          ws,
          ip: "unknown",
          clientId,
          country,
          lastSeen: Date.now(),
          lastDeltaTime: 0,
          role,
          queueToken,
          warnings: 0
        };
        this.sessions.set(ws, session2);
        ws.send(JSON.stringify({
          type: "join_ok",
          role,
          queuePos,
          serverTs: Date.now(),
          buildId: "v1.0.0"
        }));
        const pending = this.pendingRewards.get(clientId);
        if (pending && pending > 0) {
          ws.send(JSON.stringify({
            type: "invite_reward",
            amount: pending,
            msg: `Welcome back! You earned ${pending}P from invites.`
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
      if (msg.type === "click_delta") {
        if (session.role !== "player") {
          ws.send(JSON.stringify({ type: "error", code: "NOT_PLAYER", message: "You are a spectator" }));
          return;
        }
        const now = Date.now();
        const timeSinceLast = now - session.lastDeltaTime;
        if (timeSinceLast < 4500) {
          session.warnings = (session.warnings || 0) + 1;
          if (session.warnings > 3) {
            try {
              ws.send(JSON.stringify({ type: "error", code: "RATE_LIMIT_EXCEEDED", message: "Kicked due to rate limit abuse." }));
              ws.close(1008, "Rate Limit Exceeded");
            } catch (e) {
            }
            return;
          }
          ws.send(JSON.stringify({ type: "error", code: "TOO_FAST", message: `Too fast! Wait ${Math.ceil((4500 - timeSinceLast) / 1e3)}s` }));
          return;
        }
        session.warnings = 0;
        session.lastDeltaTime = now;
        const delta = Number(msg.delta);
        const userAtk = Number(msg.atk || 1);
        if (isNaN(delta) || delta <= 0 || delta > 1e3) {
          ws.send(JSON.stringify({ type: "error", code: "BAD_DELTA", message: "Invalid delta" }));
          return;
        }
        session.lastDeltaTime = now;
        if (this.gameState.status === "PLAYING" && this.gameState.hp > 0) {
          this.gameState.hp = Math.max(0, this.gameState.hp - delta);
          this.gameState.clicksByCountry[session.country] = (this.gameState.clicksByCountry[session.country] || 0) + delta;
          if (userAtk > this.gameState.maxAtk) {
            this.gameState.maxAtk = userAtk;
            this.gameState.maxAtkCountry = session.country;
          }
          this.gameState.lastUpdatedAt = now;
          if (this.gameState.hp === 0) {
            this.gameState.status = "WINNER_CHECK";
            this.gameState.winnerCheckStartTime = now;
            this.gameState.winningClientId = session.clientId;
            this.gameState.winningToken = crypto.randomUUID();
            session.ws.send(JSON.stringify({
              type: "you_won",
              token: this.gameState.winningToken,
              round: this.gameState.round
            }));
            this.saveState();
            this.broadcastState();
          }
        }
      }
      if (msg.type === "ping") {
      }
    } catch (e) {
    }
  }
  async webSocketClose(ws, code, reason, wasClean) {
    this.cleanupSession(ws);
  }
  async webSocketError(ws, error) {
    this.cleanupSession(ws);
  }
  cleanupSession(ws) {
    const session = this.sessions.get(ws);
    if (session) {
      if (session.role === "player") {
        this.players.delete(session.clientId);
        this.promoteFromQueue();
      } else if (session.queueToken) {
        this.queue = this.queue.filter((q) => q.token !== session.queueToken);
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
      session.role = "player";
      session.queueToken = void 0;
      this.players.set(session.clientId, session);
      next.ws.send(JSON.stringify({
        type: "join_ok",
        role: "player",
        queuePos: null,
        serverTs: Date.now()
      }));
      this.broadcastQueueUpdate();
    } else {
      this.promoteFromQueue();
    }
  }
  kickAllPlayers() {
    for (const p of this.players.values()) {
      try {
        p.ws.send(JSON.stringify({ type: "error", code: "GAME_OVER", message: "Round finished. Thanks for playing!" }));
        p.ws.close(1e3, "Round Finished");
      } catch (e) {
      }
    }
    this.players.clear();
  }
  broadcastQueueUpdate() {
    this.queue.forEach((item, idx) => {
      if (item.ws.readyState === WebSocket.OPEN) {
        item.ws.send(JSON.stringify({
          type: "queue_update",
          queuePos: idx + 1,
          etaSec: (idx + 1) * 30
          // Rough guess
        }));
      }
    });
  }
  broadcastState() {
    if (this.sessions.size === 0) return;
    const payload = JSON.stringify({
      type: "state",
      hp: this.gameState.hp,
      maxHp: this.gameState.maxHp,
      round: this.gameState.round,
      status: this.gameState.status,
      winnerInfo: this.gameState.winnerInfo,
      winningClientId: this.gameState.winningClientId,
      // Send winner ID
      onlinePlayers: this.players.size,
      onlineSpectatorsApprox: this.sessions.size - this.players.size,
      queueLength: this.queue.length,
      maxAtk: this.gameState.maxAtk,
      maxAtkCountry: this.gameState.maxAtkCountry,
      announcement: this.gameState.announcement,
      prize: this.gameState.prize,
      prizeUrl: this.gameState.prizeUrl,
      adUrl: this.gameState.adUrl,
      recentWinners: this.gameState.recentWinners,
      // Added this field
      rev: this.gameState.rev,
      lastUpdatedAt: this.gameState.lastUpdatedAt
    });
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(payload);
      } catch (e) {
        this.cleanupSession(ws);
      }
    }
  }
  async saveState() {
    await this.state.storage.put("fullState", this.gameState);
  }
  // --- Admin Logic ---
  async handleAdmin(request, url) {
    const authKey = request.headers.get("x-admin-key");
    if (authKey !== "egg1234") return new Response("Unauthorized", { status: 401 });
    const action = url.pathname.replace("/admin/", "");
    let details = "";
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (action === "reset-round") {
      this.gameState.hp = 1e6;
      this.gameState.round += 1;
      this.gameState.clicksByCountry = {};
      this.gameState.maxAtk = 1;
      this.gameState.maxAtkCountry = "UN";
      this.gameState.status = "PLAYING";
      this.gameState.winnerInfo = null;
      this.gameState.lastUpdatedAt = Date.now();
      while (this.players.size < this.MAX_PLAYERS && this.queue.length > 0) {
        this.promoteFromQueue();
      }
      details = `Reset Round to ${this.gameState.round}`;
      await this.saveState();
      this.broadcastState();
    } else if (action === "set-round" && request.method === "POST") {
      const body = await request.json();
      this.gameState.round = body.round;
      this.gameState.lastUpdatedAt = Date.now();
      details = `Set Round to ${body.round}`;
      await this.saveState();
      this.broadcastState();
    } else if (action === "set-hp" && request.method === "POST") {
      const body = await request.json();
      this.gameState.hp = body.hp;
      this.gameState.status = "PLAYING";
      this.gameState.winnerInfo = null;
      this.gameState.lastUpdatedAt = Date.now();
      details = `Set HP to ${body.hp}`;
      await this.saveState();
      this.broadcastState();
    } else if (action === "config" && request.method === "POST") {
      const body = await request.json();
      if (body.announcement !== void 0) this.gameState.announcement = body.announcement;
      if (body.prize !== void 0) this.gameState.prize = body.prize;
      if (body.prizeUrl !== void 0) this.gameState.prizeUrl = body.prizeUrl;
      if (body.adUrl !== void 0) this.gameState.adUrl = body.adUrl;
      this.gameState.lastUpdatedAt = Date.now();
      details = `Config Updated`;
      await this.saveState();
      this.broadcastState();
    } else if (action === "winners" && request.method === "GET") {
      try {
        const { results } = await this.env.DB.prepare("SELECT * FROM winners ORDER BY id DESC LIMIT 50").all();
        return new Response(JSON.stringify(results));
      } catch (e) {
        return new Response(JSON.stringify([]));
      }
    } else if (action.startsWith("winners/") && request.method === "DELETE") {
      const id = action.split("/")[1];
      if (!id) return new Response("Missing ID", { status: 400 });
      try {
        await this.env.DB.prepare("DELETE FROM winners WHERE id = ?").bind(id).run();
        details = `Deleted winner ID ${id}`;
        const { results } = await this.env.DB.prepare(
          "SELECT round, prize, created_at as date FROM winners ORDER BY id DESC LIMIT 5"
        ).all();
        if (results) this.gameState.recentWinners = results;
        this.broadcastState();
      } catch (e) {
        return new Response("DB Error: " + e, { status: 500 });
      }
    } else if (action === "winner" && request.method === "POST") {
    }
    if (details) {
      try {
        await this.env.DB.prepare("INSERT INTO audit_logs (action, details, ip) VALUES (?, ?, ?)").bind(action, details, ip).run();
      } catch (e) {
      }
    }
    return new Response(JSON.stringify({ success: true }));
  }
  sendStateTo(ws) {
    ws.send(JSON.stringify({
      type: "state",
      hp: this.gameState.hp,
      maxHp: this.gameState.maxHp,
      round: this.gameState.round,
      status: this.gameState.status,
      winnerInfo: this.gameState.winnerInfo,
      winningClientId: this.gameState.winningClientId,
      onlinePlayers: this.players.size,
      onlineSpectatorsApprox: this.sessions.size - this.players.size,
      queueLength: this.queue.length,
      maxAtk: this.gameState.maxAtk,
      maxAtkCountry: this.gameState.maxAtkCountry,
      announcement: this.gameState.announcement,
      prize: this.gameState.prize,
      prizeUrl: this.gameState.prizeUrl,
      adUrl: this.gameState.adUrl,
      recentWinners: this.gameState.recentWinners,
      // Added this field
      rev: this.gameState.rev,
      lastUpdatedAt: this.gameState.lastUpdatedAt
    }));
  }
};

// src/index.ts
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const id = env.GAME_DO.idFromName("GLOBAL_EGG_ID");
    const stub = env.GAME_DO.get(id);
    const proxyToDo = /* @__PURE__ */ __name(async (targetPath) => {
      const newReq = new Request(url.origin + targetPath + url.search, request);
      return stub.fetch(newReq);
    }, "proxyToDo");
    if (request.headers.get("Upgrade") === "websocket") {
      if (url.pathname === "/ws" || url.pathname === "/api/ws") {
        return proxyToDo("/ws");
      }
    }
    if (url.pathname === "/ws") {
      return stub.fetch(request);
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/invite-reward")) {
      const doPath = url.pathname.replace("/api", "");
      const newReq = new Request(url.origin + doPath, request);
      const response = await stub.fetch(newReq);
      if (response.status === 101) {
        return response;
      }
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      newHeaders.set("Cache-Control", "no-store");
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
export {
  GameDO,
  index_default as default
};
//# sourceMappingURL=index.js.map

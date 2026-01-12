// src/gameDO.ts
export class GameDO {
  state: any;
  env: any;
  // IP 기반 정확한 접속자 집계 (IP -> 마지막 접속 시간)
  activeUsers: Map<string, number> = new Map();
  
  // 게임 상태 (공지사항, 상품 정보 포함)
  gameState = {
    hp: 1000000,
    maxHp: 1000000,
    round: 1,
    onlineApprox: 0,
    status: 'PLAYING', // PLAYING, WINNER_CHECK, FINISHED
    winnerInfo: null as any, // { country: 'KR', email: 'ab***' }
    winnerCheckStartTime: 0,
    clicksByCountry: {} as Record<string, number>,
    recentWinners: [] as any[], // 최근 우승자 목록 추가
    // 설정 정보 추가 (Firebase 대체)
    announcement: "Welcome to Egg Pong!",
    prize: "Amazon Gift Card $50",
    prizeUrl: "https://amazon.com",
    adUrl: "" 
  };

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    
    // 복구 로직
    this.state.blockConcurrencyWhile(async () => {
      const stored: any = await this.state.storage.get("fullState");
      if (stored) {
        this.gameState = { ...this.gameState, ...stored };
      }
      // Ensure alarm is running
      const currentAlarm = await this.state.storage.getAlarm();
      if (currentAlarm === null) {
         await this.state.storage.setAlarm(Date.now() + 10 * 1000); // 10s initial
      }
    });
  }

  // 사용자 활동 갱신 헬퍼
  updateActivity(request: Request) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const now = Date.now();
      this.activeUsers.set(ip, now);
      
      // 요청 시마다 즉시 청소 (실시간성 보장)
      this.cleanupUsers(now);
  }

  cleanupUsers(now: number) {
      // 15초 이상 활동 없는 유저 제거
      for (const [ip, lastSeen] of this.activeUsers.entries()) {
          if (now - lastSeen > 15 * 1000) {
              this.activeUsers.delete(ip);
          }
      }
      this.gameState.onlineApprox = this.activeUsers.size;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const MAX_USERS = 130; // 최대 동시 접속자 제한 (무료 플랜용 보수적 설정)

    // 관리자 요청은 통과
    if (!url.pathname.startsWith("/admin/")) {
        // 접속자 수 체크 (이미 접속 중인 유저는 통과시켜야 게임이 진행됨 - IP 체크)
        // 하지만 간단하게 총량으로 제한 (신규/기존 구분 없이 꽉 차면 튕김 - 대기열 효과)
        if (this.gameState.onlineApprox >= MAX_USERS) {
             // 단, 내 IP가 이미 리스트에 있다면 통과 (새로고침해도 안 튕기게)
             const ip = request.headers.get("CF-Connecting-IP") || "unknown";
             if (!this.activeUsers.has(ip)) {
                 return new Response(JSON.stringify({ error: "full" }), { status: 503, headers: { "Content-Type": "application/json" } });
             }
        }
    }

    // 1. GET /state
    if (url.pathname === "/state") {
      this.updateActivity(request);
      return new Response(JSON.stringify(this.gameState), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. POST /click
    if (url.pathname === "/click" && request.method === "POST") {
      this.updateActivity(request); // 클릭도 활동으로 간주

      const body: any = await request.json();
      const dmg = body.power || 1;
      const cCode = body.country || "US";
      
      let isWinner = false;

      // 게임 진행 중일 때만 데미지 적용
      if (this.gameState.status === 'PLAYING' && this.gameState.hp > 0) {
        this.gameState.hp = Math.max(0, this.gameState.hp - dmg);
        this.gameState.clicksByCountry[cCode] = (this.gameState.clicksByCountry[cCode] || 0) + 1;
        
        if (this.gameState.hp === 0) {
            isWinner = true;
            this.gameState.status = 'WINNER_CHECK';
            this.gameState.winnerCheckStartTime = Date.now();
        }

        // Ensure alarm exists for saving state and updating stats
        const currentAlarm = await this.state.storage.getAlarm();
        if (currentAlarm === null) {
          await this.state.storage.setAlarm(Date.now() + 10 * 1000);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        hp: this.gameState.hp, 
        isWinner,
        status: this.gameState.status 
      }));
    }

    // 3. POST /winner
    if (url.pathname === "/winner" && request.method === "POST") {
      const body: any = await request.json();
      await this.env.DB.prepare(
        "INSERT INTO winners (round, email, country, prize) VALUES (?, ?, ?, ?)"
      ).bind(this.gameState.round, body.email, body.country, this.gameState.prize).run();
      
      // 마스킹된 이메일 생성 (ex: abc***@gmail.com)
      const maskedEmail = body.email.replace(/(^.{3}).+(@.+)/, "$1***$2");

      // 상태 업데이트
      this.gameState.winnerInfo = { country: body.country, email: maskedEmail };
      this.gameState.status = 'FINISHED';

      // 메모리 상태 업데이트 (최근 우승자 목록 갱신 -> 최근 상품 목록)
      this.gameState.recentWinners.unshift({
          round: this.gameState.round,
          prize: this.gameState.prize, // 상품명 저장
          date: new Date().toISOString()
      });
      // 5개만 유지
      if (this.gameState.recentWinners.length > 5) {
          this.gameState.recentWinners.pop();
      }

      await this.saveState(); // 즉시 저장
      return new Response(JSON.stringify({ success: true }));
    }

    // --- 👮 관리자 기능 (Admin) ---
    // 간단한 보안을 위해 헤더에 'x-admin-key' 확인 (실무에선 더 복잡한 인증 필요)
    if (url.pathname.startsWith("/admin/")) {
        const authKey = request.headers.get("x-admin-key");
        // 주의: 이 키는 프론트엔드 Admin 페이지에서 입력받아야 함. 여기서는 예시로 "egg1234" 설정
        if (authKey !== "egg1234") { 
            return new Response("Unauthorized", { status: 401 });
        }

        // A. 게임 리셋 (라운드 증가)
        if (url.pathname === "/admin/reset-round") {
            this.gameState.hp = 1000000;
            this.gameState.round += 1;
            this.gameState.clicksByCountry = {};
            this.gameState.status = 'PLAYING';
            this.gameState.winnerInfo = null;
            await this.saveState();
            return new Response(JSON.stringify(this.gameState));
        }

        // B. 접속자 수 초기화
        if (url.pathname === "/admin/reset-users") {
            this.gameState.onlineApprox = 0;
            return new Response(JSON.stringify({ success: true }));
        }

        // C. HP 강제 설정 (테스트용)
        if (url.pathname === "/admin/set-hp" && request.method === "POST") {
            const body: any = await request.json();
            this.gameState.hp = body.hp;
            await this.saveState();
            return new Response(JSON.stringify({ success: true, hp: this.gameState.hp }));
        }

        // C-2. 라운드 강제 설정 (New)
        if (url.pathname === "/admin/set-round" && request.method === "POST") {
            const body: any = await request.json();
            this.gameState.round = body.round;
            await this.saveState();
            return new Response(JSON.stringify({ success: true, round: this.gameState.round }));
        }

        // D. 설정 변경 (공지, 상품 등)
        if (url.pathname === "/admin/config" && request.method === "POST") {
            const body: any = await request.json();
            if (body.announcement !== undefined) this.gameState.announcement = body.announcement;
            if (body.prize !== undefined) this.gameState.prize = body.prize;
            if (body.prizeUrl !== undefined) this.gameState.prizeUrl = body.prizeUrl;
            if (body.adUrl !== undefined) this.gameState.adUrl = body.adUrl;
            
            await this.saveState();
            return new Response(JSON.stringify({ success: true }));
        }

        // E. 우승자 목록 조회
        if (url.pathname === "/admin/winners" && request.method === "GET") {
            const { results } = await this.env.DB.prepare(
                "SELECT * FROM winners ORDER BY id DESC LIMIT 50"
            ).all();
            return new Response(JSON.stringify(results));
        }

        // F. 우승자 삭제 (New)
        // URL 패턴: /admin/winners/123
        const deleteMatch = url.pathname.match(/^\/admin\/winners\/(\d+)$/);
        if (deleteMatch && request.method === "DELETE") {
            const id = deleteMatch[1];
            await this.env.DB.prepare(
                "DELETE FROM winners WHERE id = ?"
            ).bind(id).run();
            return new Response(JSON.stringify({ success: true }));
        }
    }

    return new Response("Not Found", { status: 404 });
  }

  async alarm() {
    await this.saveState();
    
    // Update Online Users Count (Exact IP-based)
    this.cleanupUsers(Date.now());

    // 타임아웃 체크 (3분)
    if (this.gameState.status === 'WINNER_CHECK') {
        if (Date.now() - this.gameState.winnerCheckStartTime > 3 * 60 * 1000) {
            this.gameState.status = 'FINISHED';
            this.gameState.winnerInfo = { country: 'Unknown', email: 'Time Out' };
        }
    }

    // D1 저장 (스냅샷)
    await this.env.DB.prepare(
      "INSERT INTO game_snapshots (round, hp, stats) VALUES (?, ?, ?)"
    ).bind(
      this.gameState.round, 
      this.gameState.hp, 
      JSON.stringify(this.gameState.clicksByCountry)
    ).run();

    // Schedule next alarm in 10s for faster updates
    await this.state.storage.setAlarm(Date.now() + 10 * 1000);
  }

  async saveState() {
      await this.state.storage.put("fullState", this.gameState);
  }
}
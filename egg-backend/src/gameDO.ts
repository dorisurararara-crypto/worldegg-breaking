// src/gameDO.ts
export class GameDO {
  state: any;
  env: any;
  
  // 인메모리 상태 (Single Source of Truth)
  gameState = {
    hp: 1000000,
    maxHp: 1000000,
    round: 1,
    onlineApprox: 0,
    clicksByCountry: {} as Record<string, number>,
  };

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    
    // 복구 로직: 서버 재시작 시 저장된 상태 불러오기
    this.state.blockConcurrencyWhile(async () => {
      const stored: any = await this.state.storage.get("fullState");
      if (stored) {
        // 병합 (새로운 필드가 추가되었을 경우 대비)
        this.gameState = { ...this.gameState, ...stored };
      }
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // 1. GET /state (폴링용)
    if (url.pathname === "/state") {
      // 접속자 수 추정 (호출될 때마다 조금씩 증가, 최대값 제한)
      this.gameState.onlineApprox = Math.min(this.gameState.onlineApprox + 1, 100000);
      
      return new Response(JSON.stringify(this.gameState), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. POST /click (클릭 처리)
    if (url.pathname === "/click" && request.method === "POST") {
      const body: any = await request.json();
      const dmg = body.power || 1;
      const cCode = body.country || "US";
      
      let isWinner = false;

      // HP 차감 (0 이하로 내려가지 않음)
      if (this.gameState.hp > 0) {
        this.gameState.hp = Math.max(0, this.gameState.hp - dmg);
        
        // 국가별 통계 집계
        this.gameState.clicksByCountry[cCode] = (this.gameState.clicksByCountry[cCode] || 0) + 1;
        
        // 우승자 판정 (막타)
        if (this.gameState.hp === 0) isWinner = true;

        // 상태 변경 시 알람 예약 (30초 뒤 배치 저장)
        const currentAlarm = await this.state.storage.getAlarm();
        if (currentAlarm === null) {
          await this.state.storage.setAlarm(Date.now() + 30 * 1000);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        hp: this.gameState.hp, // 서버의 최신 HP 반환
        isWinner 
      }));
    }

    // 3. POST /winner (우승자 정보 저장)
    if (url.pathname === "/winner" && request.method === "POST") {
      const body: any = await request.json();
      // 중요 정보는 D1에 즉시 저장
      await this.env.DB.prepare(
        "INSERT INTO winners (round, email, country) VALUES (?, ?, ?)"
      ).bind(this.gameState.round, body.email, body.country).run();
      
      return new Response(JSON.stringify({ success: true }));
    }

    // 4. Admin Reset
    if (url.pathname === "/admin/reset") {
        this.gameState.hp = 1000000;
        this.gameState.round += 1;
        this.gameState.clicksByCountry = {};
        await this.state.storage.put("fullState", this.gameState);
        return new Response(JSON.stringify(this.gameState));
    }

    return new Response("Not Found", { status: 404 });
  }

  // 알람: 주기적 저장 (배치 처리)
  async alarm() {
    // DO 스토리지 저장 (빠른 복구용)
    await this.state.storage.put("fullState", this.gameState);
    
    // D1 데이터베이스 저장 (분석용 스냅샷)
    await this.env.DB.prepare(
      "INSERT INTO game_snapshots (round, hp, stats) VALUES (?, ?, ?)"
    ).bind(
      this.gameState.round, 
      this.gameState.hp, 
      JSON.stringify(this.gameState.clicksByCountry)
    ).run();

    // 접속자 수 자연 감소 (Heartbeat 대용)
    this.gameState.onlineApprox = Math.floor(this.gameState.onlineApprox * 0.9);
  }
}

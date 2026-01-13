// src/index.ts
import { GameDO } from "./gameDO";
export { GameDO };

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    
    // CORS 설정
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key", // x-admin-key 추가
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 전 세계 단일 인스턴스 (GLOBAL_EGG_ID)
    const id = env.GAME_DO.idFromName("GLOBAL_EGG_ID");
    const stub = env.GAME_DO.get(id);

    // API 라우팅
    if (url.pathname.startsWith("/api/")) {
      const doPath = url.pathname.replace("/api", "");
      
      const newReq = new Request(url.origin + doPath, request);
      const response = await stub.fetch(newReq);
      
      // 응답 헤더 병합
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

      // GET 요청은 캐싱 (서버 부하 감소) -> 실시간성 중요하므로 캐싱 제거
      /*
      if (request.method === "GET") {
        newHeaders.set("Cache-Control", "public, max-age=3");
      }
      */
      newHeaders.set("Cache-Control", "no-store");

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

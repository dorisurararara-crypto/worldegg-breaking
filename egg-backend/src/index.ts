import { GameDO } from "./gameDO";
export { GameDO };

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    
    // CORS configuration
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Global Single Instance
    const id = env.GAME_DO.idFromName("GLOBAL_EGG_ID");
    const stub = env.GAME_DO.get(id);

    // Helper to proxy requests to DO
    const proxyToDo = async (targetPath: string) => {
        const newReq = new Request(url.origin + targetPath + url.search, request);
        return stub.fetch(newReq);
    };

    // WebSocket Upgrade Check
    if (request.headers.get("Upgrade") === "websocket") {
        // Handle /ws or /api/ws
        if (url.pathname === "/ws" || url.pathname === "/api/ws") {
            return proxyToDo("/ws");
        }
    }

    // WebSocket Direct Path
    if (url.pathname === "/ws") {
        return stub.fetch(request);
    }

    // HTTP API Routing
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/")) {
      const doPath = url.pathname.replace("/api", "");
      
      const newReq = new Request(url.origin + doPath, request);
      const response = await stub.fetch(newReq);
      
      // If it's a websocket response (101), return it directly
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

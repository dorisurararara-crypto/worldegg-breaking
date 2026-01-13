import { useState, useEffect } from 'react';

// 환경 변수 VITE_API_URL이 없으면 로컬 개발 서버 주소 사용
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787/api";

export function useGameState() {
  const [serverState, setServerState] = useState({
    hp: undefined,
    round: 1,
    onlineApprox: 0,
    clicksByCountry: {}
  });
  const [error, setError] = useState(null);

  // 상태 폴링 함수
  const fetchState = async (controller) => {
    try {
      const res = await fetch(`${API_URL}/state?t=${Date.now()}`, { 
          signal: controller?.signal,
          cache: 'no-store' 
      });
      if (res.ok) {
        const data = await res.json();
        setServerState(data);
        setError(null);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Polling failed:", e);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchState(controller); // 초기 로드

    const interval = setInterval(() => {
        const newController = new AbortController();
        fetchState(newController);
    }, 15000); // 15초마다 폴링
    
    return () => {
        clearInterval(interval);
        controller.abort();
    };
  }, []);

  return { serverState, API_URL, refetch: fetchState, error };
}

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
  const fetchState = async () => {
    try {
      const res = await fetch(`${API_URL}/state`);
      if (res.status === 503) {
          setError('full');
          return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.error === 'full') {
            setError('full');
        } else {
            setServerState(data);
            setError(null); // Clear error if successful
        }
      }
    } catch (e) {
      console.error("Polling failed:", e);
    }
  };

  useEffect(() => {
    fetchState(); // 초기 로드
    const interval = setInterval(fetchState, 10000); // 10초마다 폴링 (최적화)
    return () => clearInterval(interval);
  }, []);

  return { serverState, API_URL, refetch: fetchState, error };
}

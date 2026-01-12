import React, { useState, useEffect } from 'react';
import './App.css'; // 기존 스타일 재사용 (Glassmorphism)

// 백엔드 API 주소
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787/api";

function Admin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 대시보드 상태
  const [serverState, setServerState] = useState(null);
  
  // 입력값 상태
  const [hpInput, setHpInput] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [prize, setPrize] = useState("");
  const [prizeUrl, setPrizeUrl] = useState("");
  const [adUrl, setAdUrl] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "egg1234") { // 클라이언트 측 간단 확인 (서버에서도 체크함)
      setIsAuthenticated(true);
      fetchState();
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const fetchState = async () => {
    try {
      const res = await fetch(`${API_URL}/state`);
      const data = await res.json();
      setServerState(data);
      // 현재 서버 값으로 입력창 초기화
      setHpInput(data.hp);
      setAnnouncement(data.announcement || "");
      setPrize(data.prize || "");
      setPrizeUrl(data.prizeUrl || "");
      setAdUrl(data.adUrl || "");
    } catch (e) {
      console.error("데이터 불러오기 실패:", e);
    }
  };

  const callAdminApi = async (endpoint, body = {}) => {
    if (!confirm(`정말로 '${endpoint}' 명령을 실행하시겠습니까?`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': password // 비밀번호를 인증 키로 전송
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        alert("성공적으로 처리되었습니다!");
        fetchState(); // UI 갱신
      } else {
        alert(`오류 발생: ${res.status}`);
      }
    } catch (e) {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#333', padding: '20px' }}>
        <form onSubmit={handleLogin} className="glass" style={{ padding: '30px', borderRadius: '20px', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>관리자 접속</h2>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="비밀번호 입력"
            style={{ width: '100%', padding: '15px', fontSize: '16px', borderRadius: '10px', border: 'none', marginBottom: '20px', boxSizing: 'border-box' }}
          />
          <button type="submit" className="send-btn" style={{ width: '100%', padding: '15px' }}>로그인</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ padding: '20px', background: '#222', minHeight: '100vh', color: 'white', fontFamily: "'Pretendard', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🛠️ 관리자 대시보드</h1>
        <button onClick={() => setIsAuthenticated(false)} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>로그아웃</button>
      </div>

      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* 1. 상태 패널 */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', marginBottom: '15px' }}>📊 실시간 상태</h3>
          {serverState ? (
            <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
              <li><strong>현재 라운드:</strong> {serverState.round}</li>
              <li><strong>남은 HP:</strong> {serverState.hp.toLocaleString()} / {serverState.maxHp.toLocaleString()}</li>
              <li><strong>접속자 (추정):</strong> {serverState.onlineApprox} 명</li>
              <li><strong>마지막 갱신:</strong> {new Date().toLocaleTimeString()}</li>
            </ul>
          ) : <p>로딩 중...</p>}
          
          <button onClick={fetchState} style={{ marginTop: '10px', background: '#444', color: '#fff', border: '1px solid #666', padding: '8px 20px', borderRadius: '5px', cursor: 'pointer', width: '100%' }}>새로고침</button>
        </div>

        {/* 2. 게임 조작 */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', marginBottom: '15px' }}>🎮 게임 조작</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#ccc' }}>HP 강제 설정</label>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="number" 
                    value={hpInput} 
                    onChange={e => setHpInput(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '5px', border: 'none' }}
                    placeholder="HP 값"
                />
                <button onClick={() => callAdminApi('set-hp', { hp: Number(hpInput) })} style={{ background: '#007bff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}>적용</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button onClick={() => callAdminApi('reset-round')} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                🚨 강제 리셋<br/><span style={{fontSize:'0.8rem', fontWeight:'normal'}}>(다음 라운드)</span>
            </button>
            <button onClick={() => callAdminApi('reset-users')} style={{ background: '#ffc107', color: 'black', border: 'none', padding: '15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                👥 접속자 0명<br/><span style={{fontSize:'0.8rem', fontWeight:'normal'}}>(초기화)</span>
            </button>
          </div>
        </div>

        {/* 3. 설정 (전역) */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)', gridColumn: '1 / -1' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', marginBottom: '15px' }}>⚙️ 전역 설정 (실시간 반영)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
             <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>📢 공지사항 텍스트</label>
                <input 
                    type="text" 
                    value={announcement} 
                    onChange={e => setAnnouncement(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }} 
                    placeholder="예: 긴급 점검 중입니다."
                />
             </div>
             
             <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>📺 광고 링크 URL</label>
                <input 
                    type="text" 
                    value={adUrl} 
                    onChange={e => setAdUrl(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }} 
                    placeholder="https://..."
                />
             </div>

             <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🎁 상품명</label>
                <input 
                    type="text" 
                    value={prize} 
                    onChange={e => setPrize(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }} 
                    placeholder="예: 치킨 기프티콘"
                />
             </div>

             <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🔗 상품 링크 URL</label>
                <input 
                    type="text" 
                    value={prizeUrl} 
                    onChange={e => setPrizeUrl(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }} 
                    placeholder="https://..."
                />
             </div>
          </div>
          
          <button 
            onClick={() => callAdminApi('config', { announcement, prize, prizeUrl, adUrl })} 
            style={{ marginTop: '25px', width: '100%', background: '#28a745', color: 'white', border: 'none', padding: '15px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
          >
            💾 설정 저장하기
          </button>
        </div>

      </div>
    </div>
  );
}

export default Admin;
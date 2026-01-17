import React, { useState, useEffect } from 'react';
import './App.css'; // 기존 스타일 재사용 (Glassmorphism)

// 백엔드 API 주소 정규화 (useGameState.js와 동일)
let rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
if (rawApiUrl.endsWith('/api')) {
    rawApiUrl = rawApiUrl.substring(0, rawApiUrl.length - 4);
}
if (rawApiUrl.endsWith('/')) {
    rawApiUrl = rawApiUrl.substring(0, rawApiUrl.length - 1);
}
const API_URL = rawApiUrl;

function Admin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 대시보드 상태
  const [serverState, setServerState] = useState(null);
  
  // 입력값 상태
  const [hpInput, setHpInput] = useState("");
  const [roundInput, setRoundInput] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [prize, setPrize] = useState("");
  const [prizeUrl, setPrizeUrl] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [winners, setWinners] = useState([]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "egg1234") { // 클라이언트 측 간단 확인 (서버에서도 체크함)
      setIsAuthenticated(true);
      fetchState();
      fetchWinners();
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const fetchState = async () => {
    try {
      const res = await fetch(`${API_URL}/api/state`);
      const data = await res.json();
      setServerState(data);
      // 현재 서버 값으로 입력창 초기화
      setHpInput(data.hp);
      setRoundInput(data.round);
      setAnnouncement(data.announcement || "");
      setPrize(data.prize || "");
      setPrizeUrl(data.prizeUrl || "");
      setAdUrl(data.adUrl || "");
    } catch (e) {
      console.error("데이터 불러오기 실패:", e);
    }
  };

  const fetchWinners = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/winners`, {
              headers: { 'x-admin-key': password }
          });
          if (res.ok) {
              const data = await res.json();
              setWinners(data);
          }
      } catch (e) {
          console.error("우승자 목록 실패", e);
      }
  };

  const deleteWinner = async (id) => {
      if (!confirm("정말로 이 우승자 기록을 삭제하시겠습니까? (복구 불가)")) return;
      
      try {
          const res = await fetch(`${API_URL}/api/admin/winners/${id}`, {
              method: 'DELETE',
              headers: { 'x-admin-key': password }
          });
          if (res.ok) {
              alert("삭제되었습니다.");
              fetchWinners(); // 목록 갱신
          } else {
              alert("삭제 실패");
          }
      } catch (e) {
          alert("오류 발생");
      }
  };

  const callAdminApi = async (endpoint, body = {}) => {
    // ... (This function remains for general use, but we won't use it directly for the reset button anymore)
    if (!confirm(`정말로 '${endpoint}' 명령을 실행하시겠습니까?`)) return;
    // ... (implementation same as before)
    try {
      const res = await fetch(`${API_URL}/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        alert(JSON.stringify(json, null, 2));
        fetchState();
      } else {
        alert(`오류 발생: ${json.error || res.status}`);
      }
    } catch (e) {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  // New handler for Force Reset
  const handleForceReset = async () => {
      if (!confirm("정말로 강제 리셋하시겠습니까? (라운드 초기화 + 초대 기록 삭제)")) return;

      try {
          // 1. Reset Round
          const res1 = await fetch(`${API_URL}/api/admin/reset-round`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-key': password }
          });
          const json1 = await res1.json();
          
          // 2. Clear Invites
          const res2 = await fetch(`${API_URL}/api/admin/clear-invites`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-key': password }
          });
          const json2 = await res2.json();

          alert(`Round Reset: ${json1.success}\nInvites Clear: ${json2.success}\n\nDetails:\n${JSON.stringify(json1, null, 2)}\n${JSON.stringify(json2, null, 2)}`);
          fetchState();
      } catch (e) {
          alert("리셋 중 오류 발생: " + e.message);
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
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#ccc' }}>현재 라운드 설정</label>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="number" 
                    value={roundInput} 
                    onChange={e => setRoundInput(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '5px', border: 'none' }}
                    placeholder="라운드"
                />
                <button onClick={() => callAdminApi('set-round', { round: Number(roundInput) })} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}>변경</button>
            </div>
          </div>

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
            <button onClick={handleForceReset} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                🚨 강제 리셋<br/><span style={{fontSize:'0.8rem', fontWeight:'normal'}}>(다음 라운드)</span>
            </button>
            <button onClick={() => callAdminApi('reset-users')} style={{ background: '#ffc107', color: 'black', border: 'none', padding: '15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                👥 접속자 0명<br/><span style={{fontSize:'0.8rem', fontWeight:'normal'}}>(초기화)</span>
            </button>
            <button onClick={() => callAdminApi('check-invites')} style={{ background: '#6c757d', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                🔍 초대 기록 확인<br/><span style={{fontSize:'0.8rem', fontWeight:'normal'}}>(DB 상태 점검)</span>
            </button>
            <button onClick={() => callAdminApi('clear-invites')} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                🗑️ DB 청소<br/><span style={{fontSize:'0.8rem', fontWeight:'normal'}}>(초대 기록 삭제)</span>
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

        {/* 4. 우승자 목록 (New) */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)', gridColumn: '1 / -1' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom:'10px'}}>
             <h3>🏆 명예의 전당 (당첨자 관리)</h3>
             <button onClick={fetchWinners} style={{background:'transparent', border:'1px solid #aaa', color:'#fff', borderRadius:'5px', padding:'5px 10px', cursor:'pointer'}}>새로고침</button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Round</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>국가</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>이메일</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>상품</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>일시</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {winners.length > 0 ? winners.map((w) => (
                        <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px' }}>{w.round}</td>
                            <td style={{ padding: '10px' }}>{w.country}</td>
                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#ffb6c1' }}>{w.email}</td>
                            <td style={{ padding: '10px' }}>{w.prize || '-'}</td>
                            <td style={{ padding: '10px', color: '#aaa' }}>{new Date(w.created_at).toLocaleString()}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                <button onClick={() => deleteWinner(w.id)} style={{ background: '#ff4444', border: 'none', borderRadius: '5px', padding: '5px 10px', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>삭제</button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>아직 우승자가 없습니다.</td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Admin;
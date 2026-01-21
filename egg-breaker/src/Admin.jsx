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
  const [prizeImageUrl, setPrizeImageUrl] = useState("");
  const [prizeSecretUrl, setPrizeSecretUrl] = useState("");
  const [adUrl, setAdUrl] = useState("");

  const [winners, setWinners] = useState([]);
  const [prizePool, setPrizePool] = useState([]);
  
  // New Prize Input
  const [newPrizeName, setNewPrizeName] = useState("");
  const [newPrizeImg, setNewPrizeImg] = useState("");
  const [newPrizeSecret, setNewPrizeSecret] = useState("");
  const [newPrizeLink, setNewPrizeLink] = useState(""); // [New]

  // Checkbox State for Winners
  const [selectedWinners, setSelectedWinners] = useState(new Set());

  // [New] Session Persist
  useEffect(() => {
      const savedKey = sessionStorage.getItem('admin_key');
      if (savedKey === "egg1234") {
          setPassword(savedKey);
          setIsAuthenticated(true);
      }
  }, []);

  // [New] Fetch Data on Auth
  useEffect(() => {
      if (isAuthenticated) {
          fetchState();
          fetchWinners();
          fetchPrizePool();
      }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "egg1234") { 
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_key', password);
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setPassword("");
      sessionStorage.removeItem('admin_key');
  };

  const fetchPrizePool = async () => {
      try {
          const res = await fetch(`${API_URL}/api/admin/prize-pool`, {
              headers: { 'x-admin-key': password }
          });
          if (res.ok) {
              const data = await res.json();
              setPrizePool(data);
          }
      } catch (e) {
          console.error("상품 풀 실패", e);
      }
  };

  const handleFileUpload = (e, setUrlState) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // [Changed] 500KB Limit to ensure Base64 < 1MB (WebSocket Limit)
      if (file.size > 500 * 1024) { 
          return alert("이미지 용량이 너무 큽니다 (500KB 이하 권장). 웹소켓 전송 한도 초과 방지를 위해 용량을 줄여주세요.");
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          setUrlState(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
  };

  const addPrize = async () => {
      if (!newPrizeName || !newPrizeSecret) return alert("상품명과 실제 주소를 입력하세요.");
      try {
          const res = await fetch(`${API_URL}/api/admin/add-prize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
              body: JSON.stringify({ 
                  name: newPrizeName, 
                  image_url: newPrizeImg, 
                  secret_url: newPrizeSecret,
                  link: newPrizeLink
              })
          });
          if (res.ok) {
              setNewPrizeName(""); setNewPrizeImg(""); setNewPrizeSecret(""); setNewPrizeLink("");
              fetchPrizePool();
              alert("상품이 창고에 추가되었습니다.");
          }
      } catch (e) {}
  };

  const deletePrize = async (id) => {
      if (!confirm("정말로 삭제하시겠습니까?")) return;
      try {
          const res = await fetch(`${API_URL}/api/admin/prize-pool/${id}`, {
              method: 'DELETE',
              headers: { 'x-admin-key': password }
          });
          if (res.ok) fetchPrizePool();
      } catch (e) {}
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
      setPrizeImageUrl(data.prizeImageUrl || "");
      setPrizeSecretUrl(data.prizeSecretUrl || "");
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
              setSelectedWinners(new Set()); // Reset selection
          }
      } catch (e) {
          console.error("우승자 목록 실패", e);
      }
  };

  // [New] Checkbox Handler
  const toggleWinnerSelect = (id) => {
      const newSet = new Set(selectedWinners);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedWinners(newSet);
  };

  const toggleAllWinners = () => {
      if (selectedWinners.size === winners.length) {
          setSelectedWinners(new Set());
      } else {
          setSelectedWinners(new Set(winners.map(w => w.id)));
      }
  };

  // [New] Bulk Delete
  const deleteSelectedWinners = async () => {
      if (selectedWinners.size === 0) return alert("선택된 항목이 없습니다.");
      if (!confirm(`선택한 ${selectedWinners.size}개의 기록을 삭제하시겠습니까?`)) return;

      try {
          const promises = Array.from(selectedWinners).map(id => 
              fetch(`${API_URL}/api/admin/winners/${id}`, {
                  method: 'DELETE',
                  headers: { 'x-admin-key': password }
              })
          );
          
          await Promise.all(promises);
          alert("선택한 항목이 삭제되었습니다.");
          fetchWinners();
      } catch (e) {
          alert("일부 삭제 중 오류가 발생했습니다.");
          fetchWinners();
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
              fetchWinners(); // 목록 갱신
          } else {
              alert("삭제 실패");
          }
      } catch (e) {
          alert("오류 발생");
      }
  };

    const callAdminApi = async (endpoint, body = {}) => {
      if (!confirm(`정말로 '${endpoint}' 명령을 실행하시겠습니까?`)) return;
  
      try {
        const res = await fetch(`${API_URL}/api/admin/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': password // 비밀번호를 인증 키로 전송
          },
          body: JSON.stringify(body)
        });
        
        const json = await res.json();
        
        if (res.ok) {
          alert(json.details || "성공적으로 처리되었습니다!");
          fetchState(); // UI 갱신 (새로고침 X)
        } else {
          alert(`오류 발생: ${json.error || res.status}`);
        }
      } catch (e) {
        alert("네트워크 오류가 발생했습니다.");
      }
    };
  
    // Force Reset Handler
    const handleForceReset = async () => {
        if (!confirm("정말로 강제 리셋하시겠습니까? (라운드 초기화 + 초대 기록 삭제)")) return;
        // Now reset-round handles everything internally on backend
        callAdminApi('reset-round'); 
    };
  
    if (!isAuthenticated) {    return (
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
    <div className="admin-container" style={{ padding: '20px', background: '#222', minHeight: '100vh', color: 'white', fontFamily: "'Pretendard', sans-serif'" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🛠️ 관리자 대시보드</h1>
        <button onClick={handleLogout} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>로그아웃</button>
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🎁 상품명 (현재 라운드)</label>
                <input 
                    type="text" 
                    value={prize} 
                    onChange={e => setPrize(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }} 
                    placeholder="예: 치킨 기프티콘"
                />
             </div>

             <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🔗 상품 링크 URL (현재 라운드)</label>
                <input 
                    type="text" 
                    value={prizeUrl} 
                    onChange={e => setPrizeUrl(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }} 
                    placeholder="https://..."
                />
             </div>

             <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🖼️ 상품 예고 이미지 URL (현재 라운드)</label>
                <input 
                    type="text" 
                    value={prizeImageUrl} 
                    onChange={e => setPrizeImageUrl(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }} 
                    placeholder="https://..."
                />
             </div>

             <div style={{ background: 'rgba(255, 193, 7, 0.1)', padding: '10px', borderRadius: '10px', border: '1px dashed #ffc107' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#ffc107' }}>🔑 실제 상품권 이미지 URL (현재 라운드)</label>
                <input 
                    type="text" 
                    value={prizeSecretUrl} 
                    onChange={e => setPrizeSecretUrl(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', boxSizing: 'border-box', background: '#fff' }} 
                    placeholder="상품권 일련번호가 포함된 이미지 주소"
                />
             </div>
          </div>
          
          <button 
            onClick={() => {
                callAdminApi('config', { announcement, prize, prizeUrl, prizeImageUrl, prizeSecretUrl, adUrl });
            }} 
            style={{ marginTop: '25px', width: '100%', background: '#28a745', color: 'white', border: 'none', padding: '15px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
          >
            💾 설정 저장하기 (즉시 반영)
          </button>
        </div>

        {/* 5. 상품 창고 관리 (New) */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)', gridColumn: '1 / -1' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', marginBottom: '15px' }}>📦 상품 창고 (자동 지급 큐)</h3>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
             <h4 style={{marginTop: 0}}>➕ 새 상품 등록</h4>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <input type="text" placeholder="상품명 (예: 신세계 1만원)" value={newPrizeName} onChange={e => setNewPrizeName(e.target.value)} style={{padding:'10px', borderRadius:'5px', border:'none'}} />
                <input type="text" placeholder="상품 링크 (쿠팡 등)" value={newPrizeLink} onChange={e => setNewPrizeLink(e.target.value)} style={{padding:'10px', borderRadius:'5px', border:'none'}} />
                
                {/* Preview Image */}
                <div style={{display:'flex', gap:'5px'}}>
                    <input type="text" placeholder="예고 이미지 URL" value={newPrizeImg} onChange={e => setNewPrizeImg(e.target.value)} style={{flex:1, padding:'10px', borderRadius:'5px', border:'none'}} />
                    <label style={{background:'#666', color:'#fff', padding:'0 10px', borderRadius:'5px', cursor:'pointer', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center'}} title="내 컴퓨터에서 업로드">
                        📁
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e => handleFileUpload(e, setNewPrizeImg)} />
                    </label>
                </div>

                {/* Secret Image */}
                <div style={{display:'flex', gap:'5px'}}>
                    <input type="text" placeholder="실제 상품권 URL (필수)" value={newPrizeSecret} onChange={e => setNewPrizeSecret(e.target.value)} style={{flex:1, padding:'10px', borderRadius:'5px', border:'none'}} />
                    <label style={{background:'#ffc107', color:'#000', padding:'0 10px', borderRadius:'5px', cursor:'pointer', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center'}} title="내 컴퓨터에서 업로드">
                        📁
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e => handleFileUpload(e, setNewPrizeSecret)} />
                    </label>
                </div>

                <button onClick={addPrize} style={{background:'#28a745', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>창고에 추가</button>
             </div>
             <p style={{fontSize:'0.8rem', color:'#aaa', marginTop:'10px'}}>* 창고에 등록된 순서대로 우승자에게 자동 지급됩니다.</p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <th>순번</th>
                        <th>상품명</th>
                        <th>링크</th>
                        <th>상태</th>
                        <th>배정 라운드</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {prizePool.length > 0 ? prizePool.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: p.is_used ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
                            <td style={{ padding: '10px', textAlign:'center' }}>{idx + 1}</td>
                            <td style={{ padding: '10px' }}>{p.name}</td>
                            <td style={{ padding: '10px', maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                <a href={p.link} target="_blank" rel="noreferrer" style={{color:'#00cec9'}}>{p.link || '-'}</a>
                            </td>
                            <td style={{ padding: '10px', textAlign:'center' }}>
                                {p.is_used ? <span style={{color:'#888'}}>지급 완료</span> : <span style={{color:'#28a745', fontWeight:'bold'}}>대기 중</span>}
                            </td>
                            <td style={{ padding: '10px', textAlign:'center' }}>{p.round || '-'}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                <button onClick={() => deletePrize(p.id)} style={{ background: '#ff4444', border: 'none', borderRadius: '5px', padding: '5px 10px', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>삭제</button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="6" style={{padding:'20px', textAlign:'center', color:'#888'}}>등록된 상품이 없습니다.</td></tr>
                    )}
                </tbody>
            </table>
          </div>
        </div>

        {/* 4. 우승자 목록 */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)', gridColumn: '1 / -1' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom:'10px'}}>
             <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <h3>🏆 명예의 전당 (당첨자 관리)</h3>
                {selectedWinners.size > 0 && (
                    <button onClick={deleteSelectedWinners} style={{background:'#ff4444', color:'white', border:'none', padding:'5px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                        선택 삭제 ({selectedWinners.size})
                    </button>
                )}
             </div>
             <button onClick={fetchWinners} style={{background:'transparent', border:'1px solid #aaa', color:'#fff', borderRadius:'5px', padding:'5px 10px', cursor:'pointer'}}>새로고침</button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>
                            <input type="checkbox" onChange={toggleAllWinners} checked={winners.length > 0 && selectedWinners.size === winners.length} />
                        </th>
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
                        <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: selectedWinners.has(w.id) ? 'rgba(255, 68, 68, 0.1)' : 'transparent' }}>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                <input type="checkbox" checked={selectedWinners.has(w.id)} onChange={() => toggleWinnerSelect(w.id)} />
                            </td>
                            <td style={{ padding: '10px' }}>{w.round}</td>
                            <td style={{ padding: '10px' }}>{w.country}</td>
                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#ffb6c1' }}>
                                {w.email === "IMAGE_CLAIMED" ? (
                                    <span style={{ background: '#2e7d32', color: '#fff', padding: '2px 8px', borderRadius: '5px', fontSize: '0.8rem' }}>🖼️ 이미지 수령</span>
                                ) : w.email}
                            </td>
                            <td style={{ padding: '10px' }}>{w.prize || '-'}</td>
                            <td style={{ padding: '10px', color: '#aaa' }}>{new Date(w.created_at).toLocaleString()}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                <button onClick={() => deleteWinner(w.id)} style={{ background: '#555', border: 'none', borderRadius: '5px', padding: '5px 10px', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>삭제</button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>아직 우승자가 없습니다.</td>
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
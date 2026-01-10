import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, runTransaction, push, onDisconnect, set, remove } from 'firebase/database';
import './App.css';

// 국가 코드 -> 국기 이모지 변환 함수
const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

function App() {
  // --- 상태 관리 ---
  const [hp, setHp] = useState(1000000);
  const [isShaking, setIsShaking] = useState(false);
  const [myPoints, setMyPoints] = useState(0);     // 내 포인트 (화폐)
  const [clickPower, setClickPower] = useState(1); // 클릭 당 공격력
  const [onlineUsers, setOnlineUsers] = useState({}); // 접속자 목록
  const [isWinner, setIsWinner] = useState(false); // 막타 친 사람인가?
  const [winnerEmail, setWinnerEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  
  // 유저 정보 (세션 ID)
  const userId = useRef("user_" + Math.random().toString(36).substr(2, 9));
  const myCountry = useRef("Unknown");

  // --- 1. 초기화: 국가 확인 및 접속자 등록 ---
  useEffect(() => {
    // 무료 IP API로 국가 확인
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        myCountry.current = data.country_code || "KR"; 
        registerOnline();
      })
      .catch(() => {
        myCountry.current = "Unknown";
        registerOnline();
      });

    const registerOnline = () => {
      const userRef = ref(db, `onlineUsers/${userId.current}`);
      // 접속 정보 등록
      set(userRef, {
        country: myCountry.current,
        lastActive: Date.now()
      });
      // 연결 끊기면 자동 삭제 (onDisconnect)
      onDisconnect(userRef).remove();
    };

    // 실시간 접속자 목록 수신
    const usersRef = ref(db, 'onlineUsers');
    return onValue(usersRef, (snapshot) => {
      setOnlineUsers(snapshot.val() || {});
    });
  }, []);

  // --- 2. 체력 데이터 수신 ---
  useEffect(() => {
    const hpRef = ref(db, 'eggHP');
    return onValue(hpRef, (snapshot) => {
      const data = snapshot.val();
      setHp(data === null ? 1000000 : data);
    });
  }, []);

  // --- 3. 클릭 액션 (공격) ---
  const handleClick = () => {
    if (hp <= 0) return;

    // 애니메이션 & 포인트 적립
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);
    setMyPoints(prev => prev + clickPower); // 기여도(포인트) 증가

    // DB 트랜잭션 (동시성 제어)
    const hpRef = ref(db, 'eggHP');
    runTransaction(hpRef, (currentHP) => {
      if (currentHP === null) return 1000000;
      if (currentHP <= 0) return 0; // 이미 죽음

      const nextHP = Math.max(0, currentHP - clickPower);
      return nextHP;
    })
    .then((result) => {
      // 내가 막타를 쳤는지 확인 (committed: true 이고 결과가 0일 때)
      if (result.committed && result.snapshot.val() === 0) {
        setIsWinner(true); // 이메일 입력창 오픈
      }
    });
  };

  // --- 4. 아이템 구매 (기여도 사용) ---
  const buyItem = (cost, powerAdd) => {
    if (myPoints >= cost) {
      setMyPoints(prev => prev - cost);
      setClickPower(prev => prev + powerAdd);
      alert(`⚔️ 공격력 강화 성공! (현재 공격력: ${clickPower + powerAdd})`);
    } else {
      alert("포인트가 부족합니다! 더 때리세요!");
    }
  };

  // --- 5. 막타 이메일 전송 ---
  const submitWinnerEmail = () => {
    if (!winnerEmail.includes("@")) return alert("올바른 이메일을 입력해주세요.");
    
    push(ref(db, 'winners'), {
      email: winnerEmail,
      date: new Date().toString(),
      country: myCountry.current
    });
    
    setEmailSubmitted(true);
    alert("🎉 접수 완료! 담당자가 확인 후 상품을 보내드립니다.");
  };

  // 접속자 수 국가별 집계
  const getCountryStats = () => {
    const stats = {};
    Object.values(onlineUsers).forEach(user => {
      const country = user.country || "Unknown";
      stats[country] = (stats[country] || 0) + 1;
    });
    // 접속 많은 순 정렬
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  // 알 상태 이모지
  const getEggEmoji = () => {
    if (hp <= 0) return "🐣";
    if (hp < 250000) return "🦴";
    if (hp < 500000) return "🔥";
    if (hp < 750000) return "🍳";
    return "🥚";
  };

  return (
    <div className="main-layout">
      {/* 1. 왼쪽: 국가별 접속자 현황 (PC 전용 / 모바일은 하단) */}
      <aside className="sidebar left-panel">
        <h3>🌐 실시간 접속자</h3>
        <p className="total-users">총 {Object.keys(onlineUsers).length}명 참전 중</p>
        <ul className="country-list">
          {getCountryStats().map(([code, count]) => (
            <li key={code}>
              <span className="flag">{getFlagEmoji(code)}</span>
              <span className="count">{count}명</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* 2. 중앙: 게임 화면 */}
      <main className="game-area">
        <h1 className="title">GLOBAL EGG BREAK</h1>
        <p className="subtitle">전 세계가 함께 부수는 전설의 알</p>
        
        <div className="hp-container">
          <div className="hp-bar" style={{ width: `${(hp / 1000000) * 100}%` }}></div>
        </div>
        <h2 className="hp-text">{hp.toLocaleString()} HP</h2>

        <div className="egg-container">
           <div className={`egg ${isShaking ? 'shake' : ''}`} onClick={handleClick}>
             {getEggEmoji()}
           </div>
           {/* 클릭 시 뜨는 데미지 효과 (간단 구현) */}
           {isShaking && <span className="damage-float">-{clickPower}</span>}
        </div>

        <div className="my-status">
            <p>보유 포인트: <strong>{myPoints.toLocaleString()} P</strong></p>
            <p>현재 공격력: <strong>x{clickPower}</strong></p>
        </div>

        {/* 광고 배너 위치 */}
        <div className="ad-box">AD: 여기에 광고가 들어갑니다</div>
      </main>

      {/* 3. 오른쪽: 상점 (기여도 사용) */}
      <aside className="sidebar right-panel">
        <h3>🛒 기여도 상점</h3>
        <p className="warning-text">*새로고침 시 초기화됩니다*</p>
        
        <div className="shop-item" onClick={() => buyItem(100, 1)}>
          <div className="icon">🔨</div>
          <div className="info">
            <h4>더블 클릭</h4>
            <p>공격력 +1 증가</p>
          </div>
          <div className="price">100 P</div>
        </div>

        <div className="shop-item" onClick={() => buyItem(500, 5)}>
          <div className="icon">⛏️</div>
          <div className="info">
            <h4>강철 곡괭이</h4>
            <p>공격력 +5 증가</p>
          </div>
          <div className="price">500 P</div>
        </div>

        <div className="shop-item" onClick={() => buyItem(2000, 25)}>
          <div className="icon">💣</div>
          <div className="info">
            <h4>다이너마이트</h4>
            <p>공격력 +25 증가</p>
          </div>
          <div className="price">2k P</div>
        </div>
      </aside>

      {/* 4. 막타 승리 모달 */}
      {isWinner && !emailSubmitted && (
        <div className="winner-modal">
          <div className="modal-content">
            <h2>🏆 전설의 알 파괴자!</h2>
            <p>마지막 일격을 가하셨습니다!</p>
            <p>상품을 받으실 이메일을 입력해주세요.</p>
            <input 
              type="email" 
              placeholder="example@email.com" 
              value={winnerEmail}
              onChange={(e) => setWinnerEmail(e.target.value)}
            />
            <button onClick={submitWinnerEmail}>전송하기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
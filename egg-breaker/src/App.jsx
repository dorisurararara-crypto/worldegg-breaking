// src/App.jsx
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, runTransaction } from 'firebase/database';
import './App.css';

function App() {
  const [hp, setHp] = useState(1000000);
  const [isShaking, setIsShaking] = useState(false);
  const [clickCount, setClickCount] = useState(0); // 내가 클릭한 횟수

  // 1. 실시간 체력 연동
  useEffect(() => {
    const hpRef = ref(db, 'eggHP');
    return onValue(hpRef, (snapshot) => {
      const data = snapshot.val();
      // DB에 값이 없으면(처음) 100만으로 설정
      if (data === null) {
        setHp(1000000);
      } else {
        setHp(data);
      }
    });
  }, []);

  // 2. 클릭 핸들러 (트랜잭션 사용)
  const handleClick = () => {
    // 진동 효과
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);

    // 내 점수 올리기
    setClickCount((prev) => prev + 1);

    // DB 업데이트
    const hpRef = ref(db, 'eggHP');
    runTransaction(hpRef, (currentHP) => {
      if (currentHP === null) return 1000000;
      return Math.max(0, currentHP - 1);
    });
  };

  // 3. 광고 아이템 (가짜)
  const usePowerItem = () => {
    if (!confirm("광고를 보고 데미지 100을 입히시겠습니까? (시뮬레이션)")) return;
    
    const hpRef = ref(db, 'eggHP');
    runTransaction(hpRef, (currentHP) => {
        return Math.max(0, currentHP - 100);
    });
    alert("⚡ 크리티컬! -100 데미지!");
  };

  // 알 상태에 따른 이모지 변화
  const getEggEmoji = () => {
    if (hp <= 0) return "🐣"; // 깨짐
    if (hp < 250000) return "🍳"; // 빈사
    if (hp < 500000) return "🦴"; // 많이 깨짐
    return "🥚"; // 멀쩡
  };

  return (
    <div className="container">
      <h1 className="title">🌍 전 세계 알 깨기 챌린지</h1>
      <p className="subtitle">접속자들과 함께 체력을 깎으세요!</p>

      {/* 체력바 */}
      <div className="hp-box">
        <div 
          className="hp-bar" 
          style={{ width: `${(hp / 1000000) * 100}%` }}
        ></div>
      </div>
      <h2 className="hp-text">{hp.toLocaleString()} HP</h2>

      {/* 알 (클릭 버튼) */}
      <div className="egg-wrapper">
        <div 
          className={`egg ${isShaking ? 'shake' : ''}`} 
          onClick={handleClick}
        >
          {getEggEmoji()}
        </div>
      </div>

      {/* 정보 및 아이템 */}
      <div className="stats">
        <p>내 기여도: <strong>{clickCount}회</strong> 클릭</p>
      </div>

      <button className="item-btn" onClick={usePowerItem}>
        📺 광고 보고 파워 클릭 (-100)
      </button>
      
      {/* 배너 광고 영역 */}
      <div className="ad-banner">
        (광고 배너 영역)
      </div>
    </div>
  );
}

export default App;
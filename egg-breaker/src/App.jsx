import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, runTransaction, push, onDisconnect, set, remove } from 'firebase/database';
import './App.css';

// --- 다국어 데이터 ---
const TRANSLATIONS = {
  US: { label: "English", title: "THE MILLION CLICK EGG", subtitle: "Let's crack this egg together!", users: "Live Users", total: "Total", shop: "Shop", myPoint: "My Points", atk: "ATK", item1: "Dual Hammer", item2: "Pickaxe", item3: "TNT", modalTitle: "Legendary Destroyer!", send: "Submit", adText: "Ad Banner Area", powerClick: "⚡ Power Click (+100) ⚡", watchAd: "Watch an Ad" },
  KR: { label: "한국어", title: "100만 클릭의 알", subtitle: "전 세계가 함께 깨부수는 전설의 알", users: "접속자", total: "총", shop: "상점", myPoint: "보유 포인트", atk: "공격력", item1: "쌍망치", item2: "곡괭이", item3: "TNT 폭약", modalTitle: "전설의 파괴자!", send: "전송", adText: "광고 영역", powerClick: "⚡ 파워 클릭 (+100) ⚡", watchAd: "광고 보고 강력한 한방" },
  JP: { label: "日本語", title: "ミリオン・クリック・エッグ", subtitle: "世界中で伝説の卵を割ろう", users: "接続中", total: "計", shop: "商店", myPoint: "ポイント", atk: "攻撃力", item1: "ハンマー", item2: "つるはし", item3: "ダイナマイト", modalTitle: "伝説の破壊者！", send: "送信", adText: "広告エリア", powerClick: "⚡ パワークリック (+100) ⚡", watchAd: "広告を見て攻撃" },
  CN: { label: "中文", title: "百万点击大挑战", subtitle: "全世界一起击碎传说之蛋", users: "在线", total: "总计", shop: "商店", myPoint: "积分", atk: "攻击力", item1: "双锤", item2: "钢镐", item3: "炸药", modalTitle: "传说破坏者！", send: "发送", adText: "广告区域", powerClick: "⚡ 超级点击 (+100) ⚡", watchAd: "看广告强力攻击" }
};

const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

function App() {
  const [hp, setHp] = useState(1000000);
  const [isShaking, setIsShaking] = useState(false);
  const [myPoints, setMyPoints] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isWinner, setIsWinner] = useState(false);
  const [winnerEmail, setWinnerEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  
  // 국가 및 언어 설정
  const [myCountry, setMyCountry] = useState("US");
  const [lang, setLang] = useState(TRANSLATIONS.US);
  const [currentTool, setCurrentTool] = useState("fist");
  const [showCountrySelect, setShowCountrySelect] = useState(false); // 국가 선택창 표시 여부

  const userId = useRef("user_" + Math.random().toString(36).substr(2, 9));

  // 1. 접속 시 IP로 국가 자동 감지 (최초 1회)
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const code = data.country_code || "US";
        changeCountry(code); // 국가 설정 함수 호출
      })
      .catch(() => {
        changeCountry("US");
      });

    // 실시간 접속자 수신
    const usersRef = ref(db, 'onlineUsers');
    return onValue(usersRef, (snapshot) => {
      setOnlineUsers(snapshot.val() || {});
    });
  }, []);

  // 2. 국가 변경 함수
  const changeCountry = (code) => {
    // 지원하지 않는 나라는 US(영어)로 설정하되 국기는 유지
    const targetLang = ["KR", "JP", "CN"].includes(code) ? code : "US";
    
    setMyCountry(code);
    setLang(TRANSLATIONS[targetLang]);
    setShowCountrySelect(false); // 선택창 닫기

    // DB에 내 정보 업데이트
    const userRef = ref(db, `onlineUsers/${userId.current}`);
    set(userRef, { country: code, lastActive: Date.now() });
    onDisconnect(userRef).remove();
  };

  // 3. 체력 수신
  useEffect(() => {
    const hpRef = ref(db, 'eggHP');
    return onValue(hpRef, (snapshot) => {
      setHp(snapshot.val() === null ? 1000000 : snapshot.val());
    });
  }, []);

  // 4. 클릭 액션
  const handleClick = () => {
    if (hp <= 0) return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);
    setMyPoints(prev => prev + clickPower);

    const hpRef = ref(db, 'eggHP');
    runTransaction(hpRef, (currentHP) => {
      if (currentHP === null) return 1000000;
      return Math.max(0, currentHP - clickPower);
    }).then((result) => {
      if (result.committed && result.snapshot.val() === 0) setIsWinner(true);
    });
  };

  const buyItem = (cost, powerAdd, toolName) => {
    if (myPoints >= cost) {
      setMyPoints(prev => prev - cost);
      setClickPower(prev => prev + powerAdd);
      setCurrentTool(toolName);
    } else {
      alert("Not enough points!");
    }
  };

  const submitWinnerEmail = () => {
    if (!winnerEmail.includes("@")) return;
    push(ref(db, 'winners'), { email: winnerEmail, date: new Date().toString(), country: myCountry });
    setEmailSubmitted(true);
    alert("Sent!");
  };

  const getCountryStats = () => {
    const stats = {};
    Object.values(onlineUsers).forEach(user => {
      const c = user.country || "Unknown";
      stats[c] = (stats[c] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  const getEggEmoji = () => {
    if (hp <= 0) return "🐣";
    if (hp < 250000) return "🦴";
    if (hp < 500000) return "🔥";
    if (hp < 750000) return "🍳";
    return "🥚";
  };

  return (
    <div className="app-container">
      {/* 상단 네비게이션 (국가 선택) */}
      <nav className="navbar">
        <div className="logo">EGG BREAK 🔨</div>
        <div className="lang-selector">
          <button className="lang-btn" onClick={() => setShowCountrySelect(!showCountrySelect)}>
            {getFlagEmoji(myCountry)} {myCountry} ▼
          </button>
          {showCountrySelect && (
            <div className="lang-dropdown">
              <div onClick={() => changeCountry('US')}>🇺🇸 English (US)</div>
              <div onClick={() => changeCountry('KR')}>🇰🇷 한국어 (KR)</div>
              <div onClick={() => changeCountry('JP')}>🇯🇵 日本語 (JP)</div>
              <div onClick={() => changeCountry('CN')}>🇨🇳 中文 (CN)</div>
            </div>
          )}
        </div>
      </nav>

      <div className="main-layout">
        {/* 왼쪽 패널 */}
        <aside className="panel left-panel glass">
          <h3>🌐 {lang.users}</h3>
          <div className="scroll-box">
            {getCountryStats().map(([code, count]) => (
              <div key={code} className="user-row">
                <span className="flag">{getFlagEmoji(code)}</span>
                <span className="count">{count}</span>
              </div>
            ))}
          </div>
          <div className="total-badge">{lang.total}: {Object.keys(onlineUsers).length}</div>
        </aside>

        {/* 중앙 게임 영역 */}
        <main className="game-area">
          <div className="header-glow">
            <h1 className="title">{lang.title}</h1>
            <p className="subtitle">{lang.subtitle}</p>
          </div>

          <div className="egg-stage">
            <div 
              className={`egg ${isShaking ? 'shake' : ''} cursor-${currentTool}`} 
              onClick={handleClick}
            >
              {getEggEmoji()}
            </div>
            {isShaking && <span className="damage-float">-{clickPower}</span>}
          </div>

          <div className="hp-wrapper">
             <div className="hp-container">
               <div className="hp-bar" style={{ width: `${(hp / 1000000) * 100}%` }}></div>
             </div>
             <div className="hp-text">{hp.toLocaleString()} HP</div>
          </div>

          {/* 파워 클릭 버튼 (그라데이션) */}
          <button className="power-btn" onClick={() => buyItem(0, 0, 'fist')}>
            <span className="btn-title">{lang.powerClick}</span>
            <span className="btn-sub">{lang.watchAd}</span>
          </button>

          <div className="status-row glass">
            <div>{lang.myPoint}: <span>{myPoints}</span></div>
            <div>{lang.atk}: <span>x{clickPower}</span></div>
          </div>

          <div className="ad-banner">{lang.adText}</div>
        </main>

        {/* 오른쪽 상점 */}
        <aside className="panel right-panel glass">
          <h3>🛒 {lang.shop}</h3>
          <div className="shop-list">
            <div className="shop-item" onClick={() => buyItem(100, 1, 'hammer')}>
              <div className="icon">🔨</div>
              <div className="info">
                <h4>{lang.item1}</h4>
                <div className="price">100 P</div>
              </div>
            </div>
            <div className="shop-item" onClick={() => buyItem(500, 5, 'pickaxe')}>
              <div className="icon">⛏️</div>
              <div className="info">
                <h4>{lang.item2}</h4>
                <div className="price">500 P</div>
              </div>
            </div>
            <div className="shop-item" onClick={() => buyItem(2000, 25, 'dynamite')}>
              <div className="icon">🧨</div>
              <div className="info">
                <h4>{lang.item3}</h4>
                <div className="price">2k P</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 모달 */}
      {isWinner && !emailSubmitted && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <h2>{lang.modalTitle}</h2>
            <input 
              type="email" 
              placeholder="Email"
              value={winnerEmail}
              onChange={(e) => setWinnerEmail(e.target.value)}
            />
            <button className="send-btn" onClick={submitWinnerEmail}>{lang.send}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
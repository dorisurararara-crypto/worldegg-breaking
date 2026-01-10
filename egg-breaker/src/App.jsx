import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, runTransaction, push, onDisconnect, set } from 'firebase/database';
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

// --- 🔥 [신규] 깨지는 알 SVG 컴포넌트 ---
const CrackedEgg = ({ hp, maxHp, isShaking, tool }) => {
  const percentage = (hp / maxHp) * 100;
  
  // 체력에 따른 금(Crack) 단계 결정
  const showCrack1 = percentage < 80; // 80% 미만일 때 잔금
  const showCrack2 = percentage < 50; // 50% 미만일 때 큰금
  const showCrack3 = percentage < 20; // 20% 미만일 때 박살

  return (
    <div className={`egg-svg-container ${isShaking ? 'shake' : ''} cursor-${tool}`}>
      <svg viewBox="0 0 200 250" className="egg-svg">
        <defs>
          <radialGradient id="eggGradient" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#ffa500" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* 1. 알 본체 */}
        <ellipse cx="100" cy="125" rx="80" ry="110" fill="url(#eggGradient)" filter="url(#glow)" />

        {/* 2. 금(Cracks) - 체력에 따라 보임/숨김 */}
        {showCrack1 && (
          <path d="M100 30 L110 50 L90 60 L105 80" fill="none" stroke="#664400" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        )}
        {showCrack2 && (
          <path d="M50 100 L80 110 L60 130 L90 140 L70 160" fill="none" stroke="#664400" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        )}
        {showCrack3 && (
          <path d="M130 90 L110 110 L140 130 L120 160 L150 180" fill="none" stroke="#664400" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        )}
        {/* HP 0일 때 (완전 깨짐) */}
        {hp <= 0 && (
           <path d="M20 125 L180 125" fill="none" stroke="#000" strokeWidth="10" />
        )}
      </svg>
    </div>
  );
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
  const [myCountry, setMyCountry] = useState("US");
  const [lang, setLang] = useState(TRANSLATIONS.US);
  const [currentTool, setCurrentTool] = useState("fist");
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const userId = useRef("user_" + Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    fetch('https://ipapi.co/json/').then(res => res.json())
      .then(data => changeCountry(data.country_code || "US"))
      .catch(() => changeCountry("US"));

    const usersRef = ref(db, 'onlineUsers');
    return onValue(usersRef, (snapshot) => setOnlineUsers(snapshot.val() || {}));
  }, []);

  const changeCountry = (code) => {
    const targetLang = ["KR", "JP", "CN"].includes(code) ? code : "US";
    setMyCountry(code);
    setLang(TRANSLATIONS[targetLang]);
    setShowCountrySelect(false);
    const userRef = ref(db, `onlineUsers/${userId.current}`);
    set(userRef, { country: code, lastActive: Date.now() });
    onDisconnect(userRef).remove();
  };

  useEffect(() => {
    const hpRef = ref(db, 'eggHP');
    return onValue(hpRef, (snapshot) => setHp(snapshot.val() === null ? 1000000 : snapshot.val()));
  }, []);

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

  return (
    <div className="app-container">
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

      {/* 메인 레이아웃: 화면 꽉 채우기 */}
      <div className="main-layout">
        
        {/* 왼쪽: 접속자 (고정 너비) */}
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

        {/* 중앙: 게임 (남은 공간 모두 차지 flex-grow) */}
        <main className="game-area">
          <div className="header-glow">
            <h1 className="title">{lang.title}</h1>
            <p className="subtitle">{lang.subtitle}</p>
          </div>

          <div className="egg-stage" onClick={handleClick}>
            {/* SVG 알 컴포넌트 사용 */}
            <CrackedEgg hp={hp} maxHp={1000000} isShaking={isShaking} tool={currentTool} />
            {isShaking && <span className="damage-float">-{clickPower}</span>}
          </div>

          <div className="hp-wrapper">
             <div className="hp-container">
               <div className="hp-bar" style={{ width: `${(hp / 1000000) * 100}%` }}></div>
             </div>
             <div className="hp-text">{hp.toLocaleString()} HP</div>
          </div>

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

        {/* 오른쪽: 상점 (고정 너비) */}
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
import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, runTransaction, push, onDisconnect, set } from 'firebase/database';
import './App.css';
import Admin from './Admin';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import GameArea from './components/GameArea';
import RightPanel from './components/RightPanel';

// --- 다국어 데이터 ---
const TRANSLATIONS = {
  US: { label: "English", title: "THE MILLION CLICK EGG", subtitle: "Let's crack this egg together!", users: "Live Users", total: "Total", shop: "Shop", myPoint: "My Points", atk: "ATK", item1: "Dual Hammer", item2: "Pickaxe", item3: "TNT", item4: "Drill", item5: "Excavator", modalTitle: "Legendary Destroyer!", send: "Submit", adText: "Ad Banner Area", powerClick: "⚡ Power Click (+100) ⚡", watchAd: "Watch an Ad", logo: "EGG BREAK 🔨" },
  KR: { label: "한국어", title: "100만 클릭의 알", subtitle: "전 세계가 함께 깨부수는 전설의 알", users: "접속자", total: "총", shop: "상점", myPoint: "보유 포인트", atk: "공격력", item1: "쌍망치", item2: "곡괭이", item3: "TNT 폭약", item4: "드릴", item5: "굴착기", modalTitle: "전설의 파괴자!", send: "전송", adText: "광고 영역", powerClick: "⚡ 파워 클릭 (+100) ⚡", watchAd: "광고 보고 강력한 한방", logo: "알 깨기 🔨" },
  JP: { label: "日本語", title: "ミリオン・クリック・エッグ", subtitle: "世界中で伝説の卵を割ろう", users: "接続中", total: "計", shop: "商店", myPoint: "ポイント", atk: "攻撃力", item1: "ハンマー", item2: "つるはし", item3: "ダイナマイト", item4: "ドリル", item5: "ショベル", modalTitle: "伝説の破壊者！", send: "送信", adText: "広告エリア", powerClick: "⚡ パワークリック (+100) ⚡", watchAd: "広告を見て攻撃", logo: "エッグブレーク 🔨" },
  CN: { label: "中文", title: "百万点击大挑战", subtitle: "全世界一起击碎传说之蛋", users: "在线", total: "总计", shop: "商店", myPoint: "积分", atk: "攻击力", item1: "双锤", item2: "钢镐", item3: "炸药", item4: "电钻", item5: "挖掘机", modalTitle: "传说破坏者！", send: "发送", adText: "广告区域", powerClick: "⚡ 超级点击 (+100) ⚡", watchAd: "看广告强力攻击", logo: "击碎鸡蛋 🔨" }
};

const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

function App() {
  const [route, setRoute] = useState(window.location.hash);
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
  const [prize, setPrize] = useState('');
  const [round, setRound] = useState(1);
  const userId = useRef("user_" + Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const userRef = ref(db, `onlineUsers/${userId.current}`);

    set(userRef, { country: myCountry, lastActive: Date.now() });

    onDisconnect(userRef).remove();

    const usersRef = ref(db, 'onlineUsers');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      setOnlineUsers(snapshot.val() || {});
    });

    return () => {
      unsubscribe();
      set(userRef, null);
    };
  }, [myCountry]);

  useEffect(() => {
    fetch('https://ipapi.co/json/').then(res => res.json())
      .then(data => changeCountry(data.country_code || "US"))
      .catch(() => changeCountry("US"));

    const prizeRef = ref(db, 'prize');
    const roundRef = ref(db, 'round');

    onValue(prizeRef, (snapshot) => {
      setPrize(snapshot.val() || '');
    });
    onValue(roundRef, (snapshot) => {
      setRound(snapshot.val() || 1);
    });
  }, []);

  const changeCountry = (code) => {
    const targetLang = ["KR", "JP", "CN"].includes(code) ? code : "US";
    setMyCountry(code);
    setLang(TRANSLATIONS[targetLang]);
    setShowCountrySelect(false);
    const userRef = ref(db, `onlineUsers/${userId.current}`);
    set(userRef, { country: code, lastActive: Date.now() });
  };

  useEffect(() => {
    const hpRef = ref(db, 'eggHP');
    return onValue(hpRef, (snapshot) => {
      const currentHp = snapshot.val();
      if (currentHp === null) {
        setHp(1000000);
      } else {
        setHp(currentHp);
      }
    });
  }, []);

  const handleClick = () => {
    if (hp <= 0) return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);
    setMyPoints(prev => prev + clickPower);

    const hpRef = ref(db, 'eggHP');
    runTransaction(hpRef, (currentHP) => {
      if (currentHP === null) return 1000000;
      if (currentHP <= 0) return 0;
      return Math.max(0, currentHP - clickPower);
    }).then((result) => {
      if (result.committed && result.snapshot.val() === 0) {
        if (!isWinner) setIsWinner(true);
      }
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
    push(ref(db, 'winners'), {
      email: winnerEmail,
      date: new Date().toString(),
      country: myCountry,
      round: round
    });
    setEmailSubmitted(true);
    alert("Sent!");
  };

  const getCountryStats = () => {
    const stats = {};
    if (onlineUsers) {
      Object.values(onlineUsers).forEach(user => {
        const c = user.country || "Unknown";
        stats[c] = (stats[c] || 0) + 1;
      });
    }
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  if (route === '#admin') {
    return <Admin />;
  }

  return (
    <div className="app-container">
      <Header
        lang={lang}
        myCountry={myCountry}
        getFlagEmoji={getFlagEmoji}
        showCountrySelect={showCountrySelect}
        setShowCountrySelect={setShowCountrySelect}
        changeCountry={changeCountry}
      />

      <div className="main-layout">
        <LeftPanel
          lang={lang}
          getCountryStats={getCountryStats}
          onlineUsers={onlineUsers}
          prize={prize}
          getFlagEmoji={getFlagEmoji}
        />
        <GameArea
          lang={lang}
          hp={hp}
          isShaking={isShaking}
          clickPower={clickPower}
          isWinner={isWinner}
          emailSubmitted={emailSubmitted}
          winnerEmail={winnerEmail}
          setWinnerEmail={setWinnerEmail}
          submitWinnerEmail={submitWinnerEmail}
          handleClick={handleClick}
          currentTool={currentTool}
          buyItem={buyItem}
        />
        <RightPanel
            lang={lang}
            buyItem={buyItem}
            myPoints={myPoints}
            clickPower={clickPower}
        />
      </div>
    </div>
  );
}

export default App;
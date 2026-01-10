import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, runTransaction, push, onDisconnect, set } from 'firebase/database';
import './App.css';
import Admin from './Admin';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import GameArea from './components/GameArea';

// --- 다국어 데이터 ---
const TRANSLATIONS = {
  US: { 
    label: "English", title: "THE MILLION CLICK EGG", subtitle: "Let's crack this egg together!", users: "Live Users", total: "Total", shop: "Shop", myPoint: "Points", atk: "ATK", item1: "Dual Hammer", item2: "Pickaxe", item3: "TNT", item4: "Drill", item5: "Excavator", item6: "Laser Gun", item7: "Nuclear Bomb", modalTitle: "🎉 Congratulations! 🎉", modalDesc: "You delivered the final blow and broke the egg! You are the Legendary Destroyer.", modalPrize: "Please enter your email address to receive the prize:", send: "Submit to Claim Prize", adText: "Ad Banner Area", powerClick: "⚡ Power Click (+100) ⚡", watchAd: "Watch an Ad", logo: "EGG BREAK 🔨",
    gameRuleTitle: "How to Play", gameRule1: "- Click the egg to reduce its HP.", gameRule2: "- Collect points to buy items.", gameRule3: "- Break the egg with the world!", noticeTitle: "Notice", notice1: "- Abnormal play may result in a ban.", notice2: "- This game may be reset.", prizeTitle: "Current Prize", contactTitle: "Contact", myInfoTitle: "My Info", totalClick: "Total Clicks"
  },
  KR: { 
    label: "한국어", title: "100만 클릭의 알", subtitle: "전 세계가 함께 깨부수는 전설의 알", users: "접속자", total: "총", shop: "상점", myPoint: "보유 포인트", atk: "공격력", item1: "쌍망치", item2: "곡괭이", item3: "TNT 폭약", item4: "드릴", item5: "포크레인", item6: "레이저 총", item7: "핵폭탄", modalTitle: "🎉 축하합니다! 🎉", modalDesc: "마지막 일격을 가해 알을 깨트리셨습니다! 당신이 바로 전설의 파괴자입니다.", modalPrize: "상품 수령을 위해 이메일 주소를 입력해주세요:", send: "상품 신청하기", adText: "광고 영역", powerClick: "⚡ 파워 클릭 (+100) ⚡", watchAd: "광고 보고 강력한 한방", logo: "알 깨기 🔨",
    gameRuleTitle: "게임 방법", gameRule1: "- 알을 클릭해서 HP를 깎으세요.", gameRule2: "- 포인트를 모아 상점에서 아이템을 구매하세요.", gameRule3: "- 전 세계 유저들과 함께 알을 부수세요!", noticeTitle: "주의사항", notice1: "- 비정상적인 플레이는 제재될 수 있습니다.", notice2: "- 이 게임은 초기화될 수 있습니다.", prizeTitle: "이번 회차 상품", contactTitle: "제휴문의", myInfoTitle: "내 정보", totalClick: "총 클릭"
  },
  JP: { 
    label: "日本語", title: "ミリオン・クリック・エッグ", subtitle: "世界中で伝説の卵を割ろう", users: "接続中", total: "計", shop: "商店", myPoint: "ポイント", atk: "攻撃力", item1: "ハンマー", item2: "つるはし", item3: "ダイナマイト", item4: "ドリル", item5: "ショベルカー", item6: "レーザー銃", item7: "核爆弾", modalTitle: "🎉 おめでとうございます！ 🎉", modalDesc: "最後の一撃で卵を割りました！あなたが伝説の破壊者です。", modalPrize: "賞品を受け取るためにメールアドレスを入力してください：", send: "送信する", adText: "広告エリア", powerClick: "⚡ パワークリック (+100) ⚡", watchAd: "広告を見て攻撃", logo: "エッグブレーク 🔨",
    gameRuleTitle: "遊び方", gameRule1: "- 卵をクリックしてHPを減らしてください。", gameRule2: "- ポイントを集めてアイテムを購入しましょう。", gameRule3: "- 世界中のユーザーと一緒に卵を割りましょう！", noticeTitle: "注意事項", notice1: "- 不正なプレイは制裁の対象となります。", notice2: "- ゲームデータはリセットされる可能性があります。", prizeTitle: "今回の賞品", contactTitle: "お問い合わせ", myInfoTitle: "マイ情報", totalClick: "総クリック数"
  },
  CN: { 
    label: "中文", title: "百万点击大挑战", subtitle: "全世界一起击碎传说之蛋", users: "在线", total: "总计", shop: "商店", myPoint: "积分", atk: "攻击力", item1: "双锤", item2: "钢镐", item3: "炸药", item4: "钻头", item5: "挖掘机", item6: "激光枪", item7: "核弹", modalTitle: "🎉 恭喜！ 🎉", modalDesc: "您完成了最后一击，击碎了鸡蛋！您就是传说中的破坏者。", modalPrize: "请输入您的电子邮箱以领取奖品：", send: "提交领奖", adText: "广告区域", powerClick: "⚡ 超级点击 (+100) ⚡", watchAd: "看广告强力攻击", logo: "击碎鸡蛋 🔨",
    gameRuleTitle: "游戏玩法", gameRule1: "- 点击蛋以减少其HP。", gameRule2: "- 收集积分购买道具。", gameRule3: "- 与全世界的玩家一起击碎蛋！", noticeTitle: "注意事项", notice1: "- 异常游戏行为可能会被封禁。", notice2: "- 本游戏可能会被重置。", prizeTitle: "本期奖品", contactTitle: "商务合作", myInfoTitle: "我的信息", totalClick: "总点击数"
  }
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
  const [prizeUrl, setPrizeUrl] = useState('');
  const [round, setRound] = useState(1);
  const [announcement, setAnnouncement] = useState('');
  const [myTotalClicks, setMyTotalClicks] = useState(() => {
    return parseInt(localStorage.getItem('egg_breaker_clicks') || '0', 10);
  });

  // Use localStorage to persist user ID across refreshes to prevent "ghost" users
  const userId = useRef(localStorage.getItem('egg_breaker_uid') || "user_" + Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    localStorage.setItem('egg_breaker_uid', userId.current);

    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Initialize Kakao SDK
    if (window.Kakao && !window.Kakao.isInitialized()) {
        const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
        console.log("Trying to init Kakao with key:", kakaoKey ? kakaoKey.substring(0, 5) + "..." : "undefined");
        
        if(kakaoKey && kakaoKey !== 'YOUR_KAKAO_JAVASCRIPT_KEY') {
             try {
                window.Kakao.init(kakaoKey); 
                console.log("Kakao Initialized successfully");
             } catch(e) {
                console.error("Kakao Init Failed:", e);
             }
        } else {
             console.warn("Kakao Key is missing or default placeholder.");
        }
    }
  }, []);

  useEffect(() => {
    const userRef = ref(db, `onlineUsers/${userId.current}`);
    
    // Set user online status
    set(userRef, { country: myCountry, lastActive: Date.now() });
    
    // Set up disconnect handler
    onDisconnect(userRef).remove();

    // Listen for online users
    const usersRef = ref(db, 'onlineUsers');
    const unsubscribe = onValue(usersRef, (snapshot) => {
        setOnlineUsers(snapshot.val() || {});
    });

    // Refresh "lastActive" periodically to show liveness (optional but good practice)
    const interval = setInterval(() => {
        set(userRef, { country: myCountry, lastActive: Date.now() });
    }, 60000); // Update every minute

    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  }, [myCountry]); // Re-run if country changes to update the flag

  useEffect(() => {
    // Improved Country Detection with Fallback
    const detectCountry = async () => {
        try {
            // 1st Try: ipwho.is
            const res1 = await fetch('https://ipwho.is/');
            const data1 = await res1.json();
            if (data1.success && data1.country_code) {
                console.log("Detected Country (ipwho.is):", data1.country_code);
                changeCountry(data1.country_code);
                return;
            }
            throw new Error("ipwho.is failed");
        } catch (e) {
            console.warn("Primary geo-api failed, trying fallback...", e);
            try {
                // 2nd Try: ipapi.co
                const res2 = await fetch('https://ipapi.co/json/');
                const data2 = await res2.json();
                if (data2.country_code) {
                    console.log("Detected Country (ipapi.co):", data2.country_code);
                    changeCountry(data2.country_code);
                    return;
                }
            } catch (e2) {
                console.warn("All geo-apis failed, defaulting to US", e2);
            }
        }
        changeCountry("US");
    };
    detectCountry();

    const prizeRef = ref(db, 'prize');
    const prizeUrlRef = ref(db, 'prizeUrl');
    const roundRef = ref(db, 'round');
    const announcementRef = ref(db, 'announcement');

    onValue(prizeRef, (snapshot) => {
        setPrize(snapshot.val() || '');
    });
    onValue(prizeUrlRef, (snapshot) => {
        setPrizeUrl(snapshot.val() || '');
    });
    onValue(roundRef, (snapshot) => {
        setRound(snapshot.val() || 1);
    });
    onValue(announcementRef, (snapshot) => {
        setAnnouncement(snapshot.val() || '');
    });
  }, []);

  const changeCountry = (code) => {
    const targetLang = ["KR", "JP", "CN"].includes(code) ? code : "US";
    setMyCountry(code);
    setLang(TRANSLATIONS[targetLang]);
    setShowCountrySelect(false);
    // Update country in DB immediately
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
        if (currentHp === 0 && !isWinner) {
          // This ensures that if a user loads the page and the egg is already broken,
          // they don't become a winner. `isWinner` is only set for the user who makes the last click.
        }
      }
    });
  }, [isWinner]);

  const handleClick = () => {
    if (hp <= 0) return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);
    setMyPoints(prev => prev + clickPower);

    // Update total clicks locally
    const newTotalClicks = myTotalClicks + 1;
    setMyTotalClicks(newTotalClicks);
    localStorage.setItem('egg_breaker_clicks', newTotalClicks.toString());

    const hpRef = ref(db, 'eggHP');
    runTransaction(hpRef, (currentHP) => {
      if (currentHP === null) return 1000000;
      if (currentHP <= 0) return 0; // Already broken, no change
      return Math.max(0, currentHP - clickPower);
    }).then((result) => {
      if (result.committed && result.snapshot.val() === 0) {
        // Only the user who makes the final click becomes the winner
        if(!isWinner) setIsWinner(true);
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

  // Track the last round the user shared in (per session)
  const [lastSharedRound, setLastSharedRound] = useState(0);
  
  // Mobile Panel State: 'none', 'left', 'right'
  const [mobilePanel, setMobilePanel] = useState('none');

  const toggleMobilePanel = (panel) => {
    if (mobilePanel === panel) {
        setMobilePanel('none');
    } else {
        setMobilePanel(panel);
    }
  };

  const handleKakaoShare = () => {
    if (lastSharedRound === round) {
        alert("이번 라운드에는 이미 공유 보상을 받으셨습니다!");
        return;
    }

    if (!window.Kakao || !window.Kakao.isInitialized()) {
        alert("Kakao SDK not initialized. Please check your key.");
        return;
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: lang.title,
        description: lang.subtitle,
        imageUrl: 'https://egg-break-412ae.web.app/vite.svg', 
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
      buttons: [
        {
          title: 'Play Now',
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
      ],
    });
    
    // Reward points and update state
    setMyPoints(prev => prev + 2000);
    setLastSharedRound(round);
    alert("공유 완료! 2000 포인트가 지급되었습니다.");
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
        setShowCountrySelect={setShowCountrySelect} 
        showCountrySelect={showCountrySelect} 
        changeCountry={changeCountry}
        toggleMobilePanel={toggleMobilePanel} 
      />
      
      {announcement && (
        <div style={{
          background: '#ff9800', 
          color: 'black', 
          padding: '10px', 
          textAlign: 'center', 
          fontWeight: 'bold',
          animation: 'fadeIn 0.5s'
        }}>
          📢 {announcement}
        </div>
      )}

      {/* 메인 레이아웃: 화면 꽉 채우기 */}
      <div className="main-layout">
        
        {/* 왼쪽: 접속자 (고정 너비) */}
        <LeftPanel 
          lang={lang} 
          getCountryStats={getCountryStats} 
          onlineUsers={onlineUsers} 
          prize={prize}
          prizeUrl={prizeUrl}
          getFlagEmoji={getFlagEmoji}
          isOpen={mobilePanel === 'left'}
          toggleMobilePanel={toggleMobilePanel}
        />

        {/* 중앙: 게임 (남은 공간 모두 차지 flex-grow) */}
        <GameArea 
          lang={lang}
          hp={hp}
          isShaking={isShaking}
          clickPower={clickPower}
          myPoints={myPoints}
          isWinner={isWinner}
          emailSubmitted={emailSubmitted}
          winnerEmail={winnerEmail}
          setWinnerEmail={setWinnerEmail}
          submitWinnerEmail={submitWinnerEmail}
          handleClick={handleClick}
          currentTool={currentTool}
          buyItem={buyItem}
        />

        {/* 오른쪽: 상점 (고정 너비) */}
        <RightPanel 
          lang={lang}
          buyItem={buyItem}
          myPoints={myPoints}
          clickPower={clickPower}
          myTotalClicks={myTotalClicks}
          handleKakaoShare={handleKakaoShare}
          isOpen={mobilePanel === 'right'}
          toggleMobilePanel={toggleMobilePanel}
        />
      </div>
    </div>
  );
}

export default App;
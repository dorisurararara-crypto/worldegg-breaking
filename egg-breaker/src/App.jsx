import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import './App.css';
import Admin from './Admin';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import InfoPanel from './components/InfoPanel';
import GameArea from './components/GameArea';

// --- 다국어 데이터 (유지) ---
const TRANSLATIONS = {
  US: { 
    label: "English", title: "Egg Pong ☁️", subtitle: "Pop! Let's crack this egg together!", users: "Live Users", total: "Total", shop: "Shop", myPoint: "Points", atk: "ATK", item1: "Dual Hammer", item2: "Pickaxe", item3: "TNT", item4: "Drill", item5: "Excavator", item6: "Laser Gun", item7: "Nuclear Bomb", modalTitle: "🎉 Congratulations! 🎉", modalDesc: "You delivered the final blow and broke the egg! You are the Legendary Destroyer.", modalPrize: "Please enter your email address to receive the prize:", send: "Submit to Claim Prize", adText: "Ad Banner Area", powerClick: "⚡ Power Click (+100) ⚡", watchAd: "Watch an Ad", logo: "Egg Pong ☁️",
    gameRuleTitle: "How to Play", gameRule1: "- Click the egg to reduce its HP.", gameRule2: "- Collect points to buy items. The stronger you get, the greater the rewards!", gameRule3: "- Break the egg with the world!", noticeTitle: "Notice", notice1: "- Abnormal play may result in a ban.", notice2: "- This game may be reset.", prizeTitle: "Current Prize", contactTitle: "Contact", myInfoTitle: "My Info", totalClick: "Total Clicks",
    notEnoughPoints: "Not enough points!", alreadyShared: "You already received the share reward for this round!", shareSuccess: "Shared! 2000 points added.", sent: "Sent successfully!", bought: "Bought",
    newRoundReset: "New Round Started! All progress has been reset.",
    shopGuide: "Click the shop on the right to get powerful items!",
    rivalryTitle: "TOP RIVALRY", gap: "Gap", waiting: "Waiting...", noRival: "No Rival",
    hallOfFame: "Menu", recentPrizes: "Recent Prizes", noRecords: "No records yet. Be the first winner!",
    adWatchBtn: "📺 Watch Ad (+2000P)", shareBtn: "💬 Share (+800P)",
    adReward: "+2000 Points", shareReward: "Share & Get 800P (Max 5)",
    roundOverTitle: "Round Over!", roundOverDesc: "Waiting for the next round to begin.",
    checkingWinnerTitle: "Checking Winner...", checkingWinnerDesc: "Please wait while we verify the legendary destroyer.",
    winnerTimerWarning: "You must enter your email within 5 minutes.", winnerExitMsg: "Sent! Exiting... (Opening new window)", loserMsg: "Unfortunately, you failed. Exiting... (Opening new window)", timeLeft: "Time Left",
    retryTitle: "Ready to try again?", retryBtn: "🔄 Re-enter Game"
  },
  KR: { 
    label: "한국어", title: "에그퐁 ☁️", subtitle: "다함께 퐁! 전설의 알 깨기", users: "접속자", total: "총", shop: "상점", myPoint: "보유 포인트", atk: "공격력", item1: "쌍망치", item2: "곡괭이", item3: "TNT 폭약", item4: "드릴", item5: "포크레인", item6: "레이저 총", item7: "핵폭탄", modalTitle: "🎉 축하합니다! 🎉", modalDesc: "마지막 일격을 가해 알을 깨트리셨습니다! 당신이 바로 전설의 파괴자입니다.", modalPrize: "상품 수령을 위해 이메일 주소를 입력해주세요:", send: "상품 신청하기", adText: "광고 영역", powerClick: "⚡ 파워 클릭 (+100) ⚡", watchAd: "광고 보고 ", logo: "에그퐁 ☁️",
    gameRuleTitle: "게임 방법", gameRule1: "- 알을 클릭해서 HP를 깎으세요.", gameRule2: "- 포인트를 모아 상점에서 아이템을 구매하세요. 깨면 깰수록 더 강력해지고 더 큰 보상을 받을 수 있습니다!", gameRule3: "- 전 세계 유저들과 함께 알을 부수세요!", noticeTitle: "주의사항", notice1: "- 비정상적인 플레이는 제재될 수 있습니다.", notice2: "- 새로고침 시 초기화될 수 있습니다.", prizeTitle: "이번 회차 상품", contactTitle: "제휴문의", myInfoTitle: "내 정보", totalClick: "총 클릭",
    notEnoughPoints: "포인트가 부족합니다!", alreadyShared: "이번 라운드에는 이미 공유 보상을 받으셨습니다!", shareSuccess: "공유 완료! 800 포인트가 지급되었습니다.", sent: "전송되었습니다!", bought: "구매 완료:",
    newRoundReset: "새로운 라운드가 시작되었습니다! 모든 진행 상황이 초기화되었습니다.",
    shopGuide: "우측 상점 🛒 을 눌러 더 강력한 아이템을 획득하세요",
    rivalryTitle: "국가 대항전", gap: "차이", waiting: "대기중...", noRival: "라이벌 없음",
    hallOfFame: "메뉴", recentPrizes: "최근 우승 상품", noRecords: "아직 우승자가 없습니다. 첫 우승자가 되어보세요!",
    adWatchBtn: "📺 광고 보고 포인트 받기(+2000P)", shareBtn: "💬 공유하기 (+800P)",
    adReward: "", shareReward: "카톡으로 공유하고 800P 받기 (최대 5회)",
    roundOverTitle: "라운드 종료!", roundOverDesc: "다음 라운드 준비 중입니다.",
    checkingWinnerTitle: "우승자 판독 중...", checkingWinnerDesc: "누가 마지막 일격을 날렸는지 확인하고 있습니다.",
    winnerTimerWarning: "5분 안에 이메일을 입력해야 합니다. (미입력 시 취소)", winnerExitMsg: "전송되었습니다! 잠시 후 퇴장합니다 (새 창 열림)", loserMsg: "아쉽게도 이번에는 실패했습니다. 잠시 후 퇴장합니다 (새 창 열림)", timeLeft: "남은 시간",
    retryTitle: "다시 도전하시겠습니까?", retryBtn: "🔄 게임 재입장"
  },
  JP: { 
    label: "日本語", title: "エッグポン ☁️", subtitle: "世界中で伝説の卵を割ろう", users: "接続中", total: "計", shop: "商店", myPoint: "ポイント", atk: "攻撃力", item1: "ハンマー", item2: "つるはし", item3: "ダイナマイト", item4: "ドリル", item5: "ショベルカー", item6: "レーザー銃", item7: "核爆弾", modalTitle: "🎉 おめでとうございます！ 🎉", modalDesc: "最後の一撃で卵を割りました！あなたが伝説の破壊者です。", modalPrize: "賞品を受け取るためにメールアドレスを入力してください：", send: "送信する", adText: "広告エリア", powerClick: "⚡ パワークリック (+100) ⚡", watchAd: "広告を見て攻撃", logo: "エッグポン ☁️",
    gameRuleTitle: "遊び方", gameRule1: "- 卵をクリックしてHPを減らしてください。", gameRule2: "- ポイントを集めてアイテムを購入しましょう。", gameRule3: "- 世界中のユーザーと一緒に卵を割りましょう！", noticeTitle: "注意事項", notice1: "- 不正なプレイは制裁の対象となります。", notice2: "- ゲームデータはリセットされる可能性があります。", prizeTitle: "今回の賞品", contactTitle: "お問い合わせ", myInfoTitle: "マイ情報", totalClick: "総クリック数",
    notEnoughPoints: "ポイントが足りません！", alreadyShared: "このラウンドのシェア報酬は既に受け取っています！", shareSuccess: "シェア完了！2000ポイント追加されました。", sent: "送信しました！", bought: "購入完了:",
    newRoundReset: "新しいラウンドが始まりました！すべての進行状況がリセットされました。",
    shopGuide: "右のショップをクリックして強力なアイテムを手に入れよう！",
    rivalryTitle: "国家対抗戦", gap: "差", waiting: "待機中...", noRival: "ライバルなし",
    hallOfFame: "メニュー", recentPrizes: "最近の賞品", noRecords: "まだ勝者はいません。最初の勝者になろう！",
    adWatchBtn: "📺 広告を見る (+2000P)", shareBtn: "💬 シェア (+800P)",
    adReward: "+2000 ポイント", shareReward: "シェアして800Pゲット (最大5回)",
    roundOverTitle: "ラウンド終了！", roundOverDesc: "次のラウンドを待機中...",
    checkingWinnerTitle: "勝者を判定中...", checkingWinnerDesc: "伝説の破壊者を確認しています。",
    winnerTimerWarning: "5분 이내에 입력해주세요。", winnerExitMsg: "送信しました！まもなく終了します (新ウィンドウ)", loserMsg: "残念ながら失敗しました。まもなく終了します (新ウィンドウ)", timeLeft: "残り時間",
    retryTitle: "もう一度挑戦しますか？", retryBtn: "🔄 ゲーム再入場"
  },
  CN: { 
    label: "中文", title: "蛋蛋碰 ☁️", subtitle: "全世界一起击碎传说之蛋", users: "在线", total: "总计", shop: "商店", myPoint: "积分", atk: "攻击力", item1: "双锤", item2: "钢镐", item3: "炸药", item4: "钻头", item5: "挖掘机", item6: "激光枪", item7: "核弹", modalTitle: "🎉 恭喜！ 🎉", modalDesc: "您完成了最后一击，击碎了鸡蛋！您就是传说中的破坏者。", modalPrize: "请输入您的电子邮箱以领取奖品：", send: "提交领奖", adText: "广告区域", powerClick: "⚡ 超级点击 (+100) ⚡", watchAd: "看广告强力攻击", logo: "蛋蛋碰 ☁️",
    gameRuleTitle: "游戏玩法", gameRule1: "- 点击蛋以减少其HP。", gameRule2: "- 收集积分购买道具。", gameRule3: "- 与全世界的玩家一起击碎蛋！", noticeTitle: "注意事项", notice1: "- 异常游戏行为可能会被封禁。", notice2: "- 本游戏可能会被重置。", prizeTitle: "本期奖品", contactTitle: "商务合作", myInfoTitle: "我的信息", totalClick: "总点击数",
    notEnoughPoints: "积分不足！", alreadyShared: "本轮已领取分享奖励！", shareSuccess: "分享完成！获得2000积分。", sent: "已发送！", bought: "购买成功:",
    newRoundReset: "新一轮开始了！所有进度已重置。",
    shopGuide: "点击右侧商店购买强力道具！",
    rivalryTitle: "国家对抗赛", gap: "差距", waiting: "等待中...", noRival: "无对手",
    hallOfFame: "菜单", recentPrizes: "近期奖品", noRecords: "暂无获胜者。成为第一个赢家吧！",
    adWatchBtn: "📺 看广告 (+2000P)", shareBtn: "💬 分享 (+800P)",
    adReward: "+2000 积分", shareReward: "分享获得800P (最多5次)",
    roundOverTitle: "回合结束！", roundOverDesc: "正在等待下一轮...",
    checkingWinnerTitle: "正在判定胜者...", checkingWinnerDesc: "正在确认谁是传说中的破坏者。",
    winnerTimerWarning: "请在5分钟内输入。", winnerExitMsg: "已发送！即将退出 (打开新窗口)", loserMsg: "很遗憾，这次失败了。即将退出 (打开新窗口)", timeLeft: "剩余时间",
    retryTitle: "准备好再次尝试了吗？", retryBtn: "🔄 重新进入游戏"
  }
};

const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

const TOOL_NAMES = {
  hammer: 'item1',
  pickaxe: 'item2',
  dynamite: 'item3',
  drill: 'item4',
  excavator: 'item5',
  laser: 'item6',
  nuke: 'item7',
  fist: 'fist'
};

function App() {
  const [route, setRoute] = useState(window.location.hash);
  
  // Custom Hook for API State
  const { serverState, API_URL, error: serverError } = useGameState(); // Get error from hook
  
  // Local HP for Optimistic Updates
  const [hp, setHp] = useState(1000000);

  const [isShaking, setIsShaking] = useState(false);
  const [myPoints, setMyPoints] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [isWinner, setIsWinner] = useState(false);
  const [winnerEmail, setWinnerEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [myCountry, setMyCountry] = useState("US");
  const [lang, setLang] = useState(TRANSLATIONS.US);
  const [currentTool, setCurrentTool] = useState("fist");
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [shareCount, setShareCount] = useState(0); 
  const [adWatchCount, setAdWatchCount] = useState(0); 
  const [myTotalClicks, setMyTotalClicks] = useState(() => {
    return parseInt(localStorage.getItem('egg_breaker_clicks') || '0', 10);
  });
  
  // Track previous round to detect changes
  const prevRound = useRef(null);
  
  // Mobile Panel State: 'none', 'left', 'right'
  const [mobilePanel, setMobilePanel] = useState('none');
  const [notification, setNotification] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [hideAnnouncement, setHideAnnouncement] = useState(false);

  // Track the last round the user shared in (per session)
  const [lastSharedRound, setLastSharedRound] = useState(0);

  // Timers
  const [winnerCountdown, setWinnerCountdown] = useState(300); // 5 minutes
  const [exitCountdown, setExitCountdown] = useState(null); // For winner after submit
  const [loserCountdown, setLoserCountdown] = useState(null); // For losers
  const [showLoserMessage, setShowLoserMessage] = useState(false); // Delay for "Checking..."

  // Retry & Spectator State
  const [showRetry, setShowRetry] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const isFirstLoad = useRef(true); // Track first load to detect latecomers

  // Client Batching Ref
  const pendingDamage = useRef(0);
  
  // Data from Server State
  const announcement = serverState.announcement || "";
  const prize = serverState.prize || "";
  const prizeUrl = serverState.prizeUrl || "";
  const adUrl = serverState.adUrl || "";

  // Helper for Game End (Open New Window + Show Retry Screen)
  const handleGameEnd = (url) => {
      try {
          // Open a new blank window/tab
          const target = url || 'about:blank';
          window.open(target, '_blank');
      } catch (e) {
          console.error("Popup blocked or failed", e);
      }
      
      // Show Retry/Spectating UI inside the game instead of a separate screen
      setShowRetry(true);
      setIsSpectating(true); 
  };

  const handleRetry = () => {
      setShowRetry(false);
      // Reset Game State for Retry
      setMyPoints(0);
      setClickPower(1);
      setCurrentTool('fist');
      setShareCount(0);
      setAdWatchCount(0);
      
      // Reset Winner/Loser State
      setWinnerEmail("");
      setEmailSubmitted(false);
      setIsWinner(false);
      setExitCountdown(null);
      setLoserCountdown(null);
      setShowLoserMessage(false);

      // If round is still over, keep spectating mode
      if (hp <= 0) {
          setIsSpectating(true);
      } else {
          setIsSpectating(false);
      }
  };

  // Winner Timer (5 min limit)
  useEffect(() => {
    let timer;
    if (isWinner && !emailSubmitted && winnerCountdown > 0 && !showRetry) {
      timer = setInterval(() => {
        setWinnerCountdown(prev => prev - 1);
      }, 1000);
    } else if (winnerCountdown === 0 && isWinner && !emailSubmitted && !showRetry) {
       // Time expired for winner
       alert("Time expired! You failed to enter your email in time.");
       handleGameEnd(adUrl);
    }
    return () => clearInterval(timer);
  }, [isWinner, emailSubmitted, winnerCountdown, adUrl, showRetry]);

  // Winner Exit Timer (after submission)
  useEffect(() => {
    let timer;
    if (exitCountdown !== null && exitCountdown > 0 && !showRetry) {
        timer = setInterval(() => setExitCountdown(prev => prev - 1), 1000);
    } else if (exitCountdown === 0 && !showRetry) {
        handleGameEnd(adUrl);
    }
    return () => clearInterval(timer);
  }, [exitCountdown, adUrl, showRetry]);

  // Loser Logic & Timer
  useEffect(() => {
      let checkTimer;
      let countdownTimer;

      if (hp <= 0 && !isWinner && !showRetry && !isSpectating) {
          // 1. Wait 3 seconds before showing "Failed" (to allow server sync)
          if (!showLoserMessage) {
              checkTimer = setTimeout(() => {
                  setShowLoserMessage(true);
                  setLoserCountdown(10); // 10 seconds to exit
              }, 3000);
          }

          // 2. Start Countdown if message is shown
          if (showLoserMessage && loserCountdown !== null && loserCountdown > 0) {
              countdownTimer = setInterval(() => {
                  setLoserCountdown(prev => prev - 1);
              }, 1000);
          } else if (showLoserMessage && loserCountdown === 0) {
              handleGameEnd(adUrl);
          }
      } else {
          // Reset if HP restored (new round) or became winner
          if (hp > 0) {
            setShowLoserMessage(false);
            setLoserCountdown(null);
            setIsSpectating(false);
          }
      }

      return () => {
          clearTimeout(checkTimer);
          clearInterval(countdownTimer);
      };
  }, [hp, isWinner, showLoserMessage, loserCountdown, adUrl, showRetry, isSpectating]);

  // 1. Definition FIRST
  const changeCountry = (code) => {
    const targetLang = ["KR", "JP", "CN"].includes(code) ? code : "US";
    setMyCountry(code);
    setLang(TRANSLATIONS[targetLang]);
    setShowCountrySelect(false);
  };

  // 2. useEffects using functions
  useEffect(() => {
    const detectCountry = async () => {
        try {
            const res1 = await fetch('https://ipwho.is/');
            const data1 = await res1.json();
            if (data1.success && data1.country_code) {
                changeCountry(data1.country_code);
                return;
            }
            throw new Error("ipwho.is failed");
        } catch (e) {
            changeCountry("US");
        }
    };
    detectCountry();
  }, []);

  // Sync Local HP with Server HP (Correction with Pending Damage)
  useEffect(() => {
      if (serverState.hp !== undefined) {
          // 서버에서 온 HP를 그대로 믿지 않고, 내가 아직 서버로 안 보낸 데미지(pendingDamage)만큼
          // 미리 깎아서 보여줍니다. 그래야 HP가 뒤로 밀리는(늘어나는) 현상을 막을 수 있습니다.
          setHp(serverState.hp - pendingDamage.current);
          
          // Latecomer Detection: If it's the first load and HP is 0, set spectator immediately.
          if (isFirstLoad.current) {
              if (serverState.hp <= 0) {
                  setIsSpectating(true);
              }
              isFirstLoad.current = false;
          }
      }
  }, [serverState.hp]);
  
  // Batch Send Logic (Every 1s)
  useEffect(() => {
      const interval = setInterval(async () => {
          if (pendingDamage.current > 0) {
              const damageToSend = pendingDamage.current;
              pendingDamage.current = 0; // Reset immediately to capture new clicks

              try {
                  const res = await fetch(`${API_URL}/click`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ power: damageToSend, country: myCountry })
                  });

                  if (res.ok) {
                      const data = await res.json();
                      if (data.hp !== undefined) {
                          // 서버 HP를 그대로 쓰지 않고, 현재 전송 대기 중인 데미지를 고려해야 할 수도 있지만
                          // 여기서는 응답받은 시점의 최신 HP로 동기화합니다.
                          // 단, 사용자가 그 사이에 클릭한 것은 pendingDamage에 쌓여 있으므로
                          // 다음 렌더링 시 setHp(data.hp - pendingDamage) 처럼 보정하는 로직이 필요할 수 있습니다.
                          // 현재 useEffect([serverState.hp])에서 보정하고 있으므로 여기서는 state 업데이트만 합니다.
                          // 하지만 data.hp가 serverState.hp보다 더 최신일 수 있으므로 여기서 직접 setHp를 하면 화면이 튈 수 있습니다.
                          // 가장 좋은 건 fetch 결과를 serverState에 반영하는 것입니다.
                          // 하지만 여기서는 간단히 로컬 hp만 갱신하겠습니다.
                          // 단, 낙관적 업데이트 유지를 위해 "서버 HP - 현재 쌓인 펜딩 데미지"로 설정합니다.
                          setHp(data.hp - pendingDamage.current);
                      }
                      if (data.isWinner && !isWinner) {
                          setIsWinner(true);
                      }
                  }
              } catch (e) {
                  console.error("Batch click sync failed", e);
                  // 실패 시 펜딩 데미지 복구 (선택 사항)
                  pendingDamage.current += damageToSend;
              }
          }
      }, 5000); // 5 second interval (Optimized)

      return () => clearInterval(interval);
  }, [API_URL, myCountry, isWinner]);

  useEffect(() => {
    // Round change handling
    if (prevRound.current && serverState.round && serverState.round !== prevRound.current) {
        setMyPoints(0);
        setClickPower(1);
        setCurrentTool('fist');
        setShareCount(0);
        setAdWatchCount(0);
        setMyTotalClicks(0);
        pendingDamage.current = 0; // Reset pending on new round
        localStorage.setItem('egg_breaker_clicks', '0');
        alert(lang.newRoundReset);
    }
    if (serverState.round) {
        prevRound.current = serverState.round;
    }
  }, [serverState.round, lang]);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
        const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
        if(kakaoKey && kakaoKey !== 'YOUR_KAKAO_JAVASCRIPT_KEY') {
             try { window.Kakao.init(kakaoKey); } catch(e) { console.error("Kakao Init Failed:", e); }
        }
    }
  }, []);

  // Inactivity Timer for Guide
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastActivity > 10000 && !showGuide) {
        setShowGuide(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastActivity, showGuide]);

  const handleClick = async () => {
    if (hp <= 0) return;
    
    // Reset activity timer
    setLastActivity(Date.now());
    setShowGuide(false);
    
    // 1. [Optimistic Update] UI 즉시 반영
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);
    
    // 로컬 상태 즉시 변경
    setMyPoints(prev => prev + clickPower);
    setHp(prev => Math.max(0, prev - clickPower));
    
    // Accumulate damage for batch sending
    pendingDamage.current += clickPower;
    
    // 로컬 통계 갱신
    const newTotalClicks = myTotalClicks + 1;
    setMyTotalClicks(newTotalClicks);
    localStorage.setItem('egg_breaker_clicks', newTotalClicks.toString());
  };

  const buyItem = (cost, powerAdd, toolName) => {
    if (myPoints >= cost) {
      setMyPoints(prev => prev - cost);
      setClickPower(prev => prev + powerAdd);
      setCurrentTool(toolName);
      
      const localizedToolName = lang[TOOL_NAMES[toolName]] || toolName;
      alert(`${lang.bought} ${localizedToolName}!`);
      showNotification(`${lang.bought} ${localizedToolName}!`);
    } else {
      alert(lang.notEnoughPoints);
    }
  };

  const submitWinnerEmail = async () => {
    if (!winnerEmail.includes("@")) return;
    try {
        await fetch(`${API_URL}/winner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: winnerEmail, country: myCountry })
        });
        setEmailSubmitted(true);
        // Start exit timer
        setExitCountdown(5); 
    } catch(e) {
        console.error("Winner submit failed", e);
        alert("Failed to send. Please try again.");
    }
  };

  const showNotification = (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(''), 2000);
  };

  const toggleMobilePanel = (panel) => {
    if (mobilePanel === panel) {
        setMobilePanel('none');
    } else {
        setMobilePanel(panel);
        setShowCountrySelect(false); // Close language dropdown if panel opens
    }
  };

  const handleLangToggle = () => {
      if (!showCountrySelect) {
          setMobilePanel('none'); // Close any open panel
          setShowCountrySelect(true);
      } else {
          setShowCountrySelect(false);
      }
  };

  const handleKakaoShare = () => {
    if (shareCount >= 5) {
        alert("이번 라운드 공유 횟수(5회)를 모두 소진하셨습니다!");
        return;
    }
    if (!window.Kakao || !window.Kakao.isInitialized()) {
        alert("Kakao SDK not initialized.");
        return;
    }
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: lang.title,
        description: lang.subtitle,
        imageUrl: 'https://egg-break-412ae.web.app/vite.svg', 
        link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
      },
      buttons: [{ title: 'Play Now', link: { mobileWebUrl: window.location.href, webUrl: window.location.href } }],
    });
    setMyPoints(prev => prev + 800);
    setShareCount(prev => prev + 1);
    alert(`공유 완료! 800 포인트가 지급되었습니다. (${shareCount + 1}/5)`);
  };

  const handleAdWatch = () => {
    if (adWatchCount >= 1) {
        alert("이번 라운드 광고 시청(1회)을 이미 완료하셨습니다!");
        return;
    }
    if (adUrl) {
        window.open(adUrl, '_blank');
    } else {
        alert("현재 연결된 광고가 없습니다.");
        return;
    }
    setMyPoints(prev => prev + 2000);
    setAdWatchCount(prev => prev + 1);
    alert("광고 시청 완료! 2000 포인트가 지급되었습니다.");
  };

  if (route === '#admin') return <Admin />;

  // Server Full Overlay
  if (serverError === 'full') {
      return (
          <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100vh', background: '#fff0f5', color: '#5d4037', textAlign: 'center', padding: '20px'
          }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚧</div>
              <h1 style={{ color: '#ff6f61', marginBottom: '10px' }}>접속자가 너무 많습니다!</h1>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                  현재 서버 수용 인원(130명)을 초과하여 대기 중입니다.<br/>
                  잠시 후 자동으로 재접속을 시도합니다.
              </p>
              <div className="spinner" style={{
                  width: '30px', height: '30px', border: '4px solid #ffe4e1', borderTop: '4px solid #ff6f61', 
                  borderRadius: '50%', animation: 'spin 1s linear infinite', marginTop: '30px'
              }}></div>
          </div>
      );
  }

  // Transform server stats for UI
  const countryStats = Object.entries(serverState.clicksByCountry || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="app-container">
      <Header 
        lang={lang} 
        myCountry={myCountry} 
        getFlagEmoji={getFlagEmoji} 
        onToggleLanguage={handleLangToggle} 
        showCountrySelect={showCountrySelect} 
        changeCountry={changeCountry}
        toggleMobilePanel={toggleMobilePanel} 
      />
      
      {announcement && (
        <div style={{
          background: '#ffefd5', color: '#ff6f61', padding: '12px', textAlign: 'center', fontWeight: 'bold',
          animation: 'fadeIn 0.5s', borderRadius: '0 0 20px 20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          border: '1px solid #ffe4e1', marginBottom: '10px'
        }}>
          📢 {announcement}
        </div>
      )}

      {/* Backdrop for closing menus on click outside */}
      {(mobilePanel !== 'none' || showCountrySelect) && (
        <div 
            onClick={() => { setMobilePanel('none'); setShowCountrySelect(false); }}
            style={{
                position: 'fixed',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.3)', // Semi-transparent dimming
                zIndex: 1500, // Below panels (2000) but above everything else
                cursor: 'pointer'
            }}
        />
      )}

      <div className="main-layout">
        <LeftPanel 
          lang={lang} 
          countryStats={countryStats} 
          onlineUsersCount={serverState.onlineApprox} 
          prize={prize}
          prizeUrl={prizeUrl}
          getFlagEmoji={getFlagEmoji}
          isOpen={mobilePanel === 'left'}
          toggleMobilePanel={toggleMobilePanel}
        />

        <InfoPanel
          lang={lang}
          recentWinners={serverState.recentWinners || []}
          isOpen={mobilePanel === 'info'}
          toggleMobilePanel={toggleMobilePanel}
        />

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
          notification={notification}
          handleAdWatch={handleAdWatch}
          showGuide={showGuide}
          winnerCountdown={winnerCountdown}
          exitCountdown={exitCountdown}
          loserCountdown={loserCountdown}
          showLoserMessage={showLoserMessage}
          isSpectating={isSpectating}
          showRetry={showRetry}
          handleRetry={handleRetry}
        />

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
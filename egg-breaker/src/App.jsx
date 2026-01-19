import { useState, useEffect, useRef } from 'react';
import { NativeAudio } from '@capacitor-community/native-audio';
import { Capacitor } from '@capacitor/core';
import { useGameState } from './hooks/useGameState';
import { usePushNotifications } from './hooks/usePushNotifications';
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
    notEnoughPoints: "Points not enough!", alreadyShared: "You already received the share reward for this round!", shareSuccess: "Link shared! You will get 800P when your friend plays.", inviteSuccess: "Friend joined! You got 800 Points!", sent: "Sent successfully!", bought: "Bought",
    newRoundReset: "New Round Started! All progress has been reset.",
    shopGuide: "Click the shop on the right to get powerful items!",
    rivalryTitle: "TOP RIVALRY", gap: "Gap", waiting: "Waiting...", noRival: "No Rival",
    hallOfFame: "Menu", recentPrizes: "Recent Prizes", noRecords: "No records yet. Be the first winner!",
    adWatchBtn: "📺 Watch Ad (+2000P)", shareBtn: "💬 Share (+800P)",
    adReward: "+2000 Points", shareReward: "Share & Get 800P (Max 5)",
    roundOverTitle: "Round Over!", roundOverDesc: "Waiting for the next round to begin.",
    checkingWinnerTitle: "Checking Winner...", checkingWinnerDesc: "Please wait while we verify the legendary destroyer.",
    winnerTimerWarning: "You must enter your email within 5 minutes.", winnerExitMsg: "Sent! Exiting... (Opening new window)", loserMsg: "Unfortunately, you failed. Exiting... (Opening new window)", timeLeft: "Time Left",
    retryTitle: "Ready to try again?", retryBtn: "🔄 Re-enter Game",
    tapToClose: "(Tap to close)",
    maxAtkTitle: "Highest Attack", maxPointTitle: "Highest Points", maxClickTitle: "Highest Clicks", serverStatusTitle: "Server Status", participants: "Active", queueLabel: "Queue", spectators: "Spectators", totalOnline: "Total Online",
    soundOn: "SFX", bgmOn: "BGM", vibrationOn: "Vibrate", touchGuide: "Touch the egg in the middle! 👈"
  },
  KR: { 
    label: "한국어", title: "에그퐁 ☁️", subtitle: "다함께 퐁! 전설의 알 깨기", users: "접속자", total: "총", shop: "상점", myPoint: "보유 포인트", atk: "공격력", item1: "쌍망치", item2: "곡괭이", item3: "TNT 폭약", item4: "드릴", item5: "포크레인", item6: "레이저 총", item7: "핵폭탄", modalTitle: "🎉 축하합니다! 🎉", modalDesc: "마지막 일격을 가해 알을 깨트리셨습니다! 당신이 바로 전설의 파괴자입니다.", modalPrize: "상품 수령을 위해 이메일 주소를 입력해주세요(새로고침을 누르지 마세요! 초기화됩니다.):", send: "상품 신청하기", adText: "광고 영역", powerClick: "⚡ 파워 클릭 (+100) ⚡", watchAd: "광고 보고 ", logo: "에그퐁 ☁️",
    gameRuleTitle: "게임 방법", gameRule1: "- 화면을 클릭하여 알의 HP를 줄이세요.", gameRule2: "- 포인트를 모아 아이템을 구매하면 공격력이 올라갑니다.", gameRule3: "- 마지막 일격을 가한 단 한 명이 우승 상품을 차지합니다!", noticeTitle: "주의사항", notice1: "- 비정상적인 플레이는 제재될 수 있습니다.", notice2: "- 새로고침 시 초기화될 수 있습니다.", prizeTitle: "이번 회차 상품", contactTitle: "제휴문의", myInfoTitle: "내 정보", totalClick: "총 클릭",
    notEnoughPoints: "포인트가 부족합니다!", alreadyShared: "이번 라운드에는 이미 공유 보상을 받으셨습니다!", shareSuccess: "링크 공유 완료! 친구가 접속하면 800P가 지급됩니다.", inviteSuccess: "친구가 접속했습니다! 800 포인트를 획득했습니다!", sent: "전송되었습니다!", bought: "구매 완료:",
    newRoundReset: "새로운 라운드가 시작되었습니다! 모든 진행 상황이 초기화되었습니다.",
    shopGuide: "여기를 눌러 더 강력한 아이템을 획득하세요",
    rivalryTitle: "국가 대항전", gap: "차이", waiting: "대기중...", noRival: "라이벌 없음",
    hallOfFame: "상품", recentPrizes: "최근 우승 상품", noRecords: "아직 우승자가 없습니다. 첫 우승자가 되어보세요!",
    adWatchBtn: "📺 광고 보고 포인트 받기(+2000P)", shareBtn: "💬 공유하기 (+800P)",
    adReward: "", shareReward: "카톡으로 공유하고 800P 받기 (최대 5회)",
    roundOverTitle: "라운드 종료!", roundOverDesc: "다음 라운드 준비 중입니다.",
    checkingWinnerTitle: "우승자 판독 중...", checkingWinnerDesc: "누가 마지막 일격을 날렸는지 확인하고 있습니다.",
    winnerTimerWarning: "5분 안에 이메일을 입력해야 합니다. (미입력 시 취소)", winnerExitMsg: "전송되었습니다! 잠시 후 퇴장합니다", loserMsg: "아쉽게도 이번에는 실패했습니다. 잠시 후 퇴장합니다 (새 창 열림)", timeLeft: "남은 시간",
    retryTitle: "다시 도전하시겠습니까?", retryBtn: "🔄 재입장하기",
    tapToClose: "(탭하여 없애기)",
    maxAtkTitle: "최고 공격력", maxPointTitle: "최고 포인트", maxClickTitle: "최고 클릭수", serverStatusTitle: "서버 현황", participants: "참여자", queueLabel: "대기자", spectators: "구경꾼", totalOnline: "Total Online",
    soundOn: "효과음", bgmOn: "배경음", vibrationOn: "진동", touchGuide: "가운데 계란을 👈 터치하세요!"
  },
  JP: { 
    label: "日本語", title: "エッグポン ☁️", subtitle: "世界中で伝説の卵を割ろう", users: "接続中", total: "計", shop: "商店", myPoint: "ポイント", atk: "攻撃力", item1: "ハンマー", item2: "つるはし", item3: "ダイナマイト", item4: "ドリル", item5: "ショベルカー", item6: "レーザー銃", item7: "核爆弾", modalTitle: "🎉 おめでとうございます！ 🎉", modalDesc: "最後の一撃で卵を割りました！あなたが伝説の破壊者です。", modalPrize: "賞品を受け取るためにメールアドレスを入力してください：", send: "送信する", adText: "広告エリア", powerClick: "⚡ パワークリック (+100) ⚡", watchAd: "広告を見て攻撃", logo: "エッグポン ☁️",
    gameRuleTitle: "遊び方", gameRule1: "- 卵をクリックしてHPを減らしてください。", gameRule2: "- ポイントを集めてアイテムを購入しましょう。", gameRule3: "- 世界中のユーザーと一緒に卵を割りましょう！", noticeTitle: "注意事項", notice1: "- 不正なプレイは制裁の対象となります。", notice2: "- ゲームデータはリセットされる可能性があります。", prizeTitle: "今回の賞品", contactTitle: "お問い合わせ", myInfoTitle: "マイ情報", totalClick: "総クリック数",
    notEnoughPoints: "ポイントが足りません！", alreadyShared: "このラウンドのシェア報酬は既に受け取っています！", shareSuccess: "リンクをシェアしました！友達が参加すると800Pもらえます。", inviteSuccess: "友達が参加しました！800ポイントを獲得しました！", sent: "送信しました！", bought: "購入完了:",
    newRoundReset: "新しいラウンドが始まりました！すべての進行状況がリセットされました。",
    shopGuide: "右のショップをクリックして強力なアイテムを手に入れよう！",
    rivalryTitle: "国家対抗戦", gap: "差", waiting: "待機中...", noRival: "ライバルなし",
    hallOfFame: "メニュー", recentPrizes: "最近の賞品", noRecords: "まだ勝者はいません。最初の勝者になろう！",
    adWatchBtn: "📺 広告を見る (+2000P)", shareBtn: "💬 シェア (+800P)",
    adReward: "+2000 ポイント", shareReward: "シェアして800Pゲット (最大5回)",
    roundOverTitle: "ラウンド終了！", roundOverDesc: "次のラウンドを待機中...",
    checkingWinnerTitle: "勝者を判定中...", checkingWinnerDesc: "伝説の破壊者を確認しています。",
    winnerTimerWarning: "5분 이내에 입력해주세요。", winnerExitMsg: "送信しました！まもなく終了します (新ウィンドウ)", loserMsg: "残念ながら失敗しました。まもなく終了します (新ウィンドウ)", timeLeft: "残り時間",
    retryTitle: "もう一度挑戦しますか？", retryBtn: "🔄 ゲーム再入場",
    tapToClose: "(タップして閉じる)",
    maxAtkTitle: "最高攻撃力", maxPointTitle: "最高ポイント", maxClickTitle: "最高クリック数", serverStatusTitle: "サーバー状況", participants: "参加者", queueLabel: "待機中", spectators: "観戦者", totalOnline: "Total Online",
    soundOn: "効果音", bgmOn: "BGM", vibrationOn: "振動", touchGuide: "真ん中の卵を 👈 タッチしてください！"
  },
  CN: { 
    label: "中文", title: "蛋蛋碰 ☁️", subtitle: "全世界一起击碎传说之蛋", users: "在线", total: "总计", shop: "商店", myPoint: "积分", atk: "攻击力", item1: "双锤", item2: "钢镐", item3: "炸药", item4: "钻头", item5: "挖掘机", item6: "激光枪", item7: "核弹", modalTitle: "🎉 恭喜！ 🎉", modalDesc: "您完成了最后一击，击碎了鸡蛋！您就是传说中的破坏者。", modalPrize: "请输入您的电子邮箱以领取奖品：", send: "提交领奖", adText: "广告区域", powerClick: "⚡ 超级点击 (+100) ⚡", watchAd: "看广告强力攻击", logo: "蛋蛋碰 ☁️",
    gameRuleTitle: "游戏玩法", gameRule1: "- 点击蛋以减少其HP。", gameRule2: "- 收集积分购买道具。", gameRule3: "- 与全世界的玩家一起击碎蛋！", noticeTitle: "注意事项", notice1: "- 异常游戏行为可能会被封禁。", notice2: "- 本游戏可能会被重置。", prizeTitle: "本期奖品", contactTitle: "商务合作", myInfoTitle: "我的信息", totalClick: "总点击数",
    notEnoughPoints: "积分不足！", alreadyShared: "本轮已领取分享奖励！", shareSuccess: "链接已分享！好友进入游戏时您将获得800积分。", inviteSuccess: "好友已加入！获得800积分！", sent: "已发送！", bought: "购买成功:",
    newRoundReset: "新一轮开始了！所有进度已重置。",
    shopGuide: "点击右侧商店购买强力道具！",
    rivalryTitle: "国家对抗赛", gap: "差距", waiting: "等待中...", noRival: "无对手",
    hallOfFame: "菜单", recentPrizes: "近期奖品", noRecords: "暂无获胜者。成为第一个赢家吧！",
    adWatchBtn: "📺 看广告 (+2000P)", shareBtn: "💬 分享 (+800P)",
    adReward: "+2000 积分", shareReward: "分享获得800P (最多5次)",
    roundOverTitle: "回合结束！", roundOverDesc: "正在等待下一轮...",
    checkingWinnerTitle: "正在判定胜者...", checkingWinnerDesc: "正在确认谁是传说中的破坏者。",
    winnerTimerWarning: "请在5分钟内输入。", winnerExitMsg: "已发送！即将退出 (打开新窗口)", loserMsg: "很遗憾，这次失败了。即将退出 (打开新窗口)", timeLeft: "剩余时间",
    retryTitle: "准备好再次尝试了吗？", retryBtn: "🔄 重新进入游戏",
    tapToClose: "(点击关闭)",
    maxAtkTitle: "最高攻击力", maxPointTitle: "最高积分", maxClickTitle: "最高点击数", serverStatusTitle: "服务器状态", participants: "参与者", queueLabel: "排队中", spectators: "旁观者", totalOnline: "Total Online",
    soundOn: "音效", bgmOn: "BGM", vibrationOn: "震动", touchGuide: "点击中间的蛋 👈 ！"
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
  const { serverState, API_URL, error: serverError, role, queuePos, etaSec, addClick, connected, clientId, winningToken, winStartTime, prizeSecretImageUrl, connect, rewardEvent } = useGameState(); 
  
  // Custom Hook for Push Notifications
  usePushNotifications(API_URL, clientId);
  
  // Local HP for Optimistic Updates
  const [hp, setHp] = useState(1000000);

  const [isShaking, setIsShaking] = useState(false);
  const [myPoints, setMyPoints] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [isWinner, setIsWinner] = useState(false);
  const [winnerEmail, setWinnerEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [myCountry, setMyCountry] = useState("KR"); // Default KR
  const [lang, setLang] = useState(TRANSLATIONS.KR); // Default KR
  const [currentTool, setCurrentTool] = useState("fist");
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [adWatchCount, setAdWatchCount] = useState(0); 
  const [shareCount, setShareCount] = useState(0); // [New] Share Counter
  const [myTotalClicks, setMyTotalClicks] = useState(() => {
    return parseInt(localStorage.getItem('egg_breaker_clicks') || '0', 10);
  });
  
  // Track previous round to detect changes
  const prevRound = useRef(null);
  
  // Mobile Panel State: 'none', 'left', 'right'
  const [mobilePanel, setMobilePanel] = useState('none');
  const [notification, setNotification] = useState('');
  const [showGuide, setShowGuide] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [hideAnnouncement, setHideAnnouncement] = useState(false);

  // --- Global Swipe Logic REMOVED ---
  // const touchStart = useRef({ x: 0, y: 0 });
  // const [hasSwiped, setHasSwiped] = useState(false);

  // Timestamp for synchronization
  const lastServerTs = useRef(0);
  const buyAudioRef = useRef(null); // Singleton for buy sound

  // Timers
  const [winnerCountdown, setWinnerCountdown] = useState(300); // 5 minutes
  const [exitCountdown, setExitCountdown] = useState(null); // For winner after submit
  const [loserCountdown, setLoserCountdown] = useState(null); // For losers
  const [showLoserMessage, setShowLoserMessage] = useState(false); // Delay for "Checking..."

  // Retry & Spectator State
  const [showRetry, setShowRetry] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const isFirstLoad = useRef(true); // Track first load to detect latecomers
  
  // Queue Status for Full Server
  const [queueStatus, setQueueStatus] = useState('WAITING'); // WAITING, RELOADING, GAME_STARTED

  // Auto-Retry Logic for Queue
  useEffect(() => {
      let retryTimer;
      if (serverError === 'FULL') {
          // Wait 3 seconds then decide
          retryTimer = setTimeout(() => {
               const totalOnline = (serverState.onlinePlayers || 0) + (serverState.onlineSpectatorsApprox || 0);
               if (totalOnline >= 1000) {
                   setQueueStatus('GAME_STARTED');
               } else {
                   setQueueStatus('RELOADING');
                   window.location.reload();
               }
          }, 3000);
      }
      return () => clearTimeout(retryTimer);
  }, [serverError, serverState.onlinePlayers, serverState.onlineSpectatorsApprox]);

  // HP Threshold Announcements
  const lastStage = useRef(0);
  useEffect(() => {
      // 10단계 (10% 단위)
      const currentStage = Math.ceil(10 - ((hp / 1000000) * 100 / 10));
      
      if (currentStage > lastStage.current && hp > 0) {
          if (currentStage > 1) { // 1단계는 시작시 이미 적용될 수 있으므로 제외하거나 필요시 포함
               showNotification(`${lang.crackWarning} (Stage ${currentStage})`);
          }
          lastStage.current = currentStage;
      } else if (hp >= 1000000) {
          lastStage.current = 0;
      }
  }, [hp, lang]);

  // Data from Server State
  const announcement = serverState.nextPrizeName 
    ? `🎁 이번 라운드 상품: ${serverState.nextPrizeName}` 
    : (serverState.announcement || "");
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
      // Complete reset by reloading the page
      window.location.reload();
  };

  // Winner Timer (5 min limit)
  useEffect(() => {
    let timer;
    if (isWinner && !emailSubmitted && !showRetry) {
        if (winStartTime) {
            // [New] Sync with Server Time
            const updateTimer = () => {
                const elapsed = Math.floor((Date.now() - winStartTime) / 1000);
                const remaining = Math.max(0, 300 - elapsed);
                setWinnerCountdown(remaining);
                if (remaining <= 0) {
                    showNotification("Time expired! You failed to enter your email in time.");
                    handleGameEnd(adUrl);
                }
            };
            
            updateTimer(); // Initial call
            timer = setInterval(updateTimer, 1000);
        } else if (winnerCountdown > 0) {
            // Fallback
            timer = setInterval(() => {
                setWinnerCountdown(prev => prev - 1);
            }, 1000);
        }
    } else if (winnerCountdown === 0 && isWinner && !emailSubmitted && !showRetry) {
       // Time expired for winner (Legacy path)
       showNotification("Time expired! You failed to enter your email in time.");
       handleGameEnd(adUrl);
    }
    return () => clearInterval(timer);
  }, [isWinner, emailSubmitted, winnerCountdown, adUrl, showRetry, winStartTime]);

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
          // 1. Wait 4 seconds before showing "Failed" (to allow server sync)
          if (!showLoserMessage) {
              checkTimer = setTimeout(() => {
                  setShowLoserMessage(true);
                  setLoserCountdown(10); // 10 seconds to exit
              }, 4000);
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
            changeCountry("KR"); // Fallback to KR
        }
    };
    detectCountry();
  }, []);

  // Handle Invite Link Check
  useEffect(() => {
      const checkInvite = async (url) => {
          console.log(`[App] URL: ${url}`);
          if (!url) return;
          const params = new URLSearchParams(new URL(url).search);
          const referrer = params.get('referrer');
          console.log(`[App] Ref: ${referrer}, Me: ${clientId}`);
          
          // Remove client-side check to allow round resets to work
          if (referrer && referrer !== clientId) {
              try {
                  console.log("[App] Sending invite req...");
                  const res = await fetch(`${API_URL}/api/invite-reward`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ from: referrer, to: clientId })
                  });
                  const json = await res.json();
                  console.log(`[App] Resp: ${res.status} ${JSON.stringify(json)}`);
                  
                  if (res.ok) {
                      console.log("Invite verified by server!");
                      // Optional: mark locally if needed for UI, but rely on server for logic
                  }
              } catch (e) {
                  console.error("Invite check failed", e);
                  console.log(`[App] Err: ${e.message}`);
              }
          } else {
              console.log("[App] No valid referrer");
          }
      };
      
      checkInvite(window.location.href);
      
      // For Capacitor (Deep Links)
      if (window.Capacitor) {
          import('@capacitor/app').then(({ App: CapApp }) => {
              CapApp.addListener('appUrlOpen', data => {
                  checkInvite(data.url);
              });
          });
      }
  }, [clientId, API_URL]);

  // Handle Reward Events (Invites)
  useEffect(() => {
    if (rewardEvent) {
        setMyPoints(prev => prev + rewardEvent.amount);
        // Persist earned points locally as well
        const currentStored = parseInt(localStorage.getItem('saved_points') || '0', 10);
        localStorage.setItem('saved_points', (currentStored + rewardEvent.amount).toString());

        const msg = rewardEvent.msg === "inviteSuccess" 
            ? (lang.inviteSuccess || "Friend joined! +800P") 
            : rewardEvent.msg;
        showNotification(msg);
        console.log(`[App] Reward: ${msg}`);
    }
  }, [rewardEvent, lang]);

  // ... (Sync Local HP Logic) ... 
  // (We need to insert the render part before the closing brace of the component)


  // Sync Local HP with Server HP (Correction with Pending Damage)
  useEffect(() => {
      if (serverState.hp !== undefined) {
          const ts = serverState.lastUpdatedAt || 0;
          
          if (ts >= lastServerTs.current) {
              lastServerTs.current = ts;
              
              // [Sticky HP Logic] 
              // 서버의 HP가 내 로컬 HP보다 낮을 때만 업데이트 (타인의 공격 반영)
              // 서버 HP가 더 높으면 내 공격이 아직 서버에 도달 안 한 것이므로 내 값 유지
              setHp(prevHp => {
                  if (serverState.hp < prevHp || isFirstLoad.current) {
                      return serverState.hp;
                  }
                  // 라운드가 바뀌었을 때는 무조건 서버 값을 따름
                  if (prevRound.current && serverState.round !== prevRound.current) {
                      return serverState.hp;
                  }
                  return prevHp;
              });

              // Latecomer Detection
              if (isFirstLoad.current) {
                  if (serverState.hp <= 0) {
                      setIsSpectating(true);
                  }
                  
                  // [Opt] Restore saved points on first load (from ads/invites)
                  const savedPoints = parseInt(localStorage.getItem('saved_points') || '0', 10);
                  if (savedPoints > 0) {
                      setMyPoints(prev => prev + savedPoints);
                  }

                  isFirstLoad.current = false;
              }
              
              if (serverState.winnerInfo && serverState.winnerInfo.country === myCountry && !isWinner) {
                  // Check if it matches me? We don't have ID check here easily yet without more logic.
                  // Assume if "I" triggered the win, isWinner is set locally.
                  // If someone else won, we see status FINISHED.
              }
          } 
      }
  }, [serverState.hp, serverState.lastUpdatedAt, myCountry, isWinner]);
  
  // Removed manual flushPendingDamage logic (handled in hook)

  useEffect(() => {
    // Round change handling
    if (prevRound.current && serverState.round && serverState.round !== prevRound.current) {
        setMyPoints(0);
        setClickPower(1);
        setCurrentTool('fist');
        setAdWatchCount(0);
        setShareCount(0); // Reset share count
        setMyTotalClicks(0);
        localStorage.setItem('egg_breaker_clicks', '0');
        localStorage.setItem('saved_points', '0'); // Reset saved points too
    }
    if (serverState.round) {
        prevRound.current = serverState.round;
    }
  }, [serverState.round, serverState.status, lang]);

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
    if (hp <= 0 || serverState.status === 'FINISHED' || role === 'spectator') return;
    
    // Reset activity timer
    setLastActivity(Date.now());
    setShowGuide(false);
    
    // 1. [Optimistic Update] UI 즉시 반영
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);
    
    const newHp = Math.max(0, hp - clickPower);
    
    // 로컬 상태 즉시 변경
    setMyPoints(prev => prev + clickPower);
    setHp(newHp);
    
    // 로컬 통계 갱신
    const newTotalClicks = myTotalClicks + 1;
    setMyTotalClicks(newTotalClicks);
    localStorage.setItem('egg_breaker_clicks', newTotalClicks.toString());

    // Use Hook to Add Click
    addClick(clickPower, myCountry, myPoints + clickPower, newTotalClicks);
    
    // If HP hits 0 locally, we rely on server to confirm.
    if (newHp === 0) {
       // setIsWinner(true); // Removed: Wait for server confirmation
       setShowLoserMessage(true); // Temporarily show checking status
    }
  };

  // Check for Winning Token from Server
  useEffect(() => {
      if (winningToken) {
          setIsWinner(true);
          setShowLoserMessage(false); // Clear checking status
      }
  }, [winningToken]);

  const buyItem = async (cost, powerAdd, toolName) => {
    if (myPoints >= cost) {
      setMyPoints(prev => prev - cost);
      setClickPower(prev => prev + powerAdd);
      setCurrentTool(toolName);
      
      // Play Buy Sound (Hybrid)
      try {
          if (Capacitor.isNativePlatform()) {
              await NativeAudio.play({ assetId: 'buy' }).catch(() => {});
          } else {
              if (!buyAudioRef.current) {
                  buyAudioRef.current = new Audio('/sounds/buy.mp3');
                  buyAudioRef.current.volume = 1.0;
              }
              buyAudioRef.current.currentTime = 0;
              // Suppress NotSupportedError or other play errors
              await buyAudioRef.current.play().catch(e => {
                  if (e.name !== 'NotSupportedError' && e.name !== 'NotAllowedError') {
                      console.warn("Buy sound play failed:", e);
                  }
              });
          }
      } catch(e) { /* Ignore setup errors */ }

      const localizedToolName = lang[TOOL_NAMES[toolName]] || toolName;
      showNotification(`${lang.bought} ${localizedToolName}!`);
    } else {
      showNotification(lang.notEnoughPoints);
    }
  };

  const submitWinnerEmail = async (customEmail = null) => {
    const targetEmail = customEmail || winnerEmail;
    
    // 일반적인 경우에만 이메일 형식 체크
    if (!customEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(targetEmail)) {
            showNotification("이메일 형식이 올바르지 않습니다.");
            return;
        }
    }
    
    try {
        await fetch(`${API_URL}/api/winner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail, country: myCountry, token: winningToken })
        });
        setEmailSubmitted(true);
        // Alert success
        showNotification("이메일이 정상적으로 접수되었습니다! (Sent successfully!)");
        // Start exit timer
        setExitCountdown(5); 
    } catch(e) {
        console.error("Winner submit failed", e);
        showNotification("Failed to send. Please try again.");
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

  const handleKakaoShare = async () => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
        showNotification("Kakao SDK not initialized.");
        return;
    }

    if (shareCount >= 5) {
        showNotification(lang.alreadyShared || "이번 라운드 공유 한도(5회)를 초과했습니다.");
        return;
    }
    
    // Construct Share URL with Referrer
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('referrer', clientId);
    const shareUrl = currentUrl.toString();

    try {
        // 1. Launch Share
        // NOTE: Error 4019 means domain mismatch. Register domain in Kakao Developers.
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: lang.title,
            description: lang.subtitle,
            imageUrl: 'https://egg-break-412ae.web.app/vite.svg', // TODO: Replace with actual game image URL
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
          },
          buttons: [{ title: 'Play Now', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
        });

        // Artificial delay to mimic process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Reward
        const reward = 800;
        setMyPoints(prev => prev + reward);
        setShareCount(prev => prev + 1);
        
        // Persist reward
        const currentStored = parseInt(localStorage.getItem('saved_points') || '0', 10);
        localStorage.setItem('saved_points', (currentStored + reward).toString());

        // 3. Inform user
        showNotification(`${lang.shareSuccess} (${shareCount + 1}/5)`);
    } catch (e) {
        console.error("Kakao Share Error:", e);
        showNotification("공유하기 도중 오류가 발생했습니다. (브라우저 설정을 확인해주세요)");
    }
  };

  const handleAdWatch = () => {
    if (adWatchCount >= 1) {
        showNotification("이번 라운드 광고 시청(1회)을 이미 완료하셨습니다!");
        return;
    }
    if (adUrl) {
        window.open(adUrl, '_blank');
    } else {
        showNotification("현재 연결된 광고가 없습니다.");
        return;
    }
    const reward = 2000;
    setMyPoints(prev => prev + reward);
    setAdWatchCount(prev => prev + 1);
    
    // [Opt] Persist ad reward locally
    const currentStored = parseInt(localStorage.getItem('saved_points') || '0', 10);
    localStorage.setItem('saved_points', (currentStored + reward).toString());
    
    showNotification(`광고 시청 완료! ${reward} 포인트가 지급되었습니다.`);
  };

  if (route === '#admin') return <Admin />;

  // 1. Server Full / Queue Full Error
  if (serverError === 'FULL') {
      return (
          <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100vh', background: '#fff0f5', color: '#5d4037', textAlign: 'center', padding: '20px'
          }}>
              {queueStatus === 'GAME_STARTED' ? (
                  <>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏟️</div>
                    <h1 style={{ color: '#ff6f61', marginBottom: '10px' }}>{lang.gameStarted}</h1>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                        {lang.tryNextRound}<br/>
                        (현재 접속자: {(serverState.onlinePlayers || 0) + (serverState.onlineSpectatorsApprox || 0)}명)
                    </p>
                  </>
              ) : queueStatus === 'RELOADING' ? (
                  <>
                    <div className="spinner" style={{
                        width: '40px', height: '40px', border: '5px solid #ffe4e1', borderTop: '5px solid #ff6f61', 
                        borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '20px auto'
                    }}></div>
                    <h2>{lang.reloading}</h2>
                  </>
              ) : (
                  <>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
                    <h1 style={{ color: '#ff6f61', marginBottom: '10px' }}>{lang.queueLabel}...</h1>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                        현재 참여 가능한 인원이 모두 찼습니다.<br/>
                        잠시 후 자동으로 재접속합니다.<br/>
                    </p>
                    <div className="spinner" style={{
                            width: '30px', height: '30px', border: '4px solid #ffe4e1', borderTop: '4px solid #ff6f61', 
                            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '20px auto'
                    }}></div>
                  </>
              )}
          </div>
      );
  }

  // Debug: Loading State
  if (serverState.status === 'LOADING') {
      return (
          <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100vh', background: '#fff'
          }}>
              <h2>🔄 Connecting...</h2>
              <p>서버와 연결 중입니다.</p>
          </div>
      );
  }

  // Debug: Error State
  if (serverState.status === 'ERROR') {
      return (
          <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100vh', background: '#fff', padding: '20px', textAlign: 'center'
          }}>
              <h2 style={{color: 'red'}}>⚠️ Connection Error</h2>
              <p>{serverState.announcement}</p>
              <p style={{fontSize: '0.8rem', color: '#666', marginTop: '10px'}}>
                  Check your internet connection or server URL.
              </p>
              <p style={{fontSize: '0.7rem', color: '#aaa'}}>API: {API_URL}</p>
              <button onClick={() => window.location.reload()} style={{marginTop: '20px'}}>Retry</button>
          </div>
      );
  }

  // 2. Spectator Mode (Not Connected)
  if (!connected) {
      // Polling Mode View
      // Show Game Area but with overlay if PLAYING
      // If FINISHED or WINNER_CHECK, just show the state (GameArea handles it)
  }

  // Transform server stats for UI
  const countryStats = Object.entries(serverState.clicksByCountry || {})
    .sort((a, b) => b[1] - a[1]);

  const onlineUsersCount = (serverState.onlinePlayers || 0) + (serverState.onlineSpectatorsApprox || 0);

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
      
      {announcement && !hideAnnouncement && (
        <div 
          onClick={() => setHideAnnouncement(true)}
          style={{
            background: '#ffefd5', color: '#ff6f61', padding: '12px', textAlign: 'center', fontWeight: 'bold',
            animation: 'fadeIn 0.5s', borderRadius: '0 0 20px 20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            border: '1px solid #ffe4e1', marginBottom: '10px', cursor: 'pointer'
          }}
        >
          📢 {announcement} <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 'normal', marginLeft: '5px' }}>{lang.tapToClose}</span>
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

      {/* Side Toggle Buttons (Mobile Only) - Clickable indicators on screen edges */}
      {mobilePanel === 'none' && (
        <>
          <div 
            className="side-toggle left"
            onClick={() => toggleMobilePanel('left')}
            style={{ cursor: 'pointer' }}
          >
            <span>👉</span>
            <span className="side-label">{lang.users}</span>
          </div>
          <div 
            className="side-toggle right"
            onClick={() => toggleMobilePanel('right')}
            style={{ cursor: 'pointer' }}
          >
            <span>👈</span>
            <span className="side-label">{lang.shop}</span>
          </div>
        </>
      )}

      <div className="main-layout">
        <LeftPanel 
          lang={lang} 
          serverState={serverState}
          countryStats={countryStats} 
          onlineUsersCount={onlineUsersCount} 
          prize={prize}
          prizeUrl={prizeUrl}
          getFlagEmoji={getFlagEmoji}
          isOpen={mobilePanel === 'left'}
          toggleMobilePanel={toggleMobilePanel}
        />

        <InfoPanel
          lang={lang}
          recentWinners={serverState.recentWinners || []}
          prize={prize}
          prizeUrl={prizeUrl}
          isOpen={mobilePanel === 'info'}
          toggleMobilePanel={toggleMobilePanel}
        />

        {/* Game Area Wrapper for Overlays */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
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
              adWatchCount={adWatchCount}
              showGuide={showGuide}
              winnerCountdown={winnerCountdown}
              exitCountdown={exitCountdown}
              loserCountdown={loserCountdown}
              showLoserMessage={showLoserMessage}
              isSpectating={isSpectating} // This logic needs update in GameArea
              showRetry={showRetry}
              handleRetry={handleRetry}
              clientId={clientId}
              serverState={serverState}
              API_URL={API_URL}
              myCountry={myCountry}
              winningToken={winningToken}
              prizeSecretImageUrl={prizeSecretImageUrl}
              connected={connected}
            />

            {/* JOIN BUTTON OVERLAY (When NOT connected and PLAYING) */}
            {!connected && serverState.status === 'PLAYING' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(255, 255, 255, 0.4)', // Slightly dim
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(2px)'
                }}>
                    <button 
                        onClick={connect}
                        className="pulse-btn"
                        style={{
                            padding: '20px 50px', fontSize: '2rem', fontWeight: '900',
                            background: 'linear-gradient(45deg, #ff6f61, #ff9a9e)',
                            color: 'white', border: 'none', borderRadius: '50px',
                            cursor: 'pointer', boxShadow: '0 10px 30px rgba(255, 111, 97, 0.5)',
                            transform: 'scale(1)', transition: 'transform 0.2s',
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        ⚔️ {lang.joinGame || "JOIN GAME"}
                    </button>
                </div>
            )}
        </div>

        <RightPanel 
          lang={lang}
          buyItem={buyItem}
          myPoints={myPoints}
          clickPower={clickPower}
          myTotalClicks={myTotalClicks}
          handleKakaoShare={handleKakaoShare}
          isOpen={mobilePanel === 'right'}
          toggleMobilePanel={toggleMobilePanel}
          shareCount={shareCount} // [New] Pass share count
        />
      </div>
    </div>
  );
}

export default App;
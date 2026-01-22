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
import { TRANSLATIONS, getFlagEmoji, TOOL_NAMES } from './constants';

function App() {
  const [route, setRoute] = useState(window.location.hash);
  
  // Custom Hook for API State
  const { serverState, API_URL, error: serverError, role, queuePos, etaSec, addClick, connected, clientId, winningToken, winStartTime, prizeSecretImageUrl, connect, rewardEvent } = useGameState(); 
  
  // Custom Hook for Push Notifications
  usePushNotifications(API_URL, clientId);
  
  // Local HP for Optimistic Updates
  const [hp, setHp] = useState(1000000);

  // [Performance] Batch Updates Refs
  const accumulatedDamage = useRef(0);
  const accumulatedPoints = useRef(0);
  const accumulatedClicks = useRef(0);

  // [Performance] Flush Updates Loop (100ms throttle)
  useEffect(() => {
    const timer = setInterval(() => {
        if (accumulatedDamage.current > 0 || accumulatedPoints.current > 0) {
            const dmg = accumulatedDamage.current;
            const pts = accumulatedPoints.current;
            const clks = accumulatedClicks.current;
            
            accumulatedDamage.current = 0;
            accumulatedPoints.current = 0;
            accumulatedClicks.current = 0;

            setHp(prev => Math.max(0, prev - dmg));
            setMyPoints(prev => prev + pts);
            
            if (clks > 0) {
                setMyTotalClicks(prev => prev + clks);
            }
        }
    }, 100); 

    return () => clearInterval(timer);
  }, []);

  // [Performance] Persist Data Loop (1s throttle) - using Refs to avoid interval recreation
  const myPointsRef = useRef(0);
  const myTotalClicksRef = useRef(0);
  
  // Sync refs with state on every render (moved down below state declarations)

  useEffect(() => {
      const saveTimer = setInterval(() => {
          localStorage.setItem('egg_breaker_clicks', myTotalClicksRef.current.toString());
          localStorage.setItem('saved_points', myPointsRef.current.toString());
      }, 1000);
      return () => clearInterval(saveTimer);
  }, []); // Run once!

  // const [isShaking, setIsShaking] = useState(false); // Removed for performance
  const [myPoints, setMyPoints] = useState(() => {
      return parseInt(localStorage.getItem('saved_points') || '0', 10);
  });
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
  
  // Sync refs with state on every render (cheap)
  myPointsRef.current = myPoints;
  myTotalClicksRef.current = myTotalClicks;
  
  // Track previous round to detect changes
  const prevRound = useRef(null);
  
  // Mobile Panel State: 'none', 'left', 'right'
  const [mobilePanel, setMobilePanel] = useState('none');
  const [notification, setNotification] = useState('');
  const [showGuide, setShowGuide] = useState(true);
  const lastActivityRef = useRef(Date.now()); // [Performance] Ref instead of State
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
  const [queueStatus, setQueueStatus] = useState('WAITING'); 

  // [Modified] Handle Full Server -> Spectator Mode
  useEffect(() => {
      if (serverError === 'FULL') {
          showNotification("대기열이 꽉 차서 관전 모드로 입장합니다.");
          // No auto-reload, just stay as spectator
      }
  }, [serverError]);

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
  const announcement = serverState.announcement || "";
  const prize = serverState.prize || "";
  const prizeUrl = serverState.prizeUrl || "";
  const adUrl = serverState.adUrl || "";

  // Helper for Game End (Open New Window + Show Retry Screen)
  const handleGameEnd = (url) => {
      // [UX] Removed auto-popup to prevent blocking. 
      // Just show the retry/spectating UI with a button.
      
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
                    alert("시간이 초과되어 우승 자격이 박탈되었습니다.");
                    window.location.reload();
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
       alert("시간이 초과되어 우승 자격이 박탈되었습니다.");
       window.location.reload();
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
    const detectCountry = () => {
        try {
            // [Perf] Removed external API call (ipwho.is)
            // Use browser language as a heuristic or fallback to KR
            const lang = navigator.language || navigator.userLanguage || "ko-KR";
            if (lang.includes("ko")) changeCountry("KR");
            else if (lang.includes("ja")) changeCountry("JP");
            else if (lang.includes("zh")) changeCountry("CN");
            else changeCountry("US");
        } catch (e) {
            changeCountry("KR");
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
          const currentRound = serverState.round || 1;
          console.log(`[App] Ref: ${referrer}, Me: ${clientId}, Round: ${currentRound}`);
          
          // Remove client-side check to allow round resets to work
          if (referrer && referrer !== clientId) {
              // [Policy Note]
              // Current Policy: "Permanent 1-time Reward per Friend"
              // Enforced by: Backend 'invites' table UNIQUE constraint (from_user, to_user).
              // To switch to "Round-based Reward":
              // 1. In Backend (gameDO.ts), enable 'DELETE FROM invites' in 'reset-round' action.
              // 2. Here in Frontend, include 'currentRound' in the 'checkKey' below (Already done: _r${currentRound}).
              
              // [New] Local duplication check scoped by Round
              const checkKey = `egg_invite_checked_${referrer}_${clientId}_r${currentRound}`;
              const lastChecked = localStorage.getItem(checkKey);
              
              if (lastChecked) {
                  console.log("[App] Invite already checked locally for this round (skipping).");
                  return;
              }

              try {
                  console.log("[App] Sending invite req...");
                  const res = await fetch(`${API_URL}/api/invite-reward`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ from: referrer, to: clientId })
                  });
                  // ...
                  
                  // If success or duplicate/invalid (400), mark as checked for this round
                  if (res.ok || res.status === 400) {
                      localStorage.setItem(checkKey, Date.now().toString());
                  }

                  if (res.ok) {
                      console.log("Invite verified by server!");
                  }
              } catch (e) {
                  console.error("Invite check failed", e);
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
  }, [clientId, API_URL, serverState.round]);

  // Handle Reward Events (Invites)
  useEffect(() => {
    if (rewardEvent) {
        setMyPoints(prev => prev + rewardEvent.amount);
        // Persist earned points locally as well
        const currentStored = parseInt(localStorage.getItem('saved_points') || '0', 10);
        localStorage.setItem('saved_points', (currentStored + rewardEvent.amount).toString());

        let msg = rewardEvent.msg;
        if (msg === "INVITE_REWARD_MSG" || msg === "INVITE_REWARD_WELCOME") {
            setShareCount(prev => prev + 1);
            msg = `친구 초대 성공! 보상 지급 (누적 ${shareCount + 1}회)`;
        } else {
            // Translate other messages if needed
            if (msg === "INVITE_REWARD_MSG") msg = lang.inviteSuccess || "Friend joined! +800P";
        }

        showNotification(msg);
        console.log(`[App] Reward: ${msg}`);
    }
  }, [rewardEvent, lang, shareCount]);

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
                  
                  // [Fix] Points are already loaded in useState initial value. 
                  // Adding them again here causes double counting. Removed.

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
      if (Date.now() - lastActivityRef.current > 10000 && !showGuide) {
        setShowGuide(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [showGuide]); // Only recreate if showGuide changes (rarely)

  const handleClick = async () => {
    if (hp <= 0 || serverState.status === 'FINISHED' || role === 'spectator') return;
    
    // Reset activity timer (Ref)
    lastActivityRef.current = Date.now();
    if (showGuide) setShowGuide(false);
    
    // 1. [Performance] Accumulate Changes (UI update is batched in useEffect)
    accumulatedDamage.current += clickPower;
    accumulatedPoints.current += clickPower;
    accumulatedClicks.current += 1;
    
    // 2. Use Hook to Add Click (Hook handles server batching)
    // Pass estimated current values
    addClick(clickPower, myCountry, myPoints + accumulatedPoints.current, myTotalClicks + accumulatedClicks.current);
    
    // If HP hits 0 locally (Optimistic check)
    if (hp - accumulatedDamage.current <= 0) {
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
        if (targetEmail === "saved@prize.com") {
             showNotification(lang.prizeReceivedBtn || "상품 수령 완료!");
        } else {
             showNotification(lang.sent || "이메일이 정상적으로 접수되었습니다!");
        }
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

  const handleComboReward = (points, msg) => {
      setMyPoints(prev => prev + points);
      showNotification(msg);
      
      // Persist reward
      const currentStored = parseInt(localStorage.getItem('saved_points') || '0', 10);
      localStorage.setItem('saved_points', (currentStored + points).toString());
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
    if (clientId) {
        currentUrl.searchParams.set('referrer', clientId);
    }
    const shareUrl = currentUrl.toString();

    try {
        // 1. Launch Share
        // NOTE: Error 4019 means domain mismatch. Register domain in Kakao Developers.
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: lang.title,
            description: lang.subtitle,
            imageUrl: 'https://worldegg-breaking.pages.dev/vite.svg',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
          },
          buttons: [{ title: 'Play Now', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
          installTalk: true, 
        });

        // Artificial delay to mimic process
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Reward Removed (Only given when friend joins)
        // setShareCount(prev => prev + 1); // Removed: Reward only on actual join
        
        // 3. Inform user
        showNotification("공유창이 열렸어요. 친구가 링크로 접속하면 800P 지급!");
    } catch (e) {
        console.error("Kakao Share Error:", e);
        if (e.name === 'NotAllowedError' || e.message?.includes('intent')) {
            showNotification("카카오톡 앱 실행에 실패했습니다. (모바일 기기에서 시도해주세요)");
        } else {
            showNotification("공유하기 도중 오류가 발생했습니다. (브라우저 설정을 확인해주세요)");
        }
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

  // [Modified] Server Full Error is handled by notification now, not blocking UI
  // if (serverError === 'FULL') { ... } removed

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
      {notification && (
        <div style={{
            position: 'fixed',
            top: '10%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#ff6f61',
            border: '3px solid #ffb6c1',
            padding: '12px 30px',
            borderRadius: '50px',
            fontWeight: '800',
            fontSize: '1.2rem',
            zIndex: 10000,
            pointerEvents: 'none',
            animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            boxShadow: '0 8px 20px rgba(255, 105, 180, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap'
        }}>
            <span style={{fontSize: '1.5rem'}}>🛍️</span> {notification}
        </div>
      )}
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
              role={role} // [New] Pass role
              queuePos={queuePos} // [New] Pass queuePos
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
              onComboReward={handleComboReward}
            />

            {/* JOIN BUTTON OVERLAY (When NOT connected and PLAYING) */}
            {!connected && serverState.status === 'PLAYING' && (serverState.onlinePlayers < 1000 && (serverState.queueLength || 0) < 1000) && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'transparent', 
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', // [Mod] Align to bottom
                    zIndex: 1000, 
                    pointerEvents: 'none',
                    paddingBottom: '20px' // [Mod] Add padding from bottom
                }}>
                    <button 
                        onClick={connect}
                        className="pulse-btn"
                        style={{
                            pointerEvents: 'auto', 
                            padding: '15px 40px', fontSize: '1.5rem', fontWeight: '900', // [Mod] Slightly smaller
                            background: 'linear-gradient(45deg, #ff6f61, #ff9a9e)',
                            color: 'white', border: 'none', borderRadius: '50px',
                            cursor: 'pointer', 
                            boxShadow: '0 10px 30px rgba(255, 111, 97, 0.5)',
                            transform: 'scale(1)', transition: 'transform 0.2s',
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        {
                            serverState.onlinePlayers < 1000 ? `⚔️ ${lang.joinGame || "JOIN GAME"}` :
                            `⏳ ${lang.joinQueue || "Join Queue"}`
                        }
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
              prizeUrl={prizeUrl} // [New]
              isOpen={mobilePanel === 'right'}
              toggleMobilePanel={toggleMobilePanel}
              shareCount={shareCount} 
            />
      </div>
    </div>
  );
}

export default App;
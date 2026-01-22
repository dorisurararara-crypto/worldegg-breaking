import React, { useState, useRef, useEffect, memo } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { NativeAudio } from '@capacitor-community/native-audio';
import { Capacitor } from '@capacitor/core';

// --- Constants (Moved to top to prevent TDZ errors) ---
const TOOL_EMOJIS = {
    hammer: '🔨',
    pickaxe: '⛏️',
    dynamite: '🧨',
    drill: '🔩',
    excavator: '🚜',
    laser: '🔫',
    nuke: '☢️',
    fist: '👊'
};

const CUTE_PARTICLES = ['✨', '💖', '🌸', '🍭', '⭐', '🌈', '🍦', '🎀', '🎵', '🐇'];

// --- 깨지는 알 SVG 컴포넌트 ---
// React 19: forwardRef is not needed. ref is passed as a prop.
// Using memo for performance is still good.
const CrackedEgg = memo(({ hp, maxHp, tool, onEggClick, ref }) => {
    const percentage = (hp / maxHp) * 100;

    // 10단계 파괴 로직 (10% 단위)
    const stage = Math.ceil(10 - (percentage / 10)); // 0 to 10
    
    const isCritical = percentage < 20 && hp > 0;
    const isBroken = hp <= 0;

    // 피격 시 무작위 표정 선택을 위한 값
    // 간단하게 hp 값을 시드로 활용하여 클릭할 때마다 바뀌게 설정
    const randomSeed = Math.floor((hp % 7)); 

    // 기본 표정 구성 요소
    let eyeLeft, eyeRight, mouth, blush, extra;

    // 기본 상태 설정 (평소)
    // NOTE: Shaking 표정 변화 로직은 CSS 클래스로 처리하기 어려우므로
    // 성능을 위해 "피격 표정"은 렌더링 시 잠시 무시하거나, 
    // 정말 필요하다면 DOM 조작 대신 React 상태를 써야 하지만 
    // 여기서는 렉 방지를 위해 "기본 표정"과 "위기 표정" 위주로만 구성합니다.
    // (피격 순간 표정 변화는 너무 빠른 렌더링 교체를 요구함)

    eyeLeft = <circle cx="75" cy="110" r="8" fill="#5d4037" />;
    eyeRight = <circle cx="125" cy="110" r="8" fill="#5d4037" />;
    mouth = <path d="M90 135 Q100 145 110 135" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
    blush = (
        <>
            <ellipse cx="65" cy="125" rx="8" ry="4" fill="#ffb6c1" opacity="0.6" />
            <ellipse cx="135" cy="125" rx="8" ry="4" fill="#ffb6c1" opacity="0.6" />
        </>
    );

    if (percentage < 70) { // 슬픔
        eyeLeft = <path d="M68 115 Q75 105 82 115" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        eyeRight = <path d="M118 115 Q125 105 132 115" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        mouth = <path d="M90 145 Q100 135 110 145" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        extra = <path d="M65 125 Q60 135 65 145 M135 125 Q140 135 135 145" fill="none" stroke="#a1c4fd" strokeWidth="2" />; // 눈물
    }
    if (isCritical) { // 분노
        eyeLeft = <g><path d="M65 105 L85 115 L65 120" fill="red" /><circle cx="72" cy="112" r="2" fill="#fff" /></g>;
        eyeRight = <g><path d="M135 105 L115 115 L135 120" fill="red" /><circle cx="128" cy="112" r="2" fill="#fff" /></g>;
        mouth = <path d="M85 140 L90 130 L95 140 L100 130 L105 140 L110 130 L115 140" fill="none" stroke="#5d4037" strokeWidth="2" />;
        blush = null;
    }

    if (isBroken) {
        eyeLeft = <path d="M68 103 L82 117 M82 103 L68 117" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        eyeRight = <path d="M118 103 L132 117 M132 103 L118 117" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        mouth = <circle cx="100" cy="140" r="10" fill="none" stroke="#5d4037" strokeWidth="3" />;
        blush = null;
    }

    return (
        <div 
            ref={ref}
            className={`egg-svg-container cursor-${tool}`}
            style={{ 
                // transform is handled by CSS class 'shake'
                transition: 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
        >
            <svg viewBox="0 0 200 250" className="egg-svg" style={{ overflow: 'visible' }}>
                <defs>
                    <radialGradient id="eggGradient" cx="40%" cy="30%" r="80%">
                        <stop offset="0%" stopColor={isCritical ? "#800000" : "#ffdde1"} />
                        <stop offset="100%" stopColor={isCritical ? "#200000" : "#ff9a9e"} />
                    </radialGradient>
                    {/* [Opt] Removed Heavy SVG Filters (Glow/Blur) for Mobile Performance */}
                </defs>

                {/* 알 본체 */}
                <ellipse 
                    cx="100" cy="125" rx="80" ry="110" 
                    fill="url(#eggGradient)" 
                    /* filter removed */
                    onPointerDown={onEggClick}
                    style={{ cursor: 'pointer', touchAction: 'none', transition: 'all 0.3s' }} 
                />
                
                {/* 얼굴 */}
                <g className="egg-face" style={{ transition: 'all 0.1s', pointerEvents: 'none' }}>
                    {blush}
                    {eyeLeft}
                    {eyeRight}
                    {mouth}
                    {extra}
                </g>

                {/* 10단계 금(Cracks) - 단계가 올라갈수록 더 많은 금이 나타남 */}
                <g stroke="#5d4037" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" style={{ pointerEvents: 'none' }}>
                    {stage >= 1 && <path d="M100 30 L110 50 L90 60" />}
                    {stage >= 2 && <path d="M50 100 L70 110 L60 130" />}
                    {stage >= 3 && <path d="M140 80 L130 100 L150 110" />}
                    {stage >= 4 && <path d="M80 180 L100 190 L90 210" />}
                    {stage >= 5 && <path d="M30 140 L50 150 L40 170" />}
                    {stage >= 6 && <path d="M160 150 L140 160 L150 180" />}
                    {stage >= 7 && <path d="M70 50 L80 70 L60 80" strokeWidth="4" />}
                    {stage >= 8 && <path d="M130 180 L120 200 L140 210" strokeWidth="4" />}
                    {stage >= 9 && <path d="M100 220 V240 M40 60 L20 80" strokeWidth="5" />}
                    {stage >= 10 && <path d="M170 100 L190 120 M10 120 L30 130" strokeWidth="5" />}
                </g>

                {/* 파괴 완료 선 */}
                {isBroken && (
                    <path d="M20 125 Q100 160 180 125" fill="none" stroke="#5d4037" strokeWidth="10" style={{ pointerEvents: 'none' }} />
                )}
            </svg>
        </div>
    );
});

const GameArea = ({
    lang, hp, isShaking: _ignoredIsShaking, clickPower, myPoints, isWinner, emailSubmitted, winnerEmail,
    setWinnerEmail, submitWinnerEmail, handleClick, currentTool, buyItem, notification, handleAdWatch, adWatchCount, showGuide,
    winnerCountdown, exitCountdown, loserCountdown, showLoserMessage, isSpectating, showRetry, handleRetry,
    clientId, serverState, API_URL, myCountry, winningToken, prizeSecretImageUrl, connected,
    onComboReward, role, queuePos // [New]
}) => {
    // [Performance] Canvas Effects System
    const canvasRef = useRef(null);
    const effectsRef = useRef([]); // Stores active effects objects
    const stageRectRef = useRef({ left: 0, top: 0, width: 0, height: 0 }); // Cache rect
    
    // [New] Track if prize image is saved
    const [isPrizeSaved, setIsPrizeSaved] = useState(false); 
    const stageRef = useRef(null); // 스테이지 좌표 기준점
    const eggRef = useRef(null);   // [New] Egg DOM Ref for performant shaking
    const wasActivePlayer = useRef(false);
    const [localLoserTimer, setLocalLoserTimer] = useState(null);
    const [showWinnerClaiming, setShowWinnerClaiming] = useState(false);
    const [isSettingsFocused, setIsSettingsFocused] = useState(false); // [New] For fading icons
    const [winnerLocked, setWinnerLocked] = useState(null); // [Fix A] Lock winner status

    // [Performance] Throttling
    const lastSoundTime = useRef(0);
    const lastVibTime = useRef(0); // [New] Vibration throttle

    // [New] Submission Loading State
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- Render Conditions (Moved to top) ---
    const isMyWin = isWinner || serverState?.winningClientId === clientId;
    const isWinnerCheck = serverState?.status === 'WINNER_CHECK';
    const isFinished = serverState?.status === 'FINISHED';
    
    // [Fix] Accurate Queue/Spectator Check
    // If we are NOT connected, we are effectively a spectator (passive)
    // If role is explicitly 'spectator' OR we have a positive queue position
    const isRoleSpectator = role === 'spectator';
    const isQueueActive = (queuePos !== undefined && queuePos !== null && queuePos > 0);
    
    const isPassiveMode = !connected || isRoleSpectator || isSpectating || isQueueActive;
    
    // Guide Text Logic
    let guideText = lang.touchGuide;
    const MAX_PLAYERS = serverState.maxPlayers || 1000;
    const MAX_QUEUE = serverState.maxQueue || 1000;
    const queueLen = serverState.queueLength || 0;

    // Priority 1: Already in Queue
    if (isQueueActive) {
        guideText = "현재 '대기자' 입니다. 다음 게임에 참가할수 있습니다!";
    } 
    // Priority 2: Server Full but Queue Open (Spectator Mode but can join queue)
    else if (serverState.onlinePlayers >= MAX_PLAYERS && !connected) {
         if (queueLen < MAX_QUEUE) {
             guideText = "현재 '대기자' 입니다. 다음 게임에 참가할수 있습니다";
         } else {
             guideText = "현재 참가자와 대기자가 꽉차 있습니다! (관전중)";
         }
    } 
    // Priority 3: Just Spectating (Game in progress or finished, not full)
    else if (isRoleSpectator || isSpectating) {
         guideText = "현재 게임 진행 중... (관전)";
    } 
    else if (!connected) {
         // Not full, not connected -> "Join" button visible
    }

    // [Fix A] Update Winner Lock
    useEffect(() => {
        if (isWinnerCheck) {
            if (winnerLocked === null) {
                setWinnerLocked(isMyWin);
            }
        } else {
            if (winnerLocked !== null) setWinnerLocked(null);
        }
    }, [isWinnerCheck, isMyWin, winnerLocked]);

    // Wrapper for submit to handle loading state
    const handleSubmit = async (customEmail = null) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await submitWinnerEmail(customEmail);
        } finally {
            // Success case might reload page, but if error, we reset
            setIsSubmitting(false);
        }
    };

    const handleSavePrize = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // 1. Download Image (if available)
        if (prizeSecretImageUrl) {
            try {
                // Fetch blob to force download instead of open
                const response = await fetch(prizeSecretImageUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `egg_prize_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (e) {
                console.error("Download failed", e);
                // Fallback
                window.open(prizeSecretImageUrl, '_blank');
            }
        }

        // 2. Notify Server
        try {
            // Send dummy email to mark as claimed
            await submitWinnerEmail("saved@prize.com");
        } catch(e) {
            console.error("Submit failed", e);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Combo System
    const [combo, setCombo] = useState(0);
    const comboTimerRef = useRef(null);

    // --- Sound State (Persisted in localStorage) ---
    const [audioLoaded, setAudioLoaded] = useState(false); 

    const [isSoundOn, setIsSoundOn] = useState(() => {
        const saved = localStorage.getItem('soundOn');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [isBgmOn, setIsBgmOn] = useState(() => {
        const saved = localStorage.getItem('bgmOn');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // --- Rolling Egg Facts ---
    const [currentFactIndex, setCurrentFactIndex] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentFactIndex(prev => (prev + 1) % (lang.eggFacts?.length || 1));
        }, 6000);
        return () => clearInterval(timer);
    }, [lang.eggFacts]);

    // [Performance] Canvas Render Loop
    useEffect(() => {
        let animationFrameId;
        let lastTime = 0;

        const renderLoop = (timestamp) => {
            if (!lastTime) lastTime = timestamp;
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            
            if (canvas && ctx) {
                // Clear Canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Filter and Update Effects
                effectsRef.current = effectsRef.current.filter(effect => {
                    effect.life -= deltaTime;
                    if (effect.life <= 0) return false;

                    // Physics / Movement
                    effect.y -= effect.vy * (deltaTime / 16); // Move up
                    // effect.x += Math.sin(effect.life / 50) * 0.5; // Slight wobble
                    effect.alpha = Math.min(1, effect.life / 300); // Fade out last 300ms

                    // Draw Logic
                    ctx.save();
                    ctx.globalAlpha = effect.alpha;
                    
                    // Damage Text
                    if (effect.type === 'text') {
                        // Apply shake/rotate transform
                        const rotate = effect.rotation || 0;
                        ctx.translate(effect.x, effect.y);
                        ctx.rotate(rotate * Math.PI / 180);
                        
                        ctx.font = `900 ${effect.size}px 'Fredoka', sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // Stroke
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = effect.val >= 10000 ? '#000' : '#fff';
                        ctx.strokeText(effect.text, 0, 0);
                        
                        // Fill
                        ctx.fillStyle = effect.color;
                        ctx.fillText(effect.text, 0, 0);
                    } 
                    // Tool/Particle (Emoji)
                    else if (effect.type === 'emoji') {
                        ctx.translate(effect.x, effect.y);
                        ctx.font = `${effect.size}px serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(effect.text, 0, 0);
                    }

                    ctx.restore();
                    return true;
                });
            }
            
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        animationFrameId = requestAnimationFrame(renderLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    // [Performance] Canvas Resize & Rect Cache
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && stageRef.current) {
                const rect = stageRef.current.getBoundingClientRect();
                stageRectRef.current = rect; // Cache rect for click handler

                // Set internal resolution to match physical pixels
                const dpr = window.devicePixelRatio || 1;
                canvasRef.current.width = rect.width * dpr;
                canvasRef.current.height = rect.height * dpr;
                
                // Scale context to match
                const ctx = canvasRef.current.getContext('2d');
                ctx.scale(dpr, dpr);
                
                // Style width/height
                canvasRef.current.style.width = `${rect.width}px`;
                canvasRef.current.style.height = `${rect.height}px`;
                canvasRef.current.style.position = 'absolute';
                canvasRef.current.style.top = '0';
                canvasRef.current.style.left = '0';
                canvasRef.current.style.pointerEvents = 'none'; // Click through
                canvasRef.current.style.zIndex = '20';
            }
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize); // Scroll changes rect pos
        
        // Initial setup with small delay to ensure layout is done
        setTimeout(handleResize, 100);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize);
        };
    }, []);

    // BGM & SFX Refs
    const webAudioRefs = useRef({}); // Stores AudioBuffers for Web
    const html5AudioRefs = useRef({}); // Fallback for Web Audio failures
    const audioContextRef = useRef(null); // Web Audio Context
    const bgmRef = useRef(null); // For Web Audio BGM (HTML5 Audio is fine for BGM usually, or use Context)
    const currentPhaseRef = useRef('none');

    useEffect(() => {
        const sounds = [
            'fist', 'hammer', 'pickaxe', 'dynamite', 'drill', 'excavator', 'laser', 'nuke', 
            'buy', 'win', 'egg_cracking', 'lose', 'many_hit'
        ];

        const loadSounds = async () => {
            if (Capacitor.isNativePlatform()) {
                // Native: Preload SFX
                for (const sound of sounds) {
                    try {
                        try { await NativeAudio.unload({ assetId: sound }); } catch(e){}
                        await NativeAudio.preload({
                            assetId: sound,
                            assetPath: `public/sounds/${sound}.mp3`,
                            audioChannelNum: 1,
                            isUrl: false
                        });
                    } catch (e) { 
                        console.error(`NativeAudio preload failed for ${sound}:`, e); 
                    }
                }
                
                // Native: Preload BGM
                const bgms = ['bgm_peace', 'bgm_tense', 'bgm_danger'];
                for (const bgm of bgms) {
                     try {
                        try { await NativeAudio.unload({ assetId: bgm }); } catch(e){}
                        await NativeAudio.preload({
                            assetId: bgm,
                            assetPath: `public/sounds/${bgm}.mp3`,
                            audioChannelNum: 1,
                            isUrl: false
                        });
                    } catch (e) { 
                        console.error(`NativeAudio preload BGM failed for ${bgm}:`, e);
                    }
                }
                setAudioLoaded(true); // Signal completion

            } else {
                // Web: Preload using Web Audio API for low latency
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    const ctx = new AudioContext();
                    audioContextRef.current = ctx;

                    const loadBuffer = async (name) => {
                        try {
                            const res = await fetch(`/sounds/${name}.mp3`);
                            if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
                            const arrayBuffer = await res.arrayBuffer();
                            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                            webAudioRefs.current[name] = audioBuffer;
                        } catch (err) {
                            console.warn(`Skipping sound ${name}:`, err);
                        }
                    };

                    await Promise.all(sounds.map(s => loadBuffer(s)));
                    setAudioLoaded(true);
                } catch (e) {
                    console.error("Web Audio Init Failed", e);
                }
            }
        };

        loadSounds();

        // [Autoplay Fix] Global listener to unlock audio context on any first click
        const unlockAudio = () => {
             // Unlock Web Audio Context
             if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                 audioContextRef.current.resume().catch(e => console.log("Context resume failed", e));
             }
             // Unlock BGM
             if (!Capacitor.isNativePlatform() && bgmRef.current && bgmRef.current.paused && isBgmOn) {
                 bgmRef.current.play().catch(e => console.log("Unlock play failed", e));
             }
        };
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true });

        return () => {
            if (Capacitor.isNativePlatform()) {
                sounds.forEach(sound => NativeAudio.unload({ assetId: sound }).catch(() => {}));
                ['bgm_peace', 'bgm_tense', 'bgm_danger'].forEach(bgm => NativeAudio.unload({ assetId: bgm }).catch(() => {}));
            }
            if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current = null; }
            if (audioContextRef.current) { audioContextRef.current.close(); }
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, [isBgmOn]);

    // --- Crack Sound Logic ---
    const lastStageRef = useRef(0);
    useEffect(() => {
        const currentStage = Math.ceil(10 - ((hp / 1000000) * 100 / 10));
        if (hp > 0 && hp < 1000000) {
             // Only play if stage increases AND it's not the initial load (prev was not 0 or handled elsewhere)
             // Actually, initial load might set ref to current. 
             // We want sound only on CHANGE.
             if (currentStage > lastStageRef.current && lastStageRef.current > 0) {
                 playToolSound('egg_cracking');
             }
             lastStageRef.current = currentStage;
        } else if (hp >= 1000000) {
             lastStageRef.current = 0;
        }
    }, [hp]);

    // --- Visual Theme Logic (Separated from Audio) ---
    useEffect(() => {
        // HP가 0 이하이면 처리는 하되, 테마는 유지하거나 별도 처리 가능
        // 여기서는 HP에 따라 배경만 즉시 변경
        const percentage = (hp / 1000000) * 100;
        
        // Remove old themes first
        document.documentElement.classList.remove('dark-theme', 'tense-theme');
        document.body.classList.remove('dark-theme', 'tense-theme');

        if (percentage < 20 && hp > 0) {
            document.documentElement.classList.add('dark-theme');
            document.body.classList.add('dark-theme');
        } else if (percentage < 70 && hp > 0) {
            document.documentElement.classList.add('tense-theme');
            document.body.classList.add('tense-theme');
        }
    }, [hp]);

    // --- Audio Logic (BGM) ---
    useEffect(() => {
        if (!audioLoaded) return;

        // [New] Stop BGM if game over
        if (serverState?.status === 'WINNER_CHECK' || serverState?.status === 'FINISHED') {
            if (currentPhaseRef.current !== 'none') {
                stopBgm();
                currentPhaseRef.current = 'none';
            }
            return;
        }

        if (!isBgmOn || hp <= 0) {
            // 소리 끄기 또는 사망 시
            if (currentPhaseRef.current !== 'none') {
                stopBgm();
                currentPhaseRef.current = 'none';
            }
            return;
        }

        const percentage = (hp / 1000000) * 100;
        let newPhase = 'peace';
        if (percentage < 20) newPhase = 'danger';
        else if (percentage < 70) newPhase = 'tense';

        // Always try to play if state mismatches (e.g. paused by browser)
        if (newPhase !== currentPhaseRef.current || (bgmRef.current && bgmRef.current.paused)) {
            playBgm(newPhase);
            currentPhaseRef.current = newPhase;
        }
    }, [hp, isBgmOn, audioLoaded, serverState?.status]);

    const stopBgm = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                await NativeAudio.stop({ assetId: 'bgm_peace' });
                await NativeAudio.stop({ assetId: 'bgm_tense' });
                await NativeAudio.stop({ assetId: 'bgm_danger' });
            } catch(e) {}
        } else {
            if (bgmRef.current) {
                bgmRef.current.pause();
                // Don't nullify ref here to allow resume
            }
        }
    };

    const playBgm = async (phase) => {
        const trackName = `bgm_${phase}`;
        
        // Ensure previous BGM is fully stopped and cleared
        if (!Capacitor.isNativePlatform()) {
             if (bgmRef.current && bgmRef.current.src.indexOf(trackName) === -1) {
                 bgmRef.current.pause();
                 bgmRef.current = null;
             }
        } else {
             await stopBgm();
        }

        if (Capacitor.isNativePlatform()) {
            try {
                await NativeAudio.setVolume({ assetId: trackName, volume: 0.8 });
                await NativeAudio.play({ assetId: trackName });
                await NativeAudio.loop({ assetId: trackName });
            } catch(e) { 
                console.log("BGM Play/Loop Error:", e);
            }
        } else {
            if (!bgmRef.current) {
                const audio = new Audio(`/sounds/${trackName}.mp3`);
                audio.loop = true;
                audio.volume = 0.5;
                bgmRef.current = audio;
            }
            
            // Try to play
            bgmRef.current.play().catch(e => {
                console.log("Web BGM play failed (Autoplay blocked?):", e);
                // We rely on handlePointerDown or global click listener to resume
            });
        }
    };
    
    // --- Helper to resume Audio Context on Web ---
    const checkWebAudioAutoplay = () => {
        if (!Capacitor.isNativePlatform()) {
            // 1. Resume Web Audio Context (For SFX)
            const ctx = audioContextRef.current;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(e => console.log("AudioContext resume failed", e));
            }
            
            // 2. Resume BGM (HTML5 Audio)
            if (isBgmOn && bgmRef.current && bgmRef.current.paused) {
                bgmRef.current.play().catch(e => console.log("Still blocked", e));
            }
        }
    };

    const toggleSound = () => {
        setIsSoundOn(prev => {
            const newState = !prev;
            localStorage.setItem('soundOn', JSON.stringify(newState));
            return newState;
        });
    };

    const toggleBgm = () => {
        setIsBgmOn(prev => {
            const newState = !prev;
            localStorage.setItem('bgmOn', JSON.stringify(newState));
            return newState;
        });
    };

    const playToolSound = async (tool) => {
        if (!isSoundOn) return;
        
        // [Performance] Sound Throttling (Max 12 sounds/sec)
        const now = Date.now();
        if (now - lastSoundTime.current < 80) return;
        lastSoundTime.current = now;

        const soundName = tool || 'fist';

        if (Capacitor.isNativePlatform()) {
            try {
                await NativeAudio.play({ assetId: soundName });
            } catch (e) {
                // Ignore native play errors
            }
        } else {
            // Web Audio API with Fallback
            const ctx = audioContextRef.current;
            const buffer = webAudioRefs.current[soundName];
            let played = false;

            if (ctx && buffer && ctx.state !== 'closed') {
                if (ctx.state === 'suspended') ctx.resume().catch(() => {});
                try {
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    source.start(0);
                    played = true;
                } catch(e) {
                    // Ignore Web Audio errors
                }
            }
            
            if (!played) {
                // Fallback to HTML5 Audio
                try {
                    let audio = html5AudioRefs.current[soundName];
                    if (!audio) {
                        audio = new Audio(`/sounds/${soundName}.mp3`);
                        html5AudioRefs.current[soundName] = audio;
                    }
                    audio.currentTime = 0;
                    audio.play().catch(() => {}); // Suppress NotSupportedError/Interrupted errors
                } catch (e) {
                    // Ignore instantiation errors
                }
            }
        }
    };

    // --- Vibration State (Persisted in localStorage) ---
    const [isVibrationOn, setIsVibrationOn] = useState(() => {
        const saved = localStorage.getItem('vibrationOn');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const toggleVibration = () => {
        setIsVibrationOn(prev => {
            const newState = !prev;
            localStorage.setItem('vibrationOn', JSON.stringify(newState));
            if (newState) {
                // Test vibration when turning on
                Haptics.impact({ style: ImpactStyle.Light });
            }
            return newState;
        });
    };

    const triggerVibration = async () => {
        if (isVibrationOn) {
            try {
                await Haptics.impact({ style: ImpactStyle.Medium });
            } catch (e) {
                // Ignore errors (e.g., if running on web without support)
            }
        }
    };

    // Play Win Sound
    useEffect(() => {
        if (isMyWin) {
            stopBgm();
            playToolSound('win');
        }
    }, [isMyWin]);

    // Track if I was a player in this round
    useEffect(() => {
        // If HP is full (New Round), reset
        if (serverState?.hp === serverState?.maxHp) {
             wasActivePlayer.current = false;
             setShowWinnerClaiming(false);
             setLocalLoserTimer(null);
        }
        // If I am a player while game is playing, mark as active
        if (connected && !isSpectating && hp > 0) {
            wasActivePlayer.current = true;
        }
    }, [serverState, isSpectating, hp, connected]);

    // Loser Timer Logic
    useEffect(() => {
        // [Fix B] Don't play lose sound or start loser timer if winner or submitting
        if (winnerLocked === true || isSubmitting || emailSubmitted) return;

        if (serverState?.status === 'WINNER_CHECK' && serverState?.winningClientId !== clientId && wasActivePlayer.current) {
            if (localLoserTimer === null) {
                setLocalLoserTimer(7); // Start 7s countdown
                stopBgm(); // Ensure BGM stops
                playToolSound('lose');
            } else if (localLoserTimer > 0) {
                const timer = setTimeout(() => setLocalLoserTimer(prev => prev - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                // Timer finished
                setShowWinnerClaiming(true);
            }
        } else if (serverState?.status === 'WINNER_CHECK' && !wasActivePlayer.current) {
            // Pure spectator sees claiming screen immediately
            setShowWinnerClaiming(true);
        }
    }, [serverState, clientId, localLoserTimer, wasActivePlayer, winnerLocked, isSubmitting, emailSubmitted]);

    // Helper to format seconds to mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handlePointerDown = (e) => {
        // Only allow click if connected and playing
        if (!connected) return; 
        
        // [New] Block clicks for spectators (including queue)
        if (isPassiveMode) return;

        // 0. Blur settings
        setIsSettingsFocused(false);

        // 1. Vibration Throttle
        const now = Date.now();
        if (now - lastVibTime.current > 80) {
            triggerVibration();
            lastVibTime.current = now;
        }
        
        // --- Combo Logic & Sound ---
        const nextCombo = combo + 1;
        setCombo(prev => {
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            comboTimerRef.current = setTimeout(() => setCombo(0), 1200); 
            return prev + 1;
        });

        // Sound: Only at 10, 100, 1000 or throttle
        if ([10, 100, 1000].includes(nextCombo)) {
            playToolSound('many_hit');
        } else {
            playToolSound(currentTool);
        }

        checkWebAudioAutoplay(); // Try to resume BGM if paused

        // 1. Trigger Game Logic (Batched UI)
        handleClick();
        
        // 1-1. [Performance] Optimized Shaking (Web Animations API)
        if (eggRef.current) {
            // No force reflow. Just fire and forget animation.
            // If already animating, it will either restart or overlay.
            // Using a simple keyframe animation is compositor-friendly.
            eggRef.current.animate([
                { transform: 'translate(0, 0) rotate(0deg)' },
                { transform: 'translate(-3px, 2px) rotate(-2deg)', offset: 0.2 },
                { transform: 'translate(3px, -2px) rotate(2deg)', offset: 0.4 },
                { transform: 'translate(-3px, -2px) rotate(-2deg)', offset: 0.6 },
                { transform: 'translate(3px, 2px) rotate(2deg)', offset: 0.8 },
                { transform: 'translate(0, 0) rotate(0deg)' }
            ], {
                duration: 150,
                easing: 'linear'
            });
        }
        
        // 2. Visuals: Calculate position
        // Use cached rect or fallback to offset if available
        let x = 100; // Center fallback
        let y = 100;
        
        // Using cached rect is safest for absolute positioning mapping
        const rect = stageRectRef.current;
        if (rect.width > 0) {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        } else if (e.nativeEvent && e.nativeEvent.offsetX) {
             // Fallback to native offset (might be relative to svg child)
             x = e.nativeEvent.offsetX;
             y = e.nativeEvent.offsetY;
        }
        
        // Determine scale and color based on damage (clickPower)
        let scale = 1;
        let toolSize = 30; // px
        let dmgColor = '#ff6f61'; // Default (Low)
        
        if (clickPower >= 10000) dmgColor = '#ffd700'; // Gold
        else if (clickPower >= 1000) dmgColor = '#9c27b0'; // Purple
        else if (clickPower >= 100) dmgColor = '#e91e63'; // Pink
        else if (clickPower >= 10) dmgColor = '#ff9800'; // Orange

        switch(currentTool) {
            case 'hammer': scale = 1.2; toolSize = 40; break;
            case 'pickaxe': scale = 1.5; toolSize = 50; break;
            case 'dynamite': scale = 2.0; toolSize = 70; break;
            case 'drill': scale = 2.5; toolSize = 90; break;
            case 'excavator': scale = 3.0; toolSize = 120; break;
            case 'laser': scale = 4.5; toolSize = 160; break;
            case 'nuke': scale = 7.0; toolSize = 200; break;
            default: scale = 1; toolSize = 30;
        }

        // Random Cute Particle
        const randomParticle = CUTE_PARTICLES[Math.floor(Math.random() * CUTE_PARTICLES.length)];
        
        // Push effects to Canvas Queue (No State Update!)
        const nowEffectTime = 800; // ms
        
        // 1. Damage Number
        effectsRef.current.push({
            type: 'text',
            text: `-${clickPower.toLocaleString()}`,
            x: x + (Math.random() * 20 - 10),
            y: y - 40,
            val: clickPower,
            color: dmgColor,
            size: 24 * scale,
            life: nowEffectTime,
            vy: 2, // Velocity Y
            rotation: (Math.random() * 30 - 15)
        });

        // 2. Tool Icon
        effectsRef.current.push({
            type: 'emoji',
            text: TOOL_EMOJIS[currentTool] || '👊',
            x: x,
            y: y,
            size: toolSize,
            life: 500, // Shorter life
            vy: 0
        });

        // 3. Particle
        if (Math.random() > 0.5) { // 50% chance to reduce load
            effectsRef.current.push({
                type: 'emoji',
                text: randomParticle,
                x: x + (Math.random() * 60 - 30),
                y: y + (Math.random() * 60 - 30),
                size: 20 * (0.8 + Math.random()),
                life: 600,
                vy: 3 // Float up faster
            });
        }

        // 4. Combo Text (Canvas)
        if (nextCombo === 10 || nextCombo === 100 || nextCombo === 1000) {
             let comboText = `${nextCombo} COMBO!`;
             let cColor = '#ff4081';
             if (nextCombo === 100) { comboText = "100 COMBO!!"; cColor = '#00e676'; }
             if (nextCombo === 1000) { comboText = "1000 COMBO!!!"; cColor = '#ffea00'; }
             
             if (onComboReward && nextCombo >= 100) onComboReward(nextCombo === 100 ? 50 : 700, `${comboText} +${nextCombo === 100 ? 50 : 700}P`);

             effectsRef.current.push({
                type: 'text',
                text: comboText,
                x: x,
                y: y - 100,
                val: 0,
                color: cColor,
                size: 40,
                life: 1000,
                vy: 1,
                rotation: 0
            });
        }
    };

    return (
        <main className="game-area">
            {/* Queue Overlay Removed for Spectator Mode */}

            {/* Notification removed (moved to App.jsx) */}

            {/* Minimal Settings Toggles (Text + Pill Switches) */}
            <div 
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    zIndex: 100,
                    padding: '12px',
                    borderRadius: '18px',
                    background: isSettingsFocused ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.15)',
                    border: isSettingsFocused ? '2px solid #fff' : '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: isSettingsFocused ? '0 10px 25px rgba(0,0,0,0.1)' : 'none',
                    backdropFilter: isSettingsFocused ? 'blur(10px)' : 'none',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    opacity: isSettingsFocused ? 1 : 0.25, 
                    cursor: 'pointer',
                    minWidth: '110px'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsFocused(true);
                }}
            >
                {/* Switch Item Helper */}
                {[
                    { label: lang.soundOn || 'SFX', active: isSoundOn, toggle: toggleSound },
                    { label: lang.bgmOn || 'BGM', active: isBgmOn, toggle: toggleBgm },
                    { label: lang.vibrationOn || 'Vib', active: isVibrationOn, toggle: toggleVibration }
                ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5d4037' }}>{item.label}</span>
                        <div 
                            onClick={(e) => { e.stopPropagation(); item.toggle(); }}
                            style={{
                                width: '36px',
                                height: '20px',
                                background: item.active ? '#ff9a9e' : '#bbb',
                                borderRadius: '20px',
                                position: 'relative',
                                transition: 'background 0.3s',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: item.active ? '18px' : '2px',
                                transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Debug Console Removed */}
            
            <div className="header-glow">
                {/* 에그퐁 제목 제거 (상단 바와 중복) */}
                <p className="subtitle">{lang.subtitle}</p>
                {combo > 5 && (
                    <div style={{ 
                        color: '#ff4081', 
                        fontWeight: '900', 
                        fontSize: '1.5rem', 
                        animation: 'bounceIn 0.3s',
                        marginTop: '5px'
                    }}>
                        🔥 {combo} COMBO! 🔥
                    </div>
                )}
            </div>

            <div 
                className="egg-stage" 
                ref={stageRef}
                style={{ position: 'relative' }} // Ensure canvas is relative to this
                /* onPointerDown removed here for precise hitbox */
            >
                {/* [Performance] Effects Canvas Overlay */}
                <canvas ref={canvasRef} />

                <CrackedEgg 
                    ref={eggRef}
                    hp={hp} 
                    maxHp={1000000} 
                    // isShaking removed (handled via ref)
                    tool={currentTool} 
                    onEggClick={handlePointerDown} 
                />

                {(showGuide || isPassiveMode) && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        padding: '15px 25px',
                        borderRadius: '20px',
                        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
                        zIndex: 100,
                        fontWeight: 'bold',
                        color: '#ff6f61',
                        pointerEvents: 'none',
                        animation: 'pulse 1s infinite',
                        border: '2px solid #ffb6c1',
                        whiteSpace: 'nowrap'
                    }}>
                        {guideText}
                    </div>
                )}
                
                {/* [Performance] DOM Click Effects Removed (Replaced by Canvas) */}

            {/* Unified Modal Logic */}
            {(isWinnerCheck || isFinished || showRetry) && (
                <div 
                    className="modal-overlay" 
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'auto' // Block clicks to background
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div 
                        className="modal-content glass" 
                        style={{ 
                            maxWidth: '320px', // Reduced for mobile
                            width: '90%', 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', 
                            padding: '20px', // Reduced padding
                            maxHeight: '90vh', overflowY: 'auto' // Handle small screens
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent closing/bubbling
                    >
                        
                        {/* 2. WINNER CHECK State */}
                        {isWinnerCheck && !isFinished && !showRetry && (
                             winnerLocked === true ? (
                                <>
                                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎉</div>
                                    <h2 style={{ color: '#ff6f61', fontSize: '1.8rem', marginBottom: '10px' }}>{lang.congratsTitle}</h2>
                                    <p style={{ color: '#5d4037', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '5px' }}>
                                        {serverState?.prize || serverState?.announcement}
                                    </p>
                                    
                                    {prizeSecretImageUrl && (
                                        <div style={{ margin: '15px 0', border: '2px dashed #ffb6c1', padding: '10px', borderRadius: '10px' }}>
                                            <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>Secret Code / Image</p>
                                            <img 
                                                src={prizeSecretImageUrl} 
                                                alt="Prize Secret" 
                                                style={{ maxWidth: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                                                onError={() => console.log('winner image load fail', prizeSecretImageUrl)}
                                            />
                                        </div>
                                    )}

                                    {!emailSubmitted ? (
                                        <>
                                            {/* If Prize Image exists, show Save Button instead of Email Input */}
                                            {prizeSecretImageUrl ? (
                                                <button 
                                                    onClick={handleSavePrize}
                                                    disabled={isSubmitting}
                                                    style={{ 
                                                        background: isSubmitting ? '#ccc' : '#ff4081', 
                                                        color: '#fff', border: 'none', 
                                                        padding: '15px 40px', borderRadius: '30px', 
                                                        fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
                                                        width: '100%', boxShadow: '0 5px 15px rgba(255, 64, 129, 0.4)',
                                                        animation: 'pulse 1s infinite'
                                                    }}
                                                >
                                                    {isSubmitting ? "Processing..." : lang.savePrizeBtn}
                                                </button>
                                            ) : (
                                                /* Fallback to Email Input if no image (or physical prize) */
                                                <>
                                                    <p style={{ fontSize: '0.95rem', color: '#8d6e63', marginBottom: '20px' }}>
                                                        {lang.enterEmailDesc} <br/>
                                                        <span style={{ fontSize: '0.8rem', color: '#e57373' }}>
                                                            ({winnerCountdown}초 내 미입력 시 취소됨)
                                                        </span>
                                                    </p>
                                                    <input 
                                                        type="email" 
                                                        placeholder="example@email.com" 
                                                        value={winnerEmail}
                                                        onChange={(e) => setWinnerEmail(e.target.value)}
                                                        style={{ 
                                                            padding: '12px', width: '80%', borderRadius: '8px', 
                                                            border: '1px solid #ccc', marginBottom: '15px', fontSize: '1rem' 
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={() => handleSubmit()} 
                                                        disabled={isSubmitting}
                                                        style={{ 
                                                            background: isSubmitting ? '#ccc' : '#4caf50', 
                                                            color: '#fff', border: 'none', 
                                                            padding: '12px 30px', borderRadius: '25px', 
                                                            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
                                                            width: '100%'
                                                        }}
                                                    >
                                                        {isSubmitting ? "전송 중..." : (lang.submitBtn || "상품 수령하기")}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '3rem', margin: '20px 0' }}>✅</div>
                                            <p style={{ fontSize: '1.1rem', color: '#2e7d32', fontWeight: 'bold' }}>
                                                {prizeSecretImageUrl ? lang.prizeReceivedBtn : "전송 완료! 이메일을 확인하세요."}
                                            </p>
                                            <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '10px' }}>
                                                {exitCountdown}초 후 종료됩니다.
                                            </p>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>⏳</div>
                                    <h2 style={{ color: '#5d4037', marginBottom: '10px' }}>승자 확인 중...</h2>
                                    <p style={{ color: '#8d6e63', marginBottom: '20px' }}>
                                        다른 플레이어가 알을 깼습니다.<br/>
                                        승자가 정보를 입력하는 중입니다.
                                    </p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6f61' }}>
                                        {loserCountdown}
                                    </p>
                                </>
                            )
                        )}

                        {/* 1. FINISHED State (Round Over, Waiting for Admin) */}
                        {isFinished && (
                            <>
                                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🏁</div>
                                <h2 style={{ color: '#ff6f61', fontSize: '2rem', marginBottom: '10px' }}>{lang.roundOverTitle}</h2>
                                <p style={{ color: '#5d4037', fontSize: '1.1rem', marginBottom: '25px', lineHeight: '1.6' }}>
                                    {lang.roundOverDesc} <br/> (다음 라운드 준비 중)
                                </p>
                                <button onClick={handleRetry} style={{ background: '#ff6f61', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    {lang.retryBtn || "새로고침"}
                                </button>
                            </>
                        )}

                        {/* 3. Retry / Spectating Mode */}
                        {showRetry && !isFinished && (
                            <>
                                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>👀</div>
                                <h2 style={{ color: '#5d4037', marginBottom: '10px' }}>관전 모드</h2>
                                <p style={{ marginBottom: '20px' }}>게임이 종료되었거나 이미 참여했습니다.</p>
                                <button onClick={handleRetry} style={{ background: '#ff6f61', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '25px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    {lang.retryBtn || "다시 접속하기"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            </div>

            <div className="hp-wrapper" style={{ position: 'relative', zIndex: 10 }}>
                <div className="hp-container">
                    <div className="hp-bar" style={{ width: `${(hp / 1000000) * 100}%` }}></div>
                </div>
                <div className="hp-text">{hp.toLocaleString()} HP</div>
            </div>

            {/* 오늘 상품 보러가기 버튼 (구 광고 버튼 위치) */}
            <a 
                href={serverState?.prizeUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { if(!serverState?.prizeUrl) { e.preventDefault(); alert("등록된 상품 링크가 없습니다."); } }}
                className="power-btn"
                style={{
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(45deg, #FF6F61, #FF9A9E)',
                    boxShadow: '0 6px 20px rgba(255, 111, 97, 0.4)',
                    border: 'none'
                }}
            >
                <span className="btn-title" style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900' }}>
                    🎁 오늘 상품 보러가기
                </span>
                <span className="btn-sub" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem' }}>
                    (클릭 시 해당 상품으로 이동)
                </span>
            </a>

            <div className="coupang-notice" style={{
                    fontSize: '8px', 
                    color: 'rgba(0,0,0,0.4)', 
                    textAlign: 'center', 
                    marginBottom: '15px',
                    marginTop: '-10px',
                    pointerEvents: 'none'
                }}>
                    이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다
                </div>
            
          <div className="status-row glass">
            <div>{lang.myPoint}: <span>{myPoints}</span></div>
            <div>{lang.atk}: <span>x{clickPower}</span></div>
          </div>

          <div style={{
            marginTop: '20px',
            width: '100%',
            textAlign: 'center',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
              <p key={currentFactIndex} style={{ // Key to trigger animation on change
                fontSize: '0.9rem',
                color: '#8d6e63',
                fontWeight: 'bold',
                background: 'rgba(255, 255, 255, 0.6)',
                padding: '8px 20px',
                borderRadius: '20px',
                border: '1px dashed #d7ccc8',
                animation: 'fadeIn 0.5s',
                maxWidth: '90%',
                wordBreak: 'keep-all'
              }}>
                🥚 {lang.eggFacts ? lang.eggFacts[currentFactIndex] : "Loading..."}
              </p>
          </div>
        </main>
    );
};

export default GameArea;
import React, { useState, useRef, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { NativeAudio } from '@capacitor-community/native-audio';
import { Capacitor } from '@capacitor/core';

// --- 깨지는 알 SVG 컴포넌트 ---
const CrackedEgg = ({ hp, maxHp, isShaking, tool, onEggClick }) => {
    const percentage = (hp / maxHp) * 100;

    // 체력에 따른 금(Crack) 단계 결정
    const showCrack1 = percentage < 80;
    const showCrack2 = percentage < 70;
    const showCrack3 = percentage < 20;
    const isCritical = percentage < 20 && hp > 0; // Critical Phase (Dark Mode)

    // 표정 결정 로직
    let eyeLeft = <circle cx="75" cy="110" r="8" fill="#5d4037" />;
    let eyeRight = <circle cx="125" cy="110" r="8" fill="#5d4037" />;
    let mouth = <path d="M90 135 Q100 145 110 135" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />; // Smile
    let blush = (
        <>
            <ellipse cx="65" cy="125" rx="8" ry="4" fill="#ffb6c1" opacity="0.6" />
            <ellipse cx="135" cy="125" rx="8" ry="4" fill="#ffb6c1" opacity="0.6" />
        </>
    );

    if (hp <= 0) {
        // 깨짐 (X X 눈)
        eyeLeft = <path d="M68 103 L82 117 M82 103 L68 117" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        eyeRight = <path d="M118 103 L132 117 M132 103 L118 117" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        mouth = <circle cx="100" cy="140" r="10" fill="none" stroke="#5d4037" strokeWidth="3" />; // O 입
    } else if (isCritical) {
        // 폭주/위기 상태 (붉은 눈, 뾰족한 이빨)
        eyeLeft = (
            <g>
                 <path d="M65 105 L85 115 L65 120" fill="red" /> {/* Sharp Red Eye */}
                 <circle cx="72" cy="112" r="2" fill="#fff" />
            </g>
        );
        eyeRight = (
            <g>
                 <path d="M135 105 L115 115 L135 120" fill="red" /> {/* Sharp Red Eye */}
                 <circle cx="128" cy="112" r="2" fill="#fff" />
            </g>
        );
        mouth = (
             <path d="M85 140 L90 130 L95 140 L100 130 L105 140 L110 130 L115 140" fill="none" stroke="#5d4037" strokeWidth="2" /> // Jagged teeth
        );
        blush = null; // No blush when angry
    } else if (isShaking) {
        // 아픔 (> < 눈)
        eyeLeft = <path d="M68 110 L75 117 L82 110" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        eyeRight = <path d="M118 110 L125 117 L132 110" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        mouth = <circle cx="100" cy="140" r="6" fill="#5d4037" />; // 'o' 입
    } else if (percentage < 70) { // Changed threshold for Sad face
        // 힘듦 (울상)
        eyeLeft = <path d="M68 115 Q75 105 82 115" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        eyeRight = <path d="M118 115 Q125 105 132 115" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        mouth = <path d="M90 145 Q100 135 110 145" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />; // Frown
        // 눈물
        blush = (
             <>
                <path d="M65 125 Q60 135 65 145" fill="#a1c4fd" />
                <path d="M135 125 Q140 135 135 145" fill="#a1c4fd" />
             </>
        );
    }

    return (
        <div className={`egg-svg-container ${isShaking ? 'shake' : ''} cursor-${tool}`}>
            <svg viewBox="0 0 200 250" className="egg-svg" style={{ overflow: 'visible' }}>
                <defs>
                    <radialGradient id="eggGradient" cx="40%" cy="30%" r="80%">
                        <stop offset="0%" stopColor={isCritical ? "#800000" : "#ffdde1"} /> {/* Dark Red when critical */}
                        <stop offset="100%" stopColor={isCritical ? "#200000" : "#ff9a9e"} />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {isCritical && (
                         <filter id="redGlow">
                            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="red" />
                         </filter>
                    )}
                </defs>

                {/* 1. 알 본체 - 여기에만 클릭 이벤트를 줍니다 (정밀 타격) */}
                <ellipse 
                    cx="100" cy="125" rx="80" ry="110" 
                    fill="url(#eggGradient)" 
                    filter={isCritical ? "url(#redGlow)" : "url(#glow)"} 
                    onPointerDown={onEggClick}
                    style={{ cursor: 'pointer', touchAction: 'none' }} 
                />
                
                {/* 2. 얼굴 (Face) - 얼굴을 눌러도 클릭되도록 */}
                <g className="egg-face" style={{ transition: 'all 0.2s', pointerEvents: 'none' }}>
                    {blush}
                    {eyeLeft}
                    {eyeRight}
                    {mouth}
                </g>

                {/* 3. 금(Cracks) - 클릭 통과 (pointerEvents: none 기본값) */}
                {showCrack1 && (
                    <path d="M100 30 L110 50 L90 60 L105 80" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" opacity="0.6" style={{ pointerEvents: 'none' }} />
                )}
                {showCrack2 && (
                    <path d="M50 100 L80 110 L60 130 L90 140 L70 160" fill="none" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" opacity="0.7" style={{ pointerEvents: 'none' }} />
                )}
                {showCrack3 && (
                    <path d="M130 90 L110 110 L140 130 L120 160 L150 180" fill="none" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" opacity="0.8" style={{ pointerEvents: 'none' }} />
                )}
                {/* HP 0일 때 (완전 깨짐) */}
                {hp <= 0 && (
                    <path d="M20 125 L180 125" fill="none" stroke="#5d4037" strokeWidth="10" style={{ pointerEvents: 'none' }} />
                )}
            </svg>
        </div>
    );
};

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

const GameArea = ({
    lang, hp, isShaking, clickPower, myPoints, isWinner, emailSubmitted, winnerEmail,
    setWinnerEmail, submitWinnerEmail, handleClick, currentTool, buyItem, notification, handleAdWatch, showGuide,
    winnerCountdown, exitCountdown, loserCountdown, showLoserMessage, isSpectating, showRetry, handleRetry,
    clientId, serverState, API_URL, myCountry, winningToken, connected
}) => {
    const [clickEffects, setClickEffects] = useState([]);
    const stageRef = useRef(null); // 스테이지 좌표 기준점
    const wasActivePlayer = useRef(false);
    const [localLoserTimer, setLocalLoserTimer] = useState(null);
    const [showWinnerClaiming, setShowWinnerClaiming] = useState(false);
    
    // Settings Toggle State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
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

    // BGM & SFX Refs
    const webAudioRefs = useRef({});
    const bgmRef = useRef(null); // For Web Audio BGM
    const currentPhaseRef = useRef('none');

    useEffect(() => {
        const sounds = [
            'fist', 'hammer', 'pickaxe', 'dynamite', 'drill', 'excavator', 'laser', 'nuke', 
            'buy', 'win'
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
                // Web: Preload using HTML5 Audio
                sounds.forEach(sound => {
                    const audio = new Audio(`/sounds/${sound}.mp3`);
                    audio.volume = 0.6;
                    webAudioRefs.current[sound] = audio;
                });
                setAudioLoaded(true);
            }
        };

        loadSounds();

        return () => {
            if (Capacitor.isNativePlatform()) {
                sounds.forEach(sound => NativeAudio.unload({ assetId: sound }).catch(() => {}));
                ['bgm_peace', 'bgm_tense', 'bgm_danger'].forEach(bgm => NativeAudio.unload({ assetId: bgm }).catch(() => {}));
            }
            if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current = null; }
        };
    }, []);

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
        if (!audioLoaded) return; // Wait for load

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

        if (newPhase !== currentPhaseRef.current) {
            playBgm(newPhase);
            currentPhaseRef.current = newPhase;
        }
    }, [hp, isBgmOn, audioLoaded]);

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
                bgmRef.current = null;
            }
        }
    };

    const playBgm = async (phase) => {
        const trackName = `bgm_${phase}`;
        
        // Stop others strictly before starting new one
        await stopBgm();

        if (Capacitor.isNativePlatform()) {
            try {
                // 1. Set Volume
                await NativeAudio.setVolume({ assetId: trackName, volume: 0.8 });
                
                // 2. Play first (To wake up the audio channel reliability)
                await NativeAudio.play({ assetId: trackName });
                
                // 3. Loop (For continuous play)
                await NativeAudio.loop({ assetId: trackName });
                
            } catch(e) { 
                console.log("BGM Play/Loop Error:", e);
            }
        } else {
            const audio = new Audio(`/sounds/${trackName}.mp3`);
            audio.loop = true;
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Web BGM play failed", e));
            bgmRef.current = audio;
        }
    };
    
    // --- Helper to resume Audio Context on Web ---
    const checkWebAudioAutoplay = () => {
        if (!Capacitor.isNativePlatform() && isBgmOn && bgmRef.current && bgmRef.current.paused) {
            bgmRef.current.play().catch(e => console.log("Still blocked", e));
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
        const soundName = tool || 'fist';

        if (Capacitor.isNativePlatform()) {
            try {
                await NativeAudio.play({ assetId: soundName });
            } catch (e) {
                // console.error("Native play error", e);
            }
        } else {
            const audio = webAudioRefs.current[soundName];
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(e => console.log('Web Audio play failed', e));
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
        if (serverState?.status === 'WINNER_CHECK' && serverState?.winningClientId !== clientId && wasActivePlayer.current) {
            if (localLoserTimer === null) {
                setLocalLoserTimer(7); // Start 7s countdown
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
    }, [serverState, clientId, localLoserTimer, wasActivePlayer]);

    // Helper to format seconds to mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handlePointerDown = (e) => {
        // Only allow click if connected and playing
        if (!connected) return; 

        // 0. Trigger Vibration & Sound & Check Autoplay
        checkWebAudioAutoplay();
        triggerVibration();
        playToolSound(currentTool);

        // 1. Trigger Game Logic
        handleClick();

        // 2. Visuals: Calculate position relative to the stage
        if (!stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Determine scale based on tool
        let scale = 1;
        let toolSize = 2; 
        switch(currentTool) {
            case 'hammer': scale = 1.2; toolSize = 2.5; break;
            case 'pickaxe': scale = 1.5; toolSize = 3.5; break;
            case 'dynamite': scale = 2.0; toolSize = 5.0; break;
            case 'drill': scale = 2.5; toolSize = 7.0; break;
            case 'excavator': scale = 3.0; toolSize = 10.0; break;
            case 'laser': scale = 4.0; toolSize = 14.0; break;
            case 'nuke': scale = 6.0; toolSize = 20.0; break;
            default: scale = 1; toolSize = 2;
        }

        // Random Cute Particle
        const randomParticle = CUTE_PARTICLES[Math.floor(Math.random() * CUTE_PARTICLES.length)];

        const newEffect = { 
            id: Date.now() + Math.random(), 
            x, 
            y, 
            val: clickPower,
            scale,
            toolSize,
            toolEmoji: TOOL_EMOJIS[currentTool] || '👊',
            particle: randomParticle
        };

        // 3. Add to state (Limit concurrent particles for optimization)
        setClickEffects(prev => {
            const next = [...prev, newEffect];
            if (next.length > 20) return next.slice(next.length - 20); // Keep max 20
            return next;
        });

        // 4. Cleanup after animation (800ms matches CSS)
        setTimeout(() => {
            setClickEffects(prev => prev.filter(item => item.id !== newEffect.id));
        }, 800);
    };
    
    // --- Render Conditions ---
    const isMyWin = serverState?.winningClientId === clientId;
    const isWinnerCheck = serverState?.status === 'WINNER_CHECK';
    const isFinished = serverState?.status === 'FINISHED';
    
    // Queue Display (If connected but spectating due to full room)
    const isInQueue = connected && isSpectating && !isWinnerCheck && !isFinished;

    return (
        <main className="game-area">
            {/* Queue Overlay */}
            {isInQueue && (
                 <div className="modal-overlay">
                    <div className="modal-content glass" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
                        <h1 style={{ color: '#ff6f61', marginBottom: '10px' }}>대기열 대기 중...</h1>
                        <p style={{ fontSize: '1.2rem' }}>잠시만 기다려주세요.</p>
                        <div className="spinner" style={{
                            width: '30px', height: '30px', border: '4px solid #ffe4e1', borderTop: '4px solid #ff6f61', 
                            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '20px auto'
                        }}></div>
                    </div>
                </div>
            )}
            {notification && (
                <div style={{
                    position: 'absolute',
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
                    zIndex: 200,
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

            {/* Gear Icon (Toggle Settings) */}
            <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.8)',
                    background: 'rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(5px)',
                    color: '#5d4037',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    zIndex: 51,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s'
                }}
            >
                ⚙️
            </button>

            {/* Settings Box (Conditionally Rendered) */}
            {isSettingsOpen && (
                <div style={{
                    position: 'absolute',
                    top: '75px', // Below the gear icon
                    right: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    zIndex: 50,
                    background: 'rgba(255, 255, 255, 0.85)',
                    padding: '20px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.9)',
                    minWidth: '150px',
                    animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {/* Sound Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#5d4037' }}>효과음</span>
                        <div 
                            onClick={toggleSound}
                            style={{
                                width: '50px',
                                height: '28px',
                                background: isSoundOn ? '#ff9a9e' : '#e0e0e0',
                                borderRadius: '30px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isSoundOn ? '24px' : '2px',
                                transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>

                    {/* BGM Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#5d4037' }}>배경음</span>
                        <div 
                            onClick={toggleBgm}
                            style={{
                                width: '50px',
                                height: '28px',
                                background: isBgmOn ? '#ff9a9e' : '#e0e0e0',
                                borderRadius: '30px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isBgmOn ? '24px' : '2px',
                                transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>

                    {/* Vibration Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#5d4037' }}>진동</span>
                        <div 
                            onClick={toggleVibration}
                            style={{
                                width: '50px',
                                height: '28px',
                                background: isVibrationOn ? '#ff9a9e' : '#e0e0e0',
                                borderRadius: '30px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isVibrationOn ? '24px' : '2px',
                                transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Debug Console Removed */}
            
            <div className="header-glow">
                <h1 className="title">{lang.title}</h1>
                <p className="subtitle">{lang.subtitle}</p>
            </div>

            <div 
                className="egg-stage" 
                ref={stageRef}
                /* onPointerDown removed here for precise hitbox */
            >
                <CrackedEgg 
                    hp={hp} 
                    maxHp={1000000} 
                    isShaking={isShaking} 
                    tool={currentTool} 
                    onEggClick={handlePointerDown} 
                />

                {showGuide && (
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
                        border: '2px solid #ffb6c1'
                    }}>
                        가운데 계란을 👈  터치하세요!
                    </div>
                )}
                
                {/* Render Multiple Click Effects (Damage + Tool Icon + Cute Particle) */}
                {clickEffects.map(effect => (
                    <React.Fragment key={effect.id}>
                        {/* Damage Number */}
                        <span 
                            className="damage-float"
                            style={{ 
                                left: effect.x, 
                                top: effect.y - 50,
                                fontSize: `${1.8 * effect.scale}rem`,
                                fontWeight: '900',
                                color: '#ff6f61',
                                WebkitTextStroke: '2px #fff',
                                pointerEvents: 'none',
                                zIndex: 12,
                                transform: `rotate(${Math.random() * 20 - 10}deg)`
                            }}
                        >
                            -{effect.val}
                        </span>
                        
                        {/* Tool Icon */}
                        <span 
                            className="tool-float"
                            style={{ 
                                left: effect.x, 
                                top: effect.y,
                                fontSize: `${effect.toolSize}rem`,
                                position: 'absolute',
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'none',
                                zIndex: 11,
                                animation: 'toolPop 0.5s ease-out forwards'
                            }}
                        >
                            {effect.toolEmoji}
                        </span>

                        {/* Extra Cute Particle */}
                        <span 
                            className="particle-float"
                            style={{ 
                                left: effect.x + (Math.random() * 40 - 20), 
                                top: effect.y + (Math.random() * 40 - 20),
                                fontSize: `${1.5 + Math.random()}rem`,
                                position: 'absolute',
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'none',
                                zIndex: 10,
                                animation: 'particlePop 0.8s ease-out forwards'
                            }}
                        >
                            {effect.particle}
                        </span>
                    </React.Fragment>
                ))}

            {/* Unified Modal Logic */}
            {(isWinnerCheck || isFinished || showRetry) && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '500px', width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px' }}>
                        
                        {/* 1. FINISHED State (Round Over, Waiting for Admin) */}
                        {isFinished && (
                            <>
                                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🏁</div>
                                <h2 style={{ color: '#ff6f61', fontSize: '2rem', marginBottom: '10px' }}>{lang.roundOverTitle}</h2>
                                <p style={{ color: '#5d4037', fontSize: '1.1rem', marginBottom: '25px', lineHeight: '1.6' }}>
                                    {lang.roundOverDesc} <br/> (다음 라운드 준비 중)
                                </p>
                            </>
                        )}

                        {/* 2. WINNER CHECK State */}
                        {isWinnerCheck && (
                            <>
                                {isMyWin ? (
                                    // A. I AM THE WINNER
                                    <>
                                        <h2 style={{ color: '#ff6f61', fontSize: '2rem', marginBottom: '10px' }}>{lang.modalTitle}</h2>
                                        <p style={{ fontSize: '1.1rem', lineHeight: '1.5', marginBottom: '20px' }}>{lang.modalDesc}</p>
                                        
                                        <div style={{ background: '#fff0f5', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '2px solid #ffb6c1', width: '100%' }}>
                                            <p style={{ color: '#d32f2f', fontWeight: 'bold', marginBottom: '5px' }}>⚠️ {lang.winnerTimerWarning}</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#d32f2f' }}>
                                                {lang.timeLeft}: {formatTime(winnerCountdown)}
                                            </p>
                                        </div>

                                        {!emailSubmitted ? (
                                            <>
                                                <div style={{ background: 'rgba(255, 182, 193, 0.2)', padding: '20px', borderRadius: '15px', marginBottom: '20px', width: '100%' }}>
                                                    <p style={{ margin: '0 0 10px 0', color: '#ff6f61', fontWeight: 'bold' }}>{lang.modalPrize}</p>
                                                    <input 
                                                        type="email" 
                                                        placeholder="example@email.com"
                                                        value={winnerEmail}
                                                        onChange={(e) => setWinnerEmail(e.target.value)}
                                                        style={{ width: '90%', padding: '12px', borderRadius: '10px', border: '2px solid #ffe4e1', background: '#fff', color: '#5d4037', textAlign: 'center', fontSize: '1rem' }}
                                                    />
                                                </div>
                                                <button className="send-btn" onClick={submitWinnerEmail} style={{ fontSize: '1.1rem', padding: '12px 40px' }}>
                                                    {lang.send}
                                                </button>
                                            </>
                                        ) : (
                                            <h2 style={{ color: '#4CAF50', marginTop: '20px' }}>✅ {lang.sent}</h2>
                                        )}
                                    </>
                                ) : (
                                    // B. I AM NOT THE WINNER (Loser or Spectator)
                                    <>
                                        {(!showWinnerClaiming && localLoserTimer !== null) ? (
                                            // Loser Timer Phase (7s)
                                            <>
                                                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>😢</div>
                                                <h2 style={{ color: '#5d4037', marginBottom: '15px' }}>
                                                    {lang.loserMsg?.split('.')[0] || "아쉽게도 실패했습니다."} 
                                                </h2>
                                                <p style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6f61'}}>
                                                    {localLoserTimer}초 후 대기열로 이동합니다.
                                                </p>
                                            </>
                                        ) : (
                                            // Winner Claiming Phase (Waiting)
                                            <>
                                                 <div className="spinner" style={{
                                                    width: '40px', height: '40px', border: '5px solid #ffe4e1', borderTop: '5px solid #ff6f61', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px'
                                                }}></div>
                                                <h2>🏆 승자가 상품을 수령하고 있습니다...</h2>
                                                <p>잠시만 기다려주세요.</p>
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
            </div>

            <div className="hp-wrapper">
                <div className="hp-container">
                    <div className="hp-bar" style={{ width: `${(hp / 1000000) * 100}%` }}></div>
                </div>
                <div className="hp-text">{hp.toLocaleString()} HP</div>
            </div>

            <button className="power-btn" onClick={handleAdWatch}>
                <span className="btn-title">{lang.adWatchBtn}</span>
                <span className="btn-sub">{lang.adReward}</span>
            </button>

            <div style={{
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

          <p style={{
            marginTop: '20px',
            fontSize: '1.1rem',
            color: '#ff4444',
            fontWeight: '900',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '10px 20px',
            borderRadius: '20px',
            border: '2px solid #ffcccc',
            boxShadow: '0 4px 10px rgba(255, 0, 0, 0.1)',
            cursor: 'pointer',
            animation: 'pulse 1.5s infinite'
          }} onClick={() => document.querySelector('.mobile-toggle-btn[aria-label="Shop"]')?.click()}>
            🚨 {lang.shopGuide} 🚨
          </p>
        </main>
    );
};

export default GameArea;
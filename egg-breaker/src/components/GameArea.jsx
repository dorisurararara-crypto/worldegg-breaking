import React, { useState, useRef, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { NativeAudio } from '@capacitor-community/native-audio';
import { Capacitor } from '@capacitor/core';

// --- 깨지는 알 SVG 컴포넌트 ---
const CrackedEgg = React.memo(({ hp, maxHp, isShaking, tool, onEggClick }) => {
    const percentage = (hp / maxHp) * 100;

    // 10단계 파괴 로직 (10% 단위)
    const stage = Math.ceil(10 - (percentage / 10)); // 0 to 10
    
    const isCritical = percentage < 20 && hp > 0;
    const isBroken = hp <= 0;

    // 피격 시 무작위 표정 선택을 위한 값 (shaking일 때만 변경되도록 함)
    // 간단하게 hp 값을 시드로 활용하여 클릭할 때마다 바뀌게 설정
    const randomSeed = Math.floor((hp % 7)); 

    // 기본 표정 구성 요소
    let eyeLeft, eyeRight, mouth, blush, extra;

    // 기본 상태 설정 (평소)
    if (!isShaking) {
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
    } else {
        // --- 피격 중 (isShaking === true): 7가지 무작위 표정 ---
        switch(randomSeed) {
            case 0: // 기본 아픔 (> <)
                eyeLeft = <path d="M68 110 L75 117 L82 110" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
                eyeRight = <path d="M118 110 L125 117 L132 110" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
                mouth = <circle cx="100" cy="145" r="7" fill="#5d4037" />;
                break;
            case 1: // 당황 (O O)
                eyeLeft = <circle cx="75" cy="110" r="10" fill="none" stroke="#5d4037" strokeWidth="3" />;
                eyeRight = <circle cx="125" cy="110" r="10" fill="none" stroke="#5d4037" strokeWidth="3" />;
                mouth = <path d="M90 145 Q100 135 110 145" fill="none" stroke="#5d4037" strokeWidth="3" />;
                break;
            case 2: // 어지러움 (@ @)
                eyeLeft = <g><circle cx="75" cy="110" r="10" fill="none" stroke="#5d4037" strokeWidth="2"/><path d="M70 110 Q75 100 80 110 T70 110" fill="none" stroke="#5d4037" strokeWidth="1"/></g>;
                eyeRight = <g><circle cx="125" cy="110" r="10" fill="none" stroke="#5d4037" strokeWidth="2"/><path d="M120 110 Q125 100 130 110 T120 110" fill="none" stroke="#5d4037" strokeWidth="1"/></g>;
                mouth = <rect x="90" y="140" width="20" height="3" rx="1" fill="#5d4037" />;
                break;
            case 3: // 울먹 (ㅠ ㅠ)
                eyeLeft = <path d="M70 105 V120 M65 105 H75" fill="none" stroke="#5d4037" strokeWidth="3" />;
                eyeRight = <path d="M130 105 V120 M125 105 H135" fill="none" stroke="#5d4037" strokeWidth="3" />;
                mouth = <path d="M95 145 Q100 155 105 145" fill="none" stroke="#5d4037" strokeWidth="3" />;
                break;
            case 4: // 정신나감 (X O)
                eyeLeft = <path d="M68 103 L82 117 M82 103 L68 117" stroke="#5d4037" strokeWidth="3" />;
                eyeRight = <circle cx="125" cy="110" r="8" fill="#5d4037" />;
                mouth = <path d="M90 140 L110 150" stroke="#5d4037" strokeWidth="3" />;
                break;
            case 5: // 으악 (|| ||)
                eyeLeft = <path d="M70 105 V115 M80 105 V115" stroke="#5d4037" strokeWidth="3" />;
                eyeRight = <path d="M120 105 V115 M130 105 V115" stroke="#5d4037" strokeWidth="3" />;
                mouth = <ellipse cx="100" cy="145" rx="12" ry="6" fill="#5d4037" />;
                break;
            default: // 심각함 (- -)
                eyeLeft = <rect x="65" y="110" width="15" height="4" fill="#5d4037" />;
                eyeRight = <rect x="120" y="110" width="15" height="4" fill="#5d4037" />;
                mouth = <path d="M90 145 L110 145" stroke="#5d4037" strokeWidth="3" />;
        }
    }

    if (isBroken) {
        eyeLeft = <path d="M68 103 L82 117 M82 103 L68 117" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        eyeRight = <path d="M118 103 L132 117 M132 103 L118 117" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        mouth = <circle cx="100" cy="140" r="10" fill="none" stroke="#5d4037" strokeWidth="3" />;
        blush = null;
    }

    return (
        <div 
            className={`egg-svg-container ${isShaking ? 'shake' : ''} cursor-${tool}`}
            style={{ 
                transform: isShaking ? 'scale(0.92) translateY(5px)' : 'scale(1)',
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
    setWinnerEmail, submitWinnerEmail, handleClick, currentTool, buyItem, notification, handleAdWatch, adWatchCount, showGuide,
    winnerCountdown, exitCountdown, loserCountdown, showLoserMessage, isSpectating, showRetry, handleRetry,
    clientId, serverState, API_URL, myCountry, winningToken, prizeSecretImageUrl, connected,
    onComboReward
}) => {
    const [clickEffects, setClickEffects] = useState([]);
    const [isPrizeSaved, setIsPrizeSaved] = useState(false); // [New] Track if prize image is saved
    const stageRef = useRef(null); // 스테이지 좌표 기준점
    const wasActivePlayer = useRef(false);
    const [localLoserTimer, setLocalLoserTimer] = useState(null);
    const [showWinnerClaiming, setShowWinnerClaiming] = useState(false);
    const [isSettingsFocused, setIsSettingsFocused] = useState(false); // [New] For fading icons
    
    // [New] Submission Loading State
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    // --- Render Conditions (Moved to top) ---
    const isMyWin = serverState?.winningClientId === clientId;
    const isWinnerCheck = serverState?.status === 'WINNER_CHECK';
    const isFinished = serverState?.status === 'FINISHED';
    const isInQueue = connected && isSpectating && !isWinnerCheck && !isFinished;
    
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

        // 0. Blur settings when clicking the egg/game area
        setIsSettingsFocused(false);

        // 1. Trigger Vibration & Sound & Check Autoplay
        triggerVibration();
        
        // --- Combo Logic & Sound ---
        const nextCombo = combo + 1;
        setCombo(prev => {
            const val = prev + 1;
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            comboTimerRef.current = setTimeout(() => setCombo(0), 1200); 
            return val;
        });

        // Sound: Only at 10, 100, 1000
        if ([10, 100, 1000].includes(nextCombo)) {
            playToolSound('many_hit');
        } else {
            playToolSound(currentTool);
        }

        checkWebAudioAutoplay(); // Try to resume BGM if paused

        // 1. Trigger Game Logic
        handleClick();
        
        // 2. Visuals: Calculate position relative to the stage
        if (!stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Determine scale and color based on damage (clickPower)
        let scale = 1;
        let toolSize = 2; 
        let dmgColor = '#ff6f61'; // Default (Low)
        
        if (clickPower >= 10000) dmgColor = '#ffd700'; // Gold (Legendary)
        else if (clickPower >= 1000) dmgColor = '#9c27b0'; // Purple (Epic)
        else if (clickPower >= 100) dmgColor = '#e91e63'; // Pink (Rare)
        else if (clickPower >= 10) dmgColor = '#ff9800'; // Orange (Uncommon)

        switch(currentTool) {
            case 'hammer': scale = 1.2; toolSize = 2.5; break;
            case 'pickaxe': scale = 1.5; toolSize = 3.5; break;
            case 'dynamite': scale = 2.0; toolSize = 5.0; break;
            case 'drill': scale = 2.5; toolSize = 7.0; break;
            case 'excavator': scale = 3.0; toolSize = 10.0; break;
            case 'laser': scale = 4.5; toolSize = 14.0; break; // Increased scale
            case 'nuke': scale = 7.0; toolSize = 20.0; break; // Increased scale
            default: scale = 1; toolSize = 2;
        }

        // Random Cute Particle
        const randomParticle = CUTE_PARTICLES[Math.floor(Math.random() * CUTE_PARTICLES.length)];
        
        // Add Combo Effect if high enough (10, 100, 1000)
        let comboText = null;
        let comboColor = '#ff4081'; // Default

        if (nextCombo === 10) {
            comboText = "10 COMBO!";
            comboColor = '#ff4081'; 
        } else if (nextCombo === 100) {
            comboText = "100 COMBO!!";
            comboColor = '#00e676'; // Green
            if (onComboReward) onComboReward(50, "100 COMBO!! +50P");
        } else if (nextCombo === 1000) {
            comboText = "1000 COMBO!!!";
            comboColor = '#ffea00'; // Gold
            if (onComboReward) onComboReward(700, "1000 COMBO!!! +700P");
        }

        const newEffect = { 
            id: Date.now() + Math.random(), 
            x, 
            y, 
            val: clickPower,
            scale,
            toolSize,
            dmgColor,
            toolEmoji: TOOL_EMOJIS[currentTool] || '👊',
            particle: randomParticle,
            comboText,
            comboColor
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
                        {lang.touchGuide}
                    </div>
                )}
                
                {/* Render Multiple Click Effects (Damage + Tool Icon + Cute Particle) */}
                {clickEffects.map(effect => (
                    <React.Fragment key={effect.id}>
                        {/* Damage Number */}
                        <span 
                            className={`damage-float ${effect.val >= 1000 ? 'critical' : ''}`}
                            style={{ 
                                left: effect.x, 
                                top: effect.y - 50,
                                fontSize: `${1.8 * effect.scale}rem`,
                                fontWeight: '900',
                                color: effect.dmgColor,
                                WebkitTextStroke: effect.val >= 10000 ? '2px #000' : '2px #fff',
                                textShadow: effect.val >= 10000 ? '0 0 10px rgba(255, 215, 0, 0.8)' : 'none',
                                pointerEvents: 'none',
                                zIndex: 12,
                                transform: `rotate(${Math.random() * 20 - 10}deg)`
                            }}
                        >
                            -{effect.val.toLocaleString()}
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
                        
                        {/* Combo Text Pop */}
                        {effect.comboText && (
                             <span 
                                style={{
                                    position: 'absolute',
                                    left: effect.x,
                                    top: effect.y - 100,
                                    color: effect.comboColor || '#ff4081',
                                    fontWeight: '900',
                                    fontSize: '2rem',
                                    zIndex: 20,
                                    animation: 'bounceIn 0.5s forwards',
                                    textShadow: '0 0 10px #fff'
                                }}
                             >
                                {effect.comboText}
                             </span>
                        )}
                    </React.Fragment>
                ))}

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
                                            <p style={{ color: '#d32f2f', fontWeight: 'bold', marginBottom: '5px' }}>
                                                ⚠️ {prizeSecretImageUrl ? "5분 안에 상품을 수령하세요!" : lang.winnerTimerWarning}
                                            </p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#d32f2f' }}>
                                                {lang.timeLeft}: {formatTime(winnerCountdown)}
                                            </p>
                                        </div>

                                        {/* CASE 1: Prize Image exists */}
                                        {prizeSecretImageUrl ? (
                                            <div style={{ 
                                                background: 'linear-gradient(135deg, #fff9c4 0%, #fbc02d 100%)', 
                                                padding: '20px', 
                                                borderRadius: '20px', 
                                                marginBottom: '20px', 
                                                width: '100%',
                                                boxShadow: '0 10px 30px rgba(251, 192, 45, 0.4)',
                                                border: '3px solid #f9a825'
                                            }}>
                                                <h3 style={{ color: '#5d4037', marginBottom: '15px' }}>🎁 {lang.prizeTitle || "우승 상품"}</h3>
                                                
                                                <img 
                                                    src={prizeSecretImageUrl} 
                                                    alt="Prize" 
                                                    style={{ width: '100%', borderRadius: '10px', marginBottom: '15px', border: '2px solid #fff' }} 
                                                />
                                                
                                                {isPrizeSaved && <p style={{ color: '#2e7d32', fontWeight: 'bold', marginBottom: '10px' }}>✅ 앨범에 저장되었습니다!</p>}

                                                {!emailSubmitted ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <a 
                                                            href={prizeSecretImageUrl} 
                                                            download={`egg_prize_round_${serverState.round}.png`}
                                                            onClick={() => setIsPrizeSaved(true)}
                                                            style={{ 
                                                                display: 'block',
                                                                background: '#5d4037', 
                                                                color: '#fff', 
                                                                padding: '12px', 
                                                                borderRadius: '30px', 
                                                                textDecoration: 'none',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            {isPrizeSaved ? "📥 다시 저장하기" : "📥 이미지 저장하기"}
                                                        </a>
                                                        {isPrizeSaved && (
                                                            <button 
                                                                onClick={() => handleSubmit("IMAGE_CLAIMED")} 
                                                                className="send-btn" 
                                                                disabled={isSubmitting}
                                                                style={{ background: isSubmitting ? '#999' : '#2e7d32', width: '100%' }}
                                                            >
                                                                {isSubmitting ? "처리 중..." : "상품 수령 완료"}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <h3 style={{ color: '#2e7d32' }}>수령이 완료되었습니다!</h3>
                                                )}
                                            </div>
                                        ) : (
                                            /* CASE 2: No Image, show Email Input */
                                            <div style={{ width: '100%' }}>
                                                {!emailSubmitted ? (
                                                    <>
                                                        <div style={{ background: 'rgba(255, 182, 193, 0.2)', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
                                                            <p style={{ margin: '0 0 10px 0', color: '#ff6f61', fontWeight: 'bold' }}>{lang.modalPrize}</p>
                                                            <input 
                                                                type="email" 
                                                                placeholder="example@email.com"
                                                                value={winnerEmail}
                                                                onChange={(e) => setWinnerEmail(e.target.value)}
                                                                style={{ width: '90%', padding: '12px', borderRadius: '10px', border: '2px solid #ffe4e1', background: '#fff', color: '#5d4037', textAlign: 'center', fontSize: '1rem' }}
                                                            />
                                                        </div>
                                                        <button 
                                                            className="send-btn" 
                                                            onClick={() => handleSubmit()} 
                                                            disabled={isSubmitting}
                                                            style={{ fontSize: '1.1rem', padding: '12px 40px', background: isSubmitting ? '#999' : '' }}
                                                        >
                                                            {isSubmitting ? "처리 중..." : lang.send}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <h2 style={{ color: '#4CAF50', marginTop: '20px' }}>✅ {lang.sent}</h2>
                                                )}
                                            </div>
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

            {adWatchCount < 1 && (
                <button className="power-btn" onClick={handleAdWatch}>
                    <span className="btn-title">{lang.adWatchBtn}</span>
                    <span className="btn-sub">{lang.adReward}</span>
                </button>
            )}

            {adWatchCount < 1 && (
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
            )}

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
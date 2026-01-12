import React, { useState, useRef } from 'react';

// --- 깨지는 알 SVG 컴포넌트 ---
const CrackedEgg = ({ hp, maxHp, isShaking, tool, onEggClick }) => {
    const percentage = (hp / maxHp) * 100;

    // 체력에 따른 금(Crack) 단계 결정
    const showCrack1 = percentage < 80;
    const showCrack2 = percentage < 50;
    const showCrack3 = percentage < 20;

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
    } else if (isShaking) {
        // 아픔 (> < 눈)
        eyeLeft = <path d="M68 110 L75 117 L82 110" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        eyeRight = <path d="M118 110 L125 117 L132 110" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />;
        mouth = <circle cx="100" cy="140" r="6" fill="#5d4037" />; // 'o' 입
    } else if (percentage < 30) {
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
                        <stop offset="0%" stopColor="#ffdde1" />
                        <stop offset="100%" stopColor="#ff9a9e" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* 1. 알 본체 - 여기에만 클릭 이벤트를 줍니다 (정밀 타격) */}
                <ellipse 
                    cx="100" cy="125" rx="80" ry="110" 
                    fill="url(#eggGradient)" 
                    filter="url(#glow)" 
                    onPointerDown={onEggClick}
                    style={{ cursor: 'pointer', touchAction: 'manipulation' }}
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
    setWinnerEmail, submitWinnerEmail, handleClick, currentTool, buyItem, notification, handleAdWatch, showGuide
}) => {
    const [clickEffects, setClickEffects] = useState([]);
    const stageRef = useRef(null); // 스테이지 좌표 기준점

    const handlePointerDown = (e) => {
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

    return (
        <main className="game-area">
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
                        👈 가운데 계란을 터치하세요!
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

            {/* 모달 */}

            {/* 모달 */}
            {isWinner && !emailSubmitted && (
              <div className="modal-overlay">
                <div className="modal-content glass" style={{ maxWidth: '500px', width: '90%' }}>
                  <h2 style={{ color: '#ff6f61', fontSize: '2rem', marginBottom: '10px' }}>{lang.modalTitle}</h2>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.5', marginBottom: '20px' }}>
                    {lang.modalDesc}
                  </p>
                  
                  <div style={{ background: 'rgba(255, 182, 193, 0.2)', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 10px 0', color: '#ff6f61', fontWeight: 'bold' }}>
                      {lang.modalPrize}
                    </p>
                    <input 
                        type="email" 
                        placeholder="example@email.com"
                        value={winnerEmail}
                        onChange={(e) => setWinnerEmail(e.target.value)}
                        style={{ width: '80%', padding: '12px', borderRadius: '10px', border: '2px solid #ffe4e1', background: '#fff', color: '#5d4037', textAlign: 'center', fontSize: '1rem' }}
                    />
                  </div>

                  <button className="send-btn" onClick={submitWinnerEmail} style={{ fontSize: '1.1rem', padding: '12px 40px' }}>
                    {lang.send}
                  </button>
                </div>
              </div>
            )}

                {hp <= 0 && !isWinner && (
                    <div className="modal-overlay">
                        <div className="round-over-message">
                            <h2>Round Over!</h2>
                            <p>Waiting for the next round to begin.</p>
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

import React, { useState } from 'react';

// --- 깨지는 알 SVG 컴포넌트 ---
const CrackedEgg = ({ hp, maxHp, isShaking, tool }) => {
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
            <svg viewBox="0 0 200 250" className="egg-svg">
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

                {/* 1. 알 본체 */}
                <ellipse cx="100" cy="125" rx="80" ry="110" fill="url(#eggGradient)" filter="url(#glow)" />
                
                {/* 2. 얼굴 (Face) - 가장 위에 그려지도록 배치 */}
                <g className="egg-face" style={{ transition: 'all 0.2s' }}>
                    {blush}
                    {eyeLeft}
                    {eyeRight}
                    {mouth}
                </g>

                {/* 3. 금(Cracks) */}
                {showCrack1 && (
                    <path d="M100 30 L110 50 L90 60 L105 80" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                )}
                {showCrack2 && (
                    <path d="M50 100 L80 110 L60 130 L90 140 L70 160" fill="none" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
                )}
                {showCrack3 && (
                    <path d="M130 90 L110 110 L140 130 L120 160 L150 180" fill="none" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                )}
                {/* HP 0일 때 (완전 깨짐) */}
                {hp <= 0 && (
                    <path d="M20 125 L180 125" fill="none" stroke="#5d4037" strokeWidth="10" />
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
    setWinnerEmail, submitWinnerEmail, handleClick, currentTool, buyItem, notification, handleAdWatch
}) => {
    const [clickEffects, setClickEffects] = useState([]);

    const handlePointerDown = (e) => {
        // 1. Trigger Game Logic
        handleClick();

        // 2. Visuals: Calculate relative position
        const rect = e.currentTarget.getBoundingClientRect();
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

        // 3. Add to state
        setClickEffects(prev => [...prev, newEffect]);

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
                    top: '20%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#fff',
                    color: '#ff69b4',
                    border: '2px solid #ffb6c1',
                    padding: '10px 25px',
                    borderRadius: '25px',
                    fontWeight: 'bold',
                    zIndex: 100,
                    pointerEvents: 'none',
                    animation: 'floatUp 2s ease-out forwards',
                    boxShadow: '0 5px 15px rgba(255,182,193,0.5)'
                }}>
                    ✨ {notification}
                </div>
            )}

            <div className="header-glow">
                <h1 className="title">{lang.title}</h1>
                <p className="subtitle">{lang.subtitle}</p>
            </div>

            <div 
                className="egg-stage" 
                onPointerDown={handlePointerDown}
            >
                <CrackedEgg hp={hp} maxHp={1000000} isShaking={isShaking} tool={currentTool} />
                
                {/* Render Multiple Click Effects (Damage + Tool Icon + Cute Particle) */}
                {clickEffects.map(effect => (
                    <React.Fragment key={effect.id}>
                        {/* Damage Number - More playful font/color */}
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
                                transform: `rotate(${Math.random() * 20 - 10}deg)` // Random tilt
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
                <span className="btn-title">📺 {lang.watchAd || "AD Watch"}</span>
                <span className="btn-sub">+2000 Points</span>
            </button>
          <div className="status-row glass">
            <div>{lang.myPoint}: <span>{myPoints}</span></div>
            <div>{lang.atk}: <span>x{clickPower}</span></div>
          </div>

          <p style={{
            marginTop: '20px',
            fontSize: '0.9rem',
            color: '#ffd700',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
            animation: 'pulse 2s infinite'
          }}>
            ✨ {lang.shopGuide} ✨
          </p>

          <div className="ad-banner" style={{ marginTop: '10px', textAlign: 'center' }}>
             {/* Ad Placeholder (e.g., 320x50 or 320x100 for mobile) */}
             <div style={{ display: 'inline-block', width: '320px', height: '100px', background: 'rgba(255,255,255,0.1)', border: '1px dashed #aaa', lineHeight: '100px', color: '#fff' }}>
                Google AdSense (320x100)
             </div>
          </div>
        </main>
    );
};

export default GameArea;

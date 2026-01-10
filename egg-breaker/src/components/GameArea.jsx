import React, { useState } from 'react';

// --- 깨지는 알 SVG 컴포넌트 ---
const CrackedEgg = ({ hp, maxHp, isShaking, tool }) => {
    const percentage = (hp / maxHp) * 100;

    // 체력에 따른 금(Crack) 단계 결정
    const showCrack1 = percentage < 80; // 80% 미만일 때 잔금
    const showCrack2 = percentage < 50; // 50% 미만일 때 큰금
    const showCrack3 = percentage < 20; // 20% 미만일 때 박살

    return (
        <div className={`egg-svg-container ${isShaking ? 'shake' : ''} cursor-${tool}`}>
            <svg viewBox="0 0 200 250" className="egg-svg">
                <defs>
                    <radialGradient id="eggGradient" cx="40%" cy="30%" r="80%">
                        <stop offset="0%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#ffa500" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* 1. 알 본체 */}
                <ellipse cx="100" cy="125" rx="80" ry="110" fill="url(#eggGradient)" filter="url(#glow)" />

                {/* 2. 금(Cracks) - 체력에 따라 보임/숨김 */}
                {showCrack1 && (
                    <path d="M100 30 L110 50 L90 60 L105 80" fill="none" stroke="#664400" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                )}
                {showCrack2 && (
                    <path d="M50 100 L80 110 L60 130 L90 140 L70 160" fill="none" stroke="#664400" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
                )}
                {showCrack3 && (
                    <path d="M130 90 L110 110 L140 130 L120 160 L150 180" fill="none" stroke="#664400" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                )}
                {/* HP 0일 때 (완전 깨짐) */}
                {hp <= 0 && (
                    <path d="M20 125 L180 125" fill="none" stroke="#000" strokeWidth="10" />
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
        
        // Determine scale based on tool (Increased scaling for high-tier items)
        let scale = 1;
        let toolSize = 2; // Default emoji size
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

        const newEffect = { 
            id: Date.now() + Math.random(), 
            x, 
            y, 
            val: clickPower,
            scale,
            toolSize,
            toolEmoji: TOOL_EMOJIS[currentTool] || '👊'
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
                    background: 'rgba(0, 255, 0, 0.8)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    zIndex: 100,
                    pointerEvents: 'none',
                    animation: 'floatUp 2s ease-out forwards'
                }}>
                    {notification}
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
                
                {/* Render Multiple Click Effects (Damage + Tool Icon) */}
                {clickEffects.map(effect => (
                    <React.Fragment key={effect.id}>
                        <span 
                            className="damage-float"
                            style={{ 
                                left: effect.x, 
                                top: effect.y - 40,
                                fontSize: `${2 * effect.scale}rem`,
                                fontWeight: 'bold',
                                color: '#ff4444',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                pointerEvents: 'none',
                                zIndex: 10
                            }}
                        >
                            -{effect.val}
                        </span>
                        <span 
                            className="tool-float"
                            style={{ 
                                left: effect.x, 
                                top: effect.y,
                                fontSize: `${effect.toolSize}rem`,
                                position: 'absolute',
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'none',
                                zIndex: 5,
                                animation: 'toolPop 0.5s ease-out forwards'
                            }}
                        >
                            {effect.toolEmoji}
                        </span>
                    </React.Fragment>
                ))}

            {/* 모달 */}
            {isWinner && !emailSubmitted && (
              <div className="modal-overlay">
                <div className="modal-content glass" style={{ maxWidth: '500px', width: '90%' }}>
                  <h2 style={{ color: '#ffd700', fontSize: '2rem', marginBottom: '10px' }}>{lang.modalTitle}</h2>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.5', color: '#fff', marginBottom: '20px' }}>
                    {lang.modalDesc}
                  </p>
                  
                  <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 10px 0', color: '#00ff88', fontWeight: 'bold' }}>
                      {lang.modalPrize}
                    </p>
                    <input 
                        type="email" 
                        placeholder="example@email.com"
                        value={winnerEmail}
                        onChange={(e) => setWinnerEmail(e.target.value)}
                        style={{ width: '80%', padding: '12px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: 'white', textAlign: 'center', fontSize: '1rem' }}
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

          <div className="ad-banner" style={{ marginTop: '20px', textAlign: 'center' }}>
             {/* Ad Placeholder (e.g., 320x50 or 320x100 for mobile) */}
             <div style={{ display: 'inline-block', width: '320px', height: '100px', background: 'rgba(255,255,255,0.1)', border: '1px dashed #aaa', lineHeight: '100px', color: '#fff' }}>
                Google AdSense (320x100)
             </div>
          </div>
        </main>
    );
};

export default GameArea;

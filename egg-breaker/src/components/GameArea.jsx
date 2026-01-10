import React from 'react';

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


const GameArea = ({
    lang, hp, isShaking, clickPower, isWinner, emailSubmitted, winnerEmail,
    setWinnerEmail, submitWinnerEmail, handleClick, currentTool, buyItem
}) => {
    return (
        <main className="game-area">
            <div className="header-glow">
                <h1 className="title">{lang.title}</h1>
                <p className="subtitle">{lang.subtitle}</p>
            </div>

            <div className="egg-stage" onClick={handleClick}>
                <CrackedEgg hp={hp} maxHp={1000000} isShaking={isShaking} tool={currentTool} />
                {isShaking && <span className="damage-float">-{clickPower}</span>}

                {isWinner && !emailSubmitted && (
                    <div className="modal-overlay">
                        <div className="modal-content glass">
                            <h2>{lang.modalTitle}</h2>
                            <input
                                type="email"
                                placeholder="Email"
                                value={winnerEmail}
                                onChange={(e) => setWinnerEmail(e.target.value)}
                            />
                            <button className="send-btn" onClick={submitWinnerEmail}>{lang.send}</button>
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

            <button className="power-btn" onClick={() => buyItem(0, 0, 'fist')}>
                <span className="btn-title">{lang.powerClick}</span>
                <span className="btn-sub">{lang.watchAd}</span>
            </button>
        </main>
    );
};

export default GameArea;
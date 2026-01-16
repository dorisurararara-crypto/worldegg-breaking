import React, { useState, useRef } from 'react';

const InfoPanel = ({ lang, recentWinners, prize, prizeUrl, isOpen, toggleMobilePanel }) => {
  // --- Swipe Logic ---
  const [translateY, setTranslateY] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
        setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (translateY > 100) {
        toggleMobilePanel('none');
    }
    setTranslateY(0);
  };

  return (
    <aside 
        className={`panel info-panel glass ${isOpen ? 'active' : ''}`} 
        style={{ 
            overflowY: 'auto',
            transform: isOpen ? `translateY(${translateY}px)` : undefined,
            transition: isDragging.current ? 'none' : 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1)'
        }}
    >
      <div 
        className="panel-header"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        <h3>{lang.hallOfFame}</h3>
        <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>
      
      <div className="scroll-box">
        {/* --- Current Prize Section --- */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: '15px 0 10px', color: '#ff6f61' }}>🎁 {lang.prizeTitle}</h4>
            <div style={{ 
                background: 'rgba(255, 255, 255, 0.8)', 
                padding: '20px', 
                borderRadius: '20px',
                boxShadow: '0 8px 20px rgba(255, 105, 180, 0.15)',
                border: '3px solid #ffb6c1'
            }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ff4081', marginBottom: '5px' }}>
                    {prize || "Secret Prize"}
                </div>
                {prizeUrl && (
                    <a href={prizeUrl} target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-block', marginTop: '10px', padding: '8px 20px',
                        background: '#ff6f61', color: 'white', borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem'
                    }}>
                        Check Details
                    </a>
                )}
            </div>
        </div>

        <h4 style={{ margin: '15px 0 10px', color: '#ff6f61', textAlign: 'center' }}>📅 {lang.recentPrizes}</h4>
        
        {recentWinners && recentWinners.length > 0 ? (
            <div className="prize-list">
                {recentWinners.map((w, i) => (
                    <div key={i} className="prize-item" style={{ 
                        background: 'white', 
                        margin: '10px', 
                        padding: '15px', 
                        borderRadius: '15px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                        border: '1px solid #ffe4e1'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>
                            ROUND {w.round}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#5d4037' }}>
                            {w.prize || "Secret Prize"}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '5px' }}>
                            {new Date(w.date).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
                {lang.noRecords}
            </div>
        )}
      </div>
    </aside>
  );
};

export default InfoPanel;

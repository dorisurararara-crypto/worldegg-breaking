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
        <h4 style={{ margin: '15px 0 10px', color: '#2d3436', textAlign: 'center' }}>📅 {lang.recentPrizes}</h4>

        {recentWinners && recentWinners.length > 0 ? (
            <div className="prize-list">
                {recentWinners.map((w, i) => (
                    <div key={i} className="prize-item" style={{
                        background: 'white',
                        margin: '10px',
                        padding: '15px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.06)'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#b2bec3', marginBottom: '5px' }}>
                            ROUND {w.round}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2d3436' }}>
                            {w.prize || "Secret Prize"}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#b2bec3', marginTop: '5px' }}>
                            {new Date(w.date).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#b2bec3' }}>
                {lang.noRecords}
            </div>
        )}
      </div>
    </aside>
  );
};

export default InfoPanel;

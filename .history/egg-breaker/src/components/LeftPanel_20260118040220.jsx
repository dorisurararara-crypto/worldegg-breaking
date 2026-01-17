import React, { useState, useRef } from 'react';

const LeftPanel = ({ lang, serverState, countryStats, onlineUsersCount, recentWinners, prize, prizeUrl, getFlagEmoji, isOpen, toggleMobilePanel }) => {
  
  const maxAtk = serverState?.maxAtk || 0;
  const maxAtkCountry = serverState?.maxAtkCountry || "UN";
  const hasRecord = maxAtk > 1; 

  const onlinePlayers = serverState?.onlinePlayers || 0;
  const waitingCount = serverState?.queueLength || 0;
  const spectators = serverState?.onlineSpectatorsApprox || 0;

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
    if (diff > 0) { // Only allow dragging down
        setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (translateY > 100) { // Threshold to close
        toggleMobilePanel('none');
    }
    setTranslateY(0); // Reset position (if closed, CSS transition handles it)
  };

  return (
    <aside 
        className={`panel left-panel glass ${isOpen ? 'active' : ''}`} 
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
        <h3 style={{ color: '#ff6f61' }}>{lang.users}</h3>
        <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>
      
      {/* MVP Card */}
      <div style={{ 
          background: '#fff0f5', 
          borderRadius: '20px', 
          padding: '20px', 
          textAlign: 'center', 
          marginBottom: '20px',
          boxShadow: '0 4px 15px rgba(255, 111, 97, 0.1)'
      }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ff6f61', fontSize: '1rem' }}>
             👑 {lang.maxAtkTitle || "Highest Attack"}
          </h4>
          
          <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>
              {hasRecord ? getFlagEmoji(maxAtkCountry) : '🏳️'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5d4037' }}>
              {hasRecord ? maxAtkCountry : "UN"}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ff9a9e', margin: '5px 0' }}>
              {hasRecord ? maxAtk.toLocaleString() : "1"}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#a1887f' }}>
              {hasRecord ? "" : "기록 없음"}
          </div>
      </div>

      {/* Server Status */}
      <h4 style={{ color: '#ff6f61', marginLeft: '5px', marginBottom: '10px' }}>
          📊 {lang.serverStatusTitle || "Server Status"}
      </h4>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {/* Participants */}
          <div style={{ flex: 1, background: '#fff', padding: '15px 5px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⚔️</div>
              <div style={{ fontSize: '0.8rem', color: '#5d4037', fontWeight: 'bold' }}>{lang.participants || "Active"}</div>
              <div style={{ fontSize: '1.2rem', color: '#ff6f61', fontWeight: '900' }}>{onlinePlayers}</div>
          </div>
          
          {/* Waiting */}
          <div style={{ flex: 1, background: '#fff', padding: '15px 5px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⏳</div>
              <div style={{ fontSize: '0.8rem', color: '#5d4037', fontWeight: 'bold' }}>{lang.queueLabel || "Queue"}</div>
              <div style={{ fontSize: '1.2rem', color: '#ffb74d', fontWeight: '900' }}>{waitingCount}</div>
          </div>
          
          {/* Spectators */}
          <div style={{ flex: 1, background: '#fff', padding: '15px 5px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>👀</div>
              <div style={{ fontSize: '0.8rem', color: '#5d4037', fontWeight: 'bold' }}>{lang.spectators || "Spectators"}</div>
              <div style={{ fontSize: '1.2rem', color: '#8d6e63', fontWeight: '900' }}>{spectators}</div>
          </div>
      </div>

      {/* Total Online Badge */}
      <div className="total-badge" style={{ 
          color: '#2e7d32', 
          background: '#e8f5e9', 
          border: 'none',
          borderRadius: '15px',
          padding: '15px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          marginBottom: '20px'
      }}>
        🟢 {lang.totalOnline || "Total Online"}: {onlineUsersCount.toLocaleString()}
      </div>

      <div className="rule-notice-box" style={{ padding: '15px', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '15px', margin: '10px 0', fontSize: '0.85rem', textAlign: 'left' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#ff6f61' }}>📜 {lang.gameRuleTitle}</h4>
        <ul style={{ paddingLeft: '20px', margin: '0 0 15px 0', color: '#5d4037', lineHeight: '1.4' }}>
          <li>{lang.gameRule1}</li>
          <li>{lang.gameRule2}</li>
          <li>{lang.gameRule3}</li>
        </ul>

        <h4 style={{ margin: '0 0 8px 0', color: '#ff6f61' }}>⚠️ {lang.noticeTitle}</h4>
        <ul style={{ paddingLeft: '20px', margin: 0, color: '#d32f2f', fontSize: '0.8rem', fontWeight: 'bold' }}>
          <li style={{ marginBottom: '5px' }}>{lang.notice1}</li>
          <li>
            <span style={{ background: '#ffebee', padding: '4px 8px', borderRadius: '5px', display: 'inline-block' }}>{lang.notice2}</span>
          </li>
        </ul>
      </div>

      <div className="info-box">
        <h4>{lang.contactTitle}</h4>
        <p>dorisurararara@gmail.com</p>
      </div>
    </aside>
  );
};

export default LeftPanel;
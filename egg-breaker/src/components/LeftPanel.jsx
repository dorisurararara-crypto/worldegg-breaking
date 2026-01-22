import React, { useState, useRef } from 'react';

const LeftPanel = ({ lang, serverState, countryStats, onlineUsersCount, recentWinners, prize, prizeUrl, getFlagEmoji, isOpen, toggleMobilePanel }) => {
  
  const maxAtk = serverState?.maxAtk || 0;
  const maxAtkCountry = serverState?.maxAtkCountry || "UN";
  const hasRecord = maxAtk > 1; 

  const onlinePlayers = serverState?.onlinePlayers || 0;
  const waitingCount = serverState?.queueLength || 0;
  const spectators = serverState?.onlineSpectatorsApprox || 0;

  return (
    <aside 
        className={`panel left-panel glass ${isOpen ? 'active' : ''}`} 
        style={{ 
            overflowY: 'auto',
            transition: 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1)' 
        }}
    >
      <div
        className="panel-header"
      >
        <h3 style={{ color: '#2d3436' }}>{lang.users}</h3>
        <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>

      {/* MVP Card */}
      <div style={{
          background: '#f8f9fa',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
      }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2d3436', fontSize: '1rem' }}>
             👑 {lang.maxAtkTitle || "Highest Attack"}
          </h4>

          <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>
              {hasRecord ? getFlagEmoji(maxAtkCountry) : '🏳️'}
          </div>
          {/* Country Name removed as requested */}
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#e17055', margin: '5px 0' }}>
              {hasRecord ? maxAtk.toLocaleString() : "1"}
          </div>
          
          {/* Max Points & Clicks */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px' }}>
             <div>
                <div style={{ fontSize: '0.8rem', color: '#a1887f', fontWeight: 'bold' }}>{lang.maxPointTitle || "Max Points"}</div>
                <div style={{ fontSize: '1.1rem', color: '#ffb74d', fontWeight: '900' }}>
                    {serverState?.maxPoints ? serverState.maxPoints.toLocaleString() : "0"}
                </div>
             </div>
             <div>
                <div style={{ fontSize: '0.8rem', color: '#a1887f', fontWeight: 'bold' }}>{lang.maxClickTitle || "Max Clicks"}</div>
                <div style={{ fontSize: '1.1rem', color: '#8d6e63', fontWeight: '900' }}>
                    {serverState?.maxClicks ? serverState.maxClicks.toLocaleString() : "0"}
                </div>
             </div>
          </div>
      </div>

      {/* Server Status */}
      <h4 style={{ color: '#2d3436', marginLeft: '5px', marginBottom: '10px' }}>
          📊 {lang.serverStatusTitle || "Server Status"}
      </h4>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {/* Participants */}
          <div style={{ flex: 1, background: '#fff', padding: '15px 5px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⚔️</div>
              <div style={{ fontSize: '0.8rem', color: '#636e72', fontWeight: '600' }}>{lang.participants || "Active"}</div>
              <div style={{ fontSize: '1.2rem', color: '#e17055', fontWeight: '700' }}>{onlinePlayers}</div>
          </div>
          
          {/* Waiting */}
          <div style={{ flex: 1, background: '#fff', padding: '15px 5px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⏳</div>
              <div style={{ fontSize: '0.8rem', color: '#636e72', fontWeight: '600' }}>{lang.queueLabel || "Queue"}</div>
              <div style={{ fontSize: '1.2rem', color: '#fdcb6e', fontWeight: '700' }}>{waitingCount}</div>
          </div>

          {/* Spectators */}
          <div style={{ flex: 1, background: '#fff', padding: '15px 5px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>👀</div>
              <div style={{ fontSize: '0.8rem', color: '#636e72', fontWeight: '600' }}>{lang.spectators || "Spectators"}</div>
              <div style={{ fontSize: '1.2rem', color: '#636e72', fontWeight: '700' }}>{spectators}</div>
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

      <div className="rule-notice-box" style={{ padding: '15px', background: '#f8f9fa', borderRadius: '12px', margin: '10px 0', fontSize: '0.85rem', textAlign: 'left' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#2d3436' }}>📜 {lang.gameRuleTitle}</h4>
        <ul style={{ paddingLeft: '20px', margin: '0 0 15px 0', color: '#636e72', lineHeight: '1.4' }}>
          <li>{lang.gameRule1}</li>
          <li>{lang.gameRule2}</li>
          <li>{lang.gameRule3}</li>
        </ul>

        <h4 style={{ margin: '0 0 8px 0', color: '#2d3436' }}>⚠️ {lang.noticeTitle}</h4>
        <ul style={{ paddingLeft: '20px', margin: 0, color: '#d63031', fontSize: '0.8rem', fontWeight: '600' }}>
          <li style={{ marginBottom: '5px' }}>{lang.notice1}</li>
          <li>{lang.notice2}</li>
        </ul>
      </div>

      <div className="info-box">
        <h4>{lang.contactTitle}</h4>
        <p>bbbofficial95@gmail.com</p>
      </div>
    </aside>
  );
};

export default LeftPanel;
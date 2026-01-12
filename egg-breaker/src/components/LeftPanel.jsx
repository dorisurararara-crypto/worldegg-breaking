import React from 'react';

const LeftPanel = ({ lang, countryStats, onlineUsersCount, recentWinners, prize, prizeUrl, getFlagEmoji, isOpen, toggleMobilePanel }) => {
  // Stats for Rivalry Widget (Top 2 Countries)
  const top1 = countryStats[0];
  const top2 = countryStats[1];

  return (
    <aside className={`panel left-panel glass ${isOpen ? 'active' : ''}`}>
      <div className="panel-header">
        <h3>{lang.users}</h3>
        <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>
      
      {/* --- 🔥 국가 대항전 위젯 --- */}
      <div className="rivalry-widget" style={{ padding: '20px 10px', background: 'rgba(255, 255, 255, 0.5)', marginBottom: '10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.5)', borderRadius: '20px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#ff6f61', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>🏆 {lang.rivalryTitle}</h4>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
            {/* 1위 국가 */}
            {top1 ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: '5px' }}>{getFlagEmoji(top1[0])}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#5d4037' }}>{top1[1].toLocaleString()}</div>
                </div>
            ) : (
                <div style={{ color: '#8d6e63' }}>{lang.waiting}</div>
            )}

            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ff9a9e', fontStyle: 'italic' }}>VS</div>

            {/* 2위 국가 */}
            {top2 ? (
                <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '5px', opacity: 0.8 }}>{getFlagEmoji(top2[0])}</div>
                     <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#8d6e63' }}>{top2[1].toLocaleString()}</div>
                </div>
            ) : (
                <div style={{ color: '#a1887f', fontSize: '0.8rem' }}>{lang.noRival}</div>
            )}
        </div>
        
        {top1 && top2 && (
            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#ff6f61', fontWeight: '600' }}>
                {lang.gap}: {(top1[1] - top2[1]).toLocaleString()}
            </div>
        )}
      </div>

      <h3>🌐 {lang.users}</h3>
      <div className="scroll-box" style={{ flex: '0 0 150px' }}> {/* Limit height */}
        {/* Country Stats List */}
        {countryStats.map(([code, count], index) => (
          <div key={code} className="user-row" style={index === 0 ? { background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)' } : {}}>
            <span className="flag">
                {index === 0 && '🥇 '}
                {index === 1 && '🥈 '}
                {index === 2 && '🥉 '}
                {getFlagEmoji(code)}
            </span>
            <span className="count">{count}</span>
          </div>
        ))}
      </div>
      
      {/* Recent Winners Section Removed */}

      <div className="total-badge" style={{ color: '#4caf50', background: 'rgba(76, 175, 80, 0.1)', borderTop: '1px solid rgba(76, 175, 80, 0.2)' }}>
        🟢 {lang.users}: {onlineUsersCount.toLocaleString()}
      </div>

      <div className="info-box">
        <h4>{lang.contactTitle}</h4>
        <p>dorisurararara@gmail.com</p>
      </div>
    </aside>
  );
};

export default LeftPanel;

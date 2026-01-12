import React from 'react';

const InfoPanel = ({ lang, recentWinners, isOpen, toggleMobilePanel }) => {
  return (
    <aside className={`panel info-panel glass ${isOpen ? 'active' : ''}`}>
      <div className="panel-header">
        <h3>🏆 {lang.hallOfFame}</h3>
        <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>
      
      <div className="scroll-box">
        <h4 style={{ margin: '15px 0 10px', color: '#ff6f61', textAlign: 'center' }}>🎁 {lang.recentPrizes}</h4>
        
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

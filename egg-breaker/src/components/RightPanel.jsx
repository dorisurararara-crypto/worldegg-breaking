import React from 'react';

const RightPanel = ({ lang, buyItem, myPoints, clickPower, myTotalClicks, handleKakaoShare, isOpen, toggleMobilePanel }) => {
  return (
    <aside className={`panel right-panel glass ${isOpen ? 'active' : ''}`}>
      <div className="panel-header">
         <h3>🛒 {lang.shop}</h3>
         <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>
      <div className="shop-list">
        <div className="shop-item" onClick={() => buyItem(100, 1, 'hammer')}>
          <div className="icon">🔨</div>
          <div className="info">
            <h4>{lang.item1}</h4>
            <div className="price">100 P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+1 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(500, 5, 'pickaxe')}>
          <div className="icon">⛏️</div>
          <div className="info">
            <h4>{lang.item2}</h4>
            <div className="price">500 P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+5 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(2000, 25, 'dynamite')}>
          <div className="icon">🧨</div>
          <div className="info">
            <h4>{lang.item3}</h4>
            <div className="price">2k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+25 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(10000, 100, 'drill')}>
          <div className="icon">🔩</div>
          <div className="info">
            <h4>{lang.item4}</h4>
            <div className="price">10k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+100 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(50000, 500, 'excavator')}>
          <div className="icon">🚜</div>
          <div className="info">
            <h4>{lang.item5}</h4>
            <div className="price">50k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+500 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(200000, 2500, 'laser')}>
          <div className="icon">🔫</div>
          <div className="info">
            <h4>{lang.item6}</h4>
            <div className="price">200k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+2.5k {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(1000000, 15000, 'nuke')}>
          <div className="icon">☢️</div>
          <div className="info">
            <h4>{lang.item7}</h4>
            <div className="price">1M P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+15k {lang.atk})</span></div>
          </div>
        </div>
      </div>

      <div className="status-row glass">
        <div>{lang.myPoint}: <span>{myPoints}</span></div>
        <div>{lang.atk}: <span>x{clickPower}</span></div>
      </div>
      
      <button 
        onClick={handleKakaoShare}
        style={{
            width: '100%',
            background: '#FEE500',
            color: '#000000',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            marginTop: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        }}
      >
        <span style={{fontSize: '1.2rem'}}>💬</span> 
        Kakao Share (+2000P)
      </button>

      <div className="info-box">
        <h4>📊 {lang.myInfoTitle}</h4>
        <p>
          {lang.totalClick}: {myTotalClicks}
        </p>
      </div>

      <div className="ad-banner" style={{ marginTop: '20px', textAlign: 'center' }}>
          {/* Ad Placeholder (e.g., Vertical Skyscraper) */}
           <div style={{ display: 'inline-block', width: '100%', height: '250px', background: 'rgba(255,255,255,0.1)', border: '1px dashed #aaa', lineHeight: '250px', color: '#fff' }}>
              Google AdSense (Vertical)
           </div>
      </div>

    </aside>
  );
};

export default RightPanel;
import React from 'react';

const RightPanel = ({ lang, buyItem, myPoints, clickPower, myTotalClicks, handleKakaoShare, isOpen, toggleMobilePanel }) => {
  return (
    <aside className={`panel right-panel glass ${isOpen ? 'active' : ''}`}>
      <div className="panel-header">
         <h3>🛒 {lang.shop}</h3>
         <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>
      <div className="shop-list">
        <div className="shop-item" onClick={() => buyItem(500, 1, 'hammer')}>
          <div className="icon">🔨</div>
          <div className="info">
            <h4>{lang.item1}</h4>
            <div className="price">500 P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+1 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(2500, 6, 'pickaxe')}>
          <div className="icon">⛏️</div>
          <div className="info">
            <h4>{lang.item2}</h4>
            <div className="price">2.5k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+6 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(12000, 35, 'dynamite')}>
          <div className="icon">🧨</div>
          <div className="info">
            <h4>{lang.item3}</h4>
            <div className="price">12k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+35 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(60000, 200, 'drill')}>
          <div className="icon">🔩</div>
          <div className="info">
            <h4>{lang.item4}</h4>
            <div className="price">60k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+200 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(300000, 1200, 'excavator')}>
          <div className="icon">🚜</div>
          <div className="info">
            <h4>{lang.item5}</h4>
            <div className="price">300k P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+1200 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(1500000, 7000, 'laser')}>
          <div className="icon">🔫</div>
          <div className="info">
            <h4>{lang.item6}</h4>
            <div className="price">1.5M P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+7000 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(10000000, 60000, 'nuke')}>
          <div className="icon">☢️</div>
          <div className="info">
            <h4>{lang.item7}</h4>
            <div className="price">10M P <span style={{color:'#ff4444', marginLeft:'5px', fontSize:'0.8em'}}>(+60000 {lang.atk})</span></div>
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
        공유하고 800P 받기 (최대 5회)
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
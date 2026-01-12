import React from 'react';

const RightPanel = ({ lang, buyItem, myPoints, clickPower, myTotalClicks, handleKakaoShare, isOpen, toggleMobilePanel }) => {
  return (
    <aside className={`panel right-panel glass ${isOpen ? 'active' : ''}`}>
      <div className="panel-header">
         <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
             <h3>🛒 {lang.shop}</h3>
             <span style={{background:'rgba(255, 215, 0, 0.2)', color:'#ffd700', padding:'4px 8px', borderRadius:'12px', fontSize:'0.9rem', border:'1px solid rgba(255, 215, 0, 0.5)'}}>
                💰 {myPoints.toLocaleString()}
             </span>
         </div>
         <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
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
            marginBottom: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        }}
      >
        <span style={{fontSize: '1.2rem'}}>💬</span> 
        {lang.shareReward}
      </button>

      <div className="shop-list">
        <div className="shop-item" onClick={() => buyItem(500, 1, 'hammer')}>
          <div className="icon">🔨</div>
          <div className="info">
            <h4>{lang.item1}</h4>
            <div className="price">500 P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+1 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(2500, 6, 'pickaxe')}>
          <div className="icon">⛏️</div>
          <div className="info">
            <h4>{lang.item2}</h4>
            <div className="price">2.5k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+6 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(12000, 35, 'dynamite')}>
          <div className="icon">🧨</div>
          <div className="info">
            <h4>{lang.item3}</h4>
            <div className="price">12k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+35 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(60000, 200, 'drill')}>
          <div className="icon">🔩</div>
          <div className="info">
            <h4>{lang.item4}</h4>
            <div className="price">60k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+200 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(300000, 1200, 'excavator')}>
          <div className="icon">🚜</div>
          <div className="info">
            <h4>{lang.item5}</h4>
            <div className="price">300k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+1200 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(1500000, 7000, 'laser')}>
          <div className="icon">🔫</div>
          <div className="info">
            <h4>{lang.item6}</h4>
            <div className="price">1.5M P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+7000 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(10000000, 60000, 'nuke')}>
          <div className="icon">☢️</div>
          <div className="info">
            <h4>{lang.item7}</h4>
            <div className="price">10M P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+60000 {lang.atk})</span></div>
          </div>
        </div>
      </div>

      <div className="status-row glass">
        <div style={{width:'100%', textAlign:'center'}}>{lang.atk}: <span>x{clickPower}</span></div>
      </div>

      <div className="info-box">
        <h4>📊 {lang.myInfoTitle}</h4>
        <p>
          {lang.totalClick}: {myTotalClicks}
        </p>
      </div>

    </aside>
  );
};

export default RightPanel;
import React, { useState, useRef } from 'react';

const RightPanel = ({ lang, buyItem, myPoints, clickPower, myTotalClicks, handleKakaoShare, prizeUrl, isOpen, toggleMobilePanel, shareCount = 0 }) => {
  const TOOL_ITEMS = [
    { id: 'item1', name: lang.item1, cost: 50, power: 1, icon: '🔨' },
    { id: 'item2', name: lang.item2, cost: 300, power: 5, icon: '⛏️' },
    { id: 'item3', name: lang.item3, cost: 1000, power: 15, icon: '🧨' },
    { id: 'item4', name: lang.item4, cost: 3000, power: 40, icon: '🔩' },
    { id: 'item5', name: lang.item5, cost: 8000, power: 100, icon: '🚜' },
    { id: 'item6', name: lang.item6, cost: 20000, power: 250, icon: '🔫' },
    { id: 'item7', name: lang.item7, cost: 50000, power: 600, icon: '☢️' },
  ];

  return (
    <aside 
        className={`panel right-panel glass ${isOpen ? 'active' : ''}`} 
        style={{ 
            overflowY: 'auto',
            transition: 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1)'
        }}
    >
      <div 
        className="panel-header"
      >
        <h3>{lang.shop}</h3>
        <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>×</button>
      </div>

      <button 
        onClick={handleKakaoShare}
        style={{
            width: '100%',
            background: shareCount >= 5 ? '#e0e0e0' : '#FEE500',
            color: shareCount >= 5 ? '#999' : '#000000',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            marginBottom: '15px',
            cursor: shareCount >= 5 ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        }}
        disabled={shareCount >= 5}
      >
        <span style={{fontSize: '1.2rem'}}>💬</span> 
        {lang.shareReward} {shareCount >= 5 ? '(Max)' : `(${shareCount}/5)`}
      </button>

      {/* 오늘의 경품 링크 버튼 */}
      {prizeUrl && (
        <a 
            href={prizeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { if(!prizeUrl) { e.preventDefault(); alert("등록된 경품 링크가 없습니다."); } }}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                background: 'linear-gradient(45deg, #FF6F61, #FF9A9E)',
                color: '#fff',
                border: 'none',
                padding: '15px',
                borderRadius: '10px',
                fontWeight: '900',
                fontSize: '1.1rem',
                marginBottom: '20px',
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(255, 111, 97, 0.4)',
                boxSizing: 'border-box',
                cursor: 'pointer',
                transition: 'transform 0.2s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <span style={{fontSize: '1.4rem', marginRight:'8px'}}>🎁</span> 
            오늘 상품 보러가기
        </a>
      )}

      <div className="shop-list">
        <div className="shop-item" onClick={() => buyItem(500, 1, 'hammer')}>
          <div className="icon-box"><div className="icon">🔨</div></div>
          <div className="info">
            <h4>{lang.item1}</h4>
            <div className="price">500 P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+1 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(2500, 6, 'pickaxe')}>
          <div className="icon-box"><div className="icon">⛏️</div></div>
          <div className="info">
            <h4>{lang.item2}</h4>
            <div className="price">2.5k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+6 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(12000, 35, 'dynamite')}>
          <div className="icon-box"><div className="icon">🧨</div></div>
          <div className="info">
            <h4>{lang.item3}</h4>
            <div className="price">12k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+35 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(60000, 200, 'drill')}>
          <div className="icon-box"><div className="icon">🔩</div></div>
          <div className="info">
            <h4>{lang.item4}</h4>
            <div className="price">60k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+200 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(300000, 1200, 'excavator')}>
          <div className="icon-box"><div className="icon">🚜</div></div>
          <div className="info">
            <h4>{lang.item5}</h4>
            <div className="price">300k P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+1200 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(1500000, 7000, 'laser')}>
          <div className="icon-box"><div className="icon">🔫</div></div>
          <div className="info">
            <h4>{lang.item6}</h4>
            <div className="price">1.5M P <span style={{color:'#ff6f61', marginLeft:'5px', fontSize:'0.8em'}}>(+7000 {lang.atk})</span></div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(10000000, 60000, 'nuke')}>
          <div className="icon-box"><div className="icon">☢️</div></div>
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
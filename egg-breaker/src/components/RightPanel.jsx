import React, { useState, useRef } from 'react';

const RightPanel = ({ lang, buyItem, myPoints, clickPower, myTotalClicks, handleKakaoShare, prizeUrl, isOpen, toggleMobilePanel, shareCount = 0 }) => {
  // 귀여운 아이콘으로 변경
  const TOOL_ITEMS = [
    { id: 'item1', name: lang.item1, cost: 500, power: 1, icon: '🌸', bgColor: '#fff0f5' },
    { id: 'item2', name: lang.item2, cost: 2500, power: 6, icon: '💎', bgColor: '#e8f4fd' },
    { id: 'item3', name: lang.item3, cost: 12000, power: 35, icon: '🎀', bgColor: '#fef0f5' },
    { id: 'item4', name: lang.item4, cost: 60000, power: 200, icon: '🌈', bgColor: '#f0fff4' },
    { id: 'item5', name: lang.item5, cost: 300000, power: 1200, icon: '🦄', bgColor: '#f5f0ff' },
    { id: 'item6', name: lang.item6, cost: 1500000, power: 7000, icon: '⭐', bgColor: '#fffef0' },
    { id: 'item7', name: lang.item7, cost: 10000000, power: 60000, icon: '🌟', bgColor: '#fff5f0' },
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

      <div className="shop-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
        {TOOL_ITEMS.map((item, idx) => {
          const toolNames = ['hammer', 'pickaxe', 'dynamite', 'drill', 'excavator', 'laser', 'nuke'];
          const canBuy = myPoints >= item.cost;
          const formatCost = (cost) => {
            if (cost >= 1000000) return `${(cost/1000000).toFixed(1)}M`;
            if (cost >= 1000) return `${(cost/1000).toFixed(cost >= 10000 ? 0 : 1)}k`;
            return cost;
          };

          return (
            <div
              key={item.id}
              className="shop-item"
              onClick={() => canBuy && buyItem(item.cost, item.power, toolNames[idx])}
              style={{
                background: canBuy ? `linear-gradient(135deg, ${item.bgColor}, #ffffff)` : '#f5f5f5',
                opacity: canBuy ? 1 : 0.6,
                cursor: canBuy ? 'pointer' : 'not-allowed',
                border: canBuy ? '2px solid #ffb6c1' : '1px solid #ddd',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                boxShadow: canBuy ? '0 4px 12px rgba(255, 182, 193, 0.3)' : 'none'
              }}
            >
              <div style={{
                fontSize: '2rem',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#5d4037', fontWeight: '700' }}>{item.name}</h4>
                <div style={{
                  fontSize: '0.85rem',
                  color: canBuy ? '#ff6f61' : '#999',
                  fontWeight: '600',
                  marginTop: '4px'
                }}>
                  💰 {formatCost(item.cost)} P
                  <span style={{
                    color: '#9c27b0',
                    marginLeft: '8px',
                    background: 'rgba(156, 39, 176, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '0.75rem'
                  }}>
                    +{item.power.toLocaleString()} ATK
                  </span>
                </div>
              </div>
              {canBuy && (
                <div style={{
                  background: 'linear-gradient(45deg, #ff9a9e, #fad0c4)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  구매
                </div>
              )}
            </div>
          );
        })}
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
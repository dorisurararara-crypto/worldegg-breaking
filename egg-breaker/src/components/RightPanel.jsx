import React from 'react';

const RightPanel = ({ lang, buyItem, myPoints, clickPower, myTotalClicks, handleKakaoShare, prizeUrl, isOpen, toggleMobilePanel, shareCount = 0 }) => {
  // 아이템 데이터
  const SHOP_ITEMS = [
    { key: 'hammer', name: lang.item1, cost: 500, power: 1, icon: '🔨', tier: 1 },
    { key: 'pickaxe', name: lang.item2, cost: 2500, power: 6, icon: '⛏️', tier: 2 },
    { key: 'dynamite', name: lang.item3, cost: 12000, power: 35, icon: '💣', tier: 3 },
    { key: 'drill', name: lang.item4, cost: 60000, power: 200, icon: '🔧', tier: 4 },
    { key: 'excavator', name: lang.item5, cost: 300000, power: 1200, icon: '🏗️', tier: 5 },
    { key: 'laser', name: lang.item6, cost: 1500000, power: 7000, icon: '⚡', tier: 6 },
    { key: 'nuke', name: lang.item7, cost: 10000000, power: 60000, icon: '🚀', tier: 7 },
  ];

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
    return num.toLocaleString();
  };

  const getTierColor = (tier) => {
    const colors = {
      1: '#78909c', // 회색
      2: '#66bb6a', // 초록
      3: '#42a5f5', // 파랑
      4: '#ab47bc', // 보라
      5: '#ff7043', // 주황
      6: '#ec407a', // 핑크
      7: '#ffd54f', // 금색
    };
    return colors[tier] || '#78909c';
  };

  return (
    <aside className={`panel right-panel ${isOpen ? 'active' : ''}`}>
      <div className="panel-header">
        <h3>{lang.shop}</h3>
        <button className="panel-close-btn" onClick={() => toggleMobilePanel('none')}>✕</button>
      </div>

      {/* 카카오 공유 버튼 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={handleKakaoShare}
          disabled={shareCount >= 5}
          style={{
            width: '100%',
            background: shareCount >= 5 ? '#e0e0e0' : '#FEE500',
            color: shareCount >= 5 ? '#999' : '#3c1e1e',
            border: 'none',
            padding: '14px 16px',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: shareCount >= 5 ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: shareCount >= 5 ? 'none' : '0 2px 8px rgba(254, 229, 0, 0.4)'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>💬</span>
          친구 초대하고 800P 받기
          <span style={{
            background: 'rgba(0,0,0,0.1)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '0.8rem'
          }}>
            {shareCount}/5
          </span>
        </button>
      </div>

      {/* 내 현재 상태 */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        margin: '12px',
        borderRadius: '12px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '2px' }}>보유 포인트</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{myPoints.toLocaleString()}P</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '2px' }}>현재 공격력</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>x{clickPower.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 상점 아이템 리스트 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {SHOP_ITEMS.map((item) => {
          const canBuy = myPoints >= item.cost;
          const tierColor = getTierColor(item.tier);

          return (
            <div
              key={item.key}
              onClick={() => canBuy && buyItem(item.cost, item.power, item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: canBuy ? '#fff' : '#f8f9fa',
                border: `1px solid ${canBuy ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)'}`,
                borderRadius: '12px',
                cursor: canBuy ? 'pointer' : 'not-allowed',
                opacity: canBuy ? 1 : 0.5,
                transition: 'all 0.2s ease',
                boxShadow: canBuy ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              {/* 아이콘 */}
              <div style={{
                width: '44px',
                height: '44px',
                background: `linear-gradient(135deg, ${tierColor}20, ${tierColor}10)`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0
              }}>
                {item.icon}
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#2d3436',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {item.name}
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: tierColor,
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    +{formatNumber(item.power)}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: canBuy ? '#e17055' : '#b2bec3',
                  fontWeight: '600'
                }}>
                  {formatNumber(item.cost)} P
                </div>
              </div>

              {/* 구매 버튼 */}
              {canBuy && (
                <div style={{
                  padding: '8px 14px',
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  구매
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 통계 */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        background: '#f8f9fa',
        fontSize: '0.8rem',
        color: '#636e72',
        textAlign: 'center'
      }}>
        누적 클릭: {myTotalClicks.toLocaleString()}회
      </div>
    </aside>
  );
};

export default RightPanel;

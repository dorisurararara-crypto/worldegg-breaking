import React from 'react';

const RightPanel = ({ lang, buyItem, myPoints, clickPower }) => {
  return (
    <aside className="panel right-panel glass">
      <h3>🛒 {lang.shop}</h3>
      <div className="shop-list">
        <div className="shop-item" onClick={() => buyItem(100, 1, 'hammer')}>
          <div className="icon">🔨</div>
          <div className="info">
            <h4>{lang.item1}</h4>
            <div className="price">100 P</div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(500, 5, 'pickaxe')}>
          <div className="icon">⛏️</div>
          <div className="info">
            <h4>{lang.item2}</h4>
            <div className="price">500 P</div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(2000, 25, 'dynamite')}>
          <div className="icon">🧨</div>
          <div className="info">
            <h4>{lang.item3}</h4>
            <div className="price">2k P</div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(10000, 100, 'drill')}>
          <div className="icon">🔩</div>
          <div className="info">
            <h4>{lang.item4}</h4>
            <div className="price">10k P</div>
          </div>
        </div>
        <div className="shop-item" onClick={() => buyItem(50000, 500, 'excavator')}>
          <div className="icon">🚜</div>
          <div className="info">
            <h4>{lang.item5}</h4>
            <div className="price">50k P</div>
          </div>
        </div>
      </div>

      <div className="status-row glass">
        <div>{lang.myPoint}: <span>{myPoints}</span></div>
        <div>{lang.atk}: <span>x{clickPower}</span></div>
      </div>
      
      <div className="info-box">
        <h4>📊 내 정보</h4>
        <p>
          총 클릭: (준비중)
        </p>
      </div>

      <div className="ad-banner">{lang.adText}</div>

    </aside>
  );
};

export default RightPanel;
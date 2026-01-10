import React from 'react';

const LeftPanel = ({ lang, getCountryStats, onlineUsers, prize, getFlagEmoji }) => {
  return (
    <aside className="panel left-panel glass">
      <h3>🌐 {lang.users}</h3>
      <div className="scroll-box">
        {getCountryStats().map(([code, count]) => (
          <div key={code} className="user-row">
            <span className="flag">{getFlagEmoji(code)}</span>
            <span className="count">{count}</span>
          </div>
        ))}
      </div>
      <div className="total-badge">{lang.total}: {Object.keys(onlineUsers).length}</div>

      <div className="info-box">
        <h4>게임 방법</h4>
        <p>
          - 알을 클릭해서 HP를 깎으세요.<br/>
          - 포인트를 모아 상점에서 아이템을 구매하세요.<br/>
          - 전 세계 유저들과 함께 알을 부수세요!
        </p>
      </div>
      <div className="info-box">
        <h4>주의사항</h4>
        <p>
          - 비정상적인 플레이는 제재될 수 있습니다.<br/>
          - 이 게임은 초기화될 수 있습니다.
        </p>
      </div>

      <div className="info-box">
        <h4>이번 회차 상품</h4>
        <p>{prize}</p>
      </div>

      <div className="info-box">
        <h4>제휴문의</h4>
        <p>dorisurararara@gmail.com</p>
      </div>
    </aside>
  );
};

export default LeftPanel;
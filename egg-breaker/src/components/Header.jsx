import React from 'react';

const Header = ({ lang, myCountry, getFlagEmoji, onToggleLanguage, showCountrySelect, changeCountry, toggleMobilePanel }) => {
  return (
    <nav className="navbar">
      {/* 1. Left Group */}
      <div className="nav-left">
        <button className="mobile-toggle-btn icon-only" onClick={() => toggleMobilePanel('left')} aria-label="Users">
          👥
        </button>
        <button className="mobile-toggle-btn icon-only" onClick={() => toggleMobilePanel('info')} aria-label="Hall of Fame">
          🏆
        </button>
      </div>

      {/* 2. Center: Logo */}
      <div className="logo-container">
        <span className="logo-text">{lang.logo}</span>
      </div>

      {/* 3. Right Group */}
      <div className="nav-right">
        <div className="lang-selector">
          <button className="lang-btn-simple" onClick={onToggleLanguage}>
            {getFlagEmoji(myCountry)}
          </button>
          {showCountrySelect && (
            <div className="lang-dropdown">
              <div onClick={() => changeCountry('US')}>🇺🇸 English</div>
              <div onClick={() => changeCountry('KR')}>🇰🇷 한국어</div>
              <div onClick={() => changeCountry('JP')}>🇯🇵 日本語</div>
              <div onClick={() => changeCountry('CN')}>🇨🇳 中文</div>
            </div>
          )}
        </div>
        
        <button className="mobile-toggle-btn icon-only" onClick={() => toggleMobilePanel('right')} aria-label="Shop">
          🛒
        </button>
      </div>
    </nav>
  );
};

export default Header;

import React from 'react';

const Header = ({ lang, myCountry, getFlagEmoji, setShowCountrySelect, showCountrySelect, changeCountry, toggleMobilePanel }) => {
  return (
    <nav className="navbar">
      <div className="nav-left">
        {/* Mobile Hamburger (Left Panel) */}
        <button className="mobile-toggle-btn" onClick={() => toggleMobilePanel('left')}>
          ☰ <span style={{fontSize: '0.8rem', marginLeft: '2px'}}>{lang.users}</span>
        </button>
        <div className="logo">{lang.logo}</div>
      </div>

      <div className="nav-right">
        <div className="lang-selector">
          <button className="lang-btn" onClick={() => setShowCountrySelect(!showCountrySelect)}>
            {getFlagEmoji(myCountry)} {myCountry} ▼
          </button>
          {showCountrySelect && (
            <div className="lang-dropdown">
              <div onClick={() => changeCountry('US')}>🇺🇸 English (US)</div>
              <div onClick={() => changeCountry('KR')}>🇰🇷 한국어 (KR)</div>
              <div onClick={() => changeCountry('JP')}>🇯🇵 日本語 (JP)</div>
              <div onClick={() => changeCountry('CN')}>🇨🇳 中文 (CN)</div>
            </div>
          )}
        </div>
        
        {/* Mobile Shop (Right Panel) */}
        <button className="mobile-toggle-btn" onClick={() => toggleMobilePanel('right')}>
          🛒 <span style={{fontSize: '0.8rem', marginLeft: '2px'}}>{lang.shop}</span>
        </button>
      </div>
    </nav>
  );
};

export default Header;
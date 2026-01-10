import React from 'react';

const Header = ({ lang, myCountry, getFlagEmoji, setShowCountrySelect, showCountrySelect, changeCountry }) => {
  return (
    <nav className="navbar">
      <div className="logo">{lang.logo}</div>
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
    </nav>
  );
};

export default Header;
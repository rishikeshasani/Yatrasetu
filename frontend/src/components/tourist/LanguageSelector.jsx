import React from 'react';
import { useTranslation } from 'react-i18next';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', short: 'HI', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', short: 'TE', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', short: 'TA', flag: '🇮🇳' }
];

export default function LanguageSelector({ compact = false }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const handleChange = (code) => {
    i18n.changeLanguage(code);
  };

  if (compact) {
    return (
      <div className="language-selector-compact">
        <span className="lang-globe-icon" aria-hidden="true">🌐</span>
        <select
          value={currentLang}
          onChange={(e) => handleChange(e.target.value)}
          className="lang-select-dropdown"
          aria-label="Select Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="language-selector-pills" role="group" aria-label="Language Selector">
      <span className="lang-label-icon">🌐</span>
      {LANGUAGES.map((l) => {
        const isActive = currentLang === l.code;
        return (
          <button
            key={l.code}
            type="button"
            className={`lang-pill-btn ${isActive ? 'active' : ''}`}
            onClick={() => handleChange(l.code)}
            title={l.label}
          >
            <span className="lang-flag">{l.flag}</span>
            <span className="lang-name">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}

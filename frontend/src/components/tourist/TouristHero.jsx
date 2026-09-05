import React from 'react';
import { useTranslation } from 'react-i18next';
import { getShrineImage } from '../../utils/shrineImages';

export default function TouristHero({ selectedSite, onExploreClick, onLiveStatusClick }) {
  const { t } = useTranslation();
  const heroImage = getShrineImage(selectedSite?.id || 'TS001');
  const siteName = selectedSite?.name || 'Kedarnath Temple';

  return (
    <div className="tourist-hero-banner" style={{ backgroundImage: `url(${heroImage})` }}>
      <div className="tourist-hero-overlay"></div>
      <div className="tourist-hero-content">
        <div className="hero-badge-pill">
          <span className="hero-sparkle">✨</span>
          <span>{t('hero.welcomeBadge')}</span>
        </div>

        <h1 className="hero-title">{t('hero.title')}</h1>
        <p className="hero-subtitle">{t('hero.subtitle')}</p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="hero-btn-primary"
            onClick={onExploreClick}
          >
            <span>🏛️</span>
            <span>{t('hero.exploreCta')}</span>
          </button>
          <button
            type="button"
            className="hero-btn-secondary"
            onClick={onLiveStatusClick}
          >
            <span>📡</span>
            <span>{t('hero.liveStatusCta')}</span>
          </button>
        </div>

        <div className="hero-stats-grid">
          <div className="hero-stat-card">
            <span className="stat-icon">🕉️</span>
            <div className="stat-text">
              <strong className="stat-title">{t('hero.statDestinations')}</strong>
              <span className="stat-sub">{t('hero.statDestinationsSub')}</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <span className="stat-icon">📹</span>
            <div className="stat-text">
              <strong className="stat-title">{t('hero.statCCTV')}</strong>
              <span className="stat-sub">{t('hero.statCCTVSub')}</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <span className="stat-icon">⚡</span>
            <div className="stat-text">
              <strong className="stat-title">{t('hero.statReroute')}</strong>
              <span className="stat-sub">{t('hero.statRerouteSub')}</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <span className="stat-icon">🛡️</span>
            <div className="stat-text">
              <strong className="stat-title">{t('hero.statSafety')}</strong>
              <span className="stat-sub">{t('hero.statSafetySub')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

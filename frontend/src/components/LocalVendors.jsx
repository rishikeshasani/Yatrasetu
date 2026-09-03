import { useState, useMemo } from 'react';

export default function LocalVendors({ vendors, siteName }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = useMemo(() => {
    const set = new Set();
    vendors.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    if (selectedCategory === 'ALL') return vendors;
    return vendors.filter((v) => v.category === selectedCategory);
  }, [vendors, selectedCategory]);

  return (
    <section className="vendors-section">
      <div className="section-header-row">
        <div>
          <div className="title-with-badge">
            <h2 className="section-title">
              <span className="title-icon">🪔</span> Local Pilgrim Bazaar & Sacred Artisans
            </h2>
            <span className="vocal-local-badge">Vocal for Local</span>
          </div>
          <p className="section-subtitle">
            Support authentic shrine-side local artisans, organic prasad bhandars, and certified mountain vendors near {siteName || 'the Temple'}.
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="vendor-category-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`vendor-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'ALL' ? '🏪 All Vendors' : cat}
          </button>
        ))}
      </div>

      {/* Vendor Cards Grid */}
      <div className="vendors-grid">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-main-info">
                <h3 className="vendor-name">
                  {vendor.name}
                  {vendor.verified && (
                    <span className="verified-icon" title="Temple Board Verified Vendor">✓</span>
                  )}
                </h3>
                <span className="vendor-category-tag">{vendor.category}</span>
              </div>
              <div className="vendor-rating-box">
                <span className="star-icon">★</span>
                <span className="rating-num">{vendor.rating || '4.8'}</span>
                <span className="rating-count">({vendor.reviews_count || '150+'})</span>
              </div>
            </div>

            <div className="vendor-location-line">
              <span className="loc-pin">📍</span>
              <span>{vendor.location || 'Near Temple Entrance'}</span>
            </div>

            <div className="vendor-specialty-box">
              <span className="specialty-label">Specialty:</span>
              <p className="specialty-text">{vendor.specialty || 'Traditional Prasad and Authentic Mountain Offerings'}</p>
            </div>

            <div className="vendor-pricing-bar">
              <div className="price-tag">
                <span className="price-label">Price Range:</span>
                <span className="price-val">{vendor.price_range || '₹50 - ₹500'}</span>
              </div>
            </div>

            {vendor.discount_points_offer && (
              <div className="points-discount-banner">
                <span className="discount-gift">🎁</span>
                <span className="discount-text">{vendor.discount_points_offer}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

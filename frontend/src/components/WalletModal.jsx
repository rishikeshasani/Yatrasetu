import { useState } from 'react';

export default function WalletModal({ isOpen, onClose, wallet, pendingReward, onRedeem }) {
  const [redeemedVoucher, setRedeemedVoucher] = useState(null);

  if (!isOpen) return null;

  const points = wallet?.total_points ?? 260;
  const history = wallet?.history ?? [];
  const tier = wallet?.tier || 'Dharma Guardian (Tier 2)';

  const vouchers = [
    { id: 'vouch_darshan', title: 'Priority Fast-Track Darshan Pass', cost: 150, icon: '🎫', desc: 'Valid for next scheduled Aarti slot' },
    { id: 'vouch_prasad', title: 'Special Mahaprasad Box Voucher', cost: 80, icon: '🥥', desc: 'Redeemable at any verified temple prasad stall' },
    { id: 'vouch_shuttle', title: 'Eco Battery Shuttle Bus Free Pass', cost: 50, icon: '🚐', desc: 'Unlimited rides between Parking & Temple Gate' },
    { id: 'vouch_artisan', title: '₹100 Local Artisan Handicraft Voucher', cost: 40, icon: '🪔', desc: 'Applicable on verified local vendor stalls' },
  ];

  const handleRedeemClick = (voucher) => {
    if (points >= voucher.cost) {
      setRedeemedVoucher(voucher);
      if (onRedeem) onRedeem(voucher);
    } else {
      alert(`Insufficient Punya Points! You need ${voucher.cost - points} more points.`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content wallet-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-box">
            <span className="modal-icon">🪙</span>
            <div>
              <h2 className="modal-title">Green Pilgrim Yatra Wallet</h2>
              <span className="modal-subtitle">हरित तीर्थयात्री पुण्य मुद्रा</span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Balance Hero Card */}
          <div className="wallet-balance-card">
            <div className="balance-info">
              <span className="balance-label">Total Verified Punya Points</span>
              <div className="balance-value-row">
                <span className="balance-number">{points}</span>
                <span className="balance-unit">Coins</span>
              </div>
              <span className="balance-tier-pill">🛡️ {tier}</span>
            </div>
            <div className="balance-graphic">
              <span className="floating-coin">🪙</span>
            </div>
          </div>

          {/* Pending Reward Notice if alternate route is currently active */}
          {pendingReward?.points > 0 && (
            <div className="pending-reward-modal-banner">
              <div className="pending-modal-left">
                <span className="pending-modal-icon">🎁</span>
                <div>
                  <div className="pending-modal-title">+{pendingReward.points} Punya Points Pending Arrival</div>
                  <div className="pending-modal-sub">
                    En route to <strong>{pendingReward.routeName || 'Alternative Shrine'}</strong>. Points will credit automatically upon verified arrival.
                  </div>
                </div>
              </div>
              <span className="pending-modal-badge">🟡 In Transit</span>
            </div>
          )}

          {/* How to Earn */}
          <div className="earn-ways-box">
            <h3 className="section-mini-heading">💡 How to Earn More Punya Points:</h3>
            <div className="earn-pills-row">
              <span className="earn-pill">✨ Visit Off-Peak Hours (+40 Pts)</span>
              <span className="earn-pill">🌿 Choose Alternative Shrine (+50 Pts)</span>
              <span className="earn-pill">♻️ Eco Cleanliness Reporting (+20 Pts)</span>
            </div>
          </div>

          {/* Redeem Vouchers Section */}
          <div className="vouchers-section">
            <h3 className="section-mini-heading">🎁 Redeem Rewards & Privileges:</h3>
            <div className="vouchers-grid">
              {vouchers.map((v) => {
                const canAfford = points >= v.cost;
                return (
                  <div key={v.id} className="voucher-item">
                    <div className="voucher-left">
                      <span className="voucher-icon">{v.icon}</span>
                      <div className="voucher-details">
                        <strong className="voucher-title">{v.title}</strong>
                        <span className="voucher-desc">{v.desc}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`redeem-btn ${canAfford ? 'can-afford' : 'disabled'}`}
                      onClick={() => handleRedeemClick(v)}
                      disabled={!canAfford}
                    >
                      {v.cost} Pts
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success Notification */}
          {redeemedVoucher && (
            <div className="voucher-success-box">
              <span>🎉 Redeemed <strong>{redeemedVoucher.title}</strong>! Present QR at Temple Reception.</span>
            </div>
          )}

          {/* Transaction History Log */}
          <div className="history-section">
            <h3 className="section-mini-heading">📜 Recent Points History:</h3>
            <div className="history-list">
              {history.map((item, idx) => (
                <div key={item.id || idx} className="history-item">
                  <div className="history-info">
                    <span className="history-reason">{item.reason}</span>
                    <span className="history-time">{item.timestamp || 'Recent'}</span>
                  </div>
                  <span className="history-points">+{item.points} Pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="primary-btn" onClick={onClose}>
            Done & Return to Live Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import './EvaluationStorylineController.css';

export const STORY_STEPS = [
  {
    step: 1,
    title: 'Crowd Rises',
    icon: '📈',
    badge: 'STAGE 1: SATURATION',
    role: 'tourist',
    siteId: 'TS001',
    description: 'Kedarnath Temple suddenly reaches a critical crowd saturation (92% occupancy). Queue wait time escalates to ~180 mins.',
    details: 'Live AI cameras & GPS telemetry detect heavy sanctum queue buildup. The system triggers high-congestion alarms.',
    actionLabel: 'Trigger Crowd Surge'
  },
  {
    step: 2,
    title: 'Govt Sees Surge',
    icon: '🏛️',
    badge: 'STAGE 2: CIVIL & POLICE COMMAND',
    role: 'government',
    siteId: 'TS001',
    description: 'District Administration & Police Command Center receive real-time threshold surge alerts across the Kedarnath corridor.',
    details: 'The GIS Overview displays flashing red saturation warnings. Real-time emergency protocols are initiated.',
    actionLabel: 'Open District Command'
  },
  {
    step: 3,
    title: 'YatraSetu Redistribution',
    icon: '🤖',
    badge: 'STAGE 3: AI CORRIDOR BALANCER',
    role: 'government',
    siteId: 'TS001',
    description: 'YatraSetu AI calculates an optimal dynamic corridor redistribution, recommending diverting 35% of pilgrim traffic to the Chopta/Tungnath circuit.',
    details: 'Pilgrim Incentive Engine is armed with +25 Punya Green Points to motivate voluntary route switches.',
    actionLabel: 'Broadcast Corridor Reroute'
  },
  {
    step: 4,
    title: 'Tourist Alternative Route',
    icon: '🎒',
    badge: 'STAGE 4: PILGRIM SMART ADVISORY',
    role: 'tourist',
    siteId: 'TS001',
    description: 'Pilgrims receive a proactive dynamic advisory on their mobile portal offering the peaceful Tungnath circuit with 70% shorter queues and +25 Punya Points.',
    details: 'Pilgrims accept the green rerouting suggestion and discover verified accommodations along the alternate corridor.',
    actionLabel: 'View Pilgrim Advisory'
  },
  {
    step: 5,
    title: 'Hotel Receives Demand',
    icon: '🏨',
    badge: 'STAGE 5: PERIPHERAL HOSPITALITY',
    role: 'hotel',
    siteId: 'TS001',
    description: 'Peripheral lodge partners along the Chopta-Guptkashi highway receive real-time alerts of incoming redirected pilgrim demand (+120 visitors).',
    details: 'Hotels get instant notice of diverted pilgrims seeking rest stops and overnight stays before ascending.',
    actionLabel: 'View Hotel Surge Demand'
  },
  {
    step: 6,
    title: 'Price & Slots Respond',
    icon: '⚡',
    badge: 'STAGE 6: AUTOMATED RATE ENGINE',
    role: 'hotel',
    siteId: 'TS001',
    description: 'The automated surge pricing algorithm activates dynamic rate adjustments and opens 4 emergency hourly flex-stay buffer rooms.',
    details: 'Hotelier unlocks emergency surge capacity at regulated fair-pricing tiers to absorb highway overflow.',
    actionLabel: 'Trigger Rate & Flex-Stay Response'
  },
  {
    step: 7,
    title: 'Booking Confirmed',
    icon: '🎟️',
    badge: 'STAGE 7: INSTANT RESERVATION',
    role: 'hotel',
    siteId: 'TS001',
    description: 'Devotee instant booking is verified and confirmed with a guaranteed room at Chopta Himalayan Ashrams + fast-track darshan token.',
    details: 'Booking #YS-SURGE-101 created and synchronized across the YatraSetu ledger.',
    actionLabel: 'Confirm Devotee Reservation'
  },
  {
    step: 8,
    title: 'Inventory Updated',
    icon: '🛏️',
    badge: 'STAGE 8: LIVE TERMINAL SYNC',
    role: 'hotel',
    siteId: 'TS001',
    description: 'Lodge inventory updates in real time (Room 206 assigned), and the contactless QR check-in terminal is activated for seamless arrival.',
    details: 'Full circular workflow complete: Pilgrims are safely balanced, local economy benefits, and sanctum congestion is relieved.',
    actionLabel: 'Sync Inventory & Complete Story'
  }
];

export default function EvaluationStorylineController({
  activeRole,
  onSwitchRole,
  selectedSiteId,
  onSelectSite,
  currentStoryStep,
  onSetStoryStep,
  onTriggerSurge,
  onTriggerReroute,
  onTriggerHotelSurge,
  onResetStory
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const timerRef = useRef(null);

  const activeStepData = STORY_STEPS.find((s) => s.step === currentStoryStep) || STORY_STEPS[0];

  const handleStepClick = (stepNum) => {
    setIsPlaying(false);
    applyStep(stepNum);
  };

  const applyStep = (stepNum) => {
    const target = STORY_STEPS.find((s) => s.step === stepNum);
    if (!target) return;

    if (onSetStoryStep) onSetStoryStep(stepNum);
    if (onSelectSite && target.siteId) onSelectSite(target.siteId);
    if (onSwitchRole && target.role) onSwitchRole(target.role);

    // Apply specific stage actions
    if (stepNum === 1 || stepNum === 2) {
      if (onTriggerSurge) onTriggerSurge(true);
    }
    if (stepNum >= 3) {
      if (onTriggerReroute) onTriggerReroute(true);
    }
    if (stepNum >= 5) {
      if (onTriggerHotelSurge) onTriggerHotelSurge(true);
    }
    if (stepNum === 1) {
      if (onTriggerReroute) onTriggerReroute(false);
      if (onTriggerHotelSurge) onTriggerHotelSurge(false);
    }
  };

  const handleNext = () => {
    const nextStep = currentStoryStep < 8 ? currentStoryStep + 1 : 1;
    applyStep(nextStep);
  };

  const handlePrev = () => {
    const prevStep = currentStoryStep > 1 ? currentStoryStep - 1 : 8;
    applyStep(prevStep);
  };

  const toggleAutoplay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (onResetStory) onResetStory();
    applyStep(1);
  };

  // Autoplay effect: Advances every 4.5 seconds
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onSetStoryStep((curr) => {
          const next = curr < 8 ? curr + 1 : 1;
          applyStep(next);
          return next;
        });
      }, 4500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  return (
    <div className={`storyline-master-bar ${isCollapsed ? 'is-collapsed' : ''}`}>
      {/* Top Banner Header */}
      <div className="storyline-header">
        <div className="storyline-title-group">
          <span className="storyline-pulse-badge">
            <span className="pulse-dot"></span> LIVE EVALUATION STORYLINE
          </span>
          <h2 className="storyline-main-heading">
            Grand End-to-End Workflow: <em>"Crowd Rises at Kedarnath → Cross-Dashboard Resolution"</em>
          </h2>
        </div>

        <div className="storyline-ctrl-buttons">
          <button
            type="button"
            className={`btn-story-play ${isPlaying ? 'is-playing' : ''}`}
            onClick={toggleAutoplay}
            title={isPlaying ? 'Pause auto-walkthrough' : 'Autoplay continuous presentation story'}
          >
            <span>{isPlaying ? '⏸ Pause Story' : '▶ Autoplay Story (4.5s)'}</span>
          </button>

          <button
            type="button"
            className="btn-story-nav"
            onClick={handlePrev}
            title="Go to previous step"
          >
            ◀ Prev
          </button>

          <button
            type="button"
            className="btn-story-nav btn-story-next"
            onClick={handleNext}
            title="Go to next step"
          >
            Next ▶
          </button>

          <button
            type="button"
            className="btn-story-reset"
            onClick={handleReset}
            title="Reset narrative state to Step 1"
          >
            🔄 Reset
          </button>

          <button
            type="button"
            className="btn-story-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand evaluation flow bar' : 'Minimize evaluation flow bar'}
          >
            {isCollapsed ? 'Expand ▼' : 'Minimize ▲'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Step-by-Step Progress Pipeline */}
          <div className="storyline-steps-track">
            {STORY_STEPS.map((s) => {
              const isActive = s.step === currentStoryStep;
              const isPast = s.step < currentStoryStep;
              return (
                <button
                  key={s.step}
                  type="button"
                  className={`story-step-pill ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''}`}
                  onClick={() => handleStepClick(s.step)}
                  title={`Step ${s.step}: ${s.title}`}
                >
                  <span className="step-num-badge">{s.step}</span>
                  <span className="step-icon">{s.icon}</span>
                  <span className="step-label">{s.title}</span>
                  {isActive && <span className="step-live-arrow">▼</span>}
                </button>
              );
            })}
          </div>

          {/* Active Step Narrative Card */}
          <div className="storyline-narrative-card">
            <div className="narrative-left">
              <div className="narrative-badge-row">
                <span className="narrative-badge">{activeStepData.badge}</span>
                <span className="narrative-role-pill">
                  Active View: <strong>{activeStepData.role.toUpperCase()}</strong>
                </span>
                <span className="narrative-step-indicator">
                  Step {activeStepData.step} of 8
                </span>
              </div>
              <h3 className="narrative-headline">
                {activeStepData.icon} {activeStepData.description}
              </h3>
              <p className="narrative-subtext">
                {activeStepData.details}
              </p>
            </div>

            <div className="narrative-right">
              <div className="narrative-arrow-flow">
                <span className="flow-from">
                  {currentStoryStep === 1 ? 'Start' : STORY_STEPS[currentStoryStep - 2]?.title}
                </span>
                <span className="flow-icon">➔</span>
                <span className="flow-curr">
                  {activeStepData.title}
                </span>
                <span className="flow-icon">➔</span>
                <span className="flow-to">
                  {currentStoryStep === 8 ? 'End' : STORY_STEPS[currentStoryStep]?.title}
                </span>
              </div>

              <button
                type="button"
                className="btn-narrative-action"
                onClick={handleNext}
              >
                <span>Continue Workflow ({currentStoryStep < 8 ? `Step ${currentStoryStep + 1}` : 'Restart'})</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';
import { Zap, Code2, Sparkles } from 'lucide-react';
import { type WorkflowMode, WORKFLOW_MODES } from '../../types/workflow';

interface ModeSelectorProps {
  currentMode: WorkflowMode;
  onSelectMode: (mode: WorkflowMode) => void;
}

export default function ModeSelector({ currentMode, onSelectMode }: ModeSelectorProps) {
  const activeConfig = WORKFLOW_MODES[currentMode];

  return (
    <div className="mode-selector-wrapper">
      <div className="mode-selector-header">
        <div className="mode-selector-info">
          <div className="mode-badge-pill" style={{ color: activeConfig.accentColor, background: activeConfig.badgeBg, borderColor: `${activeConfig.accentColor}44` }}>
            <span className="mode-indicator-dot" style={{ background: activeConfig.accentColor }} />
            <span>{activeConfig.badge}</span>
          </div>
          <span className="mode-tagline-text">{activeConfig.tagline}</span>
        </div>

        {/* Apple-style Segmented Control */}
        <div className="mode-segmented-control" role="tablist" aria-label="Workflow Mode Selection">
          <button
            type="button"
            role="tab"
            aria-selected={currentMode === 'basic'}
            className={`mode-segment-btn ${currentMode === 'basic' ? 'active active-basic' : ''}`}
            onClick={() => onSelectMode('basic')}
          >
            <Zap size={14} className="mode-btn-icon" />
            <span>Basic</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentMode === 'pro'}
            className={`mode-segment-btn ${currentMode === 'pro' ? 'active active-pro' : ''}`}
            onClick={() => onSelectMode('pro')}
          >
            <Code2 size={14} className="mode-btn-icon" />
            <span>Pro</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentMode === 'advanced'}
            className={`mode-segment-btn ${currentMode === 'advanced' ? 'active active-advanced' : ''}`}
            onClick={() => onSelectMode('advanced')}
          >
            <Sparkles size={14} className="mode-btn-icon" />
            <span>Advanced</span>
          </button>
        </div>
      </div>
    </div>
  );
}


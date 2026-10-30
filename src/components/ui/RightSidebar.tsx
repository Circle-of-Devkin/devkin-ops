import React, { useState } from 'react';
import { Settings, Palette, Moon, Sun, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { appVersion } from '../../lib/appVersion';
import BrandMark from './BrandMark';

export default function RightSidebar({ theme, onSelectTheme }) {
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'settings' | 'theme'

  const themeOptions = [
    {
      id: 'dark',
      name: 'Dark Mode',
      desc: 'Default dark theme',
      icon: Moon,
      bg: '#000000',
      cardBg: '#1c1c1e',
      border: 'rgba(255, 255, 255, 0.15)'
    },
    {
      id: 'light',
      name: 'Light Mode',
      desc: 'Clean light theme',
      icon: Sun,
      bg: '#f2f2f7',
      cardBg: '#ffffff',
      border: 'rgba(0, 0, 0, 0.15)'
    }
  ];

  return (
    <div className="right-sidebar">
      {currentView === 'main' && (
        <div className="right-sidebar-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, height: '100%' }}>
          <div className="settings-menu-list">
            {/* Top Card Button: Settings (Matches User Photo) */}
            <div className="settings-menu-card" onClick={() => setCurrentView('settings')}>
              <div className="settings-menu-icon" style={{ background: 'rgba(0, 122, 255, 0.15)', color: '#007aff' }}>
                <Settings size={18} />
              </div>
              <div className="settings-menu-content">
                <div className="settings-menu-title" style={{ fontSize: '14px', fontWeight: 600 }}>Settings</div>
              </div>
            </div>
          </div>

          {/* About App Pinned at Very Bottom */}
          <div className="settings-menu-card" style={{ cursor: 'default', marginTop: 'auto' }}>
            <div className="settings-menu-icon" style={{ background: '#171a20', padding: 0, overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.28)' }}>
              <BrandMark size={34} />
            </div>
            <div className="settings-menu-content">
              <div className="settings-menu-title">About DevKin Ops</div>
              <div className="settings-menu-subtitle">v{appVersion} Desktop • Multi-Account</div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'settings' && (
        <div className="right-sidebar-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, height: '100%' }}>
          <div>
            <div className="right-sidebar-header" style={{ marginBottom: '16px' }}>
              <button className="btn-back-settings" onClick={() => setCurrentView('main')}>
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>
            </div>

            <div className="settings-menu-list">
              <div className="section-label">Settings Menu</div>

              {/* Theme & Appearance Option */}
              <div className="settings-menu-card" onClick={() => setCurrentView('theme')}>
                <div className="settings-menu-icon" style={{ background: 'rgba(191, 90, 242, 0.15)', color: '#bf5af2' }}>
                  <Palette size={18} />
                </div>
                <div className="settings-menu-content">
                  <div className="settings-menu-title">Theme & Appearance</div>
                  <div className="settings-menu-subtitle">
                    Active: {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--ios-text-muted)" />
              </div>
            </div>
          </div>

          {/* About App Pinned at Very Bottom */}
          <div className="settings-menu-card" style={{ cursor: 'default', marginTop: 'auto' }}>
            <div className="settings-menu-icon" style={{ background: '#171a20', padding: 0, overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.28)' }}>
              <BrandMark size={34} />
            </div>
            <div className="settings-menu-content">
              <div className="settings-menu-title">About DevKin Ops</div>
              <div className="settings-menu-subtitle">v{appVersion} Desktop • Multi-Account</div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'theme' && (
        <div className="right-sidebar-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, height: '100%' }}>
          <div>
            <div className="right-sidebar-header" style={{ marginBottom: '16px' }}>
              <button className="btn-back-settings" onClick={() => setCurrentView('settings')}>
                <ChevronLeft size={18} />
                <span>Back to Settings</span>
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-section-title" style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>
                <Palette size={16} color="#bf5af2" />
                <span>Theme Mode</span>
              </div>
              <div className="settings-section-desc" style={{ marginBottom: '16px' }}>
                Choose your preferred visual appearance mode:
              </div>

              <div className="theme-options-grid">
                {themeOptions.map((opt) => {
                  const IconComponent = opt.icon;
                  const isSelected = theme === opt.id || (theme === 'midnight' && opt.id === 'dark');
                  return (
                    <div
                      key={opt.id}
                      className={`theme-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectTheme(opt.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="theme-color-preview"
                          style={{ background: opt.bg, border: `1px solid ${opt.border}` }}
                        >
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '2px',
                              background: opt.cardBg
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="theme-name">{opt.name}</div>
                          <div className="theme-desc">{opt.desc}</div>
                        </div>
                        {isSelected ? (
                          <Check size={16} color="var(--ios-blue)" />
                        ) : (
                          <IconComponent size={15} color="#8e8e93" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* About App Pinned at Very Bottom */}
          <div className="settings-menu-card" style={{ cursor: 'default', marginTop: 'auto' }}>
            <div className="settings-menu-icon" style={{ background: '#171a20', padding: 0, overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.28)' }}>
              <BrandMark size={34} />
            </div>
            <div className="settings-menu-content">
              <div className="settings-menu-title">About DevKin Ops</div>
              <div className="settings-menu-subtitle">v{appVersion} Desktop • Multi-Account</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

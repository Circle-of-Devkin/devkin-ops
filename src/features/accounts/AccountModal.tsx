import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Shield, Folder, Check, AlertCircle, Loader2, Copy, ExternalLink, Github, LogIn } from 'lucide-react';
import { apiBridge } from '../../services/apiBridge';

export default function AccountModal({ isOpen, onClose, onSaveAccount }) {
  const [authType, setAuthType] = useState('oauth'); // 'oauth' | 'pat' | 'ssh'
  const [accountName, setAccountName] = useState('');

  // OAuth Device Flow State
  const [deviceFlow, setDeviceFlow] = useState(null); // { userCode, deviceCode, verificationUri, interval }
  const [isStartingFlow, setIsStartingFlow] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // PAT State
  const [patToken, setPatToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [validatedUser, setValidatedUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // SSH State
  const [sshUsername, setSshUsername] = useState('');
  const [sshEmail, setSshEmail] = useState('');
  const [sshKeyPath, setSshKeyPath] = useState('');

  const pollIntervalRef = useRef(null);

  // Cleanup polling timer on unmount or tab change or modal close
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      resetForm();
    }
  }, [isOpen]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      if (typeof pollIntervalRef.current === 'function') {
        pollIntervalRef.current();
      } else if (pollIntervalRef.current.stop) {
        pollIntervalRef.current.stop();
      } else {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  const resetForm = () => {
    setDeviceFlow(null);
    setIsStartingFlow(false);
    setIsPolling(false);
    setErrorMsg('');
    setPatToken('');
    setValidatedUser(null);
    setAccountName('');
  };

  // Start OAuth Device Flow
  const handleStartOAuth = async () => {
    setErrorMsg('');
    setIsStartingFlow(true);
    stopPolling();

    try {
      const res = await apiBridge.startDeviceFlow();
      if (res.success) {
        setDeviceFlow(res);
        setIsPolling(true);

        // Open browser automatically
        apiBridge.openExternalUrl(res.verificationUri);

        // Start dynamic polling loop
        let active = true;
        let timerId = null;
        let delayMs = Math.max(res.interval || 5, 5) * 1000 + 1000; // 6s interval

        const runPoll = async () => {
          if (!active) return;
          const pollRes = await apiBridge.pollDeviceToken(res.deviceCode);

          if (pollRes.success && pollRes.accessToken) {
            active = false;
            stopPolling();
            const profileRes = await apiBridge.validatePatToken(pollRes.accessToken);
            if (profileRes.success) {
              const user = profileRes.user;
              const newAccount = {
                id: Date.now().toString(),
                name: accountName.trim() || user.name || user.username,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                authType: 'oauth',
                patToken: pollRes.accessToken
              };
              onSaveAccount(newAccount);
              onClose();
              return;
            } else {
              setErrorMsg(profileRes.error || 'Failed to fetch user profile after login.');
              return;
            }
          }

          if (pollRes.pending) {
            if (pollRes.slowDown && pollRes.nextInterval) {
              delayMs = (pollRes.nextInterval + 2) * 1000;
            }
            if (active) {
              timerId = setTimeout(runPoll, delayMs);
            }
            return;
          }

          if (pollRes.error) {
            active = false;
            stopPolling();
            setErrorMsg(pollRes.error);
            return;
          }

          if (active) {
            timerId = setTimeout(runPoll, delayMs);
          }
        };

        pollIntervalRef.current = () => {
          active = false;
          if (timerId) clearTimeout(timerId);
        };

        timerId = setTimeout(runPoll, delayMs);
      } else {
        setErrorMsg(res.error || 'Unable to connect to GitHub OAuth.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error initializing GitHub login.');
    } finally {
      setIsStartingFlow(false);
    }
  };

  const handleCopyUserCode = () => {
    if (deviceFlow?.userCode) {
      navigator.clipboard.writeText(deviceFlow.userCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleValidatePat = async () => {
    if (!patToken.trim()) {
      setErrorMsg('Please enter a GitHub Personal Access Token.');
      return;
    }
    setErrorMsg('');
    setValidating(true);

    try {
      const res = await apiBridge.validatePatToken(patToken.trim());
      if (res.success) {
        setValidatedUser(res.user);
        if (!accountName) {
          setAccountName(res.user.name || res.user.username);
        }
      } else {
        setErrorMsg(res.error || 'Invalid token or token validation failed.');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Unexpected error validating token.');
    } finally {
      setValidating(false);
    }
  };

  const handleBrowseSshKey = async () => {
    const filePath = await apiBridge.selectSshFile();
    if (filePath) {
      setSshKeyPath(filePath);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (authType === 'oauth') {
      if (!isPolling && !deviceFlow) {
        handleStartOAuth();
      }
      return;
    }

    if (authType === 'pat') {
      if (!validatedUser) {
        setErrorMsg('Please click "Validate" to verify your token before saving.');
        return;
      }

      const newAccount = {
        id: Date.now().toString(),
        name: accountName.trim() || validatedUser.name,
        username: validatedUser.username,
        email: validatedUser.email,
        avatarUrl: validatedUser.avatarUrl,
        authType: 'pat',
        patToken: patToken.trim()
      };

      onSaveAccount(newAccount);
      onClose();
    } else {
      // SSH Key
      if (!accountName.trim() || !sshUsername.trim() || !sshEmail.trim() || !sshKeyPath.trim()) {
        setErrorMsg('Please fill in all fields including Private Key file path.');
        return;
      }

      const newAccount = {
        id: Date.now().toString(),
        name: accountName.trim(),
        username: sshUsername.trim(),
        email: sshEmail.trim(),
        avatarUrl: `https://github.com/${sshUsername.trim()}.png`,
        authType: 'ssh',
        sshKeyPath: sshKeyPath.trim()
      };

      onSaveAccount(newAccount);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Add GitHub Account</div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Top Floating Recommended Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.12), rgba(48, 209, 88, 0.15))',
            border: '1px solid rgba(48, 209, 88, 0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#30d158',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Direct Login — 1-Click Access (Recommended)</span>
          </div>
        </div>

        {/* iOS Segmented Control Tabs */}
        <div className="tab-selector">
          <button
            type="button"
            className={`tab-btn ${authType === 'oauth' ? 'active' : ''}`}
            onClick={() => {
              stopPolling();
              setAuthType('oauth');
              setErrorMsg('');
            }}
          >
            Direct Login
          </button>
          <button
            type="button"
            className={`tab-btn ${authType === 'pat' ? 'active' : ''}`}
            onClick={() => {
              stopPolling();
              setAuthType('pat');
              setErrorMsg('');
            }}
          >
            PAT Token
          </button>
          <button
            type="button"
            className={`tab-btn ${authType === 'ssh' ? 'active' : ''}`}
            onClick={() => {
              stopPolling();
              setAuthType('ssh');
              setErrorMsg('');
            }}
          >
            SSH Key
          </button>
        </div>

        {errorMsg && (
          <div className="alert-banner alert-danger">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label-clean">Account Label (Optional)</label>
            <input
              type="text"
              className="input-clean"
              placeholder="e.g. Personal Account, Work GitHub"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          {authType === 'oauth' ? (
            <div style={{ background: 'var(--ios-card)', border: '1px solid var(--ios-border)', padding: '20px', borderRadius: '12px', textAlign: 'center', marginTop: '12px' }}>
              {!deviceFlow ? (
                <>
                  <Github size={40} color="#007aff" style={{ marginBottom: '10px' }} />
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ios-text-primary)', marginBottom: '6px' }}>
                    1-Click GitHub Sign In
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ios-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                    Click below to open GitHub in your browser and authorize DevKin Ops automatically. No manual token creation or SSH key setup required!
                  </div>

                  <button
                    type="button"
                    className="btn-select-folder"
                    style={{ background: '#007aff', margin: '0 auto', padding: '10px 24px', fontSize: '14px' }}
                    onClick={handleStartOAuth}
                    disabled={isStartingFlow}
                  >
                    {isStartingFlow ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                    <span>Sign In with GitHub</span>
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--ios-text-muted)', marginBottom: '8px' }}>
                    Enter this code in your GitHub browser window:
                  </div>

                  {/* High Visibility User Code Display */}
                  <div style={{ background: 'var(--ios-input)', border: '1px dashed #007aff', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: '12px 0' }}>
                    <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '24px', fontWeight: 700, letterSpacing: '4px', color: '#007aff' }}>
                      {deviceFlow.userCode}
                    </span>
                    <button
                      type="button"
                      className="btn-add-account"
                      style={{ fontSize: '12px' }}
                      onClick={handleCopyUserCode}
                    >
                      <Copy size={14} />
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#30d158', fontSize: '13px', margin: '14px 0' }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Waiting for GitHub approval in browser...</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn-select-folder"
                      style={{ background: 'var(--ios-input)', color: 'var(--ios-text-primary)', fontSize: '12px' }}
                      onClick={() => apiBridge.openExternalUrl(deviceFlow.verificationUri)}
                    >
                      <ExternalLink size={14} /> Open Browser Again
                    </button>
                    <button
                      type="button"
                      className="btn-select-folder"
                      style={{ background: 'rgba(255,69,58,0.15)', color: '#ff453a', fontSize: '12px' }}
                      onClick={stopPolling}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : authType === 'pat' ? (
            <>
              <div className="form-field">
                <label className="form-label-clean">GitHub Token (PAT)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    className="input-clean"
                    style={{ flex: 1 }}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={patToken}
                    onChange={(e) => {
                      setPatToken(e.target.value);
                      setValidatedUser(null);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-select-folder"
                    style={{ background: '#007aff', padding: '0 16px' }}
                    onClick={handleValidatePat}
                    disabled={validating}
                  >
                    {validating ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Validate
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ios-text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                  Create token at GitHub Settings -&gt; Developer Settings -&gt; Personal Access Tokens (repo scope required).
                </div>
              </div>

              {validatedUser && (
                <div className="alert-banner alert-success" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <img
                    src={validatedUser.avatarUrl}
                    alt={validatedUser.username}
                    style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--ios-border)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: '#30d158' }}>Validated: @{validatedUser.username}</div>
                    <div style={{ fontSize: '11px', opacity: 0.9, color: 'var(--ios-text-primary)' }}>{validatedUser.email}</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label-clean">GitHub Username</label>
                <input
                  type="text"
                  className="input-clean"
                  placeholder="octocat"
                  value={sshUsername}
                  onChange={(e) => setSshUsername(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label-clean">Git Commit Email</label>
                <input
                  type="email"
                  className="input-clean"
                  placeholder="user@example.com"
                  value={sshEmail}
                  onChange={(e) => setSshEmail(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label-clean">Private SSH Key File</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-clean"
                    style={{ flex: 1, fontFamily: 'SF Pro Text, sans-serif' }}
                    placeholder="/home/user/.ssh/id_rsa_work"
                    value={sshKeyPath}
                    onChange={(e) => setSshKeyPath(e.target.value)}
                  />
                  <button type="button" className="btn-select-folder" style={{ background: 'var(--ios-input)', color: 'var(--ios-text-primary)' }} onClick={handleBrowseSshKey}>
                    <Folder size={15} /> Browse
                  </button>
                </div>
              </div>
            </>
          )}

          {authType !== 'oauth' && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-select-folder"
                style={{ background: 'var(--ios-input)', color: 'var(--ios-text-primary)', flex: 1, justifyContent: 'center' }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-select-folder"
                style={{ background: '#007aff', flex: 1, justifyContent: 'center' }}
              >
                Save Account
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

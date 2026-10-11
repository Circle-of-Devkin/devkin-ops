import React, { useState, useEffect } from 'react';
import { UploadCloud, PlusCircle, Globe, Lock, AlertCircle, CheckCircle2, Loader2, UserPlus, Check, ExternalLink, Copy } from 'lucide-react';
import { apiBridge } from '../../services/apiBridge';

export default function PublishPanel({
  folderPath,
  gitStatus,
  accounts,
  activeAccountId,
  onSelectAccount,
  onPublish,
  onOpenAddModal
}) {
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || (accounts.length > 0 ? accounts[0] : null);

  const [commitMessage, setCommitMessage] = useState('Updates');
  const [branchName, setBranchName] = useState('main');
  const [createNewRemote, setCreateNewRemote] = useState(false);
  const [remoteRepoName, setRemoteRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [repoDescription, setRepoDescription] = useState('');

  const [publishing, setPublishing] = useState(false);
  const [publishStage, setPublishStage] = useState('Checking repository');
  const [resultMsg, setResultMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [lastPublishOptions, setLastPublishOptions] = useState(null);
  const publishStages = ['Checking repository', 'Staging changes', 'Creating commit', 'Pushing to GitHub'];

  // Auto populate remoteRepoName from folder name
  useEffect(() => {
    if (gitStatus && gitStatus.folderName) {
      setRemoteRepoName(gitStatus.folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
    }
  }, [gitStatus]);

  // If no remote url exists, auto-check create new remote
  useEffect(() => {
    if (gitStatus && gitStatus.isGitRepo && !gitStatus.remoteUrl) {
      setCreateNewRemote(true);
    }
  }, [gitStatus]);

  useEffect(() => {
    if (!publishing) return undefined;
    let stageIndex = 0;
    setPublishStage(publishStages[stageIndex]);
    const timer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, publishStages.length - 1);
      setPublishStage(publishStages[stageIndex]);
    }, 1400);
    return () => clearInterval(timer);
  }, [publishing]);

  const publish = async (options) => {
    setPublishing(true);
    setResultMsg({ type: 'info', text: 'Publishing code to GitHub... Please wait.' });

    try {
      const res = await onPublish(options);

      if (res.success) {
        setResultMsg({
          type: 'success',
          text: res.message || `Successfully published to @${activeAccount.username}!`,
          repoUrl: res.repoUrl,
          branchName: res.branchName || branchName.trim() || 'main'
        });
      } else {
        setResultMsg({ type: 'danger', text: res.error || 'Publishing failed.' });
      }
    } catch (err) {
      setResultMsg({ type: 'danger', text: err.message || 'An error occurred while publishing.' });
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    if (!folderPath) {
      setResultMsg({ type: 'danger', text: 'Please select a project folder in Step 1 first.' });
      return;
    }

    if (!activeAccount) {
      setResultMsg({ type: 'danger', text: 'Please add or select a GitHub account first.' });
      return;
    }

    if (createNewRemote && !remoteRepoName.trim()) {
      setResultMsg({ type: 'danger', text: 'Please enter a name for the GitHub repository.' });
      return;
    }

    if (!confirmed) {
      setResultMsg({ type: 'danger', text: 'Please confirm the account, repository, branch, and file changes before publishing.' });
      return;
    }

    const options = {
      folderPath,
      account: activeAccount,
      commitMessage: commitMessage.trim() || 'Updates',
      branchName: branchName.trim() || 'main',
      createNewRemote,
      remoteRepoName: remoteRepoName.trim(),
      isPrivate,
      description: repoDescription.trim()
    };
    setLastPublishOptions(options);
    await publish(options);
  };

  const handleRetry = async () => {
    if (lastPublishOptions && !publishing) {
      await publish(lastPublishOptions);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-panel">
      <div className="panel-header">
        <span className="step-badge">Step 2</span>
        <div>
          <div className="panel-title">Target Account & Publish</div>
          <div className="panel-subtitle">Select your account, enter commit message and publish in 1 click</div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div style={{ background: 'var(--ios-input)', border: '1px solid var(--ios-border)', padding: '24px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
          <UserPlus size={32} color="#007aff" style={{ marginBottom: '8px' }} />
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ios-text-primary)', marginBottom: '4px' }}>Connect your GitHub account to get started</div>
          <div style={{ fontSize: '13px', color: 'var(--ios-text-muted)', marginBottom: '16px' }}>
            Choose OAuth, PAT Token, or SSH Key. Your credentials stay local to this device.
          </div>
          <button className="btn-select-folder" style={{ margin: '0 auto' }} onClick={onOpenAddModal}>
            + Add GitHub Account
          </button>
        </div>
      ) : activeAccount ? (
        <div className="publish-destination-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={activeAccount.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
              alt={activeAccount.name}
              style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255, 255, 255, 0.2)' }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ios-text-primary)', marginBottom: '2px' }}>
                Publishing as: <span style={{ color: '#007aff' }}>{activeAccount.name}</span> (@{activeAccount.username})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ios-text-muted)' }}>
                Commit Email: {activeAccount.email} • {(activeAccount.authType === 'oauth' || (activeAccount.patToken && activeAccount.patToken.startsWith('gho_'))) ? 'Direct OAuth Auth' : activeAccount.authType === 'pat' ? 'PAT HTTPS Auth' : 'SSH Key Auth'}
              </div>
            </div>
          </div>
          <label className="account-select-label">
            Target account
            <select className="account-select" value={activeAccountId || activeAccount.id} onChange={(e) => onSelectAccount?.(e.target.value)}>
              {accounts.map((account) => <option key={account.id} value={account.id}>@{account.username}</option>)}
            </select>
          </label>
        </div>
      ) : null}

      {activeAccount && (
        <div className="repository-destination">
          <div>
            <div className="destination-label">Repository destination</div>
            <div className="destination-value">
              {createNewRemote ? `Create ${remoteRepoName || 'new-repository'}` : (gitStatus?.remoteUrl ? gitStatus.remoteUrl.replace(/\.git$/, '') : 'No repository selected')}
            </div>
          </div>
          <span className={`destination-badge ${createNewRemote ? 'destination-new' : 'destination-existing'}`}>
            {createNewRemote ? 'New repository' : 'Existing remote'}
          </span>
        </div>
      )}

      {activeAccount && (
        <div className="publish-confirmation">
          <div className="confirmation-heading">Review publish target</div>
          <div className="confirmation-grid">
            <span>Account <strong>@{activeAccount.username}</strong></span>
            <span>Repository <strong>{createNewRemote ? remoteRepoName || 'New repository' : gitStatus?.remoteUrl || 'No remote selected'}</strong></span>
            <span>Branch <strong>{branchName || 'main'}</strong></span>
            <span>Files <strong>{gitStatus?.totalUncommitted || 0} changes</strong></span>
          </div>
          <label className="confirmation-check">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I confirm this account, destination, branch, and file changes are correct.</span>
          </label>
        </div>
      )}

      {resultMsg && (
        <div className={`alert-banner alert-${resultMsg.type}`} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {resultMsg.type === 'success' && <CheckCircle2 size={16} />}
            {resultMsg.type === 'danger' && <AlertCircle size={16} />}
            {resultMsg.type === 'info' && <Loader2 size={16} className="animate-spin" />}
            <span style={{ fontWeight: 500 }}>{resultMsg.text}</span>
          </div>

          {resultMsg.repoUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span className="publish-result-meta">Branch: {resultMsg.branchName}</span>
              <button
                type="button"
                className="btn-add-account"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => apiBridge.openExternalUrl(resultMsg.repoUrl)}
              >
                <ExternalLink size={12} /> Open in Browser
              </button>

              <button
                type="button"
                className="btn-add-account"
                style={{ fontSize: '11px', padding: '4px 10px', background: 'var(--ios-input)', color: 'var(--ios-text-primary)', borderColor: 'var(--ios-border)' }}
                onClick={() => handleCopyLink(resultMsg.repoUrl)}
              >
                <Copy size={12} /> {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}

          {resultMsg.type === 'danger' && lastPublishOptions && !publishing && (
            <button type="button" className="retry-button" onClick={handleRetry}>
              Retry publish
            </button>
          )}
        </div>
      )}

      {publishing && (
        <div className="publish-progress" aria-live="polite">
          <Loader2 size={16} className="animate-spin" color="#3b82f6" />
          <div>
            <div className="publish-progress-title">{publishStage}</div>
            <div className="publish-progress-subtitle">DevKin Ops is safely preparing your GitHub publish.</div>
          </div>
        </div>
      )}

      <form onSubmit={handlePublishSubmit}>
        <div className="form-field">
          <label className="form-label-clean">Commit Message</label>
          <input
            type="text"
            className="input-clean"
            placeholder="e.g. Added new features / initial release"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label-clean">Branch Name</label>
          <input
            type="text"
            className="input-clean"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
          />
        </div>

        <div style={{ margin: '22px 0', background: 'var(--ios-input)', padding: '18px 22px', borderRadius: '14px', border: '1px solid var(--ios-border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={createNewRemote}
              onChange={(e) => setCreateNewRemote(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#007aff' }}
            />
            <span>Create new repository on GitHub under @{activeAccount ? activeAccount.username : 'account'}</span>
          </label>

          {createNewRemote && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--ios-border)' }}>
              <div>
                <label className="form-label-clean" style={{ fontSize: '12px' }}>Repository Name</label>
                <input
                  type="text"
                  className="input-clean"
                  placeholder="my-new-repo"
                  value={remoteRepoName}
                  onChange={(e) => setRemoteRepoName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="radio"
                    name="visibility"
                    checked={!isPrivate}
                    onChange={() => setIsPrivate(false)}
                    style={{ accentColor: '#007aff' }}
                  />
                  <Globe size={14} color="#30d158" /> Public Repository
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="radio"
                    name="visibility"
                    checked={isPrivate}
                    onChange={() => setIsPrivate(true)}
                    style={{ accentColor: '#007aff' }}
                  />
                  <Lock size={14} color="#ff9f0a" /> Private Repository
                </label>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn-publish-green"
          disabled={publishing || !folderPath || !activeAccount}
        >
          {publishing ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Publishing to GitHub...
            </>
          ) : (
            <>
              <UploadCloud size={18} /> Publish to GitHub Account
            </>
          )}
        </button>
      </form>
    </div>
  );
}

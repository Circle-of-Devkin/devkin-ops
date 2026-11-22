import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, ChevronDown, Check, Plus, Search, X, AlertCircle, RefreshCw, Cloud, Laptop, Loader2 } from 'lucide-react';
import { type WorkflowMode } from '../../types/workflow';
import { apiBridge } from '../../services/apiBridge';
import './branchSelector.css';

interface BranchSelectorProps {
  folderPath: string;
  currentBranch: string;
  workflowMode: WorkflowMode;
  onBranchChanged?: (newBranch: string) => void | Promise<void>;
}

interface BranchData {
  current: string;
  local: string[];
  remote: string[];
  all: string[];
}

export default function BranchSelector({
  folderPath,
  currentBranch,
  workflowMode,
  onBranchChanged
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<BranchData>({
    current: currentBranch || 'main',
    local: [],
    remote: [],
    all: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'local' | 'remote'>('local');
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchInput, setNewBranchInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setErrorMessage(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setErrorMessage(null);
      setIsCreating(false);
      setNewBranchInput('');
    }
  }, [isOpen]);

  const loadBranches = async () => {
    if (!folderPath) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiBridge.getBranches(folderPath);
      if (res && res.success) {
        setBranches({
          current: res.current || currentBranch || 'main',
          local: res.local || [],
          remote: res.remote || [],
          all: res.all || []
        });
      } else {
        setErrorMessage(res?.error || 'Failed to load branches');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading branches');
    } finally {
      setLoading(false);
    }
  };

  // Branch name validation
  const validateName = (name: string): { valid: boolean; error?: string } => {
    const trimmed = name.trim();
    if (!trimmed) return { valid: false, error: 'Branch name cannot be empty.' };
    if (trimmed.length > 100) return { valid: false, error: 'Maximum 100 characters allowed.' };
    if (trimmed.startsWith('-')) return { valid: false, error: 'Cannot start with a hyphen (-).' };
    if (trimmed.startsWith('/') || trimmed.endsWith('/')) return { valid: false, error: 'Cannot start or end with a slash (/)' };
    if (trimmed.includes('..') || trimmed.includes('//') || trimmed.includes('@{')) {
      return { valid: false, error: 'Contains forbidden characters (.., //, @{).' };
    }
    if (/\s/.test(trimmed)) return { valid: false, error: 'Branch name cannot contain spaces.' };
    if (!/^[a-zA-Z0-9._/-]+$/.test(trimmed)) {
      return { valid: false, error: 'Only letters, numbers, hyphens, underscores, dots, and slashes allowed.' };
    }
    return { valid: true };
  };

  const handleSwitchBranch = async (targetBranch: string) => {
    if (targetBranch === currentBranch || actionLoading) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiBridge.checkoutBranch(folderPath, targetBranch);
      if (res && res.success) {
        setIsOpen(false);
        if (onBranchChanged) {
          await onBranchChanged(res.currentBranch || targetBranch);
        }
      } else {
        setErrorMessage(res?.error || 'Failed to switch branch');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to switch branch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBranch = async (branchNameToCreate: string) => {
    const trimmed = branchNameToCreate.trim();
    const validation = validateName(trimmed);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid branch name');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiBridge.createBranch(folderPath, trimmed, true);
      if (res && res.success) {
        setIsOpen(false);
        setIsCreating(false);
        setNewBranchInput('');
        if (onBranchChanged) {
          await onBranchChanged(res.currentBranch || trimmed);
        }
      } else {
        setErrorMessage(res?.error || 'Failed to create branch');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create branch');
    } finally {
      setActionLoading(false);
    }
  };

  // If in basic mode, render simple view
  if (workflowMode === 'basic') {
    return (
      <span className="branch-display-basic" title={`Current Git branch: ${currentBranch || 'main'}`}>
        <GitBranch size={13} /> {currentBranch || 'main'}
      </span>
    );
  }

  // Filter branches based on search query
  const query = searchQuery.trim().toLowerCase();
  const filteredLocal = branches.local.filter((b) => b.toLowerCase().includes(query));
  const filteredRemote = branches.remote.filter((b) => b.toLowerCase().includes(query));
  const exactMatchExists = branches.local.includes(searchQuery.trim()) || branches.remote.includes(searchQuery.trim());
  const canQuickCreate = query.length > 0 && !exactMatchExists;

  const currentList = activeTab === 'local' ? filteredLocal : filteredRemote;

  return (
    <div className="branch-selector-container" ref={containerRef}>
      <button
        type="button"
        className={`branch-selector-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Switch or create Git branch (Pro Mode)"
      >
        <GitBranch size={13} className="branch-trigger-icon" />
        <span className="branch-trigger-name">{currentBranch || 'main'}</span>
        <ChevronDown size={11} className={`branch-trigger-chevron ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="branch-dropdown-popover">
          <div className="branch-dropdown-header">
            <span className="branch-dropdown-title">Switch Branch</span>
            <div className="branch-header-actions">
              <button
                type="button"
                className="btn-branch-refresh"
                onClick={loadBranches}
                disabled={loading}
                title="Refresh branches"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                className="btn-branch-close"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="branch-search-box">
            <Search size={13} className="branch-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Filter or create branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canQuickCreate) {
                  handleCreateBranch(searchQuery);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="branch-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="branch-dropdown-error">
              <AlertCircle size={13} />
              <span>{errorMessage}</span>
            </div>
          )}

          {actionLoading && (
            <div className="branch-dropdown-loading">
              <Loader2 size={14} className="animate-spin text-blue-400" />
              <span>Processing branch operation...</span>
            </div>
          )}

          {/* Quick Create Prompt if user types a new branch name */}
          {canQuickCreate && !actionLoading && (
            <div
              className="branch-quick-create"
              onClick={() => handleCreateBranch(searchQuery)}
              title={`Create new branch "${searchQuery.trim()}" from "${currentBranch}"`}
            >
              <Plus size={13} className="text-blue-400" />
              <span>Create branch <strong>{searchQuery.trim()}</strong></span>
            </div>
          )}

          {/* Tabs: Local / Remote */}
          <div className="branch-tabs">
            <button
              type="button"
              className={`branch-tab ${activeTab === 'local' ? 'active' : ''}`}
              onClick={() => setActiveTab('local')}
            >
              <Laptop size={12} />
              <span>Local ({branches.local.length})</span>
            </button>
            <button
              type="button"
              className={`branch-tab ${activeTab === 'remote' ? 'active' : ''}`}
              onClick={() => setActiveTab('remote')}
            >
              <Cloud size={12} />
              <span>Remote ({branches.remote.length})</span>
            </button>
          </div>

          {/* Branch List */}
          <div className="branch-items-list">
            {loading ? (
              <div className="branch-list-empty">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading branches...</span>
              </div>
            ) : currentList.length === 0 ? (
              <div className="branch-list-empty">
                <span>No {activeTab} branches found</span>
              </div>
            ) : (
              currentList.map((bName) => {
                const isCurrent = bName === (currentBranch || 'main');
                return (
                  <button
                    key={bName}
                    type="button"
                    className={`branch-item ${isCurrent ? 'current' : ''}`}
                    onClick={() => handleSwitchBranch(bName)}
                    disabled={actionLoading || isCurrent}
                    title={isCurrent ? 'Currently active branch' : `Switch to ${bName}`}
                  >
                    <GitBranch size={12} className="branch-item-icon" />
                    <span className="branch-item-name">{bName}</span>
                    {isCurrent && (
                      <span className="branch-item-active-badge">
                        <Check size={11} />
                        <span>Active</span>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Create Branch Section */}
          <div className="branch-create-footer">
            {!isCreating ? (
              <button
                type="button"
                className="btn-open-create-branch"
                onClick={() => {
                  setIsCreating(true);
                  setNewBranchInput('');
                  setErrorMessage(null);
                }}
              >
                <Plus size={12} />
                <span>New Branch</span>
              </button>
            ) : (
              <div className="branch-create-form">
                <div className="branch-create-input-row">
                  <input
                    type="text"
                    placeholder="e.g. feature/login-page"
                    value={newBranchInput}
                    onChange={(e) => {
                      setNewBranchInput(e.target.value);
                      const res = validateName(e.target.value);
                      if (!res.valid && e.target.value.length > 0) {
                        setErrorMessage(res.error || null);
                      } else {
                        setErrorMessage(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newBranchInput.trim()) {
                        handleCreateBranch(newBranchInput);
                      } else if (e.key === 'Escape') {
                        setIsCreating(false);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-create-submit"
                    onClick={() => handleCreateBranch(newBranchInput)}
                    disabled={actionLoading || !newBranchInput.trim()}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    className="btn-create-cancel"
                    onClick={() => setIsCreating(false)}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

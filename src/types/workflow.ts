export type WorkflowMode = 'basic' | 'pro' | 'advanced';

export interface WorkflowModeConfig {
  id: WorkflowMode;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  features: string[];
}

export const WORKFLOW_MODES: Record<WorkflowMode, WorkflowModeConfig> = {
  basic: {
    id: 'basic',
    name: 'Basic Mode',
    badge: 'Starter',
    tagline: 'Simple 3-step publishing with zero distraction',
    description: 'Designed for beginners and fast publishing. Keeps Git simple, automated, and safe.',
    accentColor: '#30d158',
    badgeBg: 'rgba(48, 209, 88, 0.15)',
    features: [
      'Multi-Account switching (OAuth / PAT / SSH)',
      'Project folder picker & Drag-and-drop',
      '1-Click automated stage, commit & push',
      'Safety shield for sensitive files'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro Mode',
    badge: 'Developer',
    tagline: 'Complete Git control for everyday development',
    description: 'Adds essential daily tools: remote pull/sync, branch management, visual line diffs, and selective staging.',
    accentColor: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    features: [
      'Everything in Basic Mode',
      '1-Click Remote Pull & Sync',
      'Branch switching & new branch creation',
      'Visual Line Diff Viewer',
      'Selective file staging & discard'
    ]
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced Mode',
    badge: 'Power User',
    tagline: 'Full GitHub Cloud ecosystem, cloning & automation',
    description: 'Power user mode for senior developers and leads. Includes remote repo explorer, GitHub Organizations, AI tools, and CI/CD monitor.',
    accentColor: '#bf5af2',
    badgeBg: 'rgba(191, 90, 242, 0.15)',
    features: [
      'Everything in Pro Mode',
      'Remote Repositories Explorer & 1-Click Clone',
      'GitHub Organizations publishing',
      'AI-powered smart commit messages',
      'GitHub Actions CI/CD live monitor'
    ]
  }
};


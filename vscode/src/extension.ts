import * as vscode from 'vscode';
import { DevKinViewProvider } from './DevKinViewProvider';
import storageService from './services/storageService';
import gitService from './services/gitService';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  const extensionUri = context.extensionUri;

  // 1. Register Webview Provider for Primary Sidebar
  const provider = new DevKinViewProvider(extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DevKinViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  // 2. Status Bar Item setup
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'devkinOps.switchAccount';
  context.subscriptions.push(statusBarItem);
  updateStatusBar();
  statusBarItem.show();

  // Listen for account changes from webview to keep status bar updated
  provider.onAccountChange(() => {
    updateStatusBar();
  });

  // 3. Register Command: Open Full Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('devkinOps.open', () => {
      DevKinViewProvider.createOrShow(extensionUri, () => updateStatusBar());
    })
  );

  // 4. Register Command: Quick Switch Account
  context.subscriptions.push(
    vscode.commands.registerCommand('devkinOps.switchAccount', async () => {
      const accounts = storageService.getAccounts();
      const activeId = storageService.getActiveAccountId();

      if (accounts.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          'DevKin Ops: No GitHub accounts configured yet.',
          'Open DevKin Ops to Add Account'
        );
        if (choice) {
          DevKinViewProvider.createOrShow(extensionUri, () => updateStatusBar());
        }
        return;
      }

      type AccountQuickPickItem = vscode.QuickPickItem & { accountId?: string; isManageAction?: boolean };

      const items: AccountQuickPickItem[] = accounts.map((acc) => {
        const isActive = acc.id === activeId;
        return {
          label: `${isActive ? '✓ ' : '   '}${acc.name || acc.username || 'Unnamed'} (@${acc.username || 'unknown'})`,
          description: acc.email || '',
          detail: `Auth: ${(acc.authType || 'pat').toUpperCase()}${isActive ? ' (Currently Active)' : ''}`,
          accountId: acc.id
        };
      });

      items.push({
        label: '$(gear) Open Full DevKin Ops Dashboard...',
        description: 'Manage accounts, Git identities, and publish repositories',
        isManageAction: true
      });

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select active GitHub account for Git operations'
      });

      if (!selection) return;

      if (selection.isManageAction) {
        DevKinViewProvider.createOrShow(extensionUri, () => updateStatusBar());
        return;
      }

      if (selection.accountId) {
        storageService.setActiveAccount(selection.accountId);
        updateStatusBar();

        const selectedAccount = accounts.find((a) => a.id === selection.accountId);
        const currentWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (currentWorkspace && selectedAccount) {
          const applyChoice = await vscode.window.showInformationMessage(
            `Switched active account to @${selectedAccount.username}. Apply to current workspace Git config?`,
            'Yes, Apply to Repo',
            'No, Just Switch'
          );

          if (applyChoice === 'Yes, Apply to Repo') {
            const applyResult = await gitService.applyAccountToRepo(currentWorkspace, selectedAccount);
            if (applyResult.success) {
              vscode.window.showInformationMessage(
                `✓ Configured current repo Git identity: ${selectedAccount.name || selectedAccount.username} <${selectedAccount.email}>`
              );
            } else {
              vscode.window.showErrorMessage(`Failed to configure repo: ${applyResult.error}`);
            }
          }
        } else if (selectedAccount) {
          vscode.window.showInformationMessage(`Active DevKin GitHub account set to @${selectedAccount.username}`);
        }
      }
    })
  );

  // 5. Register Command: Refresh Status
  context.subscriptions.push(
    vscode.commands.registerCommand('devkinOps.refresh', () => {
      updateStatusBar();
      vscode.window.showInformationMessage('DevKin Ops status refreshed.');
    })
  );
}

function updateStatusBar() {
  const activeAccount = storageService.getActiveAccount();
  if (activeAccount) {
    statusBarItem.text = `$(mark-github) DevKin: @${activeAccount.username || activeAccount.name || 'active'}`;
    statusBarItem.tooltip = `DevKin Ops: Active Account @${activeAccount.username} (${activeAccount.email || 'no email'}). Click to switch.`;
  } else {
    statusBarItem.text = `$(mark-github) DevKin: No Account`;
    statusBarItem.tooltip = 'DevKin Ops: Click to configure GitHub account';
  }
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}


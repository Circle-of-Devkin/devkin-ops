import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import storageService, { GitAccount } from './services/storageService';
import gitService from './services/gitService';
import githubService from './services/githubService';

export class DevKinViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devkinOps.sidebarView';
  public static currentPanel: vscode.WebviewPanel | undefined;

  private _view?: vscode.WebviewView;
  private _onAccountChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onAccountChange = this._onAccountChangeEmitter.event;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, 'webview-dist')
      ]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
    this.setupMessageListener(webviewView.webview);
  }

  /**
   * Opens the full DevKin Ops app in an Editor Tab (WebviewPanel)
   */
  public static createOrShow(extensionUri: vscode.Uri, onAccountChangeCallback?: () => void) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DevKinViewProvider.currentPanel) {
      DevKinViewProvider.currentPanel.reveal(column);
      return DevKinViewProvider.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'devkinOpsPanel',
      'DevKin Ops',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          extensionUri,
          vscode.Uri.joinPath(extensionUri, 'webview-dist')
        ]
      }
    );

    const provider = new DevKinViewProvider(extensionUri);
    panel.webview.html = provider.getHtmlForWebview(panel.webview);
    provider.setupMessageListener(panel.webview);

    if (onAccountChangeCallback) {
      provider.onAccountChange(onAccountChangeCallback);
    }

    panel.onDidDispose(() => {
      DevKinViewProvider.currentPanel = undefined;
    });

    DevKinViewProvider.currentPanel = panel;
    return panel;
  }

  /**
   * Listen to and respond to messages from the React Webview
   */
  private setupMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(async (message) => {
      const { id, method, args } = message || {};
      if (!id || !method) return;

      try {
        let result: unknown = null;

        switch (method) {
          // Folder / Workspace selection
          case 'select-folder': {
            const currentWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const options: vscode.OpenDialogOptions = {
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: 'Select Project Folder',
              defaultUri: currentWorkspace ? vscode.Uri.file(currentWorkspace) : undefined
            };
            const uri = await vscode.window.showOpenDialog(options);
            result = uri && uri.length > 0 ? uri[0].fsPath : (currentWorkspace || null);
            break;
          }

          case 'select-ssh-file': {
            const options: vscode.OpenDialogOptions = {
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              openLabel: 'Select SSH Private Key'
            };
            const uri = await vscode.window.showOpenDialog(options);
            result = uri && uri.length > 0 ? uri[0].fsPath : null;
            break;
          }

          case 'open-external-url': {
            const url = args?.[0];
            if (url) {
              await vscode.env.openExternal(vscode.Uri.parse(url));
            }
            result = { success: true };
            break;
          }

          case 'open-in-folder': {
            const folderPath = args?.[0] as string;
            if (folderPath) {
              await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));
              result = { success: true };
            } else {
              result = { success: false, error: 'No folder path specified' };
            }
            break;
          }

          case 'open-in-vscode': {
            const folderPath = args?.[0] as string;
            if (folderPath) {
              await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(folderPath), { forceNewWindow: false });
              result = { success: true };
            } else {
              result = { success: false, error: 'No folder path specified' };
            }
            break;
          }

          // Accounts & Storage
          case 'get-accounts': {
            const accounts = storageService.getAccounts();
            const activeAccountId = storageService.getActiveAccountId();
            result = { accounts, activeAccountId };
            break;
          }

          case 'save-account': {
            const account = args?.[0] as GitAccount;
            result = storageService.saveAccount(account);
            this._onAccountChangeEmitter.fire();
            break;
          }

          case 'delete-account': {
            const accountId = args?.[0] as string;
            result = storageService.deleteAccount(accountId);
            this._onAccountChangeEmitter.fire();
            break;
          }

          case 'set-active-account': {
            const accountId = args?.[0] as string;
            result = storageService.setActiveAccount(accountId);
            this._onAccountChangeEmitter.fire();
            break;
          }

          // GitHub Service
          case 'validate-pat-token': {
            const token = args?.[0] as string;
            result = await githubService.validateToken(token);
            break;
          }

          case 'start-device-flow': {
            result = await githubService.startDeviceFlow();
            break;
          }

          case 'poll-device-token': {
            const deviceCode = args?.[0] as string;
            result = await githubService.pollDeviceToken(deviceCode);
            break;
          }

          // Git Operations
          case 'get-git-status': {
            let folderPath = args?.[0] as string | undefined;
            if (!folderPath) {
              folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            }
            if (!folderPath) {
              result = {
                success: true,
                isGitRepo: false,
                folderPath: '',
                folderName: 'No Workspace Open',
                totalUncommitted: 0,
                changes: [],
                isClean: true
              };
            } else {
              result = await gitService.getFolderGitStatus(folderPath);
            }
            break;
          }

          case 'init-git-repo': {
            let folderPath = args?.[0] as string | undefined;
            if (!folderPath) {
              folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            }
            if (!folderPath) {
              result = { success: false, error: 'No workspace folder open' };
            } else {
              result = await gitService.initRepo(folderPath);
            }
            break;
          }

          case 'apply-account-to-repo': {
            const payload = args?.[0] as { folderPath?: string; account: GitAccount } | undefined;
            let folderPath = payload?.folderPath;
            if (!folderPath) {
              folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            }
            if (!folderPath || !payload?.account) {
              result = { success: false, error: 'Missing folder or account information' };
            } else {
              result = await gitService.applyAccountToRepo(folderPath, payload.account);
            }
            break;
          }

          case 'publish-repo': {
            const options = args?.[0];
            if (options && !options.folderPath) {
              options.folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            }
            if (!options?.folderPath) {
              result = { success: false, error: 'No workspace folder open to publish' };
            } else {
              result = await gitService.publishRepo(options);
            }
            break;
          }

          default:
            result = { success: false, error: `Unknown method: ${method}` };
        }

        webview.postMessage({ id, result });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        webview.postMessage({ id, error: errorMsg });
      }
    });
  }

  /**
   * Generates HTML with rewritten asset URLs and injected electronAPI shim
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const webviewDistPath = path.join(this._extensionUri.fsPath, 'webview-dist');
    const indexPath = path.join(webviewDistPath, 'index.html');

    let html = '';
    if (fs.existsSync(indexPath)) {
      html = fs.readFileSync(indexPath, 'utf-8');
    } else {
      return `<!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; padding: 20px; color: var(--vscode-foreground);">
            <h2>DevKin Ops</h2>
            <p>Webview assets not found. Please run <code>npm run build:vscode</code> first.</p>
          </body>
        </html>`;
    }

    // Convert relative asset paths (./assets/..., ./icon.png) to webview URIs
    const webviewDistUri = vscode.Uri.joinPath(this._extensionUri, 'webview-dist');
    const baseUri = webview.asWebviewUri(webviewDistUri);

    // Replace ./assets/ with webviewUri/assets/
    html = html.replace(/(src|href)="\.?\/?assets\/([^"]+)"/g, (_match, attr, assetPath) => {
      const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDistUri, 'assets', assetPath));
      return `${attr}="${assetUri.toString()}"`;
    });

    // Replace ./icon.png with webviewUri/icon.png
    html = html.replace(/(src|href)="\.?\/?icon\.png"/g, (_match, attr) => {
      const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDistUri, 'icon.png'));
      return `${attr}="${iconUri.toString()}"`;
    });

    // CSP and VS Code electronAPI bridge shim script
    const cspSource = webview.cspSource;
    const bridgeScript = `
      <script>
        (function() {
          const vscode = acquireVsCodeApi();
          const pending = new Map();

          window.addEventListener('message', function(event) {
            const data = event.data || {};
            if (data.id && pending.has(data.id)) {
              const p = pending.get(data.id);
              pending.delete(data.id);
              if (data.error) {
                p.reject(new Error(data.error));
              } else {
                p.resolve(data.result);
              }
            }
          });

          function callBridge(method, ...args) {
            return new Promise(function(resolve, reject) {
              const id = Math.random().toString(36).substring(2) + Date.now();
              pending.set(id, { resolve, reject });
              vscode.postMessage({ id, method, args });
            });
          }

          // Full Electron API drop-in compatibility shim for DevKin Ops React frontend
          window.electronAPI = {
            selectFolder: () => callBridge('select-folder'),
            selectSshFile: () => callBridge('select-ssh-file'),
            openExternalUrl: (url) => callBridge('open-external-url', url),
            getAccounts: () => callBridge('get-accounts'),
            saveAccount: (account) => callBridge('save-account', account),
            deleteAccount: (id) => callBridge('delete-account', id),
            setActiveAccount: (id) => callBridge('set-active-account', id),
            validatePatToken: (token) => callBridge('validate-pat-token', token),
            startDeviceFlow: () => callBridge('start-device-flow'),
            pollDeviceToken: (code) => callBridge('poll-device-token', code),
            getGitStatus: (folder) => callBridge('get-git-status', folder),
            initGitRepo: (folder) => callBridge('init-git-repo', folder),
            applyAccountToRepo: (folder, account) => callBridge('apply-account-to-repo', { folderPath: folder, account }),
            publishRepo: (options) => callBridge('publish-repo', options)
          };
          window.isVsCodeExtension = true;
        })();
      </script>
    `;

    // Inject bridge script before closing </head> or at start of <body>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${bridgeScript}</head>`);
    } else {
      html = bridgeScript + html;
    }

    return html;
  }
}


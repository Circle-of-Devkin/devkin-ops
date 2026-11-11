# DevKin Ops for VS Code

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**DevKin Ops** brings powerful multi-account GitHub management, local repository inspection, and 1-click publishing workflows directly into your VS Code editor.

Built and maintained by [Circle of Devkin](https://github.com/Circle-of-Devkin).

---

## 🌟 Key Features

- **Full Application Inside VS Code**: Access the entire DevKin Ops dashboard (Basic, Pro, and Advanced modes) right from the Primary Sidebar or as a full-size Editor Tab.
- **Recent Projects Switcher**: 1-click access to switch between your recent workspaces and repositories.
- **Quick Action Launchers**: 1-click to reveal the folder in OS File Explorer or focus the editor.
- **Secret Shield & Smart `.gitignore` Guard**: Automated protection that scans for `.env`, private keys (`id_rsa`, `*.pem`), and cloud credentials before committing, offering a 1-click "Add to .gitignore & Untrack" action.
- **Seamless Multi-Account GitHub Switching**: Manage multiple personal, client, and work GitHub accounts without messing up Git configurations.
- **Status Bar Integration**: Instantly see which GitHub profile is active (`$(mark-github) DevKin: @username`). Click to switch accounts anytime.
- **Local Git Identity Enforcement**: Automatically sets local `user.name`, `user.email`, and credentials for your active workspace.
- **1-Click Publishing & Staging**: Inspect Git status, visual diffs, staged files, branches, and push repositories straight from VS Code.
- **Shared Desktop Sync**: Automatically shares configured accounts with the DevKin Ops Desktop application.

---

## 🚀 How to Use

### 1. Open the Dashboard
- **From Activity Bar**: Click the **DevKin Ops** icon in the left Activity Bar to open the sidebar.
- **From Command Palette**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type:
  `DevKin Ops: Open Full Dashboard`

### 2. Switch Accounts
- Click the **DevKin** item in the bottom status bar to view all registered accounts.
- Choose an account to switch your active profile and optionally apply it to the open repository.

### 3. Progressive Workflow Modes
- 🟢 **Basic Mode**: Simple, zero-distraction 3-step publishing with safety shields.
- 🔵 **Pro Mode**: Developer Git tools (sync, branches, visual line diffs, selective staging).
- 🟣 **Advanced Mode**: Power-user features (repo explorer, Organizations, AI commits, CI/CD).

---

## ⚙️ Commands

| Command | Description |
| :--- | :--- |
| `devkinOps.open` | Open the full DevKin Ops dashboard in an editor tab |
| `devkinOps.switchAccount` | Quick pick menu to switch active GitHub account |
| `devkinOps.refresh` | Refresh status bar and active Git repo status |

---

## 📄 License

This extension is open-source under the [MIT License](LICENSE).

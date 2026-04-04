# Orbit Orchestrator: Manual Setup Guide

I have completed the core code migration from UAAM to **Orbit**. Since I cannot physically rename the environment directory while active, please follow these steps to finalize the orchestrator's deployment.

## Step 1: Environment Cleanup
1. **Close your IDE** (VSCode/Cursor) to release file locks.
2. **Rename the Directory**:
   - Change `c:\Engineering\Windows\UAAM` to `c:\Engineering\Windows\Orbit`.
3. **Open the New Orbit Directory** in your IDE.

## Step 2: Tooling Verification
Orbit relies on the **Rust Toolchain**. Please verify you have these installed:
- [ ] **Rust**: Run `rustc --version` in PowerShell. (If not, install from [rustup.rs](https://rustup.rs/))
- [ ] **WebView2**: Standard on Windows 11, required for Tauri.

## Step 3: Library Sync
Run the following command in the Orbit root directory to fix any remaining dependency gaps:
```pwsh
npm install lucide-react @tauri-apps/api @tauri-apps/plugin-fs @tauri-apps/plugin-path @tauri-apps/plugin-shell @tauri-apps/plugin-dialog @tauri-apps/plugin-process --legacy-peer-deps
```

## Step 4: Launch the Control Plane
To start the Orbit Orchestrator, run:
```pwsh
npm run tauri dev
```
Wait for the initial compilation (this will take a few minutes for the first Rust build).

## Step 5: Initial Orbital Configuration
1. When the Orbit window opens, click **Workspace Settings** in the top-right.
2. Select your **Global Workspace Root** (where all projects will live).
3. Click **Save Configuration**.

## Step 6: Deploy Your First Node
1. Return to the Hub.
2. Click **Deploy New Project**.
3. Enter a name (e.g., `Apollo-X`).
4. **Orbit will automatically**:
   - Create the directory under your root.
   - Inject `AGENTS.md` and `DATA_FLOW.md`.
   - Register the node in the dashboard.

---
> [!IMPORTANT]
> **Agent Restriction**: From now on, when you ask Antigravity (me) to work on a specific project, Orbit's `AGENTS.md` will remind me to stay within the designated project folder. This ensures the "Orchestrator" remains the single point of truth.

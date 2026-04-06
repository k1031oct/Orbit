import { useState, useCallback, useRef, useEffect } from 'react';
import { Project, LocalRequirement, DecisionLog } from '../lib/models/types';
import { useToast } from '../context/ToastContext';
import { LogRepository } from '../lib/repositories/LogRepository';

export interface ProjectDetailUiState {
  project: Project | null;
  requirements: LocalRequirement[];
  logs: DecisionLog[];
  isLoading: boolean;
  isScanning: boolean;
  isBuilding: boolean;
  isDeploying: boolean;
  consoleLogs: string[];
  isConsoleVisible: boolean;
}

export const useProjectDetailViewModel = (projectId: string | null) => {
  const { showToast } = useToast();
  const [state, setState] = useState<ProjectDetailUiState>({
    project: null,
    requirements: [],
    logs: [],
    isLoading: true,
    isScanning: false,
    isBuilding: false,
    isDeploying: false,
    consoleLogs: [],
    isConsoleVisible: false
  });
  
  const logcatStopperRef = useRef<(() => Promise<void>) | null>(null);

  // コンポーネントのアンマウント時にログを停止
  useEffect(() => {
    return () => {
      if (logcatStopperRef.current) {
        logcatStopperRef.current();
      }
    };
  }, []);

  /**
   * コンソールにログを追記する (最大500行)
   */
  const appendLog = (line: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedLine = `[${timestamp}] ${line}`;
    setState(prev => {
      const updatedLogs = [...prev.consoleLogs, formattedLine];
      if (updatedLogs.length > 500) updatedLogs.shift();
      return { ...prev, consoleLogs: updatedLogs };
    });
  };

  /**
   * コンソールの表示切り替え
   */
  const toggleConsole = (force?: boolean) => {
    setState(prev => ({ ...prev, isConsoleVisible: force !== undefined ? force : !prev.isConsoleVisible }));
  };

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setState((prev: ProjectDetailUiState) => ({ ...prev, isLoading: true }));
    try {
      const { ProjectRepository } = await import('../lib/repositories/ProjectRepository');
      const { RequirementRepository } = await import('../lib/repositories/RequirementRepository');
      const { LogRepository } = await import('../lib/repositories/LogRepository');

      const project = await ProjectRepository.getById(projectId);
      const requirements = await RequirementRepository.getAllByProject(projectId);
      const logs = await LogRepository.getAllByProject(projectId);
      setState((prev: ProjectDetailUiState) => ({ ...prev, project, requirements, logs, isLoading: false }));
    } catch (e) {
      showToast('プロジェクト情報の読み込みに失敗しました', 'error');
      setState((prev: ProjectDetailUiState) => ({ ...prev, isLoading: false }));
    }
  }, [projectId, showToast]);

  /**
   * 要件リストを AGENTS.md に同期する
   */
  const syncMissionsToDocs = async (currentMissions: LocalRequirement[]) => {
    if (!state.project) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('sync_missions', {
        path: state.project.androidPath,
        missions: currentMissions.map(m => ({
          id: m.id,
          title: m.title,
          status: m.status,
          target: m.target || 'General'
        }))
      });
      appendLog('[ORBIT] Synced missions to AGENTS.md');
    } catch (e) {
      console.error('Failed to sync missions:', e);
    }
  };

  const handleAddRequirement = async (title: string, description: string, target: string) => {
    if (!projectId) return;
    try {
      const { RequirementRepository } = await import('../lib/repositories/RequirementRepository');
      await RequirementRepository.add({ projectId, title, description, target });
      showToast('要件を追加しました', 'success');
      
      // データ再読み込みと同期
      const requirements = await RequirementRepository.getAllByProject(projectId);
      await syncMissionsToDocs(requirements);
      await loadData();
    } catch (e) {
      showToast('要件の追加に失敗しました', 'error');
    }
  };

  const handleChangeRequirementStatus = async (id: number, status: string) => {
    try {
      const { RequirementRepository } = await import('../lib/repositories/RequirementRepository');
      await RequirementRepository.updateStatus(id, status);
      showToast('ステータスを更新しました', 'info');
      
      if (projectId) {
        const requirements = await RequirementRepository.getAllByProject(projectId);
        await syncMissionsToDocs(requirements);
      }
      await loadData();
    } catch (e) {
      showToast('更新に失敗しました', 'error');
    }
  };

  const handleRemoveRequirement = async (id: number) => {
    try {
      const { RequirementRepository } = await import('../lib/repositories/RequirementRepository');
      await RequirementRepository.delete(id);
      showToast('要件を削除しました', 'info');
      
      if (projectId) {
        const requirements = await RequirementRepository.getAllByProject(projectId);
        await syncMissionsToDocs(requirements);
      }
      await loadData();
    } catch (e) {
      showToast('削除に失敗しました', 'error');
    }
  };

  /**
   * 主要任務（Objective）の個別更新
   */
  const handleUpdateRequirement = async (id: number, updates: Partial<LocalRequirement>) => {
    try {
      const { RequirementRepository } = await import('../lib/repositories/RequirementRepository');
      await RequirementRepository.update(id, updates);
      await loadData();
    } catch (e) {
      showToast('任務の更新に失敗しました', 'error');
    }
  };

  /**
   * プロジェクト（メタデータ）の更新
   */
  const handleUpdateProject = async (updates: Partial<Project>) => {
    if (!projectId) return;
    try {
      const { ProjectRepository } = await import('../lib/repositories/ProjectRepository');
      await ProjectRepository.update(projectId, updates);
      showToast('メタデータを更新しました', 'success');
      await loadData();
    } catch (e) {
      showToast('メタデータの更新に失敗しました', 'error');
    }
  };

  const handleScanProject = async () => {
    if (!state.project || state.isScanning) return;
    setState((prev: ProjectDetailUiState) => ({ ...prev, isScanning: true, isConsoleVisible: true }));
    appendLog(`Context Scan Started: ${state.project.androidPath}`);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Execute the native scanning command
      await invoke('scan_project', { path: state.project.androidPath });
      
      appendLog('Context Scan Completed Successfully.');
      showToast('スキャンが完了しました', 'success');
      await loadData();
    } catch (e) {
      appendLog(`[ERROR] Scan Failed: ${e}`);
      showToast('スキャン中にエラーが発生しました', 'error');
    } finally {
      setState((prev: ProjectDetailUiState) => ({ ...prev, isScanning: false }));
    }
  };

  /**
   * リモート（Git & GAS）との一括同期
   */
  /**
   * リモート（Git & GAS）との一括同期
   */
  const handleSyncRemote = async () => {
    if (!state.project) return;
    showToast('リモートと同期中...', 'info');

    try {
      const { GitRepository } = await import('../lib/repositories/GitRepository');
      const { RequirementRepository } = await import('../lib/repositories/RequirementRepository');

      // 1. Git Pull
      if (state.project.gitUrl) {
        showToast('ソースコードを同期中...', 'info');
        const gitRes = await GitRepository.pull(state.project.androidPath);
        if (gitRes.success) showToast('Git プル成功', 'success');
        else showToast(`Git プルに失敗しました: ${gitRes.error || ''}`, 'info');
      }

      // 2. GAS Sync
      if (state.project.gasUrl) {
        showToast('要件を同期中...', 'info');
        await RequirementRepository.syncWithGAS(state.project.id, state.project.gasUrl);
        showToast('GAS 要件を同期しました', 'success');
      }

      showToast('一括同期が完了しました', 'success');
      await loadData();
    } catch (e) {
      showToast('同期中にエラーが発生しました', 'error');
    }
  };

  /**
   * アプリケーションのビルド (Android / Windows 判別)
   */
  const handleBuild = async () => {
    if (!state.project || state.isBuilding) return;
    
    // プラットフォーム判定
    const isTauri = state.project.platform === 'WINDOWS_TAURI';
    const isAndroid = state.project.platform === 'ANDROID_KOTLIN';
    
    setState(prev => ({ ...prev, isBuilding: true, isConsoleVisible: true }));
    appendLog(isTauri ? '--- Windows/Tauri Build Started ---' : '--- Android Build Started ---');

    // 以前のログストリームがあれば停止
    if (logcatStopperRef.current) {
      await logcatStopperRef.current();
      logcatStopperRef.current = null;
    }

    try {
      if (isTauri) {
        appendLog('[ORBIT] Detecting Tauri project. Running npm run build...');
        const { invoke } = await import('@tauri-apps/api/core');
        // Tauri 側のシェルコマンド実行ツールを使用
        const res = await invoke<string>('run_shell_command', { 
          path: state.project.androidPath, 
          command: 'npm', 
          args: ['run', 'tauri', 'build'] 
        });
        appendLog(res);
        appendLog('Tauri Build Completed Successfully.');
      } else {
        const { AndroidExecutor } = await import('../lib/android');
        const success = await AndroidExecutor.runGradle(
          state.project.androidPath, 
          ['assembleDebug'], 
          (line) => appendLog(line)
        );
        if (!success) throw new Error('Gradle Build Failed.');
        appendLog('Android Build Completed Successfully.');
      }

      showToast('ビルドが完了しました', 'success');
      const { ProjectRepository } = await import('../lib/repositories/ProjectRepository');
      await ProjectRepository.update(state.project.id, {
        lastBuildStatus: 'success',
        latestVersion: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      appendLog(`[CRITICAL] Build Error: ${errorMsg}`);
      showToast('ビルド実行中にエラーが発生しました', 'error');
      
      await LogRepository.add({
        projectId: state.project.id,
        category: 'BUILD_ERROR',
        decision: 'Build failed during execution',
        reason: errorMsg
      });
    } finally {
      setState(prev => ({ ...prev, isBuilding: false }));
    }
  };

  /**
   * アプリケーションのデプロイと実行 (Android / Windows 判別)
   */
  const handleDeploy = async () => {
    if (!state.project || state.isDeploying) return;
    const project = state.project;

    // プラットフォーム判定
    const isTauri = project.platform === 'WINDOWS_TAURI';
    const isAndroid = project.platform === 'ANDROID_KOTLIN';

    setState(prev => ({ ...prev, isDeploying: true, isConsoleVisible: true }));
    appendLog(isTauri ? '--- Windows Application Launch Started ---' : '--- Deployment Cycle Started ---');

    try {
      if (isTauri) {
        appendLog('Launching Windows Application (Tauri Binary)...');
        const { invoke } = await import('@tauri-apps/api/core');
        
        try {
          // 1. バイナリ名の決定 (Cargo.toml > tauri.conf.json > Fallback)
          let binaryName = "app.exe"; 
          
          try {
            // Cargo.toml から package.name を取得 (これが実際のバイナリ名になることが多い)
            const cargoToml = await invoke<string>('run_shell_command', {
              path: project.androidPath,
              command: 'cmd',
              args: ['/c', 'type', 'src-tauri\\Cargo.toml']
            });
            const nameMatch = cargoToml.match(/\[package\][^]*?name\s*=\s*"([^"]+)"/);
            if (nameMatch && nameMatch[1]) {
              binaryName = `${nameMatch[1]}.exe`;
            } else {
              // tauri.conf.json から取得
              const configJson = await invoke<string>('run_shell_command', {
                path: project.androidPath,
                command: 'cmd',
                args: ['/c', 'type', 'src-tauri\\tauri.conf.json']
              });
              const config = JSON.parse(configJson);
              if (config.productName) {
                binaryName = `${config.productName}.exe`;
              }
            }
          } catch (e) {
            appendLog(`[WARN] Metadata read failed, using default: ${binaryName}`);
          }

          // 2. 複数のパス（release / debug）を試行
          const pathsToTry = [
            `${project.androidPath}\\src-tauri\\target\\release\\${binaryName}`,
            `${project.androidPath}\\src-tauri\\target\\debug\\${binaryName}`,
            `${project.androidPath}\\src-tauri\\target\\release\\app.exe`,
            `${project.androidPath}\\src-tauri\\target\\debug\\app.exe`,
          ];

          let foundPath = "";
          for (const p of pathsToTry) {
            try {
              // dir コマンドで存在確認
              const res = await invoke<string>('run_shell_command', {
                path: project.androidPath,
                command: 'cmd',
                args: ['/c', 'dir', p]
              });
              // 出力にファイル名が含まれていれば存在とみなす
              if (res.includes('.exe')) {
                foundPath = p;
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!foundPath) {
            throw new Error(`Executable not found. Tried paths: ${pathsToTry.join(', ')}`);
          }

          appendLog(`Found binary at: ${foundPath}`);
          
          await invoke('run_shell_command', { 
            path: project.androidPath, 
            command: foundPath, // クォートをJS側で付与しない (Rust側で結合されるため)
            args: [] 
          });
          showToast('アプリケーションを起動しました', 'success');
        } catch (e: any) {
          throw new Error(`Tauri Launch Failed: ${e.message || e}`);
        }
      } else if (isAndroid) {
        const { AndroidExecutor } = await import('../lib/android');
        appendLog('Searching for debug APK...');
        const apkPath = await AndroidExecutor.findApk(project.androidPath);
        
        if (!apkPath) {
          appendLog('[ERROR] APK not found. Please BUILD the project first.');
          showToast('APKが見つかりません', 'error');
          return;
        }

        appendLog(`Installing APK: ${apkPath}`);
        const installSuccess = await AndroidExecutor.runCommand(
          ['install', '-r', apkPath], 
          (line) => appendLog(line)
        );

        if (installSuccess) {
          appendLog('Installation Successful. Launching App...');
          
          // 起動
          const pkgName = await AndroidExecutor.getPackageName(project.androidPath) || 'com.k1031oct.nfa';
          await AndroidExecutor.launchApp(pkgName, (line) => appendLog(line));
          
          // ログストリーミング開始
          appendLog(`[LOGCAT] Starting session for ${pkgName}...`);
          if (logcatStopperRef.current) await logcatStopperRef.current();
          logcatStopperRef.current = await AndroidExecutor.streamLogcat(pkgName, (line) => appendLog(`[ANDROID] ${line}`));
          
          showToast('アプリケーションを起動しました', 'success');
        } else {
          throw new Error('Installation Failed.');
        }
      }
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      appendLog(`[CRITICAL] Deployment Error: ${errorMsg}`);
      showToast('デプロイ中にエラーが発生しました', 'error');

      await LogRepository.add({
        projectId: project.id,
        category: 'DEPLOY_ERROR',
        decision: 'Deployment cycle failed',
        reason: errorMsg
      });
    } finally {
      setState(prev => ({ ...prev, isDeploying: false }));
    }
  };

  return {
    state,
    loadData,
    handleAddRequirement,
    handleChangeRequirementStatus,
    handleRemoveRequirement,
    handleScanProject,
    handleSyncRemote,
    handleUpdateProject,
    handleUpdateRequirement,
    handleBuild,
    handleDeploy,
    appendLog,
    toggleConsole
  };
};

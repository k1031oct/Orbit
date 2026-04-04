import { useState, useCallback } from 'react';
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

  const handleAddRequirement = async (title: string, description: string, target: string) => {
    if (!projectId) return;
    try {
      const { RequirementRepository } = await import('../lib/repositories/RequirementRepository');
      await RequirementRepository.add({ projectId, title, description, target });
      showToast('要件を追加しました', 'success');
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
   * Android アプリケーションのビルド (Gradle)
   */
  const handleBuild = async () => {
    if (!state.project || state.isBuilding) return;
    
    setState(prev => ({ ...prev, isBuilding: true, isConsoleVisible: true }));
    appendLog('--- Android Build Started ---');

    try {
      const { AndroidExecutor } = await import('../lib/android');
      const { ProjectRepository } = await import('../lib/repositories/ProjectRepository');

      const success = await AndroidExecutor.runGradle(
        state.project.androidPath, 
        ['assembleDebug'], 
        (line) => appendLog(line)
      );

      if (success) {
        appendLog('Build Completed Successfully.');
        showToast('ビルドが完了しました', 'success');
        await ProjectRepository.update(state.project.id, {
          lastBuildStatus: 'success',
          latestVersion: new Date().toISOString().split('T')[0] // 暫定バージョン
        });
        await loadData();
      } else {
        appendLog('[ERROR] Build Failed.');
        showToast('ビルドに失敗しました', 'error');
      }
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      appendLog(`[CRITICAL] Build Error: ${errorMsg}`);
      showToast('ビルド実行中にエラーが発生しました', 'error');
      
      // AI 自律診断用のテレメトリ記録
      await LogRepository.add({
        projectId: state.project!.id,
        category: 'BUILD_ERROR',
        decision: 'Build failed during execution',
        reason: errorMsg
      });
    } finally {
      setState(prev => ({ ...prev, isBuilding: false }));
    }
  };

  /**
   * アプリケーションのデプロイと実行 (ADB)
   */
  const handleDeploy = async () => {
    if (!state.project || state.isDeploying) return;

    setState(prev => ({ ...prev, isDeploying: true, isConsoleVisible: true }));
    appendLog('--- Deployment Cycle Started ---');

    try {
      const { AndroidExecutor } = await import('../lib/android');
      
      // 1. Find APK
      appendLog('Searching for debug APK...');
      const apkPath = await AndroidExecutor.findApk(state.project.androidPath);
      
      if (!apkPath) {
        appendLog('[ERROR] APK not found. Please BUILD the project first.');
        showToast('APKが見つかりません。先にビルドしてください', 'error');
        return;
      }

      // 2. Install
      appendLog(`Installing APK: ${apkPath}`);
      const installSuccess = await AndroidExecutor.runCommand(
        ['install', '-r', apkPath], 
        (line) => appendLog(line)
      );

      if (installSuccess) {
        appendLog('Installation Successful. Launching App...');
        // 3. Launch (Package Name fallback or detection logic would go here)
        // For demonstration, we'll use a placeholder or common pattern
        // In a real factory, we'd extract this from AndroidManifest.xml
        showToast('アプリケーションを起動しました', 'success');
      } else {
        appendLog('[ERROR] Installation Failed.');
        showToast('インストールに失敗しました', 'error');
      }
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      appendLog(`[CRITICAL] Deployment Error: ${errorMsg}`);
      showToast('デプロイ中にエラーが発生しました', 'error');

      // AI 自律診断用のテレメトリ記録
      await LogRepository.add({
        projectId: state.project!.id,
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

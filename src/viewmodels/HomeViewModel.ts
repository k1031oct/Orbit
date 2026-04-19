import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { ProjectRepository } from '../lib/repositories/ProjectRepository';
import { LogRepository } from '../lib/repositories/LogRepository';
import { SettingRepository } from '../lib/repositories/SettingRepository';
import { Project } from '../lib/models/types';
import { GitRepository } from '../lib/repositories/GitRepository';
import { AiRepository } from '../lib/repositories/AiRepository';

export interface HomeUiState {
  projects: Project[];
  isLoading: boolean;
  isScanning: boolean;
  isAddModalOpen: boolean;
  workspaceRoot: string | null;
  modelDownloadProgress: number | null;
}

export const useHomeViewModel = () => {
  const { showToast } = useToast();
  const [state, setState] = useState<HomeUiState>({
    projects: [],
    isLoading: true,
    isScanning: false,
    isAddModalOpen: false,
    workspaceRoot: null,
    modelDownloadProgress: null,
  });

  const loadData = useCallback(async () => {
    setState((prev: HomeUiState) => ({ ...prev, isLoading: true }));
    try {
      const projects = await ProjectRepository.getAll();
      const workspaceRoot = await SettingRepository.get('workspace_root');
      setState((prev: HomeUiState) => ({ ...prev, projects, workspaceRoot, isLoading: false }));
      
      // Local AI Model Check & Auto-Download
      const isAiReady = await AiRepository.checkModelReady();
      if (!isAiReady) {
        showToast('Local AI モデルを検出できません。自動セットアップを開始します...', 'info');
        AiRepository.startModelDownload((progress) => {
          setState((prev: HomeUiState) => ({ ...prev, modelDownloadProgress: progress }));
          if (progress >= 100) {
            showToast('Local AI のセットアップが完了しました', 'success');
            setTimeout(() => setState(p => ({ ...p, modelDownloadProgress: null })), 3000);
          }
        }).catch(err => {
          showToast(`AI セットアップ失敗: ${err}`, 'error');
          setState(p => ({ ...p, modelDownloadProgress: null }));
        });
      }
    } catch (e) {
      showToast('データの読み込みに失敗しました', 'error');
      setState((prev: HomeUiState) => ({ ...prev, isLoading: false }));
    }
  }, [showToast]);

  const handleScan = async () => {
    if (state.isScanning) return;
    setState((prev: HomeUiState) => ({ ...prev, isScanning: true }));
    
    try {
      const root = await SettingRepository.get('workspace_root');
      if (!root) {
        showToast('設定画面でワークスペースのルートディレクトリを設定してください', 'info');
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      const scanned = await invoke<any[]>('scan_projects', { baseDir: root });
      let addedCount = 0;

      for (const p of scanned) {
        const exists = await ProjectRepository.existsByPath(p.path);
        if (!exists) {
          await ProjectRepository.add({ 
            name: p.name, 
            androidPath: p.path, 
            platform: 'WINDOWS_TAURI', // Default for scanned nodes
            gitUrl: p.git_url || undefined,
            isRemoteSyncEnabled: p.git_url ? 1 : 0 
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        showToast(`${addedCount} 件の新規ノードを検出しました`, 'success');
      } else {
        showToast('新規ノードは見つかりませんでした', 'info');
      }
      
      await loadData();
    } catch (e) {
      showToast('スキャン中にエラーが発生しました', 'error');
    } finally {
      setState((prev: HomeUiState) => ({ ...prev, isScanning: false }));
    }
  };

  const handleCreateProject = async (name: string, gasUrl: string, gitUrl: string, platform: 'ANDROID_KOTLIN' | 'WINDOWS_TAURI' | 'WEB_NEXTJS' | 'GAS_TS' | 'OTHER') => {
    if (!state.workspaceRoot) {
      showToast('ワークスペースのルート設定が必要です', 'error');
      return;
    }

    try {
      const { join } = await import('@tauri-apps/api/path');
      const { invoke } = await import('@tauri-apps/api/core');
      const projectPath = await join(state.workspaceRoot, name);

      // 1. Git Clone ONLY if valid URL provided (Ensures directory is either empty or created by git)
      const trimmedGitUrl = gitUrl ? gitUrl.trim() : '';
      if (trimmedGitUrl) {
        showToast(`リポジトリを同期中: ${trimmedGitUrl}`, 'info');
        const res = await GitRepository.clone(trimmedGitUrl, projectPath);
        if (!res.success) {
          throw new Error(`Git クローンに失敗しました: ${res.error || 'Unknown error'}`);
        }
      }

      // 3. Database Entry
      const newProject = await ProjectRepository.add({ 
        name, 
        platform: platform || 'WINDOWS_TAURI', // Passed from UI
        gasUrl: gasUrl || undefined, 
        androidPath: projectPath, 
        isRemoteSyncEnabled: gasUrl ? 1 : 0,
        gitUrl: gitUrl || undefined
      });
      
      // 4. Native Workspace Scaffolding (Bypasses JS scopes and creates Portal Link)
      const mcpUrl = 'http://localhost:3000/api/mcp'; // Default MCP Endpoint
      showToast(`ノード "${name}" を初期化中...`, 'info');
      await invoke('scaffold_project', { 
        path: projectPath, 
        name, 
        projectId: newProject.id, 
        mcpUrl 
      });
      
      showToast(`ノード "${name}" を正常に起動しました`, 'success');
      await loadData();
      setState((prev: HomeUiState) => ({ ...prev, isAddModalOpen: false }));
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      showToast(`プロジェクト作成に失敗: ${errorMsg}`, 'error');
      
      // AI 自律診断用のテレメトリ記録
      await LogRepository.add({
        projectId: 'SYSTEM',
        category: 'SYSTEM_ERROR',
        decision: `Failed to initialize node: ${name}`,
        reason: errorMsg
      });
    }
  };

  const handleRemoveProject = async (id: string, name: string) => {
    try {
      await ProjectRepository.delete(id);
      showToast(`ノード "${name}" を除外しました`, 'info');
      await loadData();
    } catch (e) {
      showToast('除外に失敗しました', 'error');
    }
  };

  const setAddModalOpen = (isOpen: boolean) => {
    setState((prev: HomeUiState) => ({ ...prev, isAddModalOpen: isOpen }));
  };

  return {
    state,
    loadData,
    handleScan,
    handleCreateProject,
    handleRemoveProject,
    setAddModalOpen
  };
};

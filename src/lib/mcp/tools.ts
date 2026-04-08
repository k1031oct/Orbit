import { ProjectRepository } from '../repositories/ProjectRepository';
import { RequirementRepository } from '../repositories/RequirementRepository';
import { LogRepository } from '../repositories/LogRepository';
import { AndroidExecutor } from '../android';
import { GovernanceInterceptor } from './governance';
import fs from 'fs';
import path from 'path';

/**
 * ファイル構成からプラットフォームを推測する
 */
export async function detectPlatform(projectPath: string): Promise<string> {
  const hasFile = (p: string) => fs.existsSync(path.join(projectPath, p));
  
  if (hasFile('build.gradle.kts') || hasFile('build.gradle')) {
    return 'ANDROID_KOTLIN';
  }
  
  if (hasFile('src-tauri')) {
    return 'WINDOWS_TAURI';
  }
  
  if (hasFile('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps.next) return 'WEB_NEXTJS';
    if (deps['@tauri-apps/api']) return 'WINDOWS_TAURI';
    if (deps.react) return 'WEB_REACT';
  }
  
  if (hasFile('app.json') && hasFile('package.json')) {
     return 'MOBILE_EXPO';
  }

  return 'OTHER';
}

/**
 * AI エージェント（MCP）に公開する具体的ツールの実体
 */
export const MCPTools = {
  /**
   * 規約を遵守してファイルを書き込み、理由を記録する
   */
  async writeGovernedFile(projectId: string, path: string, content: string, reasoning?: string): Promise<{ success: boolean; message: string }> {
    const { BreakthroughManager } = await import('../services/BreakthroughManager');
    const isBreakthrough = BreakthroughManager.isBreakthroughEnabled(projectId);
    
    // Breakthrough Mode 時は規約をバイパス（将来的に GovernanceInterceptor 側にロジックを委譲することも検討）
    const res = await GovernanceInterceptor.writeGovernedFile(path, content, isBreakthrough);
    
    // 意思決定のロギング (SQLite)
    await LogRepository.add({
      projectId,
      category: isBreakthrough ? 'BREAKTHROUGH_WRITE' : 'WRITE_FILE',
      decision: `Write to ${path}`,
      reason: (isBreakthrough ? '[BREAKTHROUGH] ' : '') + (reasoning || (res.success ? 'Standard development' : 'Governance Blocked'))
    });

    // 成功時、かつ重要なファイル（ViewModel, Repository等）の場合はナレッジベースに仮登録
    if (res.success && reasoning && (path.includes('ViewModel') || path.includes('Repository'))) {
      const { KnowledgeRepository } = await import('../repositories/KnowledgeRepository');
      const project = await ProjectRepository.getById(projectId);
      const techStack = await KnowledgeRepository.inferTechStack(project?.androidPath || path.split('src')[0]);
      
      await KnowledgeRepository.add({
        projectId,
        techStack: JSON.stringify(techStack),
        taskTitle: `Implementation of ${path.split(/[\\/]/).pop()}`,
        codeSnippet: content.length > 1000 ? content.substring(0, 1000) + '...' : content,
        outcome: 'SUCCESS',
        reasoning: reasoning,
        confidence: 0.8 // 自動登録はやや低めのスコアから開始
      });
    }

    return res;
  },

  /**
   * ナレッジベースから知見を検索する (Local Edition: SearchEngine 統合)
   */
  async readKnowledge(query: string, projectId?: string): Promise<string> {
    const { SearchEngine } = await import('../services/SearchEngine');
    const { KnowledgeRepository } = await import('../repositories/KnowledgeRepository');
    const { BreakthroughManager } = await import('../services/BreakthroughManager');
    
    const project = projectId ? await ProjectRepository.getById(projectId) : null;
    const currentStack = project ? await KnowledgeRepository.inferTechStack(project.androidPath) : [];
    
    const results = await SearchEngine.search(query, currentStack);
    
    if (results.length === 0) return 'No relevant knowledge found in the local database.';

    const isBreakthrough = projectId ? BreakthroughManager.isBreakthroughEnabled(projectId) : false;
    const statusHeader = isBreakthrough ? '[STATUS: BREAKTHROUGH MODE ACTIVE - Constraints Relaxed]\n' : '';

    const output = results.map(r => {
      // 検索にヒットした＝ナレッジの利用実績としてカウント
      if (r.id) KnowledgeRepository.recordUsage(r.id);
      
      return `--- Knowledge Entry (Local) ---
ID: ${r.id}
Task: ${r.taskTitle}
Stack: ${r.techStack}
Outcome: ${r.outcome}
Reasoning: ${r.reasoning}
Code Snippet:
\`\`\`
${r.codeSnippet}
\`\`\`
------------------------------`;
    }).join('\n\n');

    return statusHeader + output;
  },

  /**
   * ノードの要件を GAS と同期
   */
  async syncRequirements(projectId: string): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project || !project.gasUrl) return 'Error: Project or GAS URL not found';

    try {
      await RequirementRepository.syncWithGAS(projectId, project.gasUrl);
      return `Sync complete for project: ${project.name}`;
    } catch (e) {
      return `Sync failed: ${e}`;
    }
  },

  /**
   * プロジェクトのプラットフォームに応じたビルドを実行
   */
  async buildNode(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';

    let fullLog = '';
    const captureOutput = (line: string) => {
      fullLog += line + '\n';
      if (onOutput) onOutput(line);
      else console.log(`[MCP BUILD] ${line}`);
    };

    // プラットフォーム別のビルドロジック
    const { BreakthroughManager } = await import('../services/BreakthroughManager');
    
    let buildResult = '';
    switch (project.platform) {
      case 'WINDOWS_TAURI':
        if (onOutput) onOutput('[ORBIT] Platform: WINDOWS_TAURI. Starting production build...');
        try {
          const { exec } = await import('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          const { stdout, stderr } = await execAsync('npm run build', { cwd: project.androidPath });
          if (onOutput) onOutput(stdout);
          if (stderr && onOutput) onOutput(`[WARN] ${stderr}`);
          buildResult = 'Build Success (Tauri/Windows)';
        } catch (e) {
          buildResult = `Tauri Build Failed: ${e}`;
        }
        break;

      case 'ANDROID_KOTLIN':
        if (onOutput) onOutput('[ORBIT] Platform: ANDROID_KOTLIN. Running Gradle assembleDebug...');
        const success = await AndroidExecutor.runGradle(
          project.androidPath, 
          ['assembleDebug'], 
          captureOutput
        );
        if (!success) {
          const errorReport = AndroidExecutor.parseBuildLog(fullLog);
          buildResult = `Build Failed.\n${errorReport}`;
        } else {
          buildResult = 'Build Success (Native Android)';
        }
        break;

      default:
        buildResult = `Error: Build logic for platform '${project.platform}' is not implemented yet.`;
    }

    // Breakthrough Manager への通知とモード設定
    if (buildResult.toLowerCase().includes('success')) {
      BreakthroughManager.recordSuccess(projectId);
    } else {
      const isBreakthrough = BreakthroughManager.recordFailure(projectId);
      if (isBreakthrough) {
          buildResult += '\n[BREAKTHROUGH] Threshold exceeded. Breakthrough Mode ENABLED.';
      }
    }
    
    return buildResult;
  },

  /**
   * Android プロジェクトをリリースビルド (AAB)
   */
  async buildReleaseNode(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';
    if (project.platform !== 'ANDROID_KOTLIN') return 'Error: Release build is only supported for ANDROID_KOTLIN projects.';

    const success = await AndroidExecutor.runGradle(
      project.androidPath, 
      ['bundleRelease'], 
      onOutput || ((l) => console.log(`[MCP RELEASE BUILD] ${l}`))
    );

    if (success) {
      const aabPath = await AndroidExecutor.findAab(project.androidPath);
      return `Release Build Success. AAB Path: ${aabPath || 'Not found'}`;
    }

    return 'Release Build Failed.';
  },

  /**
   * 実機デプロイ、起動、および UI 監査
   */
  async deployNode(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';

    if (project.platform === 'WINDOWS_TAURI') {
      return 'Deployment for WINDOWS_TAURI is limited to local storage and browser preview at this stage.';
    }

    if (project.platform === 'ANDROID_KOTLIN') {
      const apkPath = await AndroidExecutor.findApk(project.androidPath);
      if (!apkPath) return 'Error: APK not found. Please BUILD first.';

      const installSuccess = await AndroidExecutor.runCommand(
        ['install', '-r', apkPath], 
        onOutput || ((l) => console.log(`[MCP DEPLOY] ${l}`))
      );

      if (!installSuccess) return 'Deployment Failed during APK installation.';

      const packageName = await AndroidExecutor.getPackageName(project.androidPath);
      if (packageName) {
        await AndroidExecutor.launchApp(packageName, onOutput);
      }

      const uiDump = await AndroidExecutor.dumpUiStructure();
      return `Deployment Success.\n--- Automated UI Audit (Physical View) ---\n${uiDump}\n--- End Audit ---`;
    }

    return `Error: Deployment logic for platform '${project.platform}' is not implemented.`;
  },

  /**
   * 統合的な検証（ビルド + デプロイ + 視覚的監査）を実行する
   */
  async verifyMission(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const buildResult = await this.buildNode(projectId, onOutput);
    if (!buildResult.includes('Success')) return `Verification Failed at Build Stage:\n${buildResult}`;

    const deployResult = await this.deployNode(projectId, onOutput);
    if (!deployResult.includes('Success')) return `Verification Failed at Deployment Stage:\n${deployResult}`;

    // スクリーンショット取得 (Phase 6 拡張)
    const screenshot = await AndroidExecutor.captureScreenshot();
    const screenshotInfo = screenshot 
      ? `\n[SCREENSHOT_ATTACHED: base64, size: ${screenshot.length}]`
      : '\n[SCREENSHOT_FAILED]';

    return `--- Mission Verification Report ---\nStatus: SUCCESS\nDetails:\n${deployResult}${screenshotInfo}\n--- End Report ---`;
  },

  /**
   * 自律的なビルド修復試行 (Phase 7 expansion)
   */
  async autonomousRepair(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';

    // 最大 3 回の修復サイクルを試走
    for (let i = 1; i <= 3; i++) {
        const buildResult = await this.buildNode(projectId, onOutput);
        if (buildResult.includes('Success')) {
            return `Repair Success at iteration ${i}. Project is now building.`;
        }
        
        // ログ解析
        const errorReport = buildResult; 
        
        // 本来はここでエージェント（LLM）に対して「このエラーを直して」とプロンプトを送るが、
        // Orbit 基盤としては「ログを構造化して次に繋げる」までを担当。
        if (onOutput) onOutput(`[REPAIR ATTEMPT ${i}] Analyzing errors...\n${errorReport}`);
        
        // 開発エージェントはこの出力を受け取り、ファイルを修正 (write_governed_file) してから、
        // 再度 verify_mission または autonomous_repair を呼ぶ。
    }
    
    return 'Autonomous repair loop exhausted. Manual intervention required.';
  },

  /**
   * ミッションの完了を報告し、ステータスを更新する
   */
  async reportMissionComplete(projectId: string, message?: string): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';

    try {
      // 1. GAS への同期
      if (project.gasUrl) {
        const { updateGASStatus } = await import('../gas');
        // project.id ではなく、特定の requirementId が必要な場合は引数を拡張する
        // 現状はプロジェクト全体の完了報告として扱う（簡易実装）
        await updateGASStatus(project.gasUrl, projectId, 'Done', message || 'Mission completed autonomously.');
      }

      // 2. ローカル DB の更新
      await ProjectRepository.updateStatus(projectId, 'completed', new Date().toISOString());

      // 3. ログの記録
      await LogRepository.add({
        projectId,
        category: 'MISSION_COMPLETE',
        decision: 'Report Mission Complete',
        reason: message || 'All objectives verified and deployed.'
      });

      return `Mission ${project.name} reported as COMPLETE.`;
    } catch (e) {
      return `Failed to report completion: ${e}`;
    }
  },

  /**
   * ミッションの遠隔診断（テレメトリ取得）
   */
  async getMissionTelemetry(projectId?: string): Promise<string> {
    try {
      const logs = projectId 
        ? await LogRepository.getAllByProject(projectId)
        : await LogRepository.getAllRecent(20);

      if (logs.length === 0) return 'Telemetry: No recent logs found.';

      return logs.map(l => 
        `[${l.timestamp}] CATEGORY: ${l.category || 'GENERAL'} | DECISION: ${l.decision} | REASON: ${l.reason || 'N/A'}`
      ).join('\n');
    } catch (e) {
      return `Telemetry Error: ${e}`;
    }
  }
};

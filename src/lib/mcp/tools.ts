import { ProjectRepository } from '../repositories/ProjectRepository';
import { RequirementRepository } from '../repositories/RequirementRepository';
import { LogRepository } from '../repositories/LogRepository';
import { AndroidExecutor } from '../android';
import { GovernanceInterceptor } from './governance';
import fs from 'fs';
import path from 'path';

/**
 * AI エージェント（MCP）に公開する具体的ツールの実体
 */
export const MCPTools = {
  /**
   * 規約を遵守してファイルを書き込み、理由を記録する
   */
  async writeGovernedFile(projectId: string, path: string, content: string, reasoning?: string): Promise<{ success: boolean; message: string }> {
    const res = await GovernanceInterceptor.writeGovernedFile(path, content);
    
    // 意思決定のロギング (SQLite)
    await LogRepository.add({
      projectId,
      category: 'WRITE_FILE',
      decision: `Write to ${path}`,
      reason: reasoning || (res.success ? 'Standard development' : 'Governance Blocked')
    });

    return res;
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
   * Android プロジェクトをビルドし、詳細なエラーを返す
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

    const isTauri = fs.existsSync(path.join(project.androidPath, 'src-tauri'));

    if (isTauri) {
      // Windows/Tauri ビルドの実行
      if (onOutput) onOutput('[ORBIT] Detecting Tauri project. Starting production build...');
      const { exec } = await import('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        const { stdout, stderr } = await execAsync('npm run build', { cwd: project.androidPath });
        if (onOutput) onOutput(stdout);
        if (stderr && onOutput) onOutput(`[WARN] ${stderr}`);
        return 'Build Success (Tauri/Windows)';
      } catch (e) {
        return `Tauri Build Failed: ${e}`;
      }
    }

    const success = await AndroidExecutor.runGradle(
      project.androidPath, 
      ['assembleDebug'], 
      captureOutput
    );

    if (!success) {
      const errorReport = AndroidExecutor.parseBuildLog(fullLog);
      return `Build Failed.\n${errorReport}`;
    }

    return 'Build Success';
  },

  /**
   * Android プロジェクトをリリースビルド (AAB)
   */
  async buildReleaseNode(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';

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

    const apkPath = await AndroidExecutor.findApk(project.androidPath);
    if (!apkPath) return 'Error: APK not found. Please BUILD first.';

    const installSuccess = await AndroidExecutor.runCommand(
      ['install', '-r', apkPath], 
      onOutput || ((l) => console.log(`[MCP DEPLOY] ${l}`))
    );

    if (!installSuccess) return 'Deployment Failed during APK installation.';

    // パッケージ名の動的取得
    const packageName = await AndroidExecutor.getPackageName(project.androidPath);
    if (packageName) {
      await AndroidExecutor.launchApp(packageName, onOutput);
    }

    // UI 監査 (物理的な検証)
    const uiDump = await AndroidExecutor.dumpUiStructure();
    
    return `Deployment Success.\n--- Automated UI Audit (Physical View) ---\n${uiDump}\n--- End Audit ---`;
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

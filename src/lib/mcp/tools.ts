import { ProjectRepository } from '../repositories/ProjectRepository';
import { RequirementRepository } from '../repositories/RequirementRepository';
import { LogRepository } from '../repositories/LogRepository';
import { AndroidExecutor } from '../android';

/**
 * AI エージェント（MCP）に公開する具体的ツールの実体
 */
export const MCPTools = {
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
   * Android プロジェクトをビルド
   */
  async buildNode(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';

    const success = await AndroidExecutor.runGradle(
      project.androidPath, 
      ['assembleDebug'], 
      onOutput || ((l) => console.log(`[MCP BUILD] ${l}`))
    );

    return success ? 'Build Success' : 'Build Failed';
  },

  /**
   * 実機デプロイと起動
   */
  async deployNode(projectId: string, onOutput?: (line: string) => void): Promise<string> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return 'Error: Project not found';

    const apkPath = await AndroidExecutor.findApk(project.androidPath);
    if (!apkPath) return 'Error: APK not found. Please BUILD first.';

    const success = await AndroidExecutor.runCommand(
      ['install', '-r', apkPath], 
      onOutput || ((l) => console.log(`[MCP DEPLOY] ${l}`))
    );

    return success ? 'Deployment Success and App Launched' : 'Deployment Failed';
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

import { ProjectRepository } from '../repositories/ProjectRepository';

export class BreakthroughManager {
  private static failureThreshold = 3;
  private static failureCounts: Map<string, number> = new Map();
  private static breakthroughFlags: Map<string, boolean> = new Map();

  /**
   * 失敗を記録し、閾値を超えたら Breakthrough Mode を発動
   */
  static recordFailure(projectId: string): boolean {
    const current = (this.failureCounts.get(projectId) || 0) + 1;
    this.failureCounts.set(projectId, current);

    if (current >= this.failureThreshold) {
      this.breakthroughFlags.set(projectId, true);
      console.log(`[BREAKTHROUGH] Breakthrough Mode ENABLED for project: ${projectId}`);
      return true;
    }
    return false;
  }

  /**
   * 成功時にカウントをリセットし、Breakthrough Mode を解除
   */
  static recordSuccess(projectId: string): void {
    this.failureCounts.set(projectId, 0);
    this.breakthroughFlags.set(projectId, false);
  }

  /**
   * 現在 Breakthrough Mode かどうかを確認
   */
  static isBreakthroughEnabled(projectId: string): boolean {
    return this.breakthroughFlags.get(projectId) || false;
  }

  /**
   * 手動で Breakthrough Mode を切り替える (号令/Override)
   */
  static setBreakthrough(projectId: string, enabled: boolean): void {
    this.breakthroughFlags.set(projectId, enabled);
    if (enabled) {
      console.log(`[BREAKTHROUGH] Manual Breakthrough Mode ENABLED for project: ${projectId}`);
    } else {
      this.failureCounts.set(projectId, 0);
    }
  }

  /**
   * 失敗カウントを取得
   */
  static getFailureCount(projectId: string): number {
    return this.failureCounts.get(projectId) || 0;
  }
}

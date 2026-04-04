import { DecisionLog } from '../models/types';
import { getDb, saveDb, rowsToObjects } from '../db';

export class LogRepository {
  static async add(log: Omit<DecisionLog, 'id' | 'timestamp'>): Promise<void> {
    const db = await getDb();
    db.run(
      'INSERT INTO decision_logs (projectId, category, decision, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
      [log.projectId, log.category, log.decision, log.reason, new Date().toISOString()]
    );
    await saveDb();
  }

  static async getAllByProject(projectId: string): Promise<DecisionLog[]> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM decision_logs WHERE projectId = ? ORDER BY timestamp DESC', [projectId]);
    return rowsToObjects(result) as DecisionLog[];
  }

  /**
   * システム全体の最新ログを取得
   */
  static async getAllRecent(limit: number = 50): Promise<DecisionLog[]> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM decision_logs ORDER BY timestamp DESC LIMIT ?', [limit]);
    return rowsToObjects(result) as DecisionLog[];
  }
}

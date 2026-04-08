import { KnowledgeEntry } from '../models/types';
import { getDb, saveDb, rowsToObjects } from '../db';
import fs from 'fs';
import path from 'path';

export class KnowledgeRepository {
  /**
   * ナレッジを記録する
   */
  static async add(entry: Omit<KnowledgeEntry, 'id' | 'timestamp' | 'usageCount'>): Promise<void> {
    const db = await getDb();
    db.run(
      'INSERT INTO knowledge_base (projectId, techStack, taskTitle, codeSnippet, outcome, reasoning, confidence, usageCount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        entry.projectId, 
        entry.techStack, 
        entry.taskTitle, 
        entry.codeSnippet, 
        entry.outcome, 
        entry.reasoning, 
        entry.confidence, 
        0, // Initial usageCount
        new Date().toISOString()
      ]
    );
    await saveDb();
    
    // Check for natural selection after adding
    await this.purgeOldEntries();
  }

  /**
   * 利用実績を記録する
   */
  static async recordUsage(id: number): Promise<void> {
    const db = await getDb();
    db.run('UPDATE knowledge_base SET usageCount = usageCount + 1 WHERE id = ?', [id]);
    await saveDb();
  }

  /**
   * 自然淘汰アルゴリズム (Natural Selection)
   * 蔵書数が 10,000件を超えた場合、信頼度・成功率・利用回数・新しさに基づき低スコアのものを削除
   */
  static async purgeOldEntries(): Promise<void> {
    const db = await getDb();
    const countRes = db.exec('SELECT COUNT(*) as total FROM knowledge_base');
    const total = countRes[0]?.values[0][0] as number;

    const LIMIT = 10000;
    if (total > LIMIT) {
      const purgeCount = total - LIMIT + 500; // 余裕を持って一括削除
      
      // 自然淘汰スコア計算ロジックを SQL で表現
      // Score = (confidence * 100) + (usageCount * 10) + (outcome == 'SUCCESS' ? 50 : 0)
      // timestamp が古いほどマイナス評価
      const purgeSql = `
        DELETE FROM knowledge_base 
        WHERE id IN (
          SELECT id FROM knowledge_base 
          ORDER BY (
            (confidence * 100) + 
            (usageCount * 10) + 
            (CASE WHEN outcome = 'SUCCESS' THEN 50 ELSE 0 END) +
            (strftime('%s', timestamp) / 86400.0) -- 日数換算での加点（新しいほど高得点）
          ) ASC 
          LIMIT ?
        )
      `;
      db.run(purgeSql, [purgeCount]);
      await saveDb();
      console.log(`Natural selection executed: Purged ${purgeCount} low-score entries.`);
    }
  }

  /**
   * キーワードや技術スタックでナレッジを検索する (SearchEngine 構築までの簡易版)
   */
  static async search(query: string, techStackFilter?: string): Promise<KnowledgeEntry[]> {
    const db = await getDb();
    let sql = 'SELECT * FROM knowledge_base WHERE (taskTitle LIKE ? OR reasoning LIKE ? OR techStack LIKE ?)';
    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (techStackFilter) {
      sql += ' AND techStack LIKE ?';
      params.push(`%${techStackFilter}%`);
    }

    sql += ' ORDER BY confidence DESC, timestamp DESC LIMIT 10';
    
    const result = db.exec(sql, params);
    return rowsToObjects(result) as KnowledgeEntry[];
  }

  /**
   * プロジェクトのパスから技術スタックを推定する
   */
  static async inferTechStack(projectPath: string): Promise<string[]> {
    const stack: string[] = [];
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.next) stack.push('Next.js');
        if (deps.react) stack.push('React');
        if (deps.tailwindcss) stack.push('TailwindCSS');
        if (deps.prisma) stack.push('Prisma');
        if (deps.typescript || deps.tsx) stack.push('TypeScript');
        if (deps['@tauri-apps/api']) stack.push('Tauri');
        if (deps.vite) stack.push('Vite');
        if (deps.lucide) stack.push('Lucide');
      }

      const cargoPath = path.join(projectPath, 'src-tauri', 'Cargo.toml');
      if (fs.existsSync(cargoPath)) stack.push('Rust', 'Tauri-Backend');

      const gradlePath = path.join(projectPath, 'build.gradle.kts');
      if (fs.existsSync(gradlePath)) stack.push('Android/Kotlin');
      
      const buildGradlePath = path.join(projectPath, 'build.gradle');
      if (fs.existsSync(buildGradlePath)) stack.push('Android/Java');

      // Android specific folders
      if (fs.existsSync(path.join(projectPath, 'app', 'src', 'main', 'java'))) stack.push('Android/UI');
      if (fs.existsSync(path.join(projectPath, 'app', 'src', 'main', 'res', 'layout'))) stack.push('Android/XML');
      
    } catch (e) {
      console.error('Failed to infer tech stack:', e);
    }
    return Array.from(new Set(stack)); // Unique tags
  }
}

import { KnowledgeEntry } from '../models/types';
import { getDb, saveDb, rowsToObjects } from '../db';
import fs from 'fs';
import path from 'path';

export class KnowledgeRepository {
  /**
   * ナレッジを記録する
   */
  static async add(entry: Omit<KnowledgeEntry, 'id' | 'timestamp'>): Promise<void> {
    const db = await getDb();
    db.run(
      'INSERT INTO knowledge_base (projectId, techStack, taskTitle, codeSnippet, outcome, reasoning, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        entry.projectId, 
        entry.techStack, 
        entry.taskTitle, 
        entry.codeSnippet, 
        entry.outcome, 
        entry.reasoning, 
        entry.confidence, 
        new Date().toISOString()
      ]
    );
    await saveDb();
  }

  /**
   * キーワードや技術スタックでナレッジを検索する (簡易実装)
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
        if (deps.typescript) stack.push('TypeScript');
        if (deps['@tauri-apps/api']) stack.push('Tauri');
      }

      if (fs.existsSync(path.join(projectPath, 'src-tauri'))) stack.push('Rust');
      if (fs.existsSync(path.join(projectPath, 'build.gradle.kts')) || fs.existsSync(path.join(projectPath, 'build.gradle'))) stack.push('Android/Kotlin');
      
    } catch (e) {
      console.error('Failed to infer tech stack:', e);
    }
    return stack;
  }
}

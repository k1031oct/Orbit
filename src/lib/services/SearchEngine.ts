import { KnowledgeEntry } from '../models/types';
import { getDb, rowsToObjects } from '../db';

export class SearchEngine {
  /**
   * ローカルナレッジ検索 (Local Edition)
   * 1. 技術スタックによるハードフィルタリング
   * 2. キーワードマッチングによるスコアリング
   * 3. 信頼度・成功率・利用回数による重み付け
   */
  static async search(query: string, currentTechStack: string[]): Promise<KnowledgeEntry[]> {
    const db = await getDb();
    
    // クエリを単語に分割 (スペース区切り)
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
    
    // 全件取得 (後で JS 側で詳細にランク付けするが、候補は 200件程度に絞る)
    // まずは技術スタックが 1つでも一致するものを優先して抽出
    let sql = 'SELECT * FROM knowledge_base';
    let params: any[] = [];
    
    if (currentTechStack.length > 0) {
      const clauses = currentTechStack.map(() => 'techStack LIKE ?');
      sql += ' WHERE (' + clauses.join(' OR ') + ')';
      params = currentTechStack.map(tag => `%${tag}%`);
    }

    sql += ' ORDER BY timestamp DESC LIMIT 200';
    
    const result = db.exec(sql, params);
    const candidates = rowsToObjects(result) as KnowledgeEntry[];
    
    if (candidates.length === 0 && currentTechStack.length > 0) {
      // 技術スタック一致がない場合は、全体からキーワード検索を試みる
      const fallbackResult = db.exec('SELECT * FROM knowledge_base ORDER BY timestamp DESC LIMIT 200');
      candidates.push(...(rowsToObjects(fallbackResult) as KnowledgeEntry[]));
    }

    // JS 側でのランク付け
    const ranked = candidates.map(entry => {
      let score = 0;
      const title = entry.taskTitle.toLowerCase();
      const reasoning = entry.reasoning.toLowerCase();
      const entryStack = entry.techStack.toLowerCase();

      // 1. 技術スタックの一致度 (高い重み)
      currentTechStack.forEach(tag => {
        if (entryStack.includes(tag.toLowerCase())) score += 100;
      });

      // 2. キーワードマッチング
      keywords.forEach(word => {
        if (title.includes(word)) score += 50;
        if (reasoning.includes(word)) score += 20;
      });

      // 3. 自然淘汰アルゴリズム定数との統合
      // 成功は加点、信頼度は倍率
      score += (entry.outcome === 'SUCCESS' ? 30 : -20);
      score += (entry.usageCount || 0) * 5;
      score = score * entry.confidence;

      // 4. Recency (新しさ)
      const ageInDays = (Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      score -= ageInDays * 0.5; // 1日経つごとに 0.5点減点

      return { entry, score };
    });

    // スコア順にソートして上位3件を返す
    return ranked
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.entry);
  }
}

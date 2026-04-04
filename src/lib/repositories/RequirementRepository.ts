import { LocalRequirement } from '../models/types';
import { getDb, saveDb, rowsToObjects } from '../db';
import { fetchRequirements } from '../gas';

export class RequirementRepository {
  static async getAllByProject(projectId: string): Promise<LocalRequirement[]> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM local_requirements WHERE projectId = ? ORDER BY id ASC', [projectId]);
    return rowsToObjects(result) as LocalRequirement[];
  }

  static async syncWithGAS(projectId: string, gasUrl: string): Promise<void> {
    const remoteReqs = await fetchRequirements(gasUrl);
    const db = await getDb();
    
    for (const req of remoteReqs) {
      const exists = db.exec("SELECT id FROM local_requirements WHERE projectId = ? AND title = ?", [projectId, req.title]);
      
      if (exists.length > 0 && exists[0].values.length > 0) {
        db.run(
          "UPDATE local_requirements SET description = ?, status = ?, target = ? WHERE projectId = ? AND title = ?",
          [req.description || '', req.status, req.target || '', projectId, req.title]
        );
      } else {
        db.run(
          "INSERT INTO local_requirements (projectId, title, description, status, target, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          [projectId, req.title, req.description || '', req.status, req.target || '', new Date().toISOString()]
        );
      }
    }
    
    await saveDb();
  }

  static async add(req: Omit<LocalRequirement, 'id' | 'createdAt' | 'status'>): Promise<void> {
    const db = await getDb();
    db.run(
      'INSERT INTO local_requirements (projectId, title, description, target, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [req.projectId, req.title, req.description || null, req.target || null, 'Todo', new Date().toISOString()]
    );
    await saveDb();
  }

  static async update(id: number, updates: Partial<LocalRequirement>): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.target !== undefined) { fields.push('target = ?'); values.push(updates.target); }
    
    if (fields.length === 0) return;
    
    values.push(id);
    db.run(`UPDATE local_requirements SET ${fields.join(', ')} WHERE id = ?`, values);
    await saveDb();
  }

  static async updateStatus(id: number, status: string): Promise<void> {
    const db = await getDb();
    db.run('UPDATE local_requirements SET status = ? WHERE id = ?', [status, id]);
    await saveDb();
  }

  static async delete(id: number): Promise<void> {
    const db = await getDb();
    db.run('DELETE FROM local_requirements WHERE id = ?', [id]);
    await saveDb();
  }
}

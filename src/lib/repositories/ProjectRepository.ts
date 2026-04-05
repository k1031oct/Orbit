import { Project } from '../models/types';
import { getDb, saveDb, rowsToObjects } from '../db';

export class ProjectRepository {
  static async getAll(): Promise<Project[]> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM projects ORDER BY id DESC');
    return rowsToObjects(result) as Project[];
  }

  static async getById(id: string): Promise<Project | null> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM projects WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    return rows.length > 0 ? (rows[0] as Project) : null;
  }

  static async add(project: Omit<Project, 'id' | 'status'>): Promise<Project> {
    const db = await getDb();
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      status: 'pending',
    };

    db.run(
      'INSERT INTO projects (id, name, platform, gasUrl, gitUrl, androidPath, status, isRemoteSyncEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [newProject.id, newProject.name, newProject.platform, newProject.gasUrl ?? null, newProject.gitUrl ?? null, newProject.androidPath, newProject.status, newProject.isRemoteSyncEnabled ?? 0]
    );

    await saveDb();
    return newProject;
  }

  static async existsByPath(path: string): Promise<boolean> {
    const db = await getDb();
    const result = db.exec('SELECT id FROM projects WHERE androidPath = ?', [path]);
    return result.length > 0;
  }

  static async delete(id: string): Promise<void> {
    const db = await getDb();
    db.run('DELETE FROM projects WHERE id = ?', [id]);
    await saveDb();
  }

  static async updateStatus(id: string, status: string, lastSyncedAt?: string): Promise<void> {
    const db = await getDb();
    db.run('UPDATE projects SET status = ?, lastSyncedAt = ? WHERE id = ?', [status, lastSyncedAt || null, id]);
    await saveDb();
  }

  static async update(id: string, fields: Partial<Omit<Project, 'id'>>): Promise<void> {
    const db = await getDb();
    const setClauses: string[] = [];
    const values: any[] = [];

    if (fields.name !== undefined) { setClauses.push('name = ?'); values.push(fields.name); }
    if (fields.platform !== undefined) { setClauses.push('platform = ?'); values.push(fields.platform); }
    if (fields.gasUrl !== undefined) { setClauses.push('gasUrl = ?'); values.push(fields.gasUrl); }
    if (fields.gitUrl !== undefined) { setClauses.push('gitUrl = ?'); values.push(fields.gitUrl); }
    if (fields.androidPath !== undefined) { setClauses.push('androidPath = ?'); values.push(fields.androidPath); }
    if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
    if (fields.description !== undefined) { setClauses.push('description = ?'); values.push(fields.description); }
    if (fields.lastBuildStatus !== undefined) { setClauses.push('lastBuildStatus = ?'); values.push(fields.lastBuildStatus); }
    if (fields.lastBuildAt !== undefined) { setClauses.push('lastBuildAt = ?'); values.push(fields.lastBuildAt); }
    if (fields.lastErrorLog !== undefined) { setClauses.push('lastErrorLog = ?'); values.push(fields.lastErrorLog); }
    if (fields.lastApkPath !== undefined) { setClauses.push('lastApkPath = ?'); values.push(fields.lastApkPath); }
    if (fields.latestVersion !== undefined) { setClauses.push('latestVersion = ?'); values.push(fields.latestVersion); }
    if (fields.isRemoteSyncEnabled !== undefined) { setClauses.push('isRemoteSyncEnabled = ?'); values.push(fields.isRemoteSyncEnabled); }

    if (setClauses.length === 0) return;
    values.push(id);
    db.run(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values);
    await saveDb();
  }
}

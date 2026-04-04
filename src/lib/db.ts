import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { invoke } from '@tauri-apps/api/core';

export interface Settings {
  key: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  gasUrl?: string;
  gitUrl?: string;
  androidPath: string;
  status: 'active' | 'pending';
  lastSyncedAt?: string;
  description?: string;
  lastBuildStatus?: 'success' | 'failed' | 'running' | null;
  lastBuildAt?: string | null;
  lastErrorLog?: string | null;
  lastApkPath?: string | null;
  latestVersion?: string | null;
  isRemoteSyncEnabled?: number; // 0: disabled, 1: enabled
}

export interface DecisionLog {
  id: string;
  projectId: string;
  category: string;
  decision: string;
  reason: string;
  timestamp: string;
}

export interface LocalRequirement {
  id: number;
  projectId: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Done';
  target?: string;
  createdAt: string;
}

// const dbDir = path.join(process.cwd(), 'data');
// const dbFilePath = path.join(dbDir, 'uaam.db');

let dbInstance: Database | null = null;
let SQL: SqlJsStatic | null = null;

async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  // Initialize sql.js WASM
  SQL = await initSqlJs({
    locateFile: file => `/${file}`
  });

  // Load existing database file via Tauri IPC
  let fileBuffer: Uint8Array | null = null;
  try {
    const encoded = await invoke<string | null>('load_db');
    if (encoded) {
      const binaryString = atob(encoded);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBuffer = bytes;
    }
  } catch (e) {
    console.error('Failed to load DB from Tauri:', e);
  }

  dbInstance = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  // Create tables if not exists
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gasUrl TEXT,
      androidPath TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      lastSyncedAt TEXT,
      description TEXT,
      lastBuildStatus TEXT,
      lastBuildAt TEXT,
      lastErrorLog TEXT,
      lastApkPath TEXT,
      latestVersion TEXT,
      isRemoteSyncEnabled INTEGER DEFAULT 0
    )
  `);

  // Quick migration: Ensure latestVersion column exists
  try {
    dbInstance.exec('ALTER TABLE projects ADD COLUMN latestVersion TEXT');
  } catch (e) {}

  try {
    dbInstance.exec('ALTER TABLE projects ADD COLUMN isRemoteSyncEnabled INTEGER DEFAULT 0');
  } catch (e) {}

  try {
    dbInstance.exec('ALTER TABLE projects ADD COLUMN gitUrl TEXT');
  } catch (e) {}

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS decision_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId TEXT NOT NULL,
      category TEXT,
      decision TEXT NOT NULL,
      reason TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS local_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Todo',
      target TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  return dbInstance;
}

async function saveDb(): Promise<void> {
  if (!dbInstance) return;
  const data = dbInstance.export();
  
  // Uint8Array to Base64
  let binary = '';
  const bytes = new Uint8Array(data);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const encoded = btoa(binary);
  
  try {
    await invoke('save_db', { data: encoded });
  } catch (e) {
    console.error('Failed to save DB via Tauri:', e);
  }
}

// Settings Helpers
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
  const rows = rowsToObjects(result);
  return rows.length > 0 ? rows[0].value : null;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  await saveDb();
}

function rowsToObjects(result: any[]): any[] {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj;
  });
}

export async function getProjects(): Promise<Project[]> {
  const db = await getDb();
  const result = db.exec('SELECT * FROM projects ORDER BY id DESC');
  return rowsToObjects(result) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDb();
  const result = db.exec('SELECT * FROM projects WHERE id = ?', [id]);
  const rows = rowsToObjects(result);
  return rows.length > 0 ? (rows[0] as Project) : null;
}

export async function addProject(project: Omit<Project, 'id' | 'status'>): Promise<Project> {
  const db = await getDb();
  const newProject: Project = {
    ...project,
    id: Date.now().toString(),
    status: 'pending',
  };

  db.run(
    'INSERT INTO projects (id, name, gasUrl, gitUrl, androidPath, status, isRemoteSyncEnabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [newProject.id, newProject.name, newProject.gasUrl ?? null, newProject.gitUrl ?? null, newProject.androidPath, newProject.status, newProject.isRemoteSyncEnabled ?? 0]
  );

  await saveDb();
  return newProject;
}

export async function projectExistsByPath(path: string): Promise<boolean> {
  const db = await getDb();
  const result = db.exec('SELECT id FROM projects WHERE androidPath = ?', [path]);
  return result.length > 0;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM projects WHERE id = ?', [id]);
  await saveDb();
}

export async function updateProjectStatus(id: string, status: string, lastSyncedAt?: string): Promise<void> {
  const db = await getDb();
  db.run('UPDATE projects SET status = ?, lastSyncedAt = ? WHERE id = ?', [status, lastSyncedAt || null, id]);
  await saveDb();
}

export async function updateProject(id: string, fields: Partial<Omit<Project, 'id'>>): Promise<void> {
  const db = await getDb();
  const setClauses: string[] = [];
  const values: any[] = [];

  if (fields.name !== undefined) { setClauses.push('name = ?'); values.push(fields.name); }
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

export async function addDecisionLog(log: Omit<DecisionLog, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDb();
  db.run(
    'INSERT INTO decision_logs (projectId, category, decision, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
    [log.projectId, log.category, log.decision, log.reason, new Date().toISOString()]
  );
  await saveDb();
}

export async function getDecisionLogs(projectId: string): Promise<DecisionLog[]> {
  const db = await getDb();
  const result = db.exec('SELECT * FROM decision_logs WHERE projectId = ? ORDER BY timestamp DESC', [projectId]);
  return rowsToObjects(result) as DecisionLog[];
}

export async function addLocalRequirement(req: Omit<LocalRequirement, 'id' | 'createdAt' | 'status'>): Promise<void> {
  const db = await getDb();
  db.run(
    'INSERT INTO local_requirements (projectId, title, description, target, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [req.projectId, req.title, req.description || null, req.target || null, 'Todo', new Date().toISOString()]
  );
  await saveDb();
}

export async function getLocalRequirements(projectId: string): Promise<LocalRequirement[]> {
  const db = await getDb();
  const result = db.exec('SELECT * FROM local_requirements WHERE projectId = ? ORDER BY id ASC', [projectId]);
  return rowsToObjects(result) as LocalRequirement[];
}

export async function changeLocalRequirementStatus(id: number, status: string): Promise<void> {
  const db = await getDb();
  db.run('UPDATE local_requirements SET status = ? WHERE id = ?', [status, id]);
  await saveDb();
}

export async function removeLocalRequirement(id: number): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM local_requirements WHERE id = ?', [id]);
  await saveDb();
}

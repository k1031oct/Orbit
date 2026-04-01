import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import { promises as fs } from 'fs';

export interface Project {
  id: string;
  name: string;
  gasUrl?: string;
  androidPath: string;
  status: 'active' | 'pending';
  lastSyncedAt?: string;
  description?: string;
}

const dbDir = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dbDir, 'uaam.db');

let dbInstance: Database | null = null;
let SQL: SqlJsStatic | null = null;

async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  // Ensure data directory exists
  await fs.mkdir(dbDir, { recursive: true });

  // Initialize sql.js WASM
  SQL = await initSqlJs();

  // Load existing database file or create new one
  let fileBuffer: Buffer | null = null;
  try {
    fileBuffer = await fs.readFile(dbFilePath);
  } catch {
    // No existing DB file - start fresh
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
      description TEXT
    )
  `);

  return dbInstance;
}

async function saveDb(): Promise<void> {
  if (!dbInstance) return;
  await fs.mkdir(dbDir, { recursive: true });
  const data = dbInstance.export();
  await fs.writeFile(dbFilePath, Buffer.from(data));
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
    'INSERT INTO projects (id, name, gasUrl, androidPath, status) VALUES (?, ?, ?, ?, ?)',
    [newProject.id, newProject.name, newProject.gasUrl ?? null, newProject.androidPath, newProject.status]
  );

  await saveDb();
  return newProject;
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
  if (fields.androidPath !== undefined) { setClauses.push('androidPath = ?'); values.push(fields.androidPath); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.description !== undefined) { setClauses.push('description = ?'); values.push(fields.description); }

  if (setClauses.length === 0) return;
  values.push(id);
  db.run(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values);
  await saveDb();
}

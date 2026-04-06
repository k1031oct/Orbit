import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { invoke } from '@tauri-apps/api/core';

let dbInstance: Database | null = null;
let SQL: SqlJsStatic | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  // Initialize sql.js WASM
  SQL = await initSqlJs({
    locateFile: file => `/${file}`
  });

  // Load existing database file via Tauri IPC
  let fileBuffer: Uint8Array | null = null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
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
  
  // Table creation remains same...
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT DEFAULT 'WINDOWS_TAURI',
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
      isRemoteSyncEnabled INTEGER DEFAULT 0,
      gitUrl TEXT
    )
  `);

  // Migration: Platform column for existing projects
  try {
    dbInstance.run("ALTER TABLE projects ADD COLUMN platform TEXT DEFAULT 'WINDOWS_TAURI'");
  } catch (e) {
    // Column already exists
  }

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
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId TEXT NOT NULL,
      techStack TEXT,
      taskTitle TEXT NOT NULL,
      codeSnippet TEXT,
      outcome TEXT NOT NULL,
      reasoning TEXT,
      confidence REAL DEFAULT 1.0,
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

export async function saveDb(): Promise<void> {
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
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_db', { data: encoded });
  } catch (e) {
    console.error('Failed to save DB via Tauri:', e);
  }
}

export function rowsToObjects(result: any[]): any[] {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj;
  });
}

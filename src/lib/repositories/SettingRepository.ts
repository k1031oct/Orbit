import { getDb, saveDb, rowsToObjects } from '../db';

export class SettingRepository {
  static async get(key: string): Promise<string | null> {
    const db = await getDb();
    const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
    const rows = rowsToObjects(result);
    return rows.length > 0 ? rows[0].value : null;
  }

  static async update(key: string, value: string): Promise<void> {
    const db = await getDb();
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    await saveDb();
  }
}

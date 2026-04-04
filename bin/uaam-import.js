const initSqlJs = require('../node_modules/sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

const PROJECTS_TO_IMPORT = [
  { name: 'AgriDefense', path: 'C:\\Engineering\\Android\\AgriDefense' },
  { name: 'GWS-Auto-for-Android', path: 'C:\\Engineering\\Android\\GWS-Auto-for-Android' },
  { name: 'Second_brain', path: 'C:\\Engineering\\Android\\Second_brain' },
  { name: 'Tasks', path: 'C:\\Engineering\\Android\\Tasks' },
  { name: 'evo', path: 'C:\\Engineering\\WEBAPP\\evo' },
  { name: 'DesktopLauncher', path: 'C:\\Engineering\\Windows\\DesktopLauncher' },
  { name: 'UAAMTEST', path: 'C:\\Engineering\\Android\\UAAMTEST' }
];

async function importProjects() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'uaam.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found:', dbPath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  console.log('Starting UAAM project import...');

  for (let i = 0; i < PROJECTS_TO_IMPORT.length; i++) {
    const p = PROJECTS_TO_IMPORT[i];
    
    // Check if project exists by path
    const res = db.exec('SELECT id FROM projects WHERE androidPath = ?', [p.path]);
    
    if (res.length > 0 && res[0].values.length > 0) {
      // Exists, update name (for things like TEST -> UAAMTEST)
      const id = res[0].values[0][0];
      db.run('UPDATE projects SET name = ?, status = ? WHERE id = ?', [p.name, 'active', id]);
      console.log(`Updated existing project: ${p.name} (ID: ${id})`);
    } else {
      // New, insert
      const id = (Date.now() + i).toString();
      db.run(
        'INSERT INTO projects (id, name, androidPath, status, isRemoteSyncEnabled, lastSyncedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, p.name, p.path, 'active', 0, new Date().toISOString()]
      );
      console.log(`Imported new project: ${p.name} (ID: ${id})`);
    }
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('Import completed successfully.');
}

importProjects().catch(console.error);

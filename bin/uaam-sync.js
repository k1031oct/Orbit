const initSqlJs = require('../node_modules/sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

async function syncUaam() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Usage: node uaam-sync.js <update-project|update-req|list-projects|list-reqs|list-logs> --id <id> ...');
    return;
  }

  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'uaam.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found:', dbPath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  try {
    db.run('ALTER TABLE projects ADD COLUMN latestVersion TEXT');
  } catch (e) {}

  try {
    db.run('ALTER TABLE projects ADD COLUMN isRemoteSyncEnabled INTEGER DEFAULT 0');
  } catch (e) {}

  if (command === 'update-project') {
    const id = getArg('--id', args);
    const url = getArg('--url', args);
    const desc = getArg('--desc', args);
    const ver = getArg('--ver', args);
    const status = getArg('--status', args);
    const sync = getArg('--sync', args);

    if (!id) { console.error('ID required'); return; }

    const updates = [];
    const values = [];
    if (url !== null) { updates.push('gasUrl = ?'); values.push(url); }
    if (desc !== null) { updates.push('description = ?'); values.push(desc); }
    if (ver !== null) { updates.push('latestVersion = ?'); values.push(ver); }
    if (status !== null) { updates.push('status = ?'); values.push(status); }
    if (sync !== null) { updates.push('isRemoteSyncEnabled = ?'); values.push(parseInt(sync)); }

    if (updates.length > 0) {
      values.push(id);
      db.run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
      console.log(`Project ${id} updated.`);
    }
  } else if (command === 'update-req') {
    const id = getArg('--id', args);
    const status = getArg('--status', args);

    if (!id || !status) { console.error('ID and status required'); return; }

    db.run('UPDATE local_requirements SET status = ? WHERE id = ?', [status, id]);
    console.log(`Requirement ${id} updated to ${status}.`);
  } else if (command === 'list-projects') {
    const res = db.exec('SELECT id, name, status, latestVersion FROM projects');
    if (res.length > 0) {
      console.table(res[0].values.map(v => {
        const obj = {};
        res[0].columns.forEach((c, i) => obj[c] = v[i]);
        return obj;
      }));
    } else {
      console.log('No projects found.');
    }
  } else if (command === 'list-reqs') {
    const projectId = getArg('--project', args);
    const sql = projectId ? 'SELECT id, projectId, title, status, description FROM local_requirements WHERE projectId = ?' : 'SELECT id, projectId, title, status, description FROM local_requirements';
    const res = db.exec(sql, projectId ? [projectId] : []);
    if (res.length > 0) {
      console.table(res[0].values.map(v => {
        const obj = {};
        res[0].columns.forEach((c, i) => obj[c] = v[i]);
        return obj;
      }));
    } else {
      console.log('No requirements found.');
    }
  } else if (command === 'list-logs') {
    const projectId = getArg('--project', args);
    const sql = projectId ? 'SELECT * FROM decision_logs WHERE projectId = ? ORDER BY timestamp DESC' : 'SELECT * FROM decision_logs ORDER BY timestamp DESC';
    const res = db.exec(sql, projectId ? [projectId] : []);
    if (res.length > 0) {
      console.table(res[0].values.map(v => {
        const obj = {};
        res[0].columns.forEach((c, i) => obj[c] = v[i]);
        return obj;
      }));
    } else {
      console.log('No logs found.');
    }
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('UAAM synchronization complete.');
}

function getArg(key, args) {
  const idx = args.indexOf(key);
  return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : null;
}

syncUaam().catch(console.error);

const initSqlJs = require('./node_modules/sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.config');
const dbPath = path.join(appData, 'com.k1031oct.orbit', 'orbit.db');

async function diagnose() {
  if (!fs.existsSync(dbPath)) {
    console.log(`Error: Database not found at ${dbPath}`);
    return;
  }

  const fileBuffer = fs.readFileSync(dbPath);
  
  const SQL = await initSqlJs();
  const db = new SQL.Database(fileBuffer);
  
  console.log('--- MISSION TELEMETRY REPORT ---');
  const results = db.exec("SELECT * FROM decision_logs ORDER BY timestamp DESC LIMIT 20");
  
  if (results.length === 0) {
    console.log('No logs found in decision_logs table.');
  } else {
    const columns = results[0].columns;
    const values = results[0].values;
    
    values.forEach(row => {
      const log = {};
      columns.forEach((col, i) => log[col] = row[i]);
      console.log(`[${log.timestamp}] ${log.category || 'GENERAL'} - ${log.decision}: ${log.reason || '(no reason)'}`);
    });
  }
  
  db.close();
}

diagnose().catch(console.error);

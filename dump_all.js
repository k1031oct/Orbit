const initSqlJs = require('./node_modules/sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

async function dumpAll() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'uaam.db');
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const tables = ['projects', 'local_requirements', 'decision_logs'];
  
  for (const table of tables) {
    console.log(`\n--- ${table.toUpperCase()} ---`);
    const res = db.exec(`SELECT * FROM ${table}`);
    if (res.length > 0) {
      const cols = res[0].columns;
      res[0].values.forEach(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        console.log(JSON.stringify(obj, null, 2));
      });
    } else {
      console.log(`No data in ${table}.`);
    }
  }
}

dumpAll().catch(console.error);

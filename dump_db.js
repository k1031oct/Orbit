const initSqlJs = require('./node_modules/sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

async function dumpDb() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'uaam.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('Database file not found at:', dbPath);
    return;
  }
  
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);
  
  console.log('--- PROJECTS ---');
  const projects = db.exec('SELECT * FROM projects');
  if (projects.length > 0) {
    const cols = projects[0].columns;
    projects[0].values.forEach(row => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      console.log(JSON.stringify(obj, null, 2));
    });
  } else {
    console.log('No projects found.');
  }

  console.log('\n--- LOCAL REQUIREMENTS ---');
  const reqs = db.exec('SELECT * FROM local_requirements');
  if (reqs.length > 0) {
    const cols = reqs[0].columns;
    reqs[0].values.forEach(row => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      console.log(JSON.stringify(obj, null, 2));
    });
  } else {
    console.log('No local requirements found.');
  }
}

dumpDb().catch(console.error);

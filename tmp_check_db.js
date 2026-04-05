const fs = require('fs');
const initSqlJs = require('./node_modules/sql.js');

async function check() {
  const dbPath = 'data/uaam.db';
  const fileBuffer = fs.readFileSync(dbPath);
  const SQL = await initSqlJs();
  const db = new SQL.Database(fileBuffer);
  
  console.log('--- Projects ---');
  const projects = db.exec("SELECT id, name FROM projects");
  console.log(JSON.stringify(projects, null, 2));
  
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('--- Tables ---', JSON.stringify(tables, null, 2));
  
  // "objectives" か "requirements" か
  const targetTable = tables[0].values.some(v => v[0] === 'objectives') ? 'objectives' : 
                     tables[0].values.some(v => v[0] === 'requirements') ? 'requirements' : null;
  
  if (targetTable) {
    console.log(`\n--- Schema: ${targetTable} ---`);
    const schema = db.exec(`PRAGMA table_info(${targetTable})`);
    console.log(JSON.stringify(schema, null, 2));
    
    console.log(`\n--- Recent ${targetTable} ---`);
    const data = db.exec(`SELECT * FROM ${targetTable} LIMIT 10`);
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('No objectives or requirements table found.');
  }
}

check().catch(console.error);

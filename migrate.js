// script to load old custom db to sqlite db
const path = require('path');
const fs = require('fs');

async function migrate() {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const dbFilePath = path.join(__dirname, 'data', 'uaam.db');
    let fileBuffer = null;
    try {
        fileBuffer = fs.readFileSync(dbFilePath);
    } catch {}
    
    const db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
    
    db.run(`
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
            lastApkPath TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS decision_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectId TEXT NOT NULL,
            category TEXT,
            decision TEXT NOT NULL,
            reason TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
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

    try {
        const jsonPath = path.join(__dirname, 'data', 'projects.json');
        const data = fs.readFileSync(jsonPath, 'utf8');
        const projects = JSON.parse(data);
        for (const p of projects) {
            db.run(
                'INSERT OR REPLACE INTO projects (id, name, gasUrl, androidPath, status) VALUES (?, ?, ?, ?, ?)',
                [p.id, p.name, p.gasUrl, p.androidPath, p.status]
            );
            console.log(`Migrated ${p.name}`);
        }
    } catch(e) {
        console.error("Migration skipped or failed:", e);
    }
    
    fs.writeFileSync(dbFilePath, Buffer.from(db.export()));
    console.log("Migration complete!");
}

migrate();

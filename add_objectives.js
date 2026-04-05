const fs = require('fs');
const initSqlJs = require('./node_modules/sql.js');

async function addObjectives() {
  const dbPath = 'C:/Users/k1031/AppData/Roaming/com.k1031oct.orbit/orbit.db';
  if (!fs.existsSync(dbPath)) {
    console.error('DB not found');
    return;
  }
  
  const fileBuffer = fs.readFileSync(dbPath);
  const SQL = await initSqlJs();
  const db = new SQL.Database(fileBuffer);
  
  const projectId = '1775272604265'; // Orbit Project ID
  
  const objectives = [
    {
      title: 'Android 制御基盤の追加実装 (Phase 1)',
      description: 'uiautomator dump による UI 構造取得と、ビルドログのエラー詳細パース機能を実装する。',
      target: 'src/lib/android.ts'
    },
    {
      title: 'MCP ガバナンス・フックの実装 (Phase 2)',
      description: 'write_governed_file を通じた ViewModel 命名規則と XML 禁止の物理的強制を実装する。',
      target: 'src/lib/mcp/governance.ts'
    },
    {
      title: '自律検収と GAS 同期の統合 (Phase 3)',
      description: '意思決定理由の SQLite 記録と、GAS エンドポイントへのタスク完了同期を実装する。',
      target: 'src/lib/mcp/tools.ts'
    }
  ];

  console.log('Adding objectives...');
  for (const obj of objectives) {
    db.run(
      'INSERT INTO local_requirements (projectId, title, description, status, target) VALUES (?, ?, ?, ?, ?)',
      [projectId, obj.title, obj.description, 'Todo', obj.target]
    );
  }
  
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('Objectives added successfully to AppData DB.');
}

addObjectives().catch(console.error);

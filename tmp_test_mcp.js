const { MCPTools } = require('./src/lib/mcp/tools');

async function test() {
  const projectId = '1775272604265'; // Orbit
  const testFilePath = 'src/test/mcp/AuditTestViewModel.kt';
  const testContent = `
package com.k1031oct.orbit.test
import androidx.lifecycle.ViewModel

class AuditTestViewModel : ViewModel() {
    // Correct MVVM implementation
}
  `;
  const reasoning = '基盤実装後の一貫性監査および物理的ロギングのテスト。';

  console.log('--- Testing writeGovernedFile ---');
  const res = await MCPTools.writeGovernedFile(projectId, testFilePath, testContent, reasoning);
  console.log('Result:', JSON.stringify(res, null, 2));

  console.log('\n--- Checking Decision Logs ---');
  const telemetry = await MCPTools.getMissionTelemetry(projectId);
  console.log('Latest Telemetry:\n', telemetry);
}

test().catch(console.error);

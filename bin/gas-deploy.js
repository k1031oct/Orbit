const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function gasDeploy() {
  const args = process.argv.slice(2);
  const projectId = getArg('--projectId', args);
  const projectPath = getArg('--path', args);
  const title = getArg('--title', args);
  const version = getArg('--version', args);

  if (!projectId || !projectPath) {
    console.log('Usage: node gas-deploy.js --projectId <id> --path <path> [--title <title>] [--version <v1.0.0>]');
    return;
  }

  // Ensure absolute path
  const absPath = path.resolve(projectPath);
  process.chdir(absPath);
  console.log(`Current directory: ${absPath}`);

  // 1. clasp initialize if not exists
  if (!fs.existsSync('.clasp.json')) {
      console.log('Creating new GAS project...');
      execSync(`clasp create --type standalone --title "${title || 'UAAM_GAS_PROJECT'}"`, { stdio: 'inherit' });
  }

  // 2. Update appsscript.json if needed
  if (fs.existsSync('appsscript.json')) {
      let manifest = JSON.parse(fs.readFileSync('appsscript.json', 'utf8'));
      if (!manifest.webapp) {
          manifest.webapp = { access: "ANYONE", executeAs: "USER_DEPLOYING" };
          manifest.timeZone = "Asia/Tokyo";
          fs.writeFileSync('appsscript.json', JSON.stringify(manifest, null, 2));
          console.log('Updated appsscript.json to webapp.');
      }
  }

  // 3. Push code
  console.log('Pushing code to GAS...');
  execSync('clasp push -f', { stdio: 'inherit' });

  // 4. Deploy (Create Version)
  console.log(`Deploying version ${version || 'latest'}...`);
  const deployOutput = execSync(`clasp deploy -d "${version || 'Deployed via UAAM'}"`, { encoding: 'utf8' });
  console.log(deployOutput);

  // Extract Deployment ID and URL from output
  // Example output: Created version N. \n - ID @Version
  const deployMatch = deployOutput.match(/- ([a-zA-Z0-9_-]+) @\d+/);
  const deployId = deployMatch ? deployMatch[1] : null;

  if (deployId) {
      const gasUrl = `https://script.google.com/macros/s/${deployId}/exec`;
      console.log(`Deployment successful: ${gasUrl}`);

      // 5. Update UAAM Status via uaam-sync.js
      const syncCmd = `node "${path.join(__dirname, 'uaam-sync.js')}" update-project --id ${projectId} --url "${gasUrl}" --ver "${version || 'v1.0.0'}" --status active --sync 0`;
      console.log(`Syncing with UAAM: ${syncCmd}`);
      execSync(syncCmd, { stdio: 'inherit' });
  } else {
      console.error('Could not find deployment ID in clasp output.');
  }
}

function getArg(key, args) {
  const idx = args.indexOf(key);
  return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : null;
}

gasDeploy().catch(console.error);

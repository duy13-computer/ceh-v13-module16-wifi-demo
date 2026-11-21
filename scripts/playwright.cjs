const { spawnSync } = require('node:child_process');

// Cài browser trong node_modules để dùng cùng vị trí trên Windows và CI.
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0' },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);

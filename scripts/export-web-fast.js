const { spawnSync } = require('child_process');

const env = {
  ...process.env,
  EXPO_PUBLIC_SKIP_DYNAMIC_SEO_EXPORT: '1',
};

const result = spawnSync('npx', ['expo', 'export', '--platform', 'web'], {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

process.exitCode = result.status || 0;

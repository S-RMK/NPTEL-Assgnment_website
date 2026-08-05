const fs = require('fs');
const cp = require('child_process');

// Navigate into client directory if executing from root workspace
if (fs.existsSync('client/package.json')) {
  process.chdir('client');
}

// Execute Vite React build
cp.execSync('npm run build', { stdio: 'inherit' });

// Publish the build to the repo-root `dist` that vercel.json declares as outputDirectory.
// (cwd is `client` here, so `../dist` is the repo root. Copying to a bare `dist` or
// `client/dist` would target the source itself or create a junk `client/client/dist`.)
const src = 'dist';

if (fs.existsSync(src)) {
  fs.cpSync(src, '../dist', { recursive: true });
}

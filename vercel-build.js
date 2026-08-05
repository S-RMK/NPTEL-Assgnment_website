const fs = require('fs');
const cp = require('child_process');

// Navigate into client directory if executing from root workspace
if (fs.existsSync('client/package.json')) {
  process.chdir('client');
}

// Execute Vite React build
cp.execSync('npm run build', { stdio: 'inherit' });

// Ensure compiled static assets exist in all potential Vercel output locations
const src = 'dist';
const targets = ['../dist', '../client/dist', 'dist', 'client/dist'];

targets.forEach(t => {
  try {
    if (fs.existsSync(src)) {
      fs.cpSync(src, t, { recursive: true });
    }
  } catch (e) {
    // Ignore error if target path equals source
  }
});

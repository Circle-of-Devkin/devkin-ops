const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  console.log('⚡ Building DevKin Ops VS Code Extension...');

  const rootDir = path.resolve(__dirname, '..');
  const vscodeDir = __dirname;

  // 1. Ensure webview-dist exists and sync from root dist/
  const rootDist = path.join(rootDir, 'dist');
  const webviewDist = path.join(vscodeDir, 'webview-dist');

  if (!fs.existsSync(rootDist)) {
    console.warn('⚠️  Root dist/ not found. Run "npm run build" first to compile the React UI.');
  } else {
    fs.mkdirSync(webviewDist, { recursive: true });
    fs.cpSync(rootDist, webviewDist, { recursive: true });
    console.log('✓ Synced React webview assets into vscode/webview-dist');
  }

  // 2. Copy legal & changelog to extension folder for Marketplace
  const docs = ['LICENSE', 'CHANGELOG.md'];
  for (const doc of docs) {
    const srcDoc = path.join(rootDir, doc);
    const destDoc = path.join(vscodeDir, doc);
    if (fs.existsSync(srcDoc)) {
      fs.copyFileSync(srcDoc, destDoc);
      console.log(`✓ Copied ${doc} to vscode/`);
    }
  }

  // 3. Bundle extension backend with esbuild
  console.log('📦 Bundling extension backend (Node.js runtime)...');
  await esbuild.build({
    entryPoints: [path.join(vscodeDir, 'src/extension.ts')],
    bundle: true,
    outfile: path.join(vscodeDir, 'dist/extension.js'),
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    logLevel: 'info'
  });

  console.log('✨ VS Code extension built successfully at vscode/dist/extension.js');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});


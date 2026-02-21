const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const COPY_ITEMS = ['assets', 'images', 'js', 'src', 'index.html', 'prototype.html'];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function runNpmScript(scriptName) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = npmExecPath ? [npmExecPath, 'run', scriptName] : ['run', scriptName];

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: ROOT_DIR,
    shell: !npmExecPath && process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} failed with exit code ${result.status}`);
  }
}

function cleanDist() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function copyIfExists(relPath) {
  const srcPath = path.join(ROOT_DIR, relPath);
  const destPath = path.join(DIST_DIR, relPath);

  if (!fs.existsSync(srcPath)) {
    console.log(`Skipping missing path: ${relPath}`);
    return;
  }

  fs.cpSync(srcPath, destPath, { recursive: true });
  console.log(`Copied ${relPath}`);
}

function copyBuiltCssOnly() {
  const cssSourceDir = path.join(ROOT_DIR, 'css');
  const cssDestDir = path.join(DIST_DIR, 'css');

  if (!fs.existsSync(cssSourceDir)) {
    console.log('Skipping missing path: css');
    return;
  }

  fs.mkdirSync(cssDestDir, { recursive: true });

  const entries = fs.readdirSync(cssSourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.css') || entry.name.endsWith('.tailwind.css')) {
      continue;
    }

    const srcFile = path.join(cssSourceDir, entry.name);
    const destFile = path.join(cssDestDir, entry.name);
    fs.copyFileSync(srcFile, destFile);
  }

  console.log('Copied compiled CSS files to dist/css');
}

function listDistFiles() {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        files.push(toPosixPath(path.relative(DIST_DIR, fullPath)));
      }
    }
  }

  walk(DIST_DIR);
  files.sort((a, b) => a.localeCompare(b));

  console.log('Dist artifact contents:');
  for (const file of files) {
    console.log(file);
  }
}

function main() {
  console.log('Building CSS...');
  runNpmScript('build:css');

  console.log('Preparing dist artifact...');
  cleanDist();

  for (const item of COPY_ITEMS) {
    copyIfExists(item);
  }

  copyBuiltCssOnly();
  listDistFiles();
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
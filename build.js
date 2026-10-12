const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

// Remove existing dist if any and recreate
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Files to copy into dist
const filesToCopy = [
  'index.html',
  'style.css',
  'app.js',
  'questions.js'
];

filesToCopy.forEach((file) => {
  const src = path.join(__dirname, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} -> dist/${file}`);
  } else {
    console.warn(`! Missing file: ${file}`);
  }
});

console.log('\n✨ Build completed successfully! Production files ready in: dist/');

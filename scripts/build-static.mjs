import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const entries = [
  'index.html',
  'portfolio.html',
  'about.html',
  'project.html',
  'admin',
  'assets',
  'css',
  'data',
  'js',
  'sounds',
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of entries) {
  await cp(resolve(root, entry), resolve(dist, entry), { recursive: true });
}

const bundles = [
  {
    html: 'index.html',
    output: 'js/home.bundle.js',
    files: [
      'js/particles.config.js',
      'js/blob.js',
      'js/particle-scenes.js',
      'js/cursor.js',
      'js/render-content.js',
      'js/clients-carousel.js',
      'js/main.js',
    ],
  },
  {
    html: 'portfolio.html',
    output: 'js/portfolio.bundle.js',
    files: [
      'js/particles.config.js',
      'js/blob.js',
      'js/cursor.js',
      'js/portfolio.js',
    ],
  },
  {
    html: 'about.html',
    output: 'js/about.bundle.js',
    files: [
      'js/particles.config.js',
      'js/blob.js',
      'js/cursor.js',
      'js/about.js',
    ],
  },
  {
    html: 'project.html',
    output: 'js/project.bundle.js',
    files: [
      'js/particles.config.js',
      'js/blob.js',
      'js/cursor.js',
      'js/project.js',
    ],
  },
];

const bundledSources = new Set();
for (const bundle of bundles) {
  const parts = await Promise.all(
    bundle.files.map((file) => readFile(resolve(root, file), 'utf8'))
  );
  const bundleCode =
    `/* Bundle estático generado desde archivos separados. */\n${parts.join('\n;\n')}`;
  const bundleVersion = createHash('sha256')
    .update(bundleCode)
    .digest('hex')
    .slice(0, 10);
  await writeFile(
    resolve(dist, bundle.output),
    bundleCode,
    'utf8'
  );

  let html = await readFile(resolve(dist, bundle.html), 'utf8');
  for (const file of bundle.files) {
    bundledSources.add(file);
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp(`\\s*<script src="${escaped}"></script>`, 'g'),
      ''
    );
  }
  html = html.replace(
    '</body>',
    `    <script src="${bundle.output}?v=${bundleVersion}"></script>\n</body>`
  );
  await writeFile(resolve(dist, bundle.html), html, 'utf8');
}

for (const file of bundledSources) {
  await rm(resolve(dist, file), { force: true });
}

console.log('Build estático optimizado listo en dist/');

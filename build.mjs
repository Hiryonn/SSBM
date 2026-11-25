import * as esbuild from 'esbuild';
import fs from 'fs';
const r = await esbuild.build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: process.argv.includes('--min'), write: false, target: ['chrome100', 'firefox100', 'safari15'], legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync('src/style.css', 'utf8');
const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PlatFight Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script>
${js}
</script>
</body>
</html>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' Ko');

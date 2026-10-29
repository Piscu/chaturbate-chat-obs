#!/usr/bin/env node
/**
 * Genera el paquete portable para Windows x64: dist/ChatOBS-<version>-win-x64.zip
 *
 * El paquete incluye node.exe para que el usuario no tenga que instalar nada.
 *
 * Reglas de seguridad (importantes):
 *  - Solo se copia lo que esta en FILES y DIRS. NUNCA se copia data/, que es
 *    donde vive el token real de quien empaqueta.
 *  - Antes de comprimir se comprueba que no haya ningun config.json y que no
 *    aparezcan el token, el usuario ni el titulo guardados en data/config.json.
 *    Si algo falla, el build se aborta en vez de publicar datos privados.
 *
 * Uso:
 *   node empaquetar.mjs               paquete completo (descarga node.exe)
 *   node empaquetar.mjs --skip-node   sin node.exe, solo para probar el ZIP
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VERSION = '1.0.0';
const NODE_VERSION = 'v24.21.0';
const TARGET = 'win-x64';
const PACKAGE = `ChatOBS-${VERSION}-${TARGET}`;

const DIST = path.join(__dirname, 'dist');
const STAGE = path.join(DIST, PACKAGE);
const ZIP = path.join(DIST, `${PACKAGE}.zip`);
// Nombre estable: el enlace /releases/latest/download/... no cambia entre versiones.
const STABLE_ZIP = path.join(DIST, 'ChatOBS-win-x64.zip');
const CACHE = path.join(DIST, '.cache');

// Lista blanca: todo lo que no este aqui no entra en el paquete.
const FILES = ['server.mjs', 'iniciar.bat', 'minimizar.bat', 'LEEME.txt', 'README.md', 'LICENSE'];
const DIRS = ['public'];

const skipNode = process.argv.includes('--skip-node');

// ------------------------------------------------------------------ utilidades

function fail(message) {
  console.error('\n[empaquetar] ERROR: ' + message + '\n');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function download(url, label) {
  process.stdout.write(`  descargando ${label}... `);
  const res = await fetch(url);
  if (!res.ok) fail(`no se pudo descargar ${url} (HTTP ${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log('ok');
  return buffer;
}

// ------------------------------------------------------------------ node.exe

async function addNodeExe() {
  const base = `https://nodejs.org/dist/${NODE_VERSION}`;
  const sums = (await download(`${base}/SHASUMS256.txt`, 'SHASUMS256.txt')).toString('utf8');
  const line = sums.split('\n').find((l) => l.trim().endsWith(`${TARGET}/node.exe`));
  if (!line) fail(`SHASUMS256.txt no lista ${TARGET}/node.exe`);

  const expected = line.trim().split(/\s+/)[0];
  const cacheFile = path.join(CACHE, `node-${NODE_VERSION}-${TARGET}.exe`);

  // Se cachea para no descargar 90 MB en cada build.
  let exe;
  if (fs.existsSync(cacheFile)) {
    console.log('  node.exe en cache');
    exe = await fsp.readFile(cacheFile);
  } else {
    exe = await download(`${base}/${TARGET}/node.exe`, `node.exe (${NODE_VERSION})`);
    await fsp.mkdir(CACHE, { recursive: true });
    await fsp.writeFile(cacheFile, exe);
  }

  const actual = sha256(exe);
  if (actual !== expected) {
    fail(`el SHA256 de node.exe no coincide.\n  esperado: ${expected}\n  obtenido: ${actual}`);
  }
  console.log('  SHA256 de node.exe verificado');

  await fsp.writeFile(path.join(STAGE, 'node.exe'), exe);
}

// ------------------------------------------------------------------ seguridad

async function assertClean() {
  const files = walk(STAGE);

  // 1. Ningun archivo de configuracion con datos.
  const config = files.find((f) => path.basename(f).toLowerCase() === 'config.json');
  if (config) fail(`el paquete contiene ${path.relative(STAGE, config)}`);

  // 2. Ningun rastro de los datos reales de quien empaqueta. Se leen en memoria
  //    desde data/config.json y NUNCA se imprimen.
  const secrets = [];
  try {
    const raw = JSON.parse(await fsp.readFile(path.join(__dirname, 'data', 'config.json'), 'utf8'));
    const token = String(raw?.connection?.token || '').trim();
    const username = String(raw?.connection?.username || '').trim();
    const title = String(raw?.header?.title || '').trim();
    if (token) secrets.push({ label: 'token', value: token });
    if (username.length >= 3) secrets.push({ label: 'usuario', value: username });
    // El titulo por defecto ("Chat") es generico: solo se comprueba si se cambio.
    if (title.length >= 3 && title !== 'Chat') secrets.push({ label: 'titulo', value: title });
  } catch { /* sin config local: nada que comprobar */ }

  if (!secrets.length) {
    console.log('  datos locales: no hay config guardada, nada que comprobar');
    return;
  }

  for (const file of files) {
    if (path.extname(file).toLowerCase() === '.exe') continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const secret of secrets) {
      if (text.includes(secret.value)) {
        fail(`el paquete contiene tu ${secret.label} en ${path.relative(STAGE, file)}`);
      }
    }
  }
  console.log(`  datos locales: ${secrets.map((s) => s.label).join(', ')} no aparecen en el paquete`);
}

// ------------------------------------------------------------------ zip

function makeZip() {
  fs.rmSync(ZIP, { force: true });

  if (process.platform === 'win32') {
    const cmd = `Compress-Archive -Path "${STAGE}" -DestinationPath "${ZIP}" -Force`;
    execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], { stdio: 'inherit' });
    return;
  }

  try {
    execFileSync('zip', ['-r', '-q', ZIP, PACKAGE], { cwd: DIST, stdio: 'inherit' });
  } catch {
    fail('no se encontro el comando "zip". Instalalo o comprime la carpeta dist/' + PACKAGE + ' a mano.');
  }
}

// ------------------------------------------------------------------ principal

async function main() {
  console.log(`\n[empaquetar] ${PACKAGE}`);

  fs.rmSync(STAGE, { recursive: true, force: true });
  await fsp.mkdir(STAGE, { recursive: true });

  for (const file of FILES) {
    const src = path.join(__dirname, file);
    if (!fs.existsSync(src)) fail(`falta ${file}`);
    await fsp.copyFile(src, path.join(STAGE, file));
  }
  for (const dir of DIRS) {
    const src = path.join(__dirname, dir);
    if (!fs.existsSync(src)) fail(`falta la carpeta ${dir}/`);
    await fsp.cp(src, path.join(STAGE, dir), { recursive: true });
  }
  console.log(`  copiados ${FILES.length} archivos y ${DIRS.length} carpeta(s)`);

  if (skipNode) {
    console.log('  AVISO: --skip-node, el ZIP no arrancara sin Node instalado');
  } else {
    await addNodeExe();
  }

  await assertClean();

  fs.mkdirSync(DIST, { recursive: true });
  makeZip();
  await fsp.copyFile(ZIP, STABLE_ZIP);

  const size = fs.statSync(ZIP).size;
  const hash = sha256(await fsp.readFile(ZIP));
  console.log('');
  console.log(`  ZIP    : ${path.relative(__dirname, ZIP)}`);
  console.log(`  Estable: ${path.relative(__dirname, STABLE_ZIP)}  (para /releases/latest/download/)`);
  console.log(`  Tamaño : ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  SHA256 : ${hash}`);
  console.log('');
  console.log('  Antes de publicarlo: descomprimelo en una carpeta limpia, ejecuta');
  console.log('  iniciar.bat y comprueba que el editor arranca sin usuario ni token.');
  console.log('');
}

main().catch((err) => fail(err?.message || String(err)));

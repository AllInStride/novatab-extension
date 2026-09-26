#!/usr/bin/env node
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { validateCatalog } = require('../home-os.js');
const source = process.argv[2];
if (!source) {
  console.error('Pass the Admin generated catalog path.');
  process.exit(2);
}
const target = resolve(dirname(fileURLToPath(import.meta.url)), '../home-os-catalog.json');
const candidate = `${target}.candidate-${process.pid}`;
try {
  const bytes = await readFile(resolve(source));
  if (!validateCatalog(JSON.parse(bytes.toString('utf8')))) throw new Error('Catalog failed validation');
  await writeFile(candidate, bytes);
  await rename(candidate, target);
  console.log('Copied validated local Home OS catalog; run verify-home-os-catalog.mjs to check byte equality.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(candidate, { force: true }).catch(() => {});
}

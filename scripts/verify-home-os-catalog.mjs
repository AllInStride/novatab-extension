#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const bundled = resolve(dirname(fileURLToPath(import.meta.url)), '../home-os-catalog.json');
const generated = process.argv[2];
if (!generated) {
  console.error('Pass the Admin generated catalog path.');
  process.exit(2);
}
const [a, b] = await Promise.all([readFile(resolve(generated)), readFile(bundled)]);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceHash = hash(a), bundleHash = hash(b);
if (!a.equals(b)) {
  console.error(`Catalog mismatch: Admin ${sourceHash}, NovaTab ${bundleHash}`);
  process.exit(1);
}
console.log(`Catalog byte match: ${sourceHash}`);

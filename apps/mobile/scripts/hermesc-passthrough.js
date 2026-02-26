#!/usr/bin/env node
/**
 * Passthrough script that replaces hermesc on Windows.
 * Copies the JS bundle as-is (Hermes runtime will JIT-compile it).
 * This is needed because hermes-compiler v250829098+ doesn't ship win64 binaries.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

let outputFile = null;
let inputFile = null;

// Parse args: hermesc -w -emit-binary -max-diagnostic-width=80 -out OUTPUT INPUT -O -output-source-map
const flagsWithValue = new Set(['-out', '-max-diagnostic-width']);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-out' && i + 1 < args.length) {
    outputFile = args[i + 1];
    i++;
  } else if (flagsWithValue.has(args[i])) {
    i++; // skip value
  } else if (!args[i].startsWith('-')) {
    inputFile = args[i];
  }
}

if (inputFile && outputFile) {
  fs.copyFileSync(inputFile, outputFile);

  // Create a valid source map (version 3 required by compose-source-maps)
  const mapFile = outputFile + '.map';
  const sourceMap = JSON.stringify({
    version: 3,
    sources: [],
    mappings: '',
  });
  fs.writeFileSync(mapFile, sourceMap);
}

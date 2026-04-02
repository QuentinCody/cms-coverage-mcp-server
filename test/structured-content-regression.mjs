#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertContains(filePath, haystack, needle, testName) {
  totalTests++;
  if (haystack.includes(needle)) {
    console.log(`${GREEN}✓${RESET} ${testName}`);
    passedTests++;
  } else {
    console.log(`${RED}✗${RESET} ${testName}`);
    console.log(`  Missing: ${needle}`);
    console.log(`  File: ${filePath}`);
    failedTests++;
  }
}

function readFile(relPath) {
  const absPath = path.resolve(SERVER_ROOT, relPath);
  return fs.readFileSync(absPath, 'utf8');
}

console.log(`${BLUE}CMS Coverage Structured Content Regression Tests${RESET}`);

// Code Mode only -- no hand-built tools to test for createCodeModeResponse/createCodeModeError
// Verify index.ts structure
const indexContent = readFile('src/index.ts');
assertContains('src/index.ts', indexContent, 'CmsCoverageDataDO', 'index.ts exports CmsCoverageDataDO');
assertContains('src/index.ts', indexContent, 'McpAgent', 'index.ts uses McpAgent');
assertContains('src/index.ts', indexContent, 'registerCodeMode', 'index.ts registers Code Mode');
assertContains('src/index.ts', indexContent, 'registerQueryData', 'index.ts registers query-data');
assertContains('src/index.ts', indexContent, 'registerGetSchema', 'index.ts registers get-schema');

// Verify DO extends RestStagingDO
const doContent = readFile('src/do.ts');
assertContains('src/do.ts', doContent, 'RestStagingDO', 'do.ts extends RestStagingDO');
assertContains('src/do.ts', doContent, 'CmsCoverageDataDO', 'do.ts defines CmsCoverageDataDO');

// Verify Code Mode setup
const codeModeContent = readFile('src/tools/code-mode.ts');
assertContains('src/tools/code-mode.ts', codeModeContent, 'cms_coverage', 'code-mode.ts uses cms_coverage prefix');
assertContains('src/tools/code-mode.ts', codeModeContent, 'createSearchTool', 'code-mode.ts creates search tool');
assertContains('src/tools/code-mode.ts', codeModeContent, 'createExecuteTool', 'code-mode.ts creates execute tool');
assertContains('src/tools/code-mode.ts', codeModeContent, 'CMS_COVERAGE_DATA_DO', 'code-mode.ts uses correct DO binding');

// Verify catalog
const catalogContent = readFile('src/spec/catalog.ts');
assertContains('src/spec/catalog.ts', catalogContent, '/search/ncd', 'catalog has NCD search endpoint');
assertContains('src/spec/catalog.ts', catalogContent, '/search/lcd', 'catalog has LCD search endpoint');
assertContains('src/spec/catalog.ts', catalogContent, '/contractors', 'catalog has contractors endpoint');
assertContains('src/spec/catalog.ts', catalogContent, '/sad-exclusion-list', 'catalog has SAD exclusion list endpoint');
assertContains('src/spec/catalog.ts', catalogContent, 'national_coverage', 'catalog has national_coverage category');
assertContains('src/spec/catalog.ts', catalogContent, 'local_coverage', 'catalog has local_coverage category');
assertContains('src/spec/catalog.ts', catalogContent, 'reference', 'catalog has reference category');

// Verify wrangler config
const wranglerContent = readFile('wrangler.jsonc');
assertContains('wrangler.jsonc', wranglerContent, 'CmsCoverageDataDO', 'wrangler.jsonc has DO class');
assertContains('wrangler.jsonc', wranglerContent, 'CMS_COVERAGE_DATA_DO', 'wrangler.jsonc has DO binding');
assertContains('wrangler.jsonc', wranglerContent, '8872', 'wrangler.jsonc uses port 8872');

console.log(`\n${BLUE}Test Results Summary${RESET}`);
console.log(`Total tests: ${totalTests}`);
console.log(`${GREEN}Passed: ${passedTests}${RESET}`);
console.log(`${RED}Failed: ${failedTests}${RESET}`);

if (failedTests > 0) {
  console.log(`\n${RED}Regression tests failed.${RESET}`);
  process.exit(1);
}

console.log(`\n${GREEN}CMS Coverage structured content regression tests passed.${RESET}`);

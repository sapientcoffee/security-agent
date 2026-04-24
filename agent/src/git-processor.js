// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import simpleGit from 'simple-git';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from './utils/logger.js';
import { validateGitUrl } from './utils/validation.js';

/**
 * Clones a git repository into a temporary directory,
 * collects source code from relevant files, and returns it as a string.
 * Cleans up the temporary directory afterwards.
 */
 export async function processGitRepo(repoUrl, onProgress = () => {}, signal = null) {
   // Security Fix: Validate URL to prevent SSRF and Command Injection
   if (!validateGitUrl(repoUrl)) {
     throw new Error('Invalid or restricted Git repository URL provided');
   }

   const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-analyze-'));
   const git = simpleGit();

   try {
     if (signal?.aborted) throw new Error('Aborted');

     onProgress('cloning');
     logger.info(`Cloning repository: ${repoUrl} into ${tempDir}`, { module: 'git' });
     await git.clone(repoUrl, tempDir, ['--depth', '1']);

     if (signal?.aborted) throw new Error('Aborted');

     // Common patterns to ignore to save context
     const ignorePatterns = [
       '**/.git/**',
       '**/node_modules/**',
       '**/package-lock.json',
       '**/yarn.lock',
       '**/dist/**',
       '**/build/**',
       '**/*.png',
       '**/*.jpg',
       '**/*.jpeg',
       '**/*.gif',
       '**/*.svg',
       '**/*.ico',
       '**/*.pdf',
       '**/*.exe',
       '**/*.bin'
     ];

     onProgress('parsing');

     // Find all files, excluding ignored ones
     const files = await glob('**/*', {
       cwd: tempDir,
       ignore: ignorePatterns,
       nodir: true,
       absolute: true
     });

     logger.info(`Found ${files.length} relevant files for analysis.`, { module: 'git' });

     let combinedContent = "";
     for (const file of files) {
       if (signal?.aborted) throw new Error('Aborted');

       const stats = await fs.stat(file);
       // Skip files larger than 50KB to prevent context bloat
       if (stats.size > 50000) {
         logger.warn(`Skipping large file: ${path.relative(tempDir, file)} (${stats.size} bytes)`, { module: 'git' });
         continue;
       }

       const content = await fs.readFile(file, 'utf8');
       const relativePath = path.relative(tempDir, file);
      
       combinedContent += `\n--- File: ${relativePath} ---\n`;
       combinedContent += content;
       combinedContent += `\n`;
     }

     return combinedContent;
   } finally {
     try {
       logger.info(`Cleaning up temporary directory: ${tempDir}`, { module: 'git' });
       await fs.rm(tempDir, { recursive: true, force: true });
     } catch (cleanupError) {
       logger.error("Cleanup error", { module: 'git', error: cleanupError.message, stack: cleanupError.stack });
     }
   }
 }

#!/usr/bin/env ts-node

/**
 * CLI Parser pour fichiers VND
 * Permet d'analyser un fichier VND depuis le terminal
 * Usage: ts-node cli-parser.ts <fichier.vnd> [maxScenes]
 */

import * as fs from 'fs';
import * as path from 'path';
import { VNDSequentialParser } from './services/vndParser.ts';

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function printBanner() {
  console.log(colors.cyan + colors.bright);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          VND CLI Parser - Version 5.5                          ║');
  console.log('║          Analyse de fichiers Visual Novel (.vnd)               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
}

function printUsage() {
  console.log(colors.yellow + 'Usage:' + colors.reset);
  console.log('  npm run parse <fichier.vnd> [maxScenes]');
  console.log('  ts-node cli-parser.ts <fichier.vnd> [maxScenes]');
  console.log('');
  console.log(colors.yellow + 'Exemples:' + colors.reset);
  console.log('  npm run parse couleurs1.vnd');
  console.log('  npm run parse couleurs1.vnd 10');
  console.log('  ts-node cli-parser.ts couleurs1.vnd 50');
  console.log('');
}

function colorizeLog(log: string): string {
  if (log.includes('❌')) return colors.red + log + colors.reset;
  if (log.includes('⚠️')) return colors.yellow + log + colors.reset;
  if (log.includes('✓')) return colors.green + log + colors.reset;
  if (log.includes('SCÈNE #')) return colors.cyan + colors.bright + log + colors.reset;
  if (log.includes('═'.repeat(10))) return colors.blue + log + colors.reset;
  if (log.includes('ℹ️')) return colors.dim + log + colors.reset;
  return log;
}

async function parseVND(vndPath: string, maxScenes: number = 50) {
  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(vndPath)) {
      console.error(colors.red + `❌ Fichier non trouvé: ${vndPath}` + colors.reset);
      process.exit(1);
    }

    // Lire le fichier
    console.log(colors.cyan + `📂 Lecture du fichier: ${vndPath}` + colors.reset);
    const fileBuffer = fs.readFileSync(vndPath);
    const fileSize = fileBuffer.length;
    console.log(colors.dim + `   Taille: ${(fileSize / 1024).toFixed(2)} KB (${fileSize} bytes)` + colors.reset);
    console.log('');

    // Parser le fichier
    console.log(colors.cyan + `🔍 Parsing en cours (max ${maxScenes} scènes)...` + colors.reset);
    console.log('');

    const parser = new VNDSequentialParser(fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength));
    const result = parser.parse(maxScenes);

    // Afficher les logs avec couleurs
    console.log(colors.bright + '📋 LOGS DU PARSER:' + colors.reset);
    console.log('');
    result.logs.forEach(log => {
      console.log(colorizeLog(log));
    });

    // Statistiques
    console.log('');
    console.log(colors.green + colors.bright + '═'.repeat(80) + colors.reset);
    console.log(colors.green + colors.bright + '📊 STATISTIQUES' + colors.reset);
    console.log(colors.green + colors.bright + '═'.repeat(80) + colors.reset);
    console.log('');

    const totalHotspots = result.scenes.reduce((acc, s) => acc + s.hotspots.length, 0);
    const totalFiles = result.scenes.reduce((acc, s) => acc + s.files.length, 0);

    console.log(colors.cyan + `  Scènes parsées:    ${colors.bright}${result.scenes.length}${colors.reset}`);
    console.log(colors.cyan + `  Total hotspots:    ${colors.bright}${totalHotspots}${colors.reset}`);
    console.log(colors.cyan + `  Total fichiers:    ${colors.bright}${totalFiles}${colors.reset}`);
    console.log(colors.cyan + `  Lignes de logs:    ${colors.bright}${result.logs.length}${colors.reset}`);
    console.log('');

    // Sauvegarder le JSON
    const baseName = path.basename(vndPath, path.extname(vndPath));
    const jsonPath = path.join(path.dirname(vndPath), `${baseName}.parsed.json`);

    console.log(colors.yellow + `💾 Sauvegarde du JSON...` + colors.reset);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(colors.green + `✅ JSON sauvegardé: ${jsonPath}` + colors.reset);
    console.log('');

    // Sauvegarder les logs séparément
    const logsPath = path.join(path.dirname(vndPath), `${baseName}.logs.txt`);
    console.log(colors.yellow + `💾 Sauvegarde des logs...` + colors.reset);
    fs.writeFileSync(logsPath, result.logs.join('\n'), 'utf-8');
    console.log(colors.green + `✅ Logs sauvegardés: ${logsPath}` + colors.reset);
    console.log('');

    // Résumé des scènes
    console.log(colors.magenta + colors.bright + '📑 RÉSUMÉ DES SCÈNES:' + colors.reset);
    console.log('');
    result.scenes.forEach(scene => {
      const title = scene.files.find(f => f.slot === 1)?.filename || '(sans titre)';
      const hotspotCount = scene.hotspots.length;
      const fileCount = scene.files.filter(f => f.filename).length;

      console.log(colors.bright + `  Scène #${scene.id}` + colors.reset +
                  colors.dim + ` @ 0x${scene.offset.toString(16).toUpperCase().padStart(8, '0')}` + colors.reset);
      console.log(colors.cyan + `    Titre: ${title}` + colors.reset);
      console.log(colors.dim + `    Fichiers: ${fileCount} | Hotspots: ${hotspotCount} | Script cmds: ${scene.initScript.count}` + colors.reset);
      console.log('');
    });

    console.log(colors.green + colors.bright + '✅ Parsing terminé avec succès !' + colors.reset);
    console.log('');

  } catch (error) {
    console.error('');
    console.error(colors.red + colors.bright + '❌ ERREUR CRITIQUE:' + colors.reset);
    console.error(colors.red + (error as Error).message + colors.reset);
    console.error('');
    if ((error as Error).stack) {
      console.error(colors.dim + (error as Error).stack + colors.reset);
    }
    process.exit(1);
  }
}

// Main
function main() {
  printBanner();

  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  const vndPath = args[0];
  const maxScenes = args[1] ? parseInt(args[1], 10) : 50;

  if (isNaN(maxScenes) || maxScenes < 1) {
    console.error(colors.red + '❌ maxScenes doit être un nombre >= 1' + colors.reset);
    process.exit(1);
  }

  parseVND(vndPath, maxScenes);
}

main();

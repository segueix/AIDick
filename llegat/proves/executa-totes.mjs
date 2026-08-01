// Executa totes les suites de regressió de Booki en sèrie.
//
// Ús:
//   npx http-server -p 8099 -c-1 .     # des de l'arrel del projecte
//   node proves/executa-totes.mjs
//
// Variables opcionals: BOOKI_URL, CHROMIUM_PATH (les hereten les suites).
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';

const DIR = new URL('.', import.meta.url).pathname;
const suites = readdirSync(DIR)
  .filter(f => f.endsWith('.mjs') && f !== 'executa-totes.mjs')
  .sort();

function executa(fitxer) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [DIR + fitxer], { stdio: ['ignore', 'pipe', 'pipe'] });
    let sortida = '';
    p.stdout.on('data', d => { sortida += d; process.stdout.write(d); });
    p.stderr.on('data', d => { sortida += d; process.stderr.write(d); });
    p.on('close', codi => resolve({ fitxer, codi, sortida }));
  });
}

const resultats = [];
for (const s of suites) {
  console.log(`\n━━━ ${s} ━━━`);
  resultats.push(await executa(s));
}

console.log('\n══════════ RESUM ══════════');
let totals = 0, passades = 0;
for (const r of resultats) {
  const m = r.sortida.match(/(\d+)\/(\d+) comprovacions passades/);
  if (m) { passades += Number(m[1]); totals += Number(m[2]); }
  console.log(`${r.codi === 0 ? '✅' : '❌'} ${r.fitxer.padEnd(24)} ${m ? m[0] : 'sense resultat'}`);
}
console.log(`\nTotal: ${passades}/${totals} comprovacions`);
process.exit(resultats.some(r => r.codi !== 0) ? 1 : 0);

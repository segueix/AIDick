// Comptador de comprovacions compartit per totes les suites del conte.
// El format de sortida ("N/M comprovacions passades") és el que llegeix
// executa-totes.mjs per sumar el total.

export function crearComptador() {
  let passades = 0;
  let totals = 0;

  function comprova(nom, condicio, detall = '') {
    totals += 1;
    if (condicio) {
      passades += 1;
      console.log(`✅ ${nom}`);
    } else {
      console.error(`❌ ${nom}${detall ? ' — ' + detall : ''}`);
    }
  }

  function acabar() {
    console.log(`\n${passades}/${totals} comprovacions passades`);
    process.exit(passades === totals ? 0 : 1);
  }

  return { comprova, acabar, resultat: () => ({ passades, totals }) };
}

// Carregador de Playwright igual que el de les suites del llegat: primer el
// mòdul local, i si no hi és, la instal·lació global.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

export function carregarPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch (e) { /* provem la global */ }
  return createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/').call(null, 'playwright');
}

export const URL_APP = process.env.AIDICK_URL || 'http://127.0.0.1:8099/index.html';

// Obre l'app amb tot el trànsit extern bloquejat. Una crida real no simulada ha
// de fallar de seguida: si una prova es pengés esperant reintents de xarxa,
// voldria dir que està tocant la xarxa de debò.
export async function obrirApp(navegador, opcions = {}) {
  const pagina = await navegador.newPage();
  const errors = [];
  pagina.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  pagina.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  const externes = [];
  await pagina.route('**', ruta => {
    const u = ruta.request().url();
    if (u.startsWith('http://127.0.0.1:8099') || u.startsWith('http://localhost:8099')) return ruta.continue();
    externes.push(u);
    return ruta.abort();
  });

  await pagina.goto(opcions.url || URL_APP, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(300);
  return { pagina, errors, externes };
}

// Posa l'app en mode demostració i la deixa a punt per recórrer el pipeline.
export async function activarDemo(pagina) {
  await pagina.evaluate(() => { localStorage.clear(); });
  await pagina.reload({ waitUntil: 'networkidle' });
  await pagina.waitForTimeout(200);
  await pagina.evaluate(() => alternarDemo(true));
}

// Executa el pipeline sencer fins al pas indicat.
export async function recorrerFins(pagina, pas) {
  if (pas >= 1) {
    await pagina.evaluate(() => accio('b-llavors', generarLlavors));
    await pagina.waitForFunction(() => ESTAT_CONTE.llavors.length > 0, null, { timeout: 20000 });
    await pagina.evaluate(() => triarLlavor(0));
  }
  if (pas >= 2) {
    await pagina.evaluate(() => accio('b-dossier', generarDossier));
    await pagina.waitForFunction(() => ESTAT_CONTE.dossier_generat, null, { timeout: 20000 });
  }
  if (pas >= 3) {
    await pagina.evaluate(() => accio('b-escaleta', generarEscaleta));
    await pagina.waitForFunction(() => ESTAT_CONTE.escaleta.escenes.length > 0, null, { timeout: 20000 });
  }
  if (pas >= 4) {
    await pagina.evaluate(() => accio('b-escena', escriureTotes));
    await pagina.waitForFunction(
      () => ESTAT_CONTE.escenes_text.filter(Boolean).length === ESTAT_CONTE.escaleta.escenes.length,
      null, { timeout: 90000 });
  }
  if (pas >= 5) {
    await pagina.evaluate(() => accio('b-costura', costuraEstil));
    await pagina.waitForFunction(() => !!LLM_CLIENT.comptador.per_pas.costura, null, { timeout: 20000 });
    await pagina.waitForTimeout(300);
  }
  if (pas >= 6) {
    await pagina.evaluate(() => { executarAuditoria(); renderitzar(); });
  }
  if (pas >= 7) {
    await pagina.evaluate(() => accio('b-lectura', lecturaHostil));
    await pagina.waitForFunction(() => !!ESTAT_CONTE.lectura, null, { timeout: 20000 });
  }
}

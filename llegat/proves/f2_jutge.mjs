// Proves de regressió de la fase F2 (control de coherència) descrita a
// REVISIO_I_PLA_EXCELLENCIA.md.
//
// El jutge fa crides a l'LLM, així que aquí s'intercepta callLLMMulti i
// callLLMOneShotPlusCompletion amb respostes controlades: el que es verifica és
// el cablejat i les invariants (single-pass, locks, reconciliació cap endavant),
// no la qualitat del model.
//
// Ús:
//   npx http-server -p 8099 -c-1 .
//   node proves/f2_jutge.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

function carregarPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch (e) { /* provem la instal·lació global */ }
  const arrelGlobal = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return createRequire(arrelGlobal + '/').call(null, 'playwright');
}
const { chromium } = carregarPlaywright();
const URL_BOOKI = process.env.BOOKI_URL || 'http://127.0.0.1:8099/llegat/novella.html';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(URL_BOOKI, { waitUntil: 'load' });
await page.waitForTimeout(1000);
check('Càrrega en fred sense pageerror', pageErrors.length === 0, pageErrors.join(' | ') || 'cap');

// ── Cap peça del jutge no pot ser ja un stub ────────────────────────────────
const stubs = await page.evaluate(() => {
  const noms = ['executarJutgeInterval', 'jutgeIntervalInconsistencies', 'aplicarCorreccionsJutge',
                'aplicarCorreccionsPerfilsJutge', 'tancamentBlocComplet', 'reescriureAmbCorreccions',
                'jutgePanelIniciar', 'jutgePanelLog', 'jutgePanelFinalitzar'];
  return noms.filter(n => /JUTGE ELIMINAT|jutge stub/.test(String(eval(n))));
});
check('Cap funció del jutge conserva el marcatge d\'stub', stubs.length === 0, stubs.join(', ') || '9/9 restaurades');

// ── F2.2 — el tancament de bloc està connectat al bucle de capítols ─────────
const cablejat = await page.evaluate(() => ({
  aGenerarCapitol: String(generarCapitol).includes('tancamentBlocComplet'),
  cada4: [0, 1, 2, 3, 4, 7, 11].map(i => esTancamentBloc(i, 12)),
  rang: obtenirRangBlocPerCapitol(6, 12)
}));
check('generarCapitol crida el tancament de bloc', cablejat.aGenerarCapitol, '');
check('El bloc es tanca cada 4 capítols i al darrer',
  JSON.stringify(cablejat.cada4) === JSON.stringify([false, false, false, true, false, true, true]),
  cablejat.cada4.join(','));
check('El rang del bloc del capítol 7 és 5–8',
  cablejat.rang.fromIdx === 4 && cablejat.rang.toIdx === 7, JSON.stringify(cablejat.rang));

// ── Banc de proves: LLM simulat + estat mínim de novel·la ──────────────────
async function prepararEscenari(opcions) {
  return page.evaluate((o) => {
    // LLM simulat: el jutge demana JSON; li donem inconsistències controlades.
    window.__cridesLLM = [];
    window.callLLMMulti = async (msgs, sys, cfg, rol) => {
      window.__cridesLLM.push(rol);
      if (rol === 'jutge-interval') return JSON.stringify(o.veredicte);
      return '{}';
    };
    window.callLLMOneShotPlusCompletion = async () => { window.__cridesLLM.push('reescriptura'); return 'TEXT REESCRIT PEL JUTGE.'; };
    // Qualsevol crida de xarxa que se'ns hagi escapat ha de fallar de seguida,
    // no quedar-se penjada als reintents amb backoff.
    window.fetch = async () => { throw new Error('fetch no simulat durant la prova'); };

    // Els derivats, resums i resincronitzacions no són l'objecte d'aquesta prova.
    window.processarDerivatsBlocAbansJutge = async () => {};
    window.generarResumsBloc = async () => {};
    window.generarResumConsolidatBloc = async () => {};
    window.recalcularDerivatsDespresJutge = async () => {};
    window.executarCheckpoint = async () => ({ dades: { puntuacio_coherencia: 8 } });
    window.actualitzarLlibreRegistreBackground = async () => {};
    window.nkgActualitzarPostEscena = async () => {};
    window.actualitzarFilsNarratius = async () => {};
    window.generarSnapshotValidat = async () => {};
    window.actualitzarBiblia = async () => {};
    window.actualitzarBeatsNarratiusGastats = async () => {};

    USER_CONFIG = Object.assign({}, USER_CONFIG || {}, {
      apiKey: 'fals', models: { arquitecte: 'x', generacio: 'x', draft: 'x' },
      jutgeReescriu: o.jutgeReescriu
    });

    ESTAT._estructuraCapitols = Array.from({ length: 8 }, (_, i) => ({ titol: 'Cap ' + (i + 1), intensity_level: 3 }));
    ESTAT._capitols_generats = Array.from({ length: 4 }, (_, i) => 'Text original del capítol ' + (i + 1) + '.');
    ESTAT.llibreRegistre = { capitols: [], estat_personatges: [], fils_oberts: [], fils_tancats: [] };
    ESTAT._intervalLocks = {};
    ESTAT._capitolsLocked = {};
    ESTAT._chapterLocks = {};
    ESTAT._intervalsCongelats = [];
    ESTAT._contradiccionsTardanes = [];
    ESTAT._nkg = crearNKG();
    return true;
  }, opcions);
}

const VEREDICTE_BRUT = {
  net: false,
  inconsistencies: ['El rellotge apareix al calaix al cap. 2 i a la butxaca al cap. 1 sense moviment.'],
  instruccions_correccio: { '1': 'Corregeix la ubicació del rellotge al capítol 2.' },
  correccions_perfils: { fets_canonics: ['El rellotge queda al calaix des del capítol 2.'] }
};

// ── Mode per defecte: detecta, no reescriu, reconcilia cap endavant ────────
await prepararEscenari({ jutgeReescriu: false, veredicte: VEREDICTE_BRUT });
const perDefecte = await page.evaluate(async () => {
  await executarJutgeInterval(0, 3, USER_CONFIG);
  return {
    textIntacte: ESTAT._capitols_generats[1] === 'Text original del capítol 2.',
    contradiccions: (ESTAT._contradiccionsTardanes || []).length,
    filsOberts: (ESTAT.llibreRegistre.fils_oberts || []).filter(f => f.categoria === 'error-continuïtat').length,
    capitolsLocked: Object.keys(ESTAT._capitolsLocked || {}).length,
    intervalLock: !!ESTAT._intervalLocks['0-3'],
    potRegenerar: canRewrite(1, 'full').ok,
    crides: window.__cridesLLM.slice(),
    logPanel: document.getElementById('jutge-log').textContent,
    panellVisible: !document.getElementById('jutge-panel').classList.contains('hidden')
  };
});
check('Per defecte el jutge NO toca el text ja escrit', perDefecte.textIntacte, '');
check('Cap crida de reescriptura en mode per defecte',
  !perDefecte.crides.includes('reescriptura'), perDefecte.crides.join(', '));
check('La incoherència s\'obre com a fil de reconciliació cap endavant',
  perDefecte.contradiccions === 1 && perDefecte.filsOberts === 1,
  `${perDefecte.contradiccions} contradiccions, ${perDefecte.filsOberts} fils`);
check('Els capítols queden editables (no es congelen si el jutge no reescriu)',
  perDefecte.capitolsLocked === 0 && perDefecte.potRegenerar === true, '');
check('L\'interval sí que queda bloquejat (single-pass)', perDefecte.intervalLock, '');
check('El panell del jutge mostra el registre real (abans només consola)',
  perDefecte.panellVisible && /rellotge/.test(perDefecte.logPanel),
  `${perDefecte.logPanel.split('\n').length} línies`);

// ── Single-pass: el mateix interval no es torna a jutjar ───────────────────
const segonaPassada = await page.evaluate(async () => {
  window.__cridesLLM = [];
  await executarJutgeInterval(0, 3, USER_CONFIG);
  return { crides: window.__cridesLLM.slice(), contradiccions: (ESTAT._contradiccionsTardanes || []).length };
});
check('Un interval ja jutjat no es torna a jutjar (MAX_ITER=1)',
  !segonaPassada.crides.includes('jutge-interval') && segonaPassada.contradiccions === 1,
  `crides: ${segonaPassada.crides.join(', ') || 'cap'}`);

// ── Mode reescriptura activada ─────────────────────────────────────────────
await prepararEscenari({ jutgeReescriu: true, veredicte: VEREDICTE_BRUT });
const ambReescriptura = await page.evaluate(async () => {
  await executarJutgeInterval(0, 3, USER_CONFIG);
  return {
    textCorregit: ESTAT._capitols_generats[1] === 'TEXT REESCRIT PEL JUTGE.',
    altresIntactes: ESTAT._capitols_generats[0] === 'Text original del capítol 1.',
    capitolsLocked: Object.keys(ESTAT._capitolsLocked || {}).length,
    lockState: obtenirLockCapitol(1).lockState,
    potRegenerar: canRewrite(1, 'full').ok,
    potJutjar: canJudge(1)
  };
});
check('Amb la reescriptura activada, el capítol assenyalat es corregeix',
  ambReescriptura.textCorregit && ambReescriptura.altresIntactes, '');
check('En mode reescriptura els capítols del bloc queden immutables',
  ambReescriptura.capitolsLocked === 4 && ambReescriptura.lockState === 'final' && !ambReescriptura.potRegenerar, '');
check('Un capítol congelat no es pot tornar a jutjar', ambReescriptura.potJutjar === false, '');

// ── Ordre descendent de reescriptura (AGENT.md) ────────────────────────────
await prepararEscenari({
  jutgeReescriu: true,
  veredicte: { net: false, inconsistencies: ['x'], instruccions_correccio: { '0': 'a', '2': 'b', '1': 'c' }, correccions_perfils: {} }
});
const ordre = await page.evaluate(async () => {
  const vistos = [];
  const original = window.reescriureAmbCorreccions;
  window.reescriureAmbCorreccions = async (txt, instr, idx) => { vistos.push(idx); return 'CORREGIT ' + idx; };
  await aplicarCorreccionsJutge(0, 3, { '0': 'a', '2': 'b', '1': 'c' }, USER_CONFIG);
  window.reescriureAmbCorreccions = original;
  return vistos;
});
check('Les reescriptures van en ordre descendent (índex més alt primer)',
  JSON.stringify(ordre) === JSON.stringify([2, 1, 0]), ordre.join(' → '));

// ── El jutge no toca capítols fora del rang de l'interval ──────────────────
const foraRang = await page.evaluate(async () => {
  const vistos = [];
  const original = window.reescriureAmbCorreccions;
  window.reescriureAmbCorreccions = async (txt, instr, idx) => { vistos.push(idx); return 'x'; };
  await aplicarCorreccionsJutge(0, 3, { '1': 'dins', '6': 'fora' }, USER_CONFIG);
  window.reescriureAmbCorreccions = original;
  return vistos;
});
check('Cap reescriptura fora del rang del bloc', JSON.stringify(foraRang) === JSON.stringify([1]),
  foraRang.join(', '));

// ── F2.3 — el self-check comprova comportament, no text ────────────────────
const selfCheck = await page.evaluate(() => {
  const netFn = selfCheckLockingInvariants();
  // Simulem un interval jutjat dues vegades: la invariant single-pass ha de saltar.
  ESTAT._intervalLocks = { '0-3': { iteracions: 3 } };
  const ambProblema = selfCheckLockingInvariants();
  ESTAT._intervalLocks = {};
  return { net: netFn, ambProblema };
});
check('El self-check passa amb el jutge restaurat', selfCheck.net.length === 0,
  selfCheck.net.join(' | ') || 'cap problema');
check('El self-check detecta ara una violació real de single-pass',
  selfCheck.ambProblema.some(p => /MAX_ITER=1/.test(p)), selfCheck.ambProblema.join(' | '));

// ── La UI ja no promet una cosa que no passa ───────────────────────────────
const panell = await page.evaluate(() => {
  renderPanellEtapes();
  return document.getElementById('panell-etapes-cos').textContent;
});
check('El panell d\'etapes segueix anunciant el jutge, i ara és cert',
  /jutge de coherència/i.test(panell), '');

await browser.close();
const fallits = results.filter(r => !r.ok);
console.log(`\n${results.length - fallits.length}/${results.length} comprovacions passades`);
process.exit(fallits.length ? 1 : 0);

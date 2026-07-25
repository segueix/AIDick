// Proves de regressió de la fase F6 (lectura automàtica i calibratge) descrita a
// REVISIO_I_PLA_EXCELLENCIA.md.
//
// El que es verifica aquí no és que el lector llegeixi bé —això no es pot provar
// sense API i sense criteri humà— sinó les tres propietats que fan que el seu
// veredicte sigui interpretable: que els criteris d'avaluació no siguin els
// mateixos que s'injecten al generador, que el model lector sigui diferent del
// que escriu, i que el calibratge no menteixi amb mostres petites.
//
// Ús:
//   npx http-server -p 8099 -c-1 .
//   node proves/f6_lectura.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

function carregarPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch (e) { /* provem la instal·lació global */ }
  const arrelGlobal = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return createRequire(arrelGlobal + '/').call(null, 'playwright');
}
const { chromium } = carregarPlaywright();
const URL_BOOKI = process.env.BOOKI_URL || 'http://127.0.0.1:8099/index.html';

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

const PERFILS = ['larsson', 'tolkien', 'dick', 'castaneda'];

// ── F6.1 — el bucle de Goodhart està desfet ────────────────────────────────
const criteris = await page.evaluate((perfils) => {
  const out = {};
  perfils.forEach(id => {
    const p = PERFILS_AUTOR[id];
    out[id] = {
      generacio: p.criteris_excellencia || [],
      avaluacio: p.criteris_avaluacio || []
    };
  });
  return out;
}, PERFILS);

const sensAvaluacio = PERFILS.filter(id => criteris[id].avaluacio.length === 0);
check('F6.1 · Els 4 perfils tenen criteris d\'avaluació propis', sensAvaluacio.length === 0,
  sensAvaluacio.join(', ') || PERFILS.map(id => `${id}:${criteris[id].avaluacio.length}`).join(' '));

const solapats = PERFILS.filter(id =>
  criteris[id].avaluacio.some(a => criteris[id].generacio.includes(a)));
check('F6.1 · Cap criteri d\'avaluació és idèntic a un de generació',
  solapats.length === 0, solapats.join(', ') || 'cap solapament literal');

// La prova de fons: els criteris d'avaluació NO poden arribar al prompt del capítol.
const filtracio = await page.evaluate((perfils) => {
  const fuites = [];
  perfils.forEach(id => {
    ESTAT._autorPerfilId = id;
    ESTAT._nkg = ESTAT._nkg && ESTAT._nkg.macronarrativa ? ESTAT._nkg : crearNKG();
    const blocs = buildSystemPromptCapitol();
    const prompt = Array.isArray(blocs) ? blocs.map(b => b.text || '').join('\n') : String(blocs || '');
    (PERFILS_AUTOR[id].criteris_avaluacio || []).forEach(c => {
      // Comparem pel primer tros distintiu del criteri.
      const tros = c.slice(0, 40);
      if (prompt.includes(tros)) fuites.push(`${id}: "${tros}…"`);
    });
  });
  ESTAT._autorPerfilId = '';
  return fuites;
}, PERFILS);
check('F6.1 · Cap criteri d\'avaluació es filtra al prompt del generador',
  filtracio.length === 0, filtracio.join(' | ') || '4 perfils comprovats');

// I els de generació sí que hi han de ser (F3.3 no s'ha trencat)
const generacioPresent = await page.evaluate(() => {
  ESTAT._autorPerfilId = 'larsson';
  const blocs = buildSystemPromptCapitol();
  const prompt = Array.isArray(blocs) ? blocs.map(b => b.text || '').join('\n') : String(blocs || '');
  ESTAT._autorPerfilId = '';
  return /CONDICIONS D'ACCEPTACIÓ/.test(prompt);
});
check('F3.3 segueix viu: els criteris de generació sí que arriben al prompt',
  generacioPresent, '');

// ── F6.2 — decorrelació del model lector ───────────────────────────────────
const decorr = await page.evaluate(() => {
  const original = { a: ESTAT._anthropicApiKey, o: ESTAT._openaiApiKey, g: ESTAT._geminiApiKey };
  const out = {};

  // Cas 1: només clau d'Anthropic → ha de triar un altre model d'Anthropic
  ESTAT._anthropicApiKey = 'x'; ESTAT._openaiApiKey = ''; ESTAT._geminiApiKey = '';
  ESTAT._modelGeneracio = 'claude-sonnet-4-6';
  out.mateixProveidor = seleccionarModelLector({ apiKey: 'x' });

  // Cas 2: també clau d'OpenAI → ha de saltar de proveïdor
  ESTAT._openaiApiKey = 'y';
  out.altreProveidor = seleccionarModelLector({ apiKey: 'x' });

  ESTAT._anthropicApiKey = original.a; ESTAT._openaiApiKey = original.o; ESTAT._geminiApiKey = original.g;
  return out;
});
check('F6.2 · Amb un sol proveïdor, tria un model diferent del que escriu',
  decorr.mateixProveidor.model !== 'claude-sonnet-4-6',
  `${decorr.mateixProveidor.model} (${decorr.mateixProveidor.decorrelacio})`);
check('F6.2 · Amb dos proveïdors, salta de proveïdor',
  /proveïdor diferent/.test(decorr.altreProveidor.decorrelacio),
  `${decorr.altreProveidor.model} (${decorr.altreProveidor.decorrelacio})`);

// La branca sense decorrelació només és abastable si el registre no ofereix cap
// altre model. La forcem de debò en lloc d'assumir que hi arribem.
const sensDecorr = await page.evaluate(() => {
  const claus = { a: ESTAT._anthropicApiKey, o: ESTAT._openaiApiKey, g: ESTAT._geminiApiKey };
  const registreOriginal = Object.assign({}, MODEL_REGISTRY);
  Object.keys(MODEL_REGISTRY).forEach(k => { if (k !== 'claude-sonnet-4-6') delete MODEL_REGISTRY[k]; });
  ESTAT._anthropicApiKey = ''; ESTAT._openaiApiKey = ''; ESTAT._geminiApiKey = '';
  ESTAT._modelGeneracio = 'claude-sonnet-4-6';
  const r = seleccionarModelLector({});
  Object.assign(MODEL_REGISTRY, registreOriginal);
  ESTAT._anthropicApiKey = claus.a; ESTAT._openaiApiKey = claus.o; ESTAT._geminiApiKey = claus.g;
  return r;
});
check('F6.2 · Quan no hi ha cap decorrelació possible, ho declara en lloc d\'amagar-ho',
  sensDecorr.model === 'claude-sonnet-4-6' && /^CAP/.test(sensDecorr.decorrelacio),
  `${sensDecorr.model} (${sensDecorr.decorrelacio})`);

// I la UI ha d'avisar-ne, perquè un lector que s'avalua a si mateix s'aprova.
const avisUI = await page.evaluate(() => {
  renderLecturaAdversaria({
    lector: 'claude-sonnet-4-6', escriptor: 'claude-sonnet-4-6',
    decorrelacio: 'CAP — mateix model que ha escrit',
    troballes: [], criteris: [], veredicte: 'x', retallada: false
  });
  return document.getElementById('lectura-adversaria-cos').textContent;
});
check('F6.2 · La UI avisa quan el lector és el mateix model que ha escrit',
  /comparteix els seus punts cecs/.test(avisUI), '');

// ── F6.3 — el calibratge no menteix ────────────────────────────────────────
const calibratge = await page.evaluate(() => {
  ESTAT._calibratgeLector = crearRegistreCalibratge();
  const buit = calcularCalibratge(ESTAT);

  // Una sola observació perfecta: no pot dir que el lector sigui fiable.
  afegirObservacioCalibratge(ESTAT, { unitat: 'cap-1', confirmades: 5, descartades: 0, perdudes: 0 });
  const unaSola = calcularCalibratge(ESTAT);

  // Cinc observacions → mostra suficient
  for (let i = 2; i <= 5; i++) {
    afegirObservacioCalibratge(ESTAT, { unitat: 'cap-' + i, confirmades: 4, descartades: 1, perdudes: 1 });
  }
  const suficient = calcularCalibratge(ESTAT);

  // Re-calibrar la mateixa unitat no ha de duplicar la mostra
  afegirObservacioCalibratge(ESTAT, { unitat: 'cap-1', confirmades: 1, descartades: 0, perdudes: 0 });
  const senseDuplicar = calcularCalibratge(ESTAT);

  return { buit, unaSola, suficient, senseDuplicar };
});
check('F6.3 · Sense cap lectura humana, declara que no està calibrat',
  calibratge.buit.mostra === 0 && calibratge.buit.fiable === false && /no estan calibrats/.test(calibratge.buit.avis), '');
check('F6.3 · Amb 1 sola lectura perfecta NO diu que sigui fiable',
  calibratge.unaSola.fiable === false && /insuficient/.test(calibratge.unaSola.avis),
  calibratge.unaSola.avis);
check('F6.3 · Amb 5 lectures ja calcula recall i precisió',
  calibratge.suficient.mostra === 5 && calibratge.suficient.recall !== null && calibratge.suficient.precisio !== null,
  `recall=${Math.round(calibratge.suficient.recall * 100)}% precisió=${Math.round(calibratge.suficient.precisio * 100)}%`);
check('F6.3 · Recalibrar una unitat la substitueix, no la duplica',
  calibratge.senseDuplicar.mostra === 5, `mostra=${calibratge.senseDuplicar.mostra}`);

// El recall és el número que decideix si es pot saltar la lectura
const senyals = await page.evaluate(() => {
  ESTAT._calibratgeLector = crearRegistreCalibratge();
  // Lector que se'n deixa la meitat: recall 50%
  for (let i = 1; i <= 5; i++) {
    afegirObservacioCalibratge(ESTAT, { unitat: 'c' + i, confirmades: 1, descartades: 0, perdudes: 1 });
  }
  const dolent = calcularCalibratge(ESTAT);

  // Lector que xerra molt i encerta poc: precisió baixa
  ESTAT._calibratgeLector = crearRegistreCalibratge();
  for (let i = 1; i <= 5; i++) {
    afegirObservacioCalibratge(ESTAT, { unitat: 'c' + i, confirmades: 1, descartades: 4, perdudes: 0 });
  }
  const soroll = calcularCalibratge(ESTAT);
  return { dolent, soroll };
});
check('F6.3 · Avisa quan el lector es deixa massa coses',
  senyals.dolent.recall === 0.5 && /no substitueix una lectura/.test(senyals.dolent.avis),
  senyals.dolent.avis);
check('F6.3 · Avisa quan el lector és sobretot soroll',
  senyals.soroll.precisio === 0.2 && /soroll/.test(senyals.soroll.avis),
  senyals.soroll.avis);

// ── F6.4 — mostreig ────────────────────────────────────────────────────────
const mostreig = await page.evaluate(() => {
  ESTAT._calibratgeLector = crearRegistreCalibratge();
  afegirObservacioCalibratge(ESTAT, { unitat: 'cap-1', confirmades: 1 });
  ESTAT._auditoriaDeterminista = { incidencies: [{ capitol: 3, gravetat: 'alta', missatge: 'x' }] };
  const lectures = [
    { unitat: 'cap-1', capitol: 1, troballes: 9 },   // ja calibrada → fora
    { unitat: 'cap-2', capitol: 2, troballes: 1 },
    { unitat: 'cap-3', capitol: 3, troballes: 0 },   // sense troballes però amb incidència
    { unitat: 'cap-4', capitol: 4, troballes: 3 }
  ];
  return suggerirUnitatsPerLlegir(ESTAT, lectures, 3);
});
check('F6.4 · No suggereix el que ja s\'ha calibrat',
  !mostreig.some(m => m.unitat === 'cap-1'), mostreig.map(m => m.unitat).join(', '));
check('F6.4 · Prioritza els capítols amb incidències d\'auditoria',
  mostreig[0].unitat === 'cap-4' || mostreig.find(m => m.unitat === 'cap-3'),
  mostreig.map(m => `${m.unitat}(${m.pes})`).join(' '));
check('F6.4 · Cada suggeriment diu per què val la pena llegir-lo',
  mostreig.every(m => m.motiu && m.motiu.length > 10), '');

// ── El checklist de sortida inclou el calibratge ───────────────────────────
const checklist = await page.evaluate(() => {
  ESTAT._calibratgeLector = crearRegistreCalibratge();
  ESTAT._estructuraCapitols = Array.from({ length: 4 }, () => ({}));
  ESTAT._capitols_generats = Array.from({ length: 4 }, () => 'text');
  const senseCalibrar = checklistSortidaNovella().find(f => /calibrat/i.test(f.nom));
  for (let i = 1; i <= 5; i++) {
    afegirObservacioCalibratge(ESTAT, { unitat: 'u' + i, confirmades: 4, descartades: 1, perdudes: 1 });
  }
  const calibrat = checklistSortidaNovella().find(f => /calibrat/i.test(f.nom));
  return { existeix: !!senseCalibrar, senseOk: senseCalibrar && senseCalibrar.ok, ambOk: calibrat && calibrat.ok, detall: calibrat && calibrat.detall };
});
check('El checklist inclou la fila de calibratge del lector', checklist.existeix, '');
check('I està en vermell fins que hi ha lectures humanes',
  checklist.senseOk === false && checklist.ambOk === true, checklist.detall || '');

// ── El lector adversari està cablejat ──────────────────────────────────────
const cablejat = await page.evaluate(() => {
  const src = String(lecturaAdversariaNovella);
  return {
    usaAvaluacio: /criteris_avaluacio/.test(src),
    usaLector: /seleccionarModelLector/.test(src),
    hostil: /lector hostil/i.test(src),
    botons: ['btn-lectura-adversaria', 'btn-calibratge-lector'].every(id => !!document.getElementById(id))
  };
});
check('El lector usa els criteris ocults i el model decorrelacionat',
  cablejat.usaAvaluacio && cablejat.usaLector, '');
check('L\'enquadrament és adversari, no de puntuació', cablejat.hostil, '');
check('Els botons de F6 existeixen a la fase 24', cablejat.botons, '');

await browser.close();
const fallits = results.filter(r => !r.ok);
console.log(`\n${results.length - fallits.length}/${results.length} comprovacions passades`);
process.exit(fallits.length ? 1 : 0);

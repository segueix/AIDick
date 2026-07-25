// Proves de regressió de les fases F0 (desbloqueig del flux) i F1 (ordre visual)
// descrites a REVISIO_I_PLA_EXCELLENCIA.md.
//
// Ús:
//   npx http-server -p 8099 -c-1 .        # des de l'arrel del projecte
//   node proves/f0_f1.mjs                 # en una altra terminal
//
// Variables opcionals:
//   BOOKI_URL         URL de l'index.html (per defecte http://127.0.0.1:8099/index.html)
//   CHROMIUM_PATH     ruta a l'executable de Chromium
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
const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text()); });

await page.goto(URL_BOOKI, { waitUntil: 'load' });
await page.waitForTimeout(1200);

check('Càrrega en fred sense pageerror', !consoleErrors.some(e => e.startsWith('pageerror')),
  consoleErrors.filter(e => e.startsWith('pageerror')).join(' | ') || 'cap');

// ── F1.1 — l'efecte d'escriptura és cancel·lable i no barreja dos textos ──────
const conc = await page.evaluate(async () => {
  const d = document.createElement('div');
  d.id = 'zona-test';
  d.className = 'conte-reader';
  document.body.appendChild(d);

  const capA = '<p>' + 'AAAA '.repeat(300) + '</p><p>' + 'AAAA '.repeat(300) + '</p>';
  const capB = '<p>' + 'BBBB '.repeat(60) + '</p>';

  efecteEscripturaHTML('zona-test', capA, 3);     // capítol N (llarg), sense await
  await new Promise(r => setTimeout(r, 300));
  await efecteEscripturaHTML('zona-test', capB, 3); // capítol N+1 el reemplaça
  await new Promise(r => setTimeout(r, 1500));     // temps perquè el primer, si viu, contaminés

  const txt = d.textContent;
  return { teA: txt.includes('A'), teB: txt.includes('B'), llargada: txt.length };
});
check('Cap barreja entre capítol N i N+1 al mateix contenidor', conc.teB && !conc.teA,
  `teA=${conc.teA} teB=${conc.teB}`);

// ── F1.3 — el pressupost de temps acota la durada d'un capítol llarg ─────────
const durada = await page.evaluate(async () => {
  const d = document.createElement('div');
  d.id = 'zona-temps';
  d.className = 'conte-reader';
  document.body.appendChild(d);
  const llarg = '<p>' + 'paraula '.repeat(2400) + '</p>'; // ~19.200 caràcters
  const t0 = performance.now();
  await efecteEscripturaHTML('zona-temps', llarg, 3);
  return { ms: performance.now() - t0, chars: d.textContent.length };
});
check('Un capítol de ~19k caràcters es pinta en <12s (abans ~54s)', durada.ms < 12000,
  `${Math.round(durada.ms)} ms, ${durada.chars} caràcters escrits`);
check('El text llarg es pinta sencer', durada.chars > 19000, `${durada.chars} caràcters`);

// ── F1.3 — toggle de desactivació ───────────────────────────────────────────
const instant = await page.evaluate(async () => {
  USER_CONFIG = Object.assign({}, USER_CONFIG || {}, { efecteEscriptura: false });
  const d = document.createElement('div');
  d.id = 'zona-instant';
  document.body.appendChild(d);
  const t0 = performance.now();
  await efecteEscripturaHTML('zona-instant', '<p>' + 'x'.repeat(5000) + '</p>', 3);
  const ms = performance.now() - t0;
  USER_CONFIG.efecteEscriptura = true;
  return { ms, chars: d.textContent.length };
});
check('Amb l\'efecte desactivat el text surt de cop', instant.ms < 100 && instant.chars === 5000,
  `${Math.round(instant.ms)} ms`);

// ── F0.7 — guardes de null ──────────────────────────────────────────────────
const guardes = await page.evaluate(() => {
  try { showCard('id-que-no-existeix'); hideCard('altre-id-fals'); showLoader('999'); showBtn('cap'); return 'ok'; }
  catch (e) { return 'throw: ' + e.message; }
});
check('showCard/hideCard/showLoader/showBtn amb id inexistent no llancen', guardes === 'ok', guardes);

// ── F0.5 — el fallback de contracte d'escena ja no és invàlid ───────────────
const fallback = await page.evaluate(() => {
  const c = crearSceneContractFallbackLocal(3, 1, {
    personatges: ['Lisbeth', 'Bjurman'],
    funcio_narrativa: 'obtenir els informes segellats',
    beat_narratiu: 'confrontació'
  });
  return { faltants: detectarFaltantsSceneContract(c), incomplet: !!c._incomplet };
});
check('El fallback de contracte d\'escena omple els 7 camps obligatoris',
  fallback.faltants.length === 0 && !fallback.incomplet,
  fallback.faltants.join(', ') || 'cap faltant');

// ── F0.1/F0.2 — el gate del capítol 1 ───────────────────────────────────────
const gate = await page.evaluate(() => {
  // Reprodueix l'estat que deixa el flux b1–b6 tal com el construeix
  // confirmarPersonatgesNou: personatges sense objectius ni secrets, trames buides.
  const nkg = crearNKG();
  nkg.macronarrativa.synopsis_core = 'x';
  nkg.macronarrativa.theme = 'x';
  nkg.macronarrativa.ending.emocio_final_lector = 'x';
  nkg.macronarrativa.backstory_canonic.fets_previs = ['fet'];
  nkg.relacions = [{ personatge_a: 'A', personatge_b: 'B', tipus: 'rival' }];
  nkg.objectes = { clau: { nom: 'clau' } };
  nkg.llocs = { a: {}, b: {}, c: {} };
  nkg.context_creacio.estil.perspectiva.tipus = 'tercera_limitada';
  nkg.context_creacio.estil.perspectiva.pov_per_capitol = [{ capitol: 1, personatge_pov: 'A' }];
  nkg.context_creacio.cronologia.per_capitol = [{ capitol: 1, moment: 'dia 1' }];
  ['A', 'B'].forEach(n => {
    nkg.personatges[n.toLowerCase()] = {
      nom: n, rol: 'protagonista',
      trets_immutables: { aspecte_fisic: 'x', ocupacio: 'x', tret_definitori: 'x' },
      veu: { exemples_narratius: ['a', 'b'], vocabulari_recurrent: ['a', 'b', 'c'] },
      objectius: [], secrets: []            // ← el que deixa el flux nou
    };
  });
  nkg.scene_contracts = [crearSceneContractFallbackLocal(1, 1, {
    personatges: ['A', 'B'], funcio_narrativa: 'obrir el conflicte', beat_narratiu: 'confrontació'
  })];

  const biblia = { regles_mon: ['regla'] };
  ESTAT._nkg = nkg;
  ESTAT.bibliaNarrativa = biblia;
  ESTAT.trames = { trama_principal: null, subtrames: [], mapa_entrellacat: [] };
  ESTAT._modeCompatibilitatSnapshotsAntics = false;
  ESTAT.fase = 23;

  const abans = validarNKGPreparatPerCapitol1(nkg, biblia);

  // Simula exactament el que produeixen els passos de completarMotorsDramaticsNKG.
  ESTAT.trames = {
    trama_principal: { conflicte: 'A vol els informes; B els reté', causalitat: 'x' },
    subtrames: [{ descripcio: 'B xantatgeja C', personatge: 'C' }],
    mapa_entrellacat: []
  };
  Object.values(nkg.personatges).forEach(p => {
    p.objectius = [{ id: 'o1', descripcio: 'aconseguir els informes', prioritat: 1 }];
    p.secrets   = [{ descripcio: 'amaga una condemna prèvia' }];
  });

  const despres = validarNKGPreparatPerCapitol1(nkg, biblia);
  return {
    abansOk: abans.ok, abansDrama: abans.errorsDrama || [],
    despresOk: despres.ok, despresErrors: despres.errors || []
  };
});

check('Es reprodueix el bloqueig del flux nou (abans del fix el gate falla)',
  gate.abansOk === false && gate.abansDrama.length > 0,
  gate.abansDrama.slice(0, 3).join(' · '));
// Comprovació del mapatge faltant → acció
const mapatge = await page.evaluate((drama) => {
  return drama.map(f => ({ f, accio: obtenirAccioGeneracioPerFaltant(f) }))
              .filter(x => !x.accio).map(x => x.f);
}, gate.abansDrama);
check('Cada blocant dramàtic té una acció de resolució a la UI',
  mapatge.length === 0, mapatge.length ? 'sense acció: ' + mapatge.join(' | ') : `${gate.abansDrama.length}/${gate.abansDrama.length} amb botó`);

check('Amb trames + objectius + secrets, el gate del capítol 1 passa',
  gate.despresOk === true, gate.despresErrors.slice(0, 3).join(' · ') || 'cap error');

// ── F0.3 — els faltants dramàtics es pinten amb botó ────────────────────────
const htmlDrama = await page.evaluate(() =>
  renderitzarFaltantsDrama(['Lisbeth no té objectius dramàtics accionables.', 'Falta trama principal amb conflicte causal.'])
);
check('renderitzarFaltantsDrama inclou botons d\'acció',
  (htmlDrama.match(/generarFaltantNKG\(/g) || []).length >= 3,
  `${(htmlDrama.match(/generarFaltantNKG\(/g) || []).length} botons`);

// ── F1.7 — ESTAT.fase segueix el pas real dels fonaments ────────────────────
const fases = await page.evaluate(() => {
  const src = confirmarTemaNou.toString() + confirmarPersonatgesNou.toString() +
              confirmarMonNou.toString() + confirmarEstructuraNou.toString() + confirmarFinalNou.toString();
  return ['b2', 'b3', 'b4', 'b5', 'b6'].filter(f => src.includes(`ESTAT.fase = '${f}'`));
});
check('ESTAT.fase s\'assigna a b2…b6 (abans només b1)', fases.length === 5, fases.join(', '));

// ── F1.8 — els capítols reservats es distingeixen a la llista ───────────────
const reservats = await page.evaluate(() => {
  ESTAT._estructuraCapitols = Array.from({ length: 6 }, (_, i) => ({ titol: 'Cap ' + (i + 1), intensity_level: 3 }));
  ESTAT._capitols_generats = ['t', 't', 't', 't'];
  ESTAT._capitolActual = 4;
  ESTAT._autoRedaccioMode = false;
  renderLlistaCapitols();
  const html = document.getElementById('capitol-llista').innerHTML;
  return { reservats: (html.match(/reservat per a Opus/g) || []).length, blau: (html.match(/🔵/g) || []).length };
});
check('Els dos últims capítols es marquen com a reservats a la llista',
  reservats.reservats === 2 && reservats.blau === 2, `${reservats.reservats} marcats`);

// ── Funcions noves disponibles en temps d'execució (blocs <script> creuats) ──
const disponibles = await page.evaluate(() => ['generarIDesarTrames', 'completarMotorsDramaticsNKG',
  'mostrarIAnarA', 'personatgesSenseMotorDramatic', 'sceneContractsIncomplets', 'generarTrames']
  .filter(n => typeof window[n] !== 'function' && typeof eval(n) !== 'function'));
check('Les funcions noves són invocables entre els dos blocs <script>',
  disponibles.length === 0, disponibles.join(', ') || 'totes disponibles');

// ── mostrarIAnarA amb id inexistent no llança ───────────────────────────────
const anarA = await page.evaluate(() => {
  try { mostrarIAnarA('fase-inexistent'); return 'ok'; } catch (e) { return 'throw: ' + e.message; }
});
check('mostrarIAnarA amb id inexistent no llança', anarA === 'ok', anarA);

// ══════════════════════════════════════════════════════════════════════════
//  Regressions de l'informe d'ús real: el gate de motors dramàtics es quedava
//  bloquejat amb personatges secundaris sense objectius ni secrets, subtrames
//  "no connectades" i contractes d'escena inexistents.
// ══════════════════════════════════════════════════════════════════════════

// BUG 1 — mergeObjectiusSecretsNKG esborrava tothom qui no fos al tros actual.
const merge = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  ['Laia', 'Biel', 'Mats Eklund', 'Samir Haddad'].forEach(nom => {
    ESTAT._nkg.personatges[nkgNormalitzarNom(nom)] = { nom, objectius: [], secrets: [] };
  });
  // Tros 1: dos personatges
  mergeObjectiusSecretsNKG({
    objectius_per_personatge: { laia: [{ descripcio: 'trobar l\'informe' }], biel: [{ descripcio: 'tapar-ho' }] },
    secrets_per_personatge:   { laia: [{ contingut: 'va falsificar una firma' }], biel: [{ contingut: 'cobra del fons' }] }
  });
  // Tros 2: els altres dos — abans, això buidava Laia i Biel
  mergeObjectiusSecretsNKG({
    objectius_per_personatge: { 'mats_eklund': [{ descripcio: 'protegir el germà' }] },
    secrets_per_personatge:   { 'mats_eklund': [{ contingut: 'sap qui va signar' }] }
  });
  // I el model pot retornar el nom visible en lloc de la clau normalitzada
  mergeObjectiusSecretsNKG({
    objectius_per_personatge: { 'Samir Haddad': [{ descripcio: 'sortir del país' }] },
    secrets_per_personatge:   { 'Samir Haddad': [{ contingut: 'té els originals' }] }
  });
  const p = ESTAT._nkg.personatges;
  return Object.keys(p).map(k => ({
    nom: p[k].nom, objectius: (p[k].objectius || []).length, secrets: (p[k].secrets || []).length
  }));
});
const senseMotor = merge.filter(m => m.objectius === 0 || m.secrets === 0);
check('El merge per trossos ja no esborra els personatges anteriors',
  senseMotor.length === 0, senseMotor.map(m => m.nom).join(', ') || merge.map(m => `${m.nom}:${m.objectius}/${m.secrets}`).join(' '));

// BUG 2 — les subtrames reals del prompt usen personatges_implicats
const subtrames = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  ESTAT.bibliaNarrativa = {};
  ESTAT.trames = {
    trama_principal: { conflicte_central: 'x', descripcio: 'y' },
    // Forma EXACTA que produeix el prompt de generarTrames
    subtrames: [{
      nom: 'La deute del germà', descripcio: 'Mats amaga un pagament',
      personatges_implicats: ['Mats Eklund'], capitol_inici: 2, capitol_resolucio: 10,
      com_entrellaça: 'obliga la Laia a triar'
    }],
    mapa_entrellacat: []
  };
  return teSubtramesConnectades(ESTAT._nkg, ESTAT.bibliaNarrativa);
});
check('Una subtrama amb "personatges_implicats" compta com a connectada', subtrames === true, '');

// BUG 3 — amb la llista de contractes BUIDA, el pas se saltava
const contractes = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  ESTAT._escaletes = [];
  ESTAT._estructuraCapitols = [
    { titol: 'U', personatges: ['Laia'], resum: 'obre el cas' },
    { titol: 'Dos', personatges: ['Laia', 'Mats Eklund'], resum: 'topa amb l\'arxiu' }
  ];
  const abans = (ESTAT._nkg.scene_contracts || []).length;
  const incompletsAbans = sceneContractsIncomplets().length;   // 0: no n'hi ha cap
  const creats = aplicarFallbackSceneContracts();
  return {
    abans, incompletsAbans, creats,
    valids: (ESTAT._nkg.scene_contracts || []).every(c => detectarFaltantsSceneContract(c).length === 0)
  };
});
check('Amb zero contractes, sceneContractsIncomplets no en veia cap (causa del pas saltat)',
  contractes.abans === 0 && contractes.incompletsAbans === 0, '');
check('El fallback crea un contracte vàlid per capítol',
  contractes.creats === 2 && contractes.valids, `${contractes.creats} contractes`);

// El cas complet de l'usuari: gate vermell → completar → gate verd, sense LLM
const casReal = await page.evaluate(async () => {
  window.fetch = async () => { throw new Error('sense xarxa a la prova'); };
  // Totes les vies LLM fallen: només han d'actuar els fallbacks locals.
  window.generarIDesarTrames = async () => { throw new Error('LLM caigut'); };
  window.generarObjectiusSecrets = async () => { throw new Error('LLM caigut'); };
  window.generarCompletarSceneContracts = async () => { throw new Error('LLM caigut'); };

  const nkg = crearNKG();
  nkg.macronarrativa.synopsis_core = 'x'; nkg.macronarrativa.theme = 'x';
  nkg.macronarrativa.ending.emocio_final_lector = 'x';
  nkg.macronarrativa.backstory_canonic.fets_previs = ['fet'];
  nkg.relacions = [{ personatge_a: 'Laia', personatge_b: 'Mats Eklund', tipus: 'rival' }];
  nkg.objectes = { clau: { nom: 'clau' } };
  nkg.llocs = { a: {}, b: {}, c: {} };
  nkg.context_creacio.estil.perspectiva.tipus = 'tercera_limitada';
  nkg.context_creacio.estil.perspectiva.pov_per_capitol = [{ capitol: 1, personatge_pov: 'Laia' }];
  nkg.context_creacio.cronologia.per_capitol = [{ capitol: 1, moment: 'mati' }];
  [['Laia', 'protagonista'], ['Mats Eklund', 'secundari'], ['Samir Haddad', 'secundari']].forEach(([nom, rol]) => {
    nkg.personatges[nkgNormalitzarNom(nom)] = {
      nom, rol,
      trets_immutables: { aspecte_fisic: 'x', ocupacio: 'x', tret_definitori: 'x' },
      veu: { exemples_narratius: ['a', 'b'], vocabulari_recurrent: ['a', 'b', 'c'] },
      motivacions_base: { desig_extern: 'publicar la investigació', necessitat_interna: 'deixar de dependre' },
      arc: { inici_emocional: 'en alerta' }, limit_moral: 'no exposar una font',
      objectius: [], secrets: [], primera_aparicio: 1
    };
  });
  ESTAT._nkg = nkg;
  ESTAT.bibliaNarrativa = { regles_mon: ['regla'] };
  ESTAT.trames = { trama_principal: { conflicte_central: 'x' }, subtrames: [], mapa_entrellacat: [] };
  ESTAT._estructuraCapitols = [{ titol: 'U', personatges: ['Laia'], resum: 'obre' },
                               { titol: 'Dos', personatges: ['Laia', 'Mats Eklund'], resum: 'topa' }];
  ESTAT._escaletes = [];
  ESTAT._modeCompatibilitatSnapshotsAntics = false;
  ESTAT.fase = 23;

  const abans = validarNKGPreparatPerCapitol1(nkg, ESTAT.bibliaNarrativa);
  const res = await completarMotorsDramaticsNKG({}, () => {});
  const despres = validarNKGPreparatPerCapitol1(ESTAT._nkg, ESTAT.bibliaNarrativa);
  return {
    blocantsAbans: (abans.errorsDrama || []).length,
    ok: despres.ok,
    errors: despres.errors || [],
    fallbacks: res.fallbacks || []
  };
});
check('Es reprodueix el bloqueig reportat (secundaris sense motors, subtrames, contractes)',
  casReal.blocantsAbans >= 5, `${casReal.blocantsAbans} blocants`);
check('Amb totes les crides LLM caigudes, la compleció local obre el gate igualment',
  casReal.ok === true, casReal.errors.slice(0, 3).join(' · ') || `fallbacks: ${casReal.fallbacks.join(' | ')}`);

// I iniciarFase11 ha d'intentar-ho sol abans de mostrar cap llista
const autoIntent = await page.evaluate(() =>
  String(iniciarFase11).includes('completarMotorsDramaticsNKG'));
check('iniciarFase11 intenta completar els motors abans de bloquejar l\'usuari', autoIntent, '');

await browser.close();

const fallits = results.filter(r => !r.ok);
console.log(`\n${results.length - fallits.length}/${results.length} comprovacions passades`);
if (consoleErrors.length) {
  console.log('\nErrors de consola recollits:');
  consoleErrors.slice(0, 10).forEach(e => console.log('  ' + e));
}
process.exit(fallits.length ? 1 : 0);

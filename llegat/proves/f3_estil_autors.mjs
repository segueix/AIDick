// Proves de regressió de la fase F3 (estil dels 4 autors) descrita a
// REVISIO_I_PLA_EXCELLENCIA.md.
//
// Ús:
//   npx http-server -p 8099 -c-1 .        # des de l'arrel del projecte
//   node proves/f3_estil_autors.mjs       # en una altra terminal
//
// Variables opcionals:
//   BOOKI_URL         URL de l'index.html (per defecte http://127.0.0.1:8099/llegat/novella.html)
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

const PERFILS = ['larsson', 'tolkien', 'dick', 'castaneda'];

// ── F3.2 — matriu de perfils completa ───────────────────────────────────────
const matriu = await page.evaluate((perfils) => {
  const camps = ['regles_dures', 'intensitat', 'prosa', 'exposicio', 'emocio', 'humanitzacio', 'criteris_excellencia'];
  const buits = [];
  perfils.forEach(id => camps.forEach(c => {
    const v = PERFILS_AUTOR[id] && PERFILS_AUTOR[id][c];
    const ple = Array.isArray(v) ? v.length > 0 : (typeof v === 'object' ? v && Object.keys(v).length > 0 : !!String(v || '').trim());
    if (!ple) buits.push(`${id}.${c}`);
  }));
  return buits;
}, PERFILS);
check('Els 4 perfils tenen els 7 camps d\'estil', matriu.length === 0, matriu.join(', ') || '28/28 camps plens');

// ── F3.1 — el prompt base ja no imposa autors aliens ni regles contradictòries ─
const prompts = await page.evaluate((perfils) => {
  const out = {};
  perfils.forEach(id => {
    ESTAT._autorPerfilId = id;
    out[id] = getSystemPromptNovella('');
  });
  ESTAT._autorPerfilId = '';
  out.cap = getSystemPromptNovella('');
  return out;
}, PERFILS);

const alienes = PERFILS.filter(id => /Donna Tartt|Ferrante|Ruiz Zaf/i.test(prompts[id]));
check('Cap prompt imposa Tartt/Ferrante/Zafón', alienes.length === 0, alienes.join(', ') || 'cap perfil');

const senseNom = PERFILS.filter(id => !prompts[id].includes({
  larsson: 'Stieg Larsson', tolkien: 'J.R.R. Tolkien', dick: 'Philip K. Dick', castaneda: 'Carlos Castaneda'
}[id]));
check('Cada prompt nomena el seu autor de referència', senseNom.length === 0, senseNom.join(', ') || '4/4');

check('Larsson manté la regla d\'un sol adjectiu',
  /Màxim 1 adjectiu/i.test(prompts.larsson), '');
check('Tolkien NO rep la regla d\'un sol adjectiu (contradeia el seu perfil)',
  !/Màxim 1 adjectiu/i.test(prompts.tolkien) && /NO t'apliquis la regla d'un sol adjectiu/i.test(prompts.tolkien), '');
check('Castaneda permet el diàleg didàctic (abans prohibit globalment)',
  /diàleg didàctic/i.test(prompts.castaneda) && !/PROHIBIT que cap personatge expliqui/i.test(prompts.castaneda), '');
check('Dick permet el monòleg intern paranoic',
  /monòleg intern hi és una eina|introspecció és el motor/i.test(prompts.dick), '');
check('Sense perfil, es mantenen les regles genèriques',
  /Màxim 1 adjectiu/i.test(prompts.cap) && /PROHIBIT que cap personatge expliqui/i.test(prompts.cap), '');

// ── F3.3 — criteris d'excel·lència com a restricció de generació ────────────
const criteris = await page.evaluate((perfils) => {
  const out = {};
  perfils.forEach(id => { out[id] = blocCriterisExcellenciaGeneracio(id); });
  out.cap = blocCriterisExcellenciaGeneracio('');
  return out;
}, PERFILS);
const sensCrit = PERFILS.filter(id => !/CONDICIONS D'ACCEPTACIÓ/.test(criteris[id]) || !/verificable/.test(criteris[id]));
check('Els criteris d\'excel·lència entren com a condicions d\'acceptació', sensCrit.length === 0,
  sensCrit.join(', ') || '4/4 perfils');
check('Sense perfil no s\'inventen criteris', criteris.cap === '', '');

// ── F3.4 — ambientació i criteris dins del prompt de capítol ────────────────
const payload = await page.evaluate(() => {
  ESTAT._autorPerfilId = 'castaneda';
  ESTAT._nkg = ESTAT._nkg && ESTAT._nkg.macronarrativa ? ESTAT._nkg : crearNKG();
  const blocs = buildSystemPromptCapitol();
  const text = Array.isArray(blocs) ? blocs.map(b => b.text || '').join('\n') : String(blocs || '');
  const cacheats = Array.isArray(blocs) ? blocs.filter(b => b.cache_control).map(b => b.text || '').join('\n') : '';
  ESTAT._autorPerfilId = '';
  return {
    teAmbientacio: /REGLA D'AMBIENTACIÓ INVIOLABLE/.test(text),
    ambientacioCacheada: /REGLA D'AMBIENTACIÓ INVIOLABLE/.test(cacheats),
    teCriteris: /CONDICIONS D'ACCEPTACIÓ/.test(text),
    teMexic: /Mèxic|Sonora/.test(text)
  };
});
check('El prompt de capítol inclou la regla d\'ambientació (abans només al flux b1–b6)',
  payload.teAmbientacio && payload.teMexic, '');
check('La regla d\'ambientació va al bloc amb cache (cost zero per capítol)',
  payload.ambientacioCacheada, '');
check('El prompt de capítol inclou les condicions d\'acceptació del perfil',
  payload.teCriteris, '');

// ── F3.5 — detecció blindada ────────────────────────────────────────────────
const deteccio = await page.evaluate(() => {
  ESTAT._autorPerfilId = '';
  ESTAT.configProjecte = {};
  ESTAT.tematica = '';
  const humorNegre = obtenirPerfilAutorId('humor negre i irònic');
  const nomEnDick  = obtenirPerfilAutorId('la Dickinson explica');
  const epic       = obtenirPerfilAutorId('un to èpic i fantàstic');
  const noir       = obtenirPerfilAutorId('novel·la noir escandinava');
  const larsson    = obtenirPerfilAutorId('univers Larsson (Stieg Larsson)');
  // El perfil explícit del projecte ha de guanyar sobre el text lliure.
  ESTAT._autorPerfilId = 'tolkien';
  const guanyaProjecte = resoldrePerfilAutor('univers Larsson noir');
  ESTAT._autorPerfilId = '';
  return { humorNegre, nomEnDick, epic, noir, larsson, guanyaProjecte };
});
check('"humor negre" ja no activa el perfil Larsson', deteccio.humorNegre === '', `→ "${deteccio.humorNegre}"`);
check('"Dickinson" ja no activa el perfil Dick', deteccio.nomEnDick === '', `→ "${deteccio.nomEnDick}"`);
check('"èpic i fantàstic" ja no activa Tolkien per si sol', deteccio.epic === '', `→ "${deteccio.epic}"`);
check('Les pistes de gènere segueixen funcionant com a pla B', deteccio.noir === 'larsson', `→ "${deteccio.noir}"`);
check('El nom de l\'autor segueix detectant-se', deteccio.larsson === 'larsson', `→ "${deteccio.larsson}"`);
check('El perfil triat al projecte guanya sobre el text lliure', deteccio.guanyaProjecte === 'tolkien',
  `→ "${deteccio.guanyaProjecte}"`);

// ── F3.6 — bloc d'humanització ──────────────────────────────────────────────
const huma = await page.evaluate((perfils) => {
  ESTAT._nkg = crearNKG();
  ESTAT._nkg.personatges = {
    lisbeth: {
      nom: 'Lisbeth',
      motivacions_base: { necessitat_interna: 'deixar de dependre de ningú' },
      arc: { waypoints: [{ capitol: 2, estat: 'admet que necessita ajuda', senyal_visible: 'deixa la porta oberta' }] }
    }
  };
  ESTAT._nkg.context_creacio.estil.perspectiva.pov_per_capitol = [{ capitol: 2, personatge_pov: 'Lisbeth' }];
  ESTAT._estructuraCapitols = [
    { titol: 'U', intensity_level: 3 },
    {
      titol: 'Dos', intensity_level: 4, temperatura_emocional: 8,
      personatges: ['Lisbeth', 'Blomkvist'],
      ratio_dialeg: { percentatge_dialeg: 35, tipus_dialeg: 'dialeg_intens' },
      cost_emocional: { personatge: 'Lisbeth', que_perd: 'la seva rutina de control', manifestacio: 'deixa de comprovar la porta', duracio: 'fins al final del capítol' }
    }
  ];
  ESTAT._escaletes = [];
  const out = {};
  perfils.forEach(id => { ESTAT._autorPerfilId = id; out[id] = construirBlocHumanitzacio(2); });
  ESTAT._autorPerfilId = '';
  return out;
}, PERFILS);

const seccions = ['MICRORUPTURA', 'COS:', 'OBJECTE EMOCIONAL', 'TEMPS MORT', 'DIÀLEG IMPERFECTE', 'WAYPOINT', 'COST'];
const incompletes = PERFILS.filter(id => seccions.some(s => !huma[id].includes(s)));
check('El bloc d\'humanització genera les 6 peces + waypoint/cost', incompletes.length === 0,
  incompletes.join(', ') || '4/4 perfils');
check('El bloc usa el POV, la necessitat interna i el waypoint reals',
  /Lisbeth/.test(huma.larsson) && /deixar de dependre de ningú/.test(huma.larsson) && /deixa la porta oberta/.test(huma.larsson), '');
check('El gest inútil i l\'objecte estan parametritzats per autor',
  /cafè i tabac/.test(huma.larsson) && /anell|fíbula/.test(huma.tolkien) &&
  /marca mal impresa/.test(huma.dick) && /planta seca/.test(huma.castaneda), '');
check('La temperatura emocional real arriba al bloc (8/10 → vulnerabilitat exposada)',
  /8\/10/.test(huma.larsson) && /vulnerabilitat exposada/.test(huma.larsson), '');
check('El ratio de diàleg real arriba al bloc',
  /35%/.test(huma.larsson) && /dialeg_intens/.test(huma.larsson), '');

// ── Errata que deixava morta la capa d'arquitectura emocional ───────────────
const errata = await page.evaluate(() =>
  [construirContextDialegCapitols, construirContextCostEmocionalCapitols, aplicarRatioDialegCapitols]
    .some(f => f.toString().includes('_estruturaCapitols')));
check('Cap referència a la propietat mal escrita _estruturaCapitols', errata === false, '');
const capaViva = await page.evaluate(() => construirContextDialegCapitols().length);
check('La capa de temperatura/diàleg ja llegeix els capítols reals', capaViva === 2, `${capaViva} capítols`);

// ── F3.7 — diverses escenes per capítol ─────────────────────────────────────
const escenes = await page.evaluate(() => {
  const dades = {
    funcio: 'la investigació topa amb l\'arxiu tancat',
    scene_contracts: [
      { id: 'C2E1', capitol: 2, escena: 1, nom: 'Arxiu tancat', lloc: 'arxiu municipal', beat_narratiu: 'investigació',
        pov: 'Lisbeth', personatges_presents: ['Lisbeth'], objectiu_visible_pov: 'obtenir l\'expedient',
        obstacle_concret: 'la funcionària nega l\'accés', asimetria_poder: 'ella té la clau',
        decisio_irreversible: 'entra sense permís', cost_immediat: 'queda registrada a la càmera',
        consequencia_narrativa: 'la investigació esdevé il·legal' },
      { id: 'C2E2', capitol: 2, escena: 2, nom: 'La trucada', lloc: 'aparcament', beat_narratiu: 'confrontació',
        pov: 'Lisbeth', personatges_presents: ['Lisbeth', 'Blomkvist'], objectiu_visible_pov: 'que no ho publiqui',
        obstacle_concret: 'ell ja ho ha enviat', asimetria_poder: 'ell controla el diari',
        decisio_irreversible: 'li dona el nom de la font', cost_immediat: 'trenca la seva regla',
        consequencia_narrativa: 'la font queda exposada' }
    ]
  };
  const capInfo = { titol: 'Dos', personatges: ['Lisbeth'], resum: 'x' };
  ESTAT.estil = Object.assign({}, ESTAT.estil, { paraules: 3000 });
  const esc = escenesDesDeContractes(dades, capInfo, 2);
  const buit = escenesDesDeContractes(null, capInfo, 2);
  return {
    n: esc.length,
    noms: esc.map(e => e.nom),
    beats: esc.map(e => e.beat_narratiu),
    paraules: esc.map(e => e.paraules_objectiu),
    contractesOk: esc.every(e => detectarFaltantsSceneContract(e.scene_contract).length === 0),
    fallbackN: buit.length,
    fallbackOk: detectarFaltantsSceneContract(buit[0].scene_contract).length === 0
  };
});
check('Un capítol amb 2 contractes genera 2 escenes (abans en descartava totes menys la primera)',
  escenes.n === 2, `${escenes.n} escenes: ${escenes.noms.join(' | ')}`);
check('Cada escena manté el seu beat narratiu real (abans "diàleg" fix)',
  escenes.beats.join(',') === 'investigació,confrontació', escenes.beats.join(', '));
check('Les paraules es reparteixen entre escenes',
  escenes.paraules.every(p => p === 1500), escenes.paraules.join(' + '));
check('Tots els contractes de les escenes són vàlids', escenes.contractesOk, '');
check('El fallback sense contractes segueix produint una escena vàlida',
  escenes.fallbackN === 1 && escenes.fallbackOk, '');

// El prompt d'escaleta ha de demanar la divisió en escenes
const promptEscaleta = await page.evaluate(() => nouFlux_escaletaCapitol.toString());
check('El prompt d\'escaleta demana explícitament 2-4 escenes amb contracte',
  /DIVISIÓ EN ESCENES \(OBLIGATORI\)/.test(promptEscaleta) && /escenesMin/.test(promptEscaleta), '');

await browser.close();

const fallits = results.filter(r => !r.ok);
console.log(`\n${results.length - fallits.length}/${results.length} comprovacions passades`);
process.exit(fallits.length ? 1 : 0);

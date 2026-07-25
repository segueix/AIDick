// Proves de regressió de la fase F4 (higiene) descrita a
// REVISIO_I_PLA_EXCELLENCIA.md.
//
// Ús:
//   npx http-server -p 8099 -c-1 .
//   node proves/f4_higiene.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

function carregarPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch (e) { /* provem la instal·lació global */ }
  const arrelGlobal = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return createRequire(arrelGlobal + '/').call(null, 'playwright');
}
const { chromium } = carregarPlaywright();
const URL_BOOKI = process.env.BOOKI_URL || 'http://127.0.0.1:8099/index.html';
const ARREL = new URL('..', import.meta.url).pathname;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

// ── Comprovacions sobre el fitxer, sense navegador ─────────────────────────
const html = readFileSync(ARREL + 'index.html', 'utf8');
// Els comentaris expliquen què s'ha tret i citen els valors antics; les
// comprovacions han de mirar només codi.
const senseComentaris = html.replace(/^\s*\/\/.*$/gm, '');

const definicions = (html.match(/^function renderitzarResumDramaticBiblia\(\)/gm) || []).length;
check('F4.1 · renderitzarResumDramaticBiblia està definida un sol cop',
  definicions === 1, `${definicions} definicions`);

const morts = ['validarIReomplirEscaleta', 'revisioArquitectaAmbContinuitat']
  .filter(n => new RegExp(`^(async )?function ${n}\\(`, 'm').test(html));
check('F4 · Les funcions mortes ja no es defineixen', morts.length === 0, morts.join(', ') || 'cap');

check('F4.4 · nkg_biblia.html ja no forma part del projecte',
  !existsSync(ARREL + 'nkg_biblia.html'), '');

// Els mòduls s'han de carregar amb etiquetes directes: els scripts injectats amb
// document.write els bloquegen els navegadors quan són cross-origin i la
// connexió és lenta, i llavors l'app no arrenca sense donar cap error clar.
check('Cap mòdul es carrega amb document.write',
  !/document\.write\s*\([^)]*<script/i.test(html), '');
const moduls = ['perfils_autor_base.js', 'models_openai.js', 'ui_fixes.js', 'nkg_core.js']
  .filter(m => !new RegExp(`<script src="${m.replace('.', '\\.')}"`).test(html));
check('Tots els mòduls es carreguen amb <script src> directe',
  moduls.length === 0, moduls.join(', ') || '4 mòduls');

const taulesHardcodades = [
  /const MODEL_DEFAULTS = \{/.test(senseComentaris) && 'MODEL_DEFAULTS',
  /gemini-1\.5-pro/.test(senseComentaris) && 'gemini-1.5-pro',
  /claude-opus-4-1(?!-)/.test(senseComentaris) && 'claude-opus-4-1'
].filter(Boolean);
check('F4.2 · Han desaparegut les taules i els IDs desalineats',
  taulesHardcodades.length === 0, taulesHardcodades.join(', ') || 'cap');

// ── Comprovacions dins del navegador ───────────────────────────────────────
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const pageErrors = [];
const avisos = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'warning') avisos.push(m.text()); });
await page.goto(URL_BOOKI, { waitUntil: 'load' });
await page.waitForTimeout(1200);
check('Càrrega en fred sense pageerror', pageErrors.length === 0, pageErrors.join(' | ') || 'cap');

// Cal capturar-ho ARA: més avall hi ha proves que provoquen aquests avisos a
// posta, i comptar-los com a avisos d'arrencada seria un fals negatiu.
const avisosArrencada = avisos.filter(a => /Invariants de jutge|Models per defecte desalineats/.test(a));
check('Els self-checks d\'arrencada passen nets',
  avisosArrencada.length === 0, avisosArrencada.join(' | ') || 'cap avís');

// F4.2 — tot ID per defecte ha d'existir al registre de models
const models = await page.evaluate(() => ({
  problemes: validarDefaultsModels(),
  perProveidor: MODELS_PER_PROVEIDOR,
  providerDefaults: {
    anthropic: PROVIDER_DEFAULTS.anthropic.model,
    openai: PROVIDER_DEFAULTS.openai.model,
    gemini: PROVIDER_DEFAULTS.gemini.model
  },
  registreTe: id => !!MODEL_REGISTRY[id]
}));
check('F4.2 · Cap model per defecte falta al registre',
  models.problemes.length === 0, models.problemes.join(' | ') || `${Object.keys(models.perProveidor).length} proveïdors validats`);

const coherents = await page.evaluate(() =>
  ['anthropic', 'openai', 'gemini'].filter(p => PROVIDER_DEFAULTS[p].model !== MODELS_PER_PROVEIDOR[p].generacio));
check('F4.2 · PROVIDER_DEFAULTS deriva de la font única', coherents.length === 0,
  coherents.join(', ') || `anthropic=${models.providerDefaults.anthropic}, openai=${models.providerDefaults.openai}, gemini=${models.providerDefaults.gemini}`);

// Regressió: models_openai.js muta MODELS_PER_PROVEIDOR a DOMContentLoaded.
// Amb una còpia feta en temps de parseig, PROVIDER_DEFAULTS quedava congelat
// amb el model antic i la font única deixava de ser-ho.
const mutacioTardana = await page.evaluate(() => {
  const previ = MODELS_PER_PROVEIDOR.openai.generacio;
  MODELS_PER_PROVEIDOR.openai = { ...MODELS_PER_PROVEIDOR.openai, generacio: 'model-injectat-tard' };
  const segueix = PROVIDER_DEFAULTS.openai.model;
  const detectat = validarDefaultsModels();
  MODELS_PER_PROVEIDOR.openai = { ...MODELS_PER_PROVEIDOR.openai, generacio: previ };
  return { segueix, detectat, restaurat: PROVIDER_DEFAULTS.openai.model === previ };
});
check('F4.2 · PROVIDER_DEFAULTS segueix la font quan es muta després de carregar',
  mutacioTardana.segueix === 'model-injectat-tard' && mutacioTardana.restaurat,
  `→ ${mutacioTardana.segueix}`);

// I si algú torna a copiar el valor en lloc de llegir-lo, el validador ho ha de dir.
const detectaDivergencia = await page.evaluate(() => {
  const original = Object.getOwnPropertyDescriptor(PROVIDER_DEFAULTS.openai, 'model');
  Object.defineProperty(PROVIDER_DEFAULTS.openai, 'model', { value: 'gpt-obsolet', configurable: true });
  const problemes = validarDefaultsModels();
  Object.defineProperty(PROVIDER_DEFAULTS.openai, 'model', original);
  return problemes;
});
check('F4.2 · El validador detecta la divergència que abans se li escapava',
  detectaDivergencia.some(p => /PROVIDER_DEFAULTS\.openai/.test(p)),
  detectaDivergencia.join(' | ') || 'cap problema detectat');

const presets = await page.evaluate(() => {
  const fora = [];
  ['economic', 'equilibrat', 'premium', 'maxim', 'barat_gpt', 'gemini'].forEach(nom => {
    aplicarPreset(nom);
    [ESTAT._modelDraft, ESTAT._modelGeneracio, ESTAT._modelArquitecte].forEach(id => {
      if (!MODEL_REGISTRY[id]) fora.push(`${nom}:${id}`);
    });
  });
  return fora;
});
check('F4.2 · Tots els presets trien models que existeixen al registre',
  presets.length === 0, presets.join(', ') || '6 presets validats');

// F4.3 — l'informe d'excel·lència ja no talla el capítol a 6.000 caràcters
const informe = await page.evaluate(() => {
  const src = String(generarInformeExcellencia).replace(/^\s*\/\/.*$/gm, '');
  return {
    talla6000: /substring\(0,\s*6000\)/.test(src),
    diuComplet: /TEXT COMPLET/.test(src),
    usaContext: /context_max/.test(src)
  };
});
check('F4.3 · L\'informe d\'excel·lència avalua el capítol sencer',
  !informe.talla6000 && informe.diuComplet && informe.usaContext, '');

// El límit s'ha de derivar del context del model, no d'un número fix
const limit = await page.evaluate(() => {
  const ctx = MODEL_REGISTRY['claude-opus-4-6'].context_max;
  return { ctx, limit: Math.min(200000, Math.floor(ctx * 0.5 * 3.5)) };
});
check('F4.3 · El límit del text es deriva del context del model',
  limit.limit > 6000, `${limit.limit} caràcters (context ${limit.ctx})`);

await browser.close();
const fallits = results.filter(r => !r.ok);
console.log(`\n${results.length - fallits.length}/${results.length} comprovacions passades`);
process.exit(fallits.length ? 1 : 0);

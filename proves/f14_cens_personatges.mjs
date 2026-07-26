// Proves de regressió de l'encàrrec 6 de MILLORES_PENDENTS.md: cap pas del
// pipeline impedia que el model introduís personatges nous a mitja novel·la ni
// que reutilitzés un nom per a una persona diferent.
//
// Ús:
//   npx http-server -p 8099 -c-1 .        # des de l'arrel del projecte
//   node proves/f14_cens_personatges.mjs
//
// Variables opcionals: BOOKI_URL, CHROMIUM_PATH.
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

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(URL_BOOKI, { waitUntil: 'load' });
await page.waitForTimeout(1200);

const r = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  ESTAT._nkg.personatges = {
    olof_lindqvist: { nom: 'Olof Lindqvist', viu: true },
    anniken: { nom: 'Anniken', viu: true },
    lars_bergstrom: { nom: 'Lars Bergström', viu: false }
  };
  ESTAT._nkg.llocs = { norrmalm: { nom: 'Norrmalm' }, estocolm: { nom: 'Estocolm' } };

  const text = [
    'La tassa va caure quan Olof va obrir l’aixeta. Anniken el va cridar des de l’escala.',
    'Van caminar cap a Norrmalm. A Estocolm feia fred aquell matí.',
    'La Karin va obrir la carpeta. Va mirar la Karin i la Karin no va dir res.',
    'Va veure en Lindqvist a la cantonada, amb en Bergström al costat.',
    'Un home anomenat Bosch va passar de llarg una sola vegada.'
  ].join('\n');

  const nous = detectarNomsNousCapitol(text, 3);
  const clausNoves = nous.map(n => n.clau);

  // Prosa sense cap nom nou: no ha de generar soroll
  const netaCap = detectarNomsNousCapitol(
    'Olof va mirar Anniken. Anniken va callar. Després Olof va sortir al carrer amb Anniken.', 4);

  // Registre com a error de continuïtat
  ESTAT._contradiccionsTardanes = [];
  ESTAT.llibreRegistre = ESTAT.llibreRegistre || { fils_oberts: [], fils_tancats: [] };
  ESTAT.llibreRegistre.fils_oberts = [];
  const resRegistrat = comprovarPersonatgesCapitol(text, 3);
  const resSenseRegistrar = (() => {
    ESTAT._contradiccionsTardanes = [];
    return comprovarPersonatgesCapitol(text, 3, { registrar: false });
  })();

  return {
    clausNoves,
    netaCap: netaCap.length,
    cens: buildBlocCensPersonatges(),
    registrats: resRegistrat.registrats,
    filsOberts: (ESTAT.llibreRegistre.fils_oberts || []).length,
    categoriaFil: (ESTAT.llibreRegistre.fils_oberts[0] || {}).categoria,
    senseRegistrar: resSenseRegistrar.registrats,
    censBuit: (() => { ESTAT._nkg = crearNKG(); return buildBlocCensPersonatges(); })(),
    senseNkg: (() => { const g = ESTAT._nkg; ESTAT._nkg = null; const out = comprovarPersonatgesCapitol('Karin i Karin.', 1); ESTAT._nkg = g; return out.nous.length; })()
  };
});

comprova('Detecta un nom propi que no consta al registre',
  r.clausNoves.includes('karin'), JSON.stringify(r.clausNoves));
comprova('No marca els personatges canònics',
  !r.clausNoves.includes('olof') && !r.clausNoves.includes('anniken'), JSON.stringify(r.clausNoves));
comprova('Reconeix un personatge citat pel cognom',
  !r.clausNoves.includes('lindqvist') && !r.clausNoves.includes('bergstrom'), JSON.stringify(r.clausNoves));
comprova('No marca els topònims del mapa com a personatges',
  !r.clausNoves.includes('norrmalm') && !r.clausNoves.includes('estocolm'), JSON.stringify(r.clausNoves));
comprova('Una menció de pas única queda per sota del llindar',
  !r.clausNoves.includes('bosch'), JSON.stringify(r.clausNoves));
comprova('Un capítol sense noms nous no genera soroll', r.netaCap === 0, String(r.netaCap));

comprova('El cens llista els personatges canònics',
  r.cens.includes('Olof Lindqvist') && r.cens.includes('Anniken'));
comprova('El cens marca els personatges morts', /Lars Bergström \[MORT\]/.test(r.cens));
comprova('El cens prohibeix reutilitzar un nom per a algú altre',
  /designa SEMPRE la mateixa persona/.test(r.cens));
comprova('El cens ofereix l’alternativa de la figura sense nom',
  /deixa-la sense nom/.test(r.cens));
comprova('Sense personatges registrats el cens queda buit', r.censBuit === '');

comprova('Els noms nous es registren com a error de continuïtat',
  r.registrats === 1 && r.filsOberts === 1, `${r.registrats} / ${r.filsOberts}`);
comprova('El fil obert té la categoria error-continuïtat',
  r.categoriaFil === 'error-continuïtat', String(r.categoriaFil));
comprova('L’opció registrar:false només informa', r.senseRegistrar === 0);
comprova('Sense NKG la comprovació no peta', r.senseNkg === 0);

comprova('El cens s’injecta al prompt del capítol',
  await page.evaluate(() => document.documentElement.outerHTML.includes('buildBlocCensPersonatges()')));
comprova('La comprovació s’executa al pipeline post-capítol',
  await page.evaluate(() => document.documentElement.outerHTML.includes('comprovarPersonatgesCapitol(textCapitol')));

comprova('Cap error de pàgina durant les proves', pageErrors.length === 0, pageErrors.join(' | '));

console.log(`\n${passades}/${totals} comprovacions passades`);
await browser.close();
process.exit(passades === totals ? 0 : 1);

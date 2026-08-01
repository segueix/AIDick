// Proves de regressió de la fase F5 (verificació determinista) descrita a
// REVISIO_I_PLA_EXCELLENCIA.md.
//
// Aquestes proves són especialment estrictes en un punt: els validadors no només
// han de trobar la contradicció que se'ls planta, sinó NO inventar-ne cap sobre
// una novel·la coherent. Un validador amb falsos positius és pitjor que cap.
//
// Ús:
//   npx http-server -p 8099 -c-1 .
//   node proves/f5_verificacio.mjs
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

// Construeix un NKG amb un llibre major controlat.
async function ambRegistre(esdeveniments, extra = {}) {
  return page.evaluate(({ esdeveniments, extra }) => {
    const nkg = crearNKG();
    Object.assign(nkg, extra);
    assegurarRegistreEstat(nkg);
    esdeveniments.forEach(e => registrarEsdevenimentEstat(nkg, e));
    return auditarCoherenciaNKG(nkg, { totalCapitols: 8, novellaAcabada: !!extra.__acabada });
  }, { esdeveniments, extra });
}

// ── Cas net: cap fals positiu ──────────────────────────────────────────────
const net = await ambRegistre([
  { capitol: 1, escena: 1, tipus: 'ubicacio', subjecte: 'Lisbeth', valor: 'Estocolm', detall: '' },
  { capitol: 2, escena: 1, tipus: 'ubicacio', subjecte: 'Lisbeth', valor: 'Hedestad', detall: 'Estocolm' },
  { capitol: 1, escena: 1, tipus: 'objecte', subjecte: 'expedient', valor: 'Lisbeth', detall: 'arxiu' },
  { capitol: 3, escena: 1, tipus: 'objecte', subjecte: 'expedient', valor: 'Blomkvist', detall: 'Lisbeth' },
  { capitol: 2, escena: 1, tipus: 'coneixement', subjecte: 'Lisbeth', valor: 'apren', detall: 'identitat del pare' },
  { capitol: 4, escena: 1, tipus: 'coneixement', subjecte: 'Lisbeth', valor: 'usa', detall: 'identitat del pare' }
]);
check('Una novel·la coherent no genera cap incidència', net.ok,
  net.incidencies.map(i => i.missatge).join(' | ') || `${net.esdevenimentsAuditats} esdeveniments, 0 incidències`);

// ── 1. Objecte teletransportat ─────────────────────────────────────────────
const objecte = await ambRegistre([
  { capitol: 1, escena: 1, tipus: 'objecte', subjecte: 'rellotge', valor: 'calaix', detall: 'butxaca' },
  { capitol: 4, escena: 1, tipus: 'objecte', subjecte: 'rellotge', valor: 'Blomkvist', detall: 'taula del bar' }
]);
check('Detecta un objecte que surt d\'on no era',
  objecte.incidencies.some(i => i.tipus === 'objecte' && i.gravetat === 'alta'),
  objecte.incidencies.map(i => i.missatge)[0] || 'cap');

// ── 2. Personatge a dos llocs alhora ───────────────────────────────────────
const ubicacio = await ambRegistre([
  { capitol: 3, escena: 2, tipus: 'ubicacio', subjecte: 'Nil', valor: 'la redacció', detall: '' },
  { capitol: 3, escena: 2, tipus: 'ubicacio', subjecte: 'Nil', valor: 'el moll', detall: '' }
]);
check('Detecta un personatge a dos llocs a la mateixa escena',
  ubicacio.incidencies.some(i => i.tipus === 'ubicacio' && i.gravetat === 'alta'),
  ubicacio.incidencies.map(i => i.missatge)[0] || 'cap');

// El mateix personatge canviant de lloc entre escenes NO és un error
const moviment = await ambRegistre([
  { capitol: 3, escena: 1, tipus: 'ubicacio', subjecte: 'Nil', valor: 'la redacció', detall: '' },
  { capitol: 3, escena: 2, tipus: 'ubicacio', subjecte: 'Nil', valor: 'el moll', detall: 'la redacció' }
]);
check('Moure\'s entre escenes no és cap error', moviment.ok,
  moviment.incidencies.map(i => i.missatge).join(' | ') || 'cap incidència');

// ── 3. Els morts no actuen ─────────────────────────────────────────────────
const mort = await ambRegistre([
  { capitol: 5, escena: 3, tipus: 'mort', subjecte: 'Bjurman', valor: 'mort' },
  { capitol: 7, escena: 1, tipus: 'ubicacio', subjecte: 'Bjurman', valor: 'el despatx', detall: '' }
]);
check('Detecta activitat d\'un personatge després de morir',
  mort.incidencies.some(i => i.tipus === 'mort' && i.gravetat === 'alta'),
  mort.incidencies.map(i => i.missatge)[0] || 'cap');

const mortAbans = await ambRegistre([
  { capitol: 2, escena: 1, tipus: 'ubicacio', subjecte: 'Bjurman', valor: 'el despatx', detall: '' },
  { capitol: 5, escena: 3, tipus: 'mort', subjecte: 'Bjurman', valor: 'mort' }
]);
check('Actuar ABANS de morir no és cap error', mortAbans.ok,
  mortAbans.incidencies.map(i => i.missatge).join(' | ') || 'cap incidència');

// ── 4. Coneixement: actuar sobre el que encara no se sap ───────────────────
const coneixement = await ambRegistre([
  { capitol: 6, escena: 1, tipus: 'coneixement', subjecte: 'Nil', valor: 'apren', detall: 'el nom de la font' },
  { capitol: 2, escena: 1, tipus: 'coneixement', subjecte: 'Nil', valor: 'usa', detall: 'el nom de la font' }
]);
check('Detecta qui actua sobre informació que encara no té',
  coneixement.incidencies.some(i => i.tipus === 'coneixement' && i.gravetat === 'alta'),
  coneixement.incidencies.map(i => i.missatge)[0] || 'cap');

const maiApres = await ambRegistre([
  { capitol: 3, escena: 1, tipus: 'coneixement', subjecte: 'Maja', valor: 'usa', detall: 'el codi de la caixa' }
]);
check('Detecta qui actua sobre informació que no aprèn mai',
  maiApres.incidencies.some(i => i.tipus === 'coneixement'),
  maiApres.incidencies.map(i => i.missatge)[0] || 'cap');

// ── 5. Cronologia ──────────────────────────────────────────────────────────
const crono = await page.evaluate(() => {
  const nkg = crearNKG();
  nkg.context_creacio.cronologia.per_capitol = [
    { capitol: 1, data: '2024-03-01', moment: 'mati' },
    { capitol: 2, data: '2024-03-04', moment: 'tarda' },
    { capitol: 3, data: '2024-02-20', moment: 'nit' }              // retrocés no marcat
  ];
  const ambError = auditarCoherenciaNKG(nkg, { totalCapitols: 3 });

  nkg.context_creacio.cronologia.per_capitol[2].moment = 'nit (flashback)';
  const ambFlashback = auditarCoherenciaNKG(nkg, { totalCapitols: 3 });
  return {
    detecta: ambError.incidencies.some(i => i.tipus === 'cronologia'),
    respectaFlashback: !ambFlashback.incidencies.some(i => i.tipus === 'cronologia')
  };
});
check('Detecta un retrocés temporal no declarat', crono.detecta, '');
check('Un flashback declarat no compta com a error', crono.respectaFlashback, '');

// ── 6. Fils oberts, només quan la novel·la s'ha acabat ─────────────────────
const fils = await page.evaluate(() => {
  const nkg = crearNKG();
  nkg.threads.oberts = ['qui va matar el guarda', 'el deute del pare'];
  nkg.threads.pendents_resolucio = ['el deute del pare'];   // final obert volgut
  return {
    enCurs: auditarCoherenciaNKG(nkg, { totalCapitols: 8, novellaAcabada: false }).incidencies.filter(i => i.tipus === 'fils').length,
    acabada: auditarCoherenciaNKG(nkg, { totalCapitols: 8, novellaAcabada: true }).incidencies.filter(i => i.tipus === 'fils').length
  };
});
check('Els fils oberts no molesten mentre s\'escriu', fils.enCurs === 0, `${fils.enCurs}`);
check('En acabar, només es queixa dels fils sense justificar', fils.acabada === 1, `${fils.acabada} de 2 fils oberts`);

// ── F5.1 — el llibre major no es trunca ────────────────────────────────────
const ledger = await page.evaluate(() => {
  const nkg = crearNKG();
  assegurarRegistreEstat(nkg);
  for (let i = 1; i <= 200; i++) {
    registrarEsdevenimentEstat(nkg, { capitol: i, escena: 1, tipus: 'ubicacio', subjecte: 'X', valor: 'lloc' + i });
    nkg.timeline_personatges.push('linia ' + i);
    if (nkg.timeline_personatges.length > 40) nkg.timeline_personatges = nkg.timeline_personatges.slice(-40);
  }
  return { registre: nkg.registre_estat.esdeveniments.length, timeline: nkg.timeline_personatges.length };
});
check('El llibre major conserva tots els esdeveniments (la timeline es trunca)',
  ledger.registre === 200 && ledger.timeline === 40,
  `registre=${ledger.registre}, timeline=${ledger.timeline}`);

// ── F5.1 — els hooks reals alimenten el llibre major ───────────────────────
const hooks = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  const nkg = ESTAT._nkg;
  nkg.personatges.maja = { nom: 'Maja', ubicacio: 'cuina', viu: true, objectes_inventari: [], objectes_descartats: [] };
  nkgRegistrarCanvisPersonatge(nkg, { nom: 'Maja', ubicacio: 'cuina' }, { nom: 'Maja', ubicacio: 'garatge' }, 2, 1);
  nkgRegistrarMovimentObjecte(nkg, 'Claus', { posseidor: 'Maja', ubicacio: 'cuina' }, { posseidor: 'Nil', ubicacio: 'garatge' }, 2, 1, 'les hi dona');
  const ev = nkg.registre_estat.esdeveniments;
  return {
    total: ev.length,
    tipus: ev.map(e => e.tipus).sort(),
    ubicacio: ev.find(e => e.tipus === 'ubicacio')?.valor,
    objecte: ev.find(e => e.tipus === 'objecte')?.subjecte
  };
});
check('Els canvis reals d\'ubicació i d\'objecte entren al llibre major',
  hooks.total === 2 && hooks.ubicacio === 'garatge' && /clau/i.test(hooks.objecte || ''),
  `${hooks.total} esdeveniments: ${hooks.tipus.join(', ')}`);

// ── F5.4 — bloc d'estat inicial determinista ───────────────────────────────
const blocEstat = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  const nkg = ESTAT._nkg;
  assegurarRegistreEstat(nkg);
  nkg.personatges.lisbeth = {
    nom: 'Lisbeth', ubicacio: 'la redacció', viu: true,
    estat_fisic: 'esgotada', estat_emocional: 'en alerta',
    objectes_inventari: ['portàtil', 'expedient'], indumentaria_actual: 'jaqueta negra'
  };
  nkg.personatges.bjurman = { nom: 'Bjurman', ubicacio: 'el despatx', viu: false, objectes_inventari: [] };
  registrarEsdevenimentEstat(nkg, { capitol: 2, escena: 1, tipus: 'coneixement', subjecte: 'Lisbeth', valor: 'apren', detall: 'identitat del pare' });
  registrarEsdevenimentEstat(nkg, { capitol: 6, escena: 1, tipus: 'coneixement', subjecte: 'Lisbeth', valor: 'apren', detall: 'el compte suís' });
  nkg.context_creacio.cronologia.per_capitol = [{ capitol: 5, data: '2024-03-10', moment: 'nit' }];
  ESTAT._estructuraCapitols = Array.from({ length: 8 }, (_, i) => ({ titol: 'C' + (i + 1), personatges: ['Lisbeth', 'Bjurman'] }));
  return construirBlocEstatInicialCapitol(5);
});
check('El bloc d\'estat porta ubicació, inventari i rellotge reals',
  /la redacció/.test(blocEstat) && /portàtil/.test(blocEstat) && /2024-03-10/.test(blocEstat), '');
check('El bloc d\'estat marca els morts com a no actuables',
  /Bjurman/.test(blocEstat) && /MORT/.test(blocEstat), '');
check('El bloc només llista el que el personatge ja sap en aquell punt',
  /identitat del pare/.test(blocEstat) && !/compte suís/.test(blocEstat),
  'coneixement del cap. 6 exclòs al cap. 5');

// ── El bloc arriba al prompt del capítol ───────────────────────────────────
const alPrompt = await page.evaluate(() => {
  ESTAT._capitolActual = 4;
  const blocs = buildSystemPromptCapitol();
  const text = Array.isArray(blocs) ? blocs.map(b => b.text || '').join('\n') : String(blocs || '');
  return /ESTAT AL COMENÇAMENT D'AQUEST CAPÍTOL/.test(text) && /la redacció/.test(text);
});
check('El bloc d\'estat s\'injecta al prompt del capítol', alPrompt, '');

// ── F5.2 — l'auditoria arriba al checklist de sortida ──────────────────────
const checklist = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  assegurarRegistreEstat(ESTAT._nkg);
  registrarEsdevenimentEstat(ESTAT._nkg, { capitol: 5, escena: 1, tipus: 'mort', subjecte: 'X', valor: 'mort' });
  registrarEsdevenimentEstat(ESTAT._nkg, { capitol: 7, escena: 1, tipus: 'ubicacio', subjecte: 'X', valor: 'lloc' });
  ESTAT._estructuraCapitols = Array.from({ length: 8 }, () => ({}));
  ESTAT._capitols_generats = Array.from({ length: 8 }, () => 'text');
  const fila = checklistSortidaNovella().find(f => /Auditoria determinista/.test(f.nom));
  return { existeix: !!fila, ok: fila && fila.ok, detall: fila && fila.detall };
});
check('El checklist de sortida inclou l\'auditoria determinista', checklist.existeix, '');
check('I es posa en vermell quan hi ha una contradicció demostrable',
  checklist.ok === false, checklist.detall || '');

// ── Les incidències obren fils de reconciliació ────────────────────────────
const fils2 = await page.evaluate(() => {
  ESTAT._contradiccionsTardanes = [];
  ESTAT.llibreRegistre = { capitols: [], estat_personatges: [], fils_oberts: [], fils_tancats: [] };
  const res = executarAuditoriaDeterminista({ totalCapitols: 8, obrirFils: true });
  const primera = (ESTAT._contradiccionsTardanes || []).length;
  executarAuditoriaDeterminista({ totalCapitols: 8, obrirFils: true });   // idempotent?
  return { altes: res.altes, primera, segona: (ESTAT._contradiccionsTardanes || []).length };
});
check('Cada incidència alta obre un fil de reconciliació',
  fils2.primera === fils2.altes && fils2.altes > 0, `${fils2.primera} fils per ${fils2.altes} incidències`);
check('Repetir l\'auditoria no duplica els fils',
  fils2.segona === fils2.primera, `${fils2.primera} → ${fils2.segona}`);

// ── El tancament de bloc executa l'auditoria ───────────────────────────────
const cablejat = await page.evaluate(() =>
  String(tancamentBlocComplet).includes('executarAuditoriaDeterminista'));
check('El tancament de bloc executa l\'auditoria abans del jutge', cablejat, '');

await browser.close();
const fallits = results.filter(r => !r.ok);
console.log(`\n${results.length - fallits.length}/${results.length} comprovacions passades`);
process.exit(fallits.length ? 1 : 0);

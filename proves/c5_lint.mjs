// c5 — Lint de català, en dues capes.
//
// Capa 1 (navegador): llista tancada de castellanismes i anglicismes. Ha de
// detectar el que hi ha a la llista i NO marcar català correcte. El fals
// positiu és el defecte més car: un validador que es queixa d'un text bo
// s'acaba ignorant, i llavors ja no serveix per a res.
//
// Capa 2 (proves): corrector ortogràfic hunspell sobre el text exportat, que és
// el que sí que detecta paraules inventades. Si hunspell no hi és, aquesta capa
// se salta sense fer fallar la suite, però es diu clarament.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { crearComptador } from './ajudes/comprova.mjs';
import { carregarNucliConte } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { CONTE_CORE: C } = carregarNucliConte();

const LLINDAR_PER_MIL = Number(process.env.LLINDAR_PER_MIL || 2);
const DICCIONARI = process.env.DICCIONARI_CA || 'ca_ES';
const contenet = readFileSync(new URL('./ajudes/conte_net.txt', import.meta.url), 'utf8');

// ── Capa 1: el que ha de detectar ────────────────────────────────────────────
const casosPositius = [
  ['bueno', 'Bueno, va dir, ja ho arreglarem demà.'],
  ['entonces', 'Entonces va tancar la porta i va marxar.'],
  ['pero', 'Ho va intentar pero no hi va haver manera.'],
  ['ventanilla', "Es va posar a la cua de la ventanilla del fons."],
  ['despacho', "El despacho del cap era al final del passadís."],
  ['tarjeta', "Va passar la tarjeta pel lector dues vegades."],
  ['palid', 'Tenia la cara palid i les mans fredes.'],
  ['promessa', "Li va fer una promessa que no pensava complir."],
  ['queure', 'Va queure de genolls davant del taulell.'],
  ['a lo millor', 'A lo millor demà ja no hi serà, va pensar.'],
  ['tenir que', "Va tenir que signar tres impresos seguits."]
];
casosPositius.forEach(([forma, frase]) => {
  const r = C.lintCatalaParcial(frase);
  comprova(`detecta el castellanisme «${forma}»`,
    r.troballes.some(t => t.forma === forma), JSON.stringify(r.troballes.map(t => t.forma)));
});

const anglicismes = [
  ['ok', "Va dir que tot estava ok i va penjar."],
  ['OK majúscula', 'Al marge hi havia escrit OK amb bolígraf.'],
  ['sorry', 'Sorry, va dir sense mirar-lo.'],
  ['meeting', "El meeting era a les quatre a la sala del fons."],
  ['feedback', 'No va rebre cap feedback del supervisor.']
];
anglicismes.forEach(([nom, frase]) => {
  comprova(`detecta l'anglicisme de «${nom}»`,
    C.lintCatalaParcial(frase).troballes.some(t => t.tipus === 'anglicisme'),
    JSON.stringify(C.lintCatalaParcial(frase).troballes));
});

comprova('cada troballa del lint porta una cita del text',
  C.lintCatalaParcial('Bueno, entonces va marxar.').troballes.every(t => t.cita && t.cita.length > 0));
comprova('cada castellanisme porta la forma correcta',
  C.lintCatalaParcial('Bueno, va dir.').troballes.every(t => t.correccio && t.correccio.length > 0));

// ── Capa 1: els casos legítims que s'hi assemblen ────────────────────────────
const casosLegitims = [
  ['el conte de mostra sencer', contenet],
  ['paraules catalanes homògrafes del castellà', 'La cara li va canviar. A l\'oficina, la pantalla es va apagar. Ell nada cada matí.'],
  ['substantius acabats en -ment', 'El pagament, el coneixement, el plantejament, el casament i el raonament del moviment.'],
  ['noms propis nord-americans', 'Halloran va parlar amb Devereux i amb Farrow al carrer Bram.'],
  ['una marca inventada amb majúscula', 'La companyia Update Systems tenia la seu al carrer Delham.'],
  ['un topònim anglès', 'Va agafar la Highway 5 en direcció nord.'],
  ['paraules catalanes que comencen igual que un castellanisme', 'El buscador va trobar la peroració i la mancomunitat.'],
  ['diàleg català correcte amb guió llarg', '—Ja s\'ha tramitat —va dir—. No cal tornar-hi.\n—Doncs torni-ho a tramitar.']
];
casosLegitims.forEach(([nom, text]) => {
  const r = C.lintCatalaParcial(text);
  comprova(`NO marca res a ${nom}`, r.troballes.length === 0,
    JSON.stringify(r.troballes.map(t => `${t.forma} (${t.tipus})`)));
});

comprova('«Highway» amb majúscula no es marca però «highway» sí',
  C.lintCatalaParcial('Va agafar la Highway 5.').troballes.length === 0 &&
  C.lintCatalaParcial('Va agafar la highway del nord.').troballes.length === 1);

comprova('el lint es declara PARCIAL sempre', C.lintCatalaParcial(contenet).parcial === true);
comprova('el lint no diu que sigui una comprovació ortogràfica',
  C.lintCatalaParcial('una paraula inventada com esquerdé no la detecta').troballes.length === 0);

// ── Capa 2: hunspell sobre el text exportat ──────────────────────────────────
function hunspellDisponible() {
  try {
    const d = execFileSync('hunspell', ['-D'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return d.includes(DICCIONARI) || d.includes('/ca');
  } catch (e) {
    const err = String((e && e.stderr) || '');
    return err.includes(DICCIONARI) || err.includes('/ca');
  }
}

function analitzarAmbHunspell(text) {
  let sortida = '';
  try {
    sortida = execFileSync('hunspell', ['-i', 'UTF-8', '-d', DICCIONARI, '-l'],
      { input: text, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { sortida = String((e && e.stdout) || ''); }

  const paraules = String(text).split(/\s+/).filter(Boolean);
  const comptador = new Map();
  sortida.split('\n').map(l => l.trim()).filter(Boolean).forEach(p => {
    if (/^[A-ZÀ-Ý]/.test(p)) return; // els noms propis no són faltes
    comptador.set(p.toLowerCase(), (comptador.get(p.toLowerCase()) || 0) + 1);
  });
  const ocurrencies = [...comptador.values()].reduce((a, b) => a + b, 0);
  return {
    total: paraules.length,
    formes: [...comptador.keys()],
    per_mil: Number(((ocurrencies / Math.max(1, paraules.length)) * 1000).toFixed(2))
  };
}

if (hunspellDisponible()) {
  const bo = analitzarAmbHunspell(contenet);
  comprova(`hunspell no marca faltes al conte de mostra (${bo.per_mil}‰)`,
    bo.per_mil <= LLINDAR_PER_MIL, bo.formes.slice(0, 12).join(', '));

  const trencat = 'No va ser un dramat sinó un esquerdé sec, el bord que espartia una línia fina. L\'ascensor estava tympanitzat i hi havia ungulaments de confiança.';
  const dolent = analitzarAmbHunspell(trencat);
  comprova('hunspell detecta les paraules inventades que el lint del navegador no veu',
    dolent.formes.length >= 4, dolent.formes.join(', '));
  comprova('el text inventat supera el llindar', dolent.per_mil > LLINDAR_PER_MIL, `${dolent.per_mil}‰`);
} else {
  console.log(`\nℹ️  hunspell amb el diccionari «${DICCIONARI}» no està instal·lat en aquesta màquina.`);
  console.log('   La capa 2 (corrector ortogràfic complet) se salta sense fer fallar la suite.');
  console.log('   Instal·lació: apt-get install hunspell hunspell-ca\n');
  comprova('la capa 2 s\'ha saltat i s\'ha dit, en lloc de donar-la per feta', true);
}

acabar();

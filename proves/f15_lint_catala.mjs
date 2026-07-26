// Encàrrec 8 de MILLORES_PENDENTS.md — control de qualitat lèxica del català.
//
// El defecte més greu de les generacions amb models fluixos en català era
// lèxic: paraules que no existeixen ("esquerdé", "espartia", "ungulaments",
// "obrefilera", "sanguinitat") i castellanismes ("ensayada", "promessa",
// "manipul·lat", "pálid", "va queure"). Cap jutge basat en LLM les detectava,
// perquè el jutge era el mateix model que les escrivia.
//
// Aquesta prova mesura el defecte amb un corrector ortogràfic, sense gastar
// cap token, i el converteix en un número que es pot seguir entre generacions.
//
// Ús:
//   node proves/f15_lint_catala.mjs                        # només autoprova
//   node proves/f15_lint_catala.mjs capitol.txt            # un text
//   node proves/f15_lint_catala.mjs booki_backup_*.json    # un backup sencer
//
// Variables opcionals:
//   LLINDAR_PER_MIL   paraules inexistents per 1000 admeses (per defecte 2)
//   DICCIONARI_CA     codi del diccionari hunspell (per defecte ca_ES, prova també ca)
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const LLINDAR_PER_MIL = Number(process.env.LLINDAR_PER_MIL || 2);
const DICCIONARI = process.env.DICCIONARI_CA || 'ca_ES';

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

// ── Disponibilitat del corrector ─────────────────────────────────────────────
function hunspellDisponible() {
  try {
    const dicts = execFileSync('hunspell', ['-D'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return dicts.includes(DICCIONARI) || dicts.includes('/ca');
  } catch (e) {
    try {
      // -D escriu a stderr en algunes versions
      const err = String(e.stderr || '');
      return err.includes(DICCIONARI) || err.includes('/ca');
    } catch (_) { return false; }
  }
}

// ── Extracció del text a analitzar ───────────────────────────────────────────
function nomsPropisDelBackup(snapshot) {
  const noms = new Set();
  const nkg = (snapshot && snapshot.estat && snapshot.estat._nkg) || {};
  const afegir = (valor) => {
    String(valor || '').split(/\s+/).filter(t => t.length > 1).forEach(t => noms.add(t.toLowerCase()));
  };
  Object.values(nkg.personatges || {}).forEach(p => afegir(p && p.nom));
  Object.values(nkg.llocs || {}).forEach(l => afegir(l && (l.nom || l.nom_visible)));
  return noms;
}

function carregarEntrada(rutaFitxer) {
  const cru = readFileSync(rutaFitxer, 'utf8');
  if (!rutaFitxer.endsWith('.json')) return { text: cru, nomsPropis: new Set(), origen: 'text' };

  const snapshot = JSON.parse(cru);
  const caps = (snapshot && snapshot.estat && snapshot.estat._capitols_generats) || [];
  const text = caps.filter(Boolean).join('\n\n');
  return { text, nomsPropis: nomsPropisDelBackup(snapshot), origen: `backup (${caps.filter(Boolean).length} capítols)` };
}

// ── Anàlisi ──────────────────────────────────────────────────────────────────
function analitzarCatala(text, nomsPropis = new Set()) {
  const paraules = String(text).split(/\s+/).filter(Boolean);
  const total = paraules.length;
  if (total === 0) return { total: 0, inexistents: [], perMil: 0 };

  // hunspell -l llista només les paraules que no reconeix, una per línia.
  // -i UTF-8 és imprescindible: sense això hunspell interpreta el text com a
  // latin-1 i parteix les paraules accentuades ("irònic" → "ir" + "nic"),
  // cosa que produeix una allau de falsos positius en català.
  let sortida = '';
  try {
    sortida = execFileSync('hunspell', ['-i', 'UTF-8', '-d', DICCIONARI, '-l'], {
      input: text, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
    });
  } catch (e) {
    sortida = String((e && e.stdout) || '');
  }

  const comptador = new Map();
  sortida.split('\n').map(l => l.trim()).filter(Boolean).forEach(p => {
    const net = p.toLowerCase();
    // Els noms propis del projecte no són faltes.
    if (nomsPropis.has(net)) return;
    // Una paraula que comença en majúscula i no és inici de frase sol ser nom propi.
    if (/^[A-ZÀ-Ý]/.test(p)) return;
    comptador.set(net, (comptador.get(net) || 0) + 1);
  });

  const inexistents = [...comptador.entries()]
    .map(([paraula, n]) => ({ paraula, n }))
    .sort((a, b) => b.n - a.n);

  const ocurrencies = inexistents.reduce((acc, x) => acc + x.n, 0);
  return { total, inexistents, ocurrencies, perMil: Number(((ocurrencies / total) * 1000).toFixed(2)) };
}

// ── Execució ─────────────────────────────────────────────────────────────────
const disponible = hunspellDisponible();

if (!disponible) {
  console.log(`⚠️  hunspell amb el diccionari «${DICCIONARI}» no està disponible.`);
  console.log('   Instal·lació: apt-get install hunspell hunspell-ca  ·  brew install hunspell + diccionari ca');
  console.log('   La prova se salta sense fallar.\n');
  console.log('0/0 comprovacions passades');
  process.exit(0);
}

// Autoprova: el mesurador ha de saber distingir català correcte de català inventat.
const mostraCorrecta = 'La tassa va caure quan va obrir l\'aixeta. El soroll es va quedar entre la cuina i l\'escala, com si el pis hagués fet un comentari irònic.';
const mostraTrencada = 'No va ser un dramat sinó un esquerdé sec, el bord que espartia una línia fina. L\'ascensor estava tympanitzat i hi havia ungulaments de confiança.';

const bona = analitzarCatala(mostraCorrecta);
const dolenta = analitzarCatala(mostraTrencada);

comprova('El mesurador no marca faltes en català correcte',
  bona.perMil <= LLINDAR_PER_MIL, `${bona.perMil}‰ · ${bona.inexistents.map(x => x.paraula).join(', ')}`);
comprova('El mesurador detecta les paraules inventades',
  dolenta.inexistents.length >= 4,
  `${dolenta.inexistents.length} detectades: ${dolenta.inexistents.map(x => x.paraula).join(', ')}`);
comprova('El text trencat supera el llindar', dolenta.perMil > LLINDAR_PER_MIL, `${dolenta.perMil}‰`);

// Anàlisi del fitxer que passi l'usuari
const ruta = process.argv[2];
if (ruta) {
  if (!existsSync(ruta)) {
    console.error(`\n❌ No s'ha trobat el fitxer: ${ruta}`);
    process.exit(1);
  }
  const { text, nomsPropis, origen } = carregarEntrada(ruta);
  const res = analitzarCatala(text, nomsPropis);

  console.log(`\n── ${ruta} (${origen}) ──`);
  console.log(`Paraules analitzades: ${res.total.toLocaleString()}`);
  console.log(`Paraules inexistents: ${res.ocurrencies} (${res.inexistents.length} formes diferents)`);
  console.log(`Ràtio: ${res.perMil}‰  ·  llindar: ${LLINDAR_PER_MIL}‰`);
  if (res.inexistents.length > 0) {
    console.log('\nMés freqüents:');
    res.inexistents.slice(0, 25).forEach(x => console.log(`  ${String(x.n).padStart(4)} × ${x.paraula}`));
  }
  console.log('');
  comprova(`El text es manté per sota de ${LLINDAR_PER_MIL}‰ de paraules inexistents`,
    res.perMil <= LLINDAR_PER_MIL, `${res.perMil}‰`);
} else {
  console.log('\nℹ️  Sense fitxer: només s\'ha executat l\'autoprova del mesurador.');
  console.log('   Ús: node proves/f15_lint_catala.mjs <capitol.txt | booki_backup_*.json>');
}

console.log(`\n${passades}/${totals} comprovacions passades`);
process.exit(passades === totals ? 0 : 1);

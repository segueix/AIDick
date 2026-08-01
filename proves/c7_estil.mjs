// c7 — Separació entre generar i avaluar.
//
// La regla és una i és la més fàcil de trencar sense adonar-se'n: cap cadena de
// criteris_avaluacio_conte pot arribar a un prompt de generació. Si un criteri
// d'avaluació hi arriba, l'examen mesura el seu propi enunciat i el veredicte
// deixa de valdre.
//
// El camí invers també importa: criteris_excellencia_conte SÍ que ha d'arribar
// al prompt de redacció; si no hi arriba, l'estil PKD no s'aplica i el conte
// surt genèric.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';
import { carregarNucliConte, llegirGlobal, llegirFitxer } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { PERFILS_AUTOR: P } = carregarNucliConte();

// ── El perfil ────────────────────────────────────────────────────────────────
comprova('el perfil dick té el subobjecte conte', !!P.dick.conte);
comprova('conte porta forma, obertura, desenllac i les dues llistes',
  ['forma', 'obertura', 'desenllac', 'criteris_excellencia_conte', 'criteris_avaluacio_conte']
    .every(k => P.dick.conte[k]));
comprova('els camps originals del perfil dick són intactes',
  ['estil', 'regles_dures', 'prosa', 'exposicio', 'emocio', 'intensitat', 'humanitzacio',
   'criteris_avaluacio', 'criteris_excellencia', 'ambientacio', 'prefill', 'deteccio'].every(k => P.dick[k]));
comprova('la regex de detecció de dick no ha canviat',
  String(P.dick.deteccio) === String(/philip\s*k\.?\s*dick|philip\s+dick|\bdick\b/i));
comprova('els altres tres perfils segueixen sencers',
  ['larsson', 'tolkien', 'castaneda'].every(id => P[id] && P[id].estil && P[id].criteris_excellencia));
comprova('dick és el perfil per defecte', llegirGlobal('PERFIL_AUTOR_PER_DEFECTE') === 'dick');
comprova('cap criteri apareix a les dues llistes alhora',
  !P.dick.conte.criteris_excellencia_conte.some(x => P.dick.conte.criteris_avaluacio_conte.includes(x)));
comprova('els accessors de generació i d\'avaluació són funcions diferents',
  llegirGlobal('criterisExcellenciaConte') !== llegirGlobal('criterisAvaluacioConte'));

// ── Anàlisi estàtica del codi de l'app ───────────────────────────────────────
const app = llegirFitxer('index.html');
comprova('criterisAvaluacioConte només es crida des de blocSistemaLectura',
  (app.match(/criterisAvaluacioConte\(/g) || []).length === 1 &&
  /function blocSistemaLectura[\s\S]{0,600}criterisAvaluacioConte\(/.test(app),
  String((app.match(/criterisAvaluacioConte\(/g) || []).length) + ' crides');
comprova('blocSistemaGeneracio no menciona mai criterisAvaluacioConte',
  !/function blocSistemaGeneracio[\s\S]*?\n}/.exec(app)[0].includes('criterisAvaluacioConte'));
// Es compten els punts de CRIDA, descartant la definició de la funció.
const cridesLectura = (app.match(/blocSistemaLectura\(\)/g) || []).length
  - (app.match(/function\s+blocSistemaLectura\(\)/g) || []).length;
comprova('blocSistemaLectura només es crida des d\'un lloc', cridesLectura === 1, `${cridesLectura} crides`);
comprova('l\'únic lloc que la crida és el pas de lectura hostil',
  /async function lecturaHostil\([\s\S]{0,800}blocSistemaLectura\(\)/.test(app));

// ── Els prompts muntats de debò, no el codi que els munta ────────────────────
const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();
const { pagina } = await obrirApp(navegador);
await activarDemo(pagina);
await recorrerFins(pagina, 4);

const prompts = await pagina.evaluate(() => ({
  llavor: { sistema: blocSistemaGeneracio({ forma: true }), usuari: promptLlavors(CONTE_CORE.triarMotius([], 3)) },
  dossier: { sistema: blocSistemaGeneracio({ forma: true }), usuari: promptDossier() },
  escaleta: { sistema: blocSistemaGeneracio({ forma: true, obertura: true, desenllac: true }), usuari: promptEscaleta() },
  escena: { sistema: blocSistemaGeneracio({ prosa: true, forma: true, excellencia: true }), usuari: promptEscena(0) },
  escenaFinal: { sistema: blocSistemaGeneracio({ prosa: true, forma: true, excellencia: true }), usuari: promptEscena(ESTAT_CONTE.escaleta.escenes.length - 1) },
  costura: { sistema: blocSistemaGeneracio({ corrector: true, forma: false }), usuari: promptCosturaEstil(textActual()) },
  lectura: { sistema: blocSistemaLectura(), usuari: promptLectura(textActual()) }
}));

const avaluacio = P.dick.conte.criteris_avaluacio_conte;
const excellencia = P.dick.conte.criteris_excellencia_conte;

['llavor', 'dossier', 'escaleta', 'escena', 'escenaFinal', 'costura'].forEach(pas => {
  const sencer = prompts[pas].sistema + '\n' + prompts[pas].usuari;
  const filtrats = avaluacio.filter(c => sencer.includes(c));
  comprova(`cap criteri d'avaluació arriba al prompt de ${pas}`,
    filtrats.length === 0, filtrats.join(' | '));
});

// Els criteris d'avaluació són preguntes; que no n'hi arribi ni el fragment.
['llavor', 'dossier', 'escaleta', 'escena', 'costura'].forEach(pas => {
  const sencer = prompts[pas].sistema + '\n' + prompts[pas].usuari;
  const fragments = avaluacio.map(c => c.split(/[,?]/)[0].trim()).filter(f => f.length > 25);
  const trobats = fragments.filter(f => sencer.includes(f));
  comprova(`ni un fragment llarg d'un criteri d'avaluació apareix al prompt de ${pas}`,
    trobats.length === 0, trobats.join(' | '));
});

comprova('els criteris d\'avaluació SÍ que arriben al prompt de lectura',
  avaluacio.every(c => prompts.lectura.sistema.includes(c)));
comprova('els criteris d\'excel·lència arriben al prompt de redacció',
  excellencia.every(c => prompts.escena.sistema.includes(c)),
  excellencia.filter(c => !prompts.escena.sistema.includes(c)).join(' | '));
comprova('els criteris d\'excel·lència NO arriben al prompt de lectura',
  !excellencia.some(c => prompts.lectura.sistema.includes(c)));

// ── El contingut dels prompts de redacció ────────────────────────────────────
comprova('el prompt d\'escena porta la forma del conte PKD',
  prompts.escena.sistema.includes(P.dick.conte.forma.slice(0, 60)));
comprova('la primera escena rep les regles d\'obertura',
  prompts.escena.usuari.includes(P.dick.conte.obertura.slice(0, 50)));
comprova('l\'última escena rep les regles de desenllaç i el final obligatori',
  prompts.escenaFinal.usuari.includes(P.dick.conte.desenllac.slice(0, 50)) &&
  prompts.escenaFinal.usuari.includes('final obligatori'));
comprova('la primera escena NO rep les regles de desenllaç',
  !prompts.escena.usuari.includes(P.dick.conte.desenllac.slice(0, 50)));
comprova('el prompt d\'escena demana la longitud en CARÀCTERS',
  /\d+ CARÀCTERS amb espais/.test(prompts.escena.usuari) && prompts.escena.usuari.includes('No comptis paraules'));
comprova('el prompt d\'escena imposa el guió llarg com a format únic',
  prompts.escena.usuari.includes('guió llarg'));
comprova('el prompt d\'escena prohibeix l\'anglès i el castellà',
  prompts.escena.usuari.includes('Cap paraula en anglès ni en castellà'));
comprova('el prompt d\'escena porta el dossier i el contracte',
  prompts.escena.usuari.includes('DOSSIER DEL CONTE') && prompts.escena.usuari.includes("CONTRACTE D'AQUESTA ESCENA"));
comprova('el prompt de llavors prohibeix els tòpics de l\'obra de Dick',
  prompts.llavor.usuari.includes('Deckard') && prompts.llavor.usuari.includes('Ubik'));
comprova('el prompt de llavors porta el clixé a esquivar de cada motiu',
  prompts.llavor.usuari.includes("Clixé que has d'esquivar"));
comprova('la directiva de llengua és a tots els prompts de sistema',
  ['llavor', 'dossier', 'escaleta', 'escena', 'costura', 'lectura']
    .every(p => prompts[p].sistema.includes('EXCLUSIVAMENT en català')));
comprova('el prompt de lectura prohibeix posar nota, resumir i elogiar',
  /PROHIBIT[\s\S]*nota[\s\S]*resumir[\s\S]*elogiar/.test(prompts.lectura.sistema));
comprova('el prompt de lectura exigeix cita literal a cada defecte',
  prompts.lectura.usuari.includes('fragment LITERAL'));

// ── L'entrada de les escenes no creix amb la longitud del conte ─────────────
const midaPrompts = await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes.map((_, i) => promptEscena(i).length));
const creixement = midaPrompts[midaPrompts.length - 1] - midaPrompts[0];
comprova('el prompt de l\'última escena no és gaire més gran que el de la primera',
  creixement < 3000, `${midaPrompts[0]} → ${midaPrompts[midaPrompts.length - 1]} (+${creixement})`);
comprova('cap prompt d\'escena porta el text sencer de les escenes anteriors',
  await pagina.evaluate(() => {
    const anterior = ESTAT_CONTE.escenes_text[0];
    return anterior.length > 500 && !promptEscena(1).includes(anterior);
  }));
comprova('el prompt d\'escena porta com a molt els últims 400 caràcters escrits',
  await pagina.evaluate(() => {
    const p = promptEscena(2);
    const m = p.match(/«…([\s\S]*?)»/);
    return !!m && m[1].length <= 400;
  }));

await navegador.close();
acabar();

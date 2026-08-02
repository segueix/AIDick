// c1 — conte_core.js amb node sol, sense navegador.
// Repartiment de caràcters, validació del dossier, contractes, fallback local,
// aplicarPedacos amb tots els casos de rebuig i banc de motius sense repeticions.
import { readFileSync } from 'node:fs';
import { crearComptador } from './ajudes/comprova.mjs';
import { carregarNucliConte } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { CONTE_CORE: C } = carregarNucliConte();

// ── Recompte de caràcters ────────────────────────────────────────────────────
comprova('comptaCaracters normalitza els finals de línia de Windows',
  C.comptaCaracters('una\r\nlínia') === C.comptaCaracters('una\nlínia'));
comprova('comptaCaracters elimina els espais al final de línia',
  C.comptaCaracters('una   \nlínia') === C.comptaCaracters('una\nlínia'));
comprova('comptaCaracters redueix els salts múltiples a un de sol',
  C.comptaCaracters('a\n\n\n\nb') === 3, String(C.comptaCaracters('a\n\n\n\nb')));
comprova('comptaCaracters és reproduïble entre execucions',
  C.comptaCaracters('El text\r\n\r\namb   \nsalts.') === C.comptaCaracters('El text\r\n\r\namb   \nsalts.'));
comprova('comptaCaracters compta espais interiors',
  C.comptaCaracters('a b c') === 5);

// ── Repartiment ──────────────────────────────────────────────────────────────
[4, 5, 6].forEach(n => {
  const r = C.repartirCaracters(C.CONTE_OBJECTIU_CARACTERS, n);
  comprova(`repartirCaracters amb ${n} escenes suma exactament l'objectiu`,
    r.reduce((a, b) => a + b, 0) === C.CONTE_OBJECTIU_CARACTERS,
    `${r.reduce((a, b) => a + b, 0)} · ${JSON.stringify(r)}`);
});
const desiguals = C.repartirCaracters(17500, 5, [1, 1.25, 1, 1, 1.15]);
comprova('repartirCaracters amb pesos desiguals també quadra',
  desiguals.reduce((a, b) => a + b, 0) === 17500, JSON.stringify(desiguals));
comprova('els pesos desiguals produeixen escenes de mides diferents',
  new Set(desiguals).size > 1, JSON.stringify(desiguals));
comprova('repartirCaracters no torna mai una escena a zero',
  C.repartirCaracters(100, 6).every(x => x >= 1), JSON.stringify(C.repartirCaracters(100, 6)));
comprova('pesosPerEscenes dona més pes a l\'esquerda i a la final',
  (() => {
    const p = C.pesosPerEscenes([{ funcio_pkd: 'cap' }, { funcio_pkd: 'esquerda' }, { funcio_pkd: 'cap' }]);
    return p[1] > p[0] && p[2] > p[0];
  })());

// ── Dossier ──────────────────────────────────────────────────────────────────
const dossierValid = {
  premissa: 'Un imprès duplicat amb el mateix número de sèrie',
  anomalia: 'El registre manté actives fitxes de morts perquè no n\'ha tornat mai cap carta',
  anomalia_justificacio: 'No és cap entorn fals: és un procediment correcte aplicat divuit anys',
  final_obligatori: 'Rep l\'imprès que faltava signat amb la seva lletra',
  esquerda: 'El registre decideix qui existeix',
  mentida_del_sistema: 'El llibre diu un exemplar i n\'hi ha dos',
  cost_empatia: 'Retirar la fitxa el delata',
  protagonista: {
    nom: 'Peter Halloran', feina_ordinaria: 'Auxiliar de cens', ferida: 'Va signar els papers de la seva germana',
    objectiu_extern: 'Tancar el duplicat', secret: 'Guarda expedients que no li toquen',
    problemes_quotidians: ['Deu quatre mensualitats del dentista', 'El veí de sobre fa saltar el diferencial'],
    veu: { registre: 'Sec i procedimental', mai_diria: ['El sistema té raó', 'No vull saber-ho', 'No és cosa meva'] }
  },
  secundaris: [{ nom: 'Devereux', funcio: 'Arxiver', vol: 'Que ningú toqui el seu ordre', amaga: 'Les fitxes antigues' }],
  mon: { lloc: 'Departament de cens', any: '2043', deteriorament: ['a1', 'b2', 'c3'], objectes_consum_defectuosos: ['d4', 'e5'] },
  objectes_clau: [],
  fets_canonics: ['El número de sèrie és 412', 'El lligall salta del 412 al 414'],
  cronologia: [{ quan: 'Dilluns', que: 'Troba el duplicat' }],
  motius_triats: []
};

comprova('un dossier complet passa la validació',
  C.validarDossier(dossierValid).valid, JSON.stringify(C.validarDossier(dossierValid).faltants));
comprova('un dossier buit no passa la validació',
  !C.validarDossier(C.crearDossierBuit()).valid);
comprova('cada faltant porta camp, motiu i com_resoldre',
  C.validarDossier(C.crearDossierBuit()).faltants.every(f => f.camp && f.motiu && f.com_resoldre));
comprova('"per determinar" no compta com a valor',
  !C.validarDossier(Object.assign({}, dossierValid, { premissa: 'per determinar' })).valid);
comprova('menys de 3 frases a mai_diria bloqueja', (() => {
  const d = JSON.parse(JSON.stringify(dossierValid));
  d.protagonista.veu.mai_diria = ['una', 'dues'];
  return !C.validarDossier(d).valid;
})());

// ── Anomalia única i vida quotidiana ─────────────────────────────────────────
// Cada comprovació nova porta el cas que ha de detectar i el cas legítim que
// s'hi assembla: un validador que es queixa de material correcte és pitjor que
// no tenir-lo.
comprova('un dossier sense anomalia bloqueja i diu com resoldre-ho', (() => {
  const d = JSON.parse(JSON.stringify(dossierValid));
  d.anomalia = '';
  const v = C.validarDossier(d);
  return !v.valid && v.faltants.some(f => f.camp === 'anomalia' && f.com_resoldre);
})());
comprova('un dossier amb anomalia i justificació buida NO bloqueja', (() => {
  const d = JSON.parse(JSON.stringify(dossierValid));
  d.anomalia_justificacio = '';
  return C.validarDossier(d).valid;
})());
comprova('un sol problema quotidià bloqueja', (() => {
  const d = JSON.parse(JSON.stringify(dossierValid));
  d.protagonista.problemes_quotidians = ['Deu quatre mensualitats del dentista'];
  return !C.validarDossier(d).valid;
})());
comprova('tres problemes quotidians també bloquegen: n\'han de ser exactament dos', (() => {
  const d = JSON.parse(JSON.stringify(dossierValid));
  d.protagonista.problemes_quotidians = ['un problema llarg', 'un altre problema llarg', 'un tercer problema'];
  const v = C.validarDossier(d);
  return !v.valid && v.faltants.some(f => f.camp === 'protagonista.problemes_quotidians');
})());
comprova('exactament dos problemes quotidians passen', C.validarDossier(dossierValid).valid);

// ── Títol ────────────────────────────────────────────────────────────────────
comprova('un títol conceptual d\'una a quatre paraules és vàlid',
  C.validarTitolConte('Fil de cosit', dossierValid).valid &&
  C.validarTitolConte('Consta', dossierValid).valid);
comprova('el patró nom + ofici es rebutja pel seu nom',
  !C.validarTitolConte('Peter Halloran auxiliar de cens', dossierValid).valid);
comprova('el nom del protagonista SOL no invalida el títol',
  C.validarTitolConte('El cas Halloran', dossierValid).valid,
  C.validarTitolConte('El cas Halloran', dossierValid).motiu);
comprova('l\'ofici SOL tampoc invalida el títol',
  C.validarTitolConte('Cens residencial', dossierValid).valid,
  C.validarTitolConte('Cens residencial', dossierValid).motiu);
comprova('més de quatre paraules es rebutja',
  !C.validarTitolConte('Denise Holloway telefonista nocturna d\'una asseguradora', dossierValid).valid);
comprova('un títol amb coma es rebutja',
  !C.validarTitolConte('Halloran, cens', dossierValid).valid);
comprova('un títol buit es rebutja i porta com_resoldre',
  !C.validarTitolConte('', dossierValid).valid && !!C.validarTitolConte('', dossierValid).com_resoldre);
comprova('tot rebuig de títol porta motiu i com_resoldre',
  ['', 'Halloran, cens', 'una descripció massa llarga per ser un títol de conte']
    .every(t => { const v = C.validarTitolConte(t, dossierValid); return v.valid || (v.motiu && v.com_resoldre); }));

// ── Fusió que no buida (mode de fallada b) ───────────────────────────────────
const fusionat = C.fusionarDossierSenseBuidar(dossierValid, { esquerda: 'Text nou', mon: { any: '2051' } });
comprova('una compleció parcial no esborra cap camp previ',
  fusionat.premissa === dossierValid.premissa &&
  fusionat.protagonista.nom === 'Peter Halloran' &&
  fusionat.mon.lloc === 'Departament de cens' &&
  fusionat.fets_canonics.length === 2, JSON.stringify(fusionat).slice(0, 200));
comprova('una compleció parcial sí que escriu el que porta',
  fusionat.esquerda === 'Text nou' && fusionat.mon.any === '2051');
comprova('un valor buit entrant no pot esborrar un valor existent',
  C.fusionarDossierSenseBuidar(dossierValid, { premissa: '', secundaris: [] }).premissa === dossierValid.premissa &&
  C.fusionarDossierSenseBuidar(dossierValid, { premissa: '', secundaris: [] }).secundaris.length === 1);
comprova('un null entrant tampoc esborra res',
  C.fusionarDossierSenseBuidar(dossierValid, { premissa: null, mon: null }).mon.lloc === 'Departament de cens');

// ── Contractes ───────────────────────────────────────────────────────────────
const contracteComplet = C.crearContracteEscena(0, {
  pov: 'Halloran', lloc: 'Oficina', present: ['Halloran'], objectiu_pov: 'Tancar el duplicat',
  obstacle: 'El llibre diu que només n\'hi ha un', objecte_o_informacio_en_disputa: 'Els dos B-14',
  decisio_irreversible: 'Els guarda', cost_immediat: 'Té una prova a la taula',
  consequencia: 'Ja no pot dir que no ho sabia', caracters_objectiu: 3500, funcio_pkd: 'mentida'
});
comprova('un contracte complet no té faltants',
  C.detectarFaltantsContracte(contracteComplet).length === 0,
  JSON.stringify(C.detectarFaltantsContracte(contracteComplet)));
comprova('un contracte buit té faltants a tots els camps',
  C.detectarFaltantsContracte(C.crearContracteEscena(0, {})).length >= 10);
comprova('una funcio_pkd desconeguda es normalitza a "cap"',
  C.crearContracteEscena(0, { funcio_pkd: 'inventada' }).funcio_pkd === 'cap');

// ── Escena de la ferida ──────────────────────────────────────────────────────
comprova('escena_ferida és false si el model no la declara',
  C.crearContracteEscena(0, {}).escena_ferida === false);
comprova('escena_ferida només és true amb el booleà true, mai amb una cadena',
  C.crearContracteEscena(0, { escena_ferida: true }).escena_ferida === true &&
  C.crearContracteEscena(0, { escena_ferida: 'sí' }).escena_ferida === false);
comprova('indexEscenaFerida troba l\'escena marcada',
  C.indexEscenaFerida([{ escena_ferida: false }, { escena_ferida: true }, {}]) === 1);
comprova('indexEscenaFerida torna -1 si no n\'hi ha cap',
  C.indexEscenaFerida([{ escena_ferida: false }, {}]) === -1);
comprova('el fallback local no pot declarar l\'escena de la ferida',
  C.contracteFallbackLocal(0, dossierValid, 3500).escena_ferida === false);

// ── Criteris de revisió lingüística ──────────────────────────────────────────
comprova('CRITERIS_LLENGUA_REVISIO porta els tres controls de llengua',
  C.CRITERIS_LLENGUA_REVISIO.length === 3 &&
  C.CRITERIS_LLENGUA_REVISIO.every(c => c.id && c.criteri && c.exemple));
comprova('els criteris de llengua cobreixen verbs inventats, tractament i designació',
  ['verbs_inventats', 'tractament', 'designacio_objectes']
    .every(id => C.CRITERIS_LLENGUA_REVISIO.some(c => c.id === id)));

// ── Fallback local (mode de fallada c) ───────────────────────────────────────
[dossierValid, {}, C.crearDossierBuit()].forEach((d, i) => {
  const fb = C.contracteFallbackLocal(i, d, 3500);
  comprova(`el fallback local és complet amb el dossier ${i + 1}`,
    C.detectarFaltantsContracte(fb).length === 0, JSON.stringify(C.detectarFaltantsContracte(fb)));
});
comprova('el fallback local mai assigna una funció PKD',
  [dossierValid, {}].every(d => C.contracteFallbackLocal(0, d, 3500).funcio_pkd === 'cap'));
const compl = C.completarContracteAmbFallback(
  { index: 2, pov: 'Halloran', objectiu_pov: 'Tancar el tràmit', funcio_pkd: 'esquerda' }, dossierValid, 3500);
comprova('completar un contracte parcial el deixa complet',
  C.detectarFaltantsContracte(compl.contracte).length === 0);
comprova('completar un contracte conserva el que ja tenia',
  compl.contracte.pov === 'Halloran' && compl.contracte.objectiu_pov === 'Tancar el tràmit' &&
  compl.contracte.funcio_pkd === 'esquerda');
comprova('completar reporta quins camps ha hagut de tapar',
  compl.camps_omplerts.length > 0 && compl.camps_omplerts.includes('obstacle'));

// ── aplicarPedacos ───────────────────────────────────────────────────────────
const base = 'Alfa beta gamma. El sobre era damunt la taula. Delta epsilon zeta. El sobre era damunt la taula. Omega final.';

let r = C.aplicarPedacos(base, [{ cerca: 'El sobre era damunt la taula.', substitueix: 'X.', motiu: 'tic' }]);
comprova('un cerca duplicat es rebutja i el text queda intacte',
  r.rebutjats.length === 1 && r.aplicats.length === 0 && r.text === base);
comprova('el rebuig per duplicat diu quantes vegades apareix',
  /apareix 2 vegades/.test(r.rebutjats[0].motiu), r.rebutjats[0].motiu);

r = C.aplicarPedacos(base, [{ cerca: 'FRAGMENT INEXISTENT', substitueix: 'x', motiu: 'tic' }]);
comprova('un cerca inexistent es rebutja', r.rebutjats.length === 1 && r.text === base);
comprova('el rebuig per inexistència ho explica',
  /no apareix al text/.test(r.rebutjats[0].motiu), r.rebutjats[0].motiu);

r = C.aplicarPedacos(base, [{ cerca: 'Delta epsilon zeta.', substitueix: 'Delta epsilon eta.', motiu: 'tic' }]);
comprova('un canvi de longitud semblant s\'aplica', r.aplicats.length === 1 && r.text.includes('Delta epsilon eta.'));

const llarg = 'Delta epsilon zeta, i molt més text afegit que allarga això molt per sobre del vint-i-cinc per cent permès.';
r = C.aplicarPedacos(base, [{ cerca: 'Delta epsilon zeta.', substitueix: llarg, motiu: 'tic' }]);
comprova('allargar un 300% sense motiu es rebutja', r.rebutjats.length === 1 && r.text === base);
r = C.aplicarPedacos(base, [{ cerca: 'Delta epsilon zeta.', substitueix: llarg, motiu: 'expansio' }]);
comprova('allargar un 300% amb motiu "expansio" s\'aplica', r.aplicats.length === 1);
r = C.aplicarPedacos(base, [{ cerca: 'Delta epsilon zeta.', substitueix: 'Delta.', motiu: 'retall' }]);
comprova('escurçar amb motiu "retall" s\'aplica', r.aplicats.length === 1);

const ambParagrafs = 'Primer paràgraf sencer.\n\nSegon paràgraf sencer.\n\nTercer paràgraf.';
r = C.aplicarPedacos(ambParagrafs, [{ cerca: 'Segon paràgraf sencer.', substitueix: '', motiu: 'retall' }]);
comprova('buidar un paràgraf sencer es rebutja', r.rebutjats.length === 1 && r.text === ambParagrafs);

r = C.aplicarPedacos(base, [
  { cerca: 'FRAGMENT INEXISTENT', substitueix: 'x', motiu: 'tic' },
  { cerca: 'Alfa beta gamma.', substitueix: 'Alfa beta gama.', motiu: 'tic' }
]);
comprova('un lot amb un pedaç dolent aplica la resta',
  r.aplicats.length === 1 && r.rebutjats.length === 1 && r.text.includes('Alfa beta gama.'));

let capExcepcio = true;
[[null, null], [undefined, [{}]], ['text', [{ cerca: null }]], ['text', [null]],
 ['t', [{ cerca: 't', substitueix: null }]], [123, [{ cerca: '2', substitueix: '3' }]],
 ['x', 'no és un array']].forEach(([tx, pd]) => {
  try { C.aplicarPedacos(tx, pd); } catch (e) { capExcepcio = false; }
});
comprova('aplicarPedacos no llança mai cap excepció', capExcepcio);

// ── Porta PKD ────────────────────────────────────────────────────────────────
comprova('una escaleta amb esquerda, mentida i empatia passa la porta',
  C.validarGatePKD([{ funcio_pkd: 'esquerda' }, { funcio_pkd: 'mentida' }, { funcio_pkd: 'empatia' }]).valid);
const senseEmpatia = C.validarGatePKD([{ funcio_pkd: 'esquerda' }, { funcio_pkd: 'mentida' }, { funcio_pkd: 'paranoia' }]);
comprova('sense empatia la porta bloqueja', !senseEmpatia.valid && senseEmpatia.faltants[0].funcio === 'empatia');
comprova('el faltant de la porta porta com_resoldre', !!senseEmpatia.faltants[0].com_resoldre);
comprova('la paranoia avisa però no bloqueja',
  C.validarGatePKD([{ funcio_pkd: 'esquerda' }, { funcio_pkd: 'mentida' }, { funcio_pkd: 'empatia' }]).avis_paranoia.length > 0);

// ── Banc de motius ───────────────────────────────────────────────────────────
comprova('BANC_MOTIUS_PKD té exactament 30 entrades', C.BANC_MOTIUS_PKD.length === 30, String(C.BANC_MOTIUS_PKD.length));
comprova('els ids dels motius són únics', new Set(C.BANC_MOTIUS_PKD.map(m => m.id)).size === 30);
comprova('tots els motius tenen motiu, tensió i evita',
  C.BANC_MOTIUS_PKD.every(m => m.motiu && m.tensio && m.evita));
comprova('cap "evita" és genèric',
  C.BANC_MOTIUS_PKD.every(m => m.evita.split(/\s+/).length >= 8 && !/^evita\s+(els\s+)?clix/i.test(m.evita)),
  C.BANC_MOTIUS_PKD.filter(m => m.evita.split(/\s+/).length < 8).map(m => m.id).join(', '));
comprova('cada "tensió" és una pregunta', C.BANC_MOTIUS_PKD.every(m => m.tensio.includes('?')));
comprova('TOPICS_PROHIBITS cobreix l\'obra i les adaptacions',
  ['Deckard', 'Ubik', 'replicant', 'Rekal', 'Precrim'].every(x => C.TOPICS_PROHIBITS.includes(x)));

// ── Mecanismes vetats ────────────────────────────────────────────────────────
// TOPICS_PROHIBITS prohibeix noms; MOTIUS_VETATS prohibeix mecanismes, que és
// el que es reproduïa disfressat amb un altre vocabulari.
comprova('MOTIUS_VETATS té les vuit categories', C.MOTIUS_VETATS.length === 8, String(C.MOTIUS_VETATS.length));
comprova('cada motiu vetat porta id, mecanisme i disfressa',
  C.MOTIUS_VETATS.every(m => m.id && m.mecanisme && m.disfressa));
comprova('els vuit mecanismes vetats hi són pel seu nom',
  ['entropia_regressiva', 'precrim', 'entorn_fals', 'aparell_que_cobra',
   'records_comprats', 'simulacre_que_dubta', 'droga_que_obre_realitats', 'entitat_gravada']
    .every(id => C.MOTIUS_VETATS.some(m => m.id === id)));
comprova('cada vetat_per del banc apunta a un mecanisme que existeix',
  C.BANC_MOTIUS_PKD.filter(m => m.vetat_per).every(m => C.MOTIUS_VETATS.some(v => v.id === m.vetat_per)),
  C.BANC_MOTIUS_PKD.filter(m => m.vetat_per && !C.MOTIUS_VETATS.some(v => v.id === m.vetat_per)).map(m => m.id).join(', '));
comprova('sis motius del banc queden vetats i vint-i-quatre disponibles',
  C.BANC_MOTIUS_PKD.filter(m => m.vetat_per).length === 6 && C.motiusDisponibles().length === 24,
  `${C.motiusDisponibles().length} disponibles`);
comprova('triarMotius no proposa mai un motiu vetat',
  C.triarMotius([], 3).every(m => !m.vetat_per) &&
  C.triarMotius(C.BANC_MOTIUS_PKD.map(m => m.id), 3).every(m => !m.vetat_per));
comprova('el motiu de la premissa analitzada (indemnització abans del sinistre) és vetat',
  !!C.BANC_MOTIUS_PKD.find(m => m.id === 'assegurança_predictiva').vetat_per);

// Vuit generacions seguides sense repetir cap motiu: 24 disponibles / 3 per conte.
let usats = [];
const combinacions = [];
for (let i = 0; i < 8; i++) {
  const tria = C.triarMotius(usats, 3);
  combinacions.push(tria.map(m => m.id));
  usats = usats.concat(tria.map(m => m.id));
}
const totsElsDisponibles = combinacions.flat();
comprova('vuit generacions seguides gasten els 24 motius disponibles sense repetir-ne cap',
  totsElsDisponibles.length === 24 && new Set(totsElsDisponibles).size === 24,
  `${new Set(totsElsDisponibles).size} únics de ${totsElsDisponibles.length}`);
comprova('cada generació dona una combinació diferent de l\'anterior',
  combinacions.every((c, i) => i === 0 || c.some(id => !combinacions[i - 1].includes(id))));
comprova('triarMotius és determinista amb el mateix estat',
  JSON.stringify(C.triarMotius(['precognicio_administrativa'], 3)) === JSON.stringify(C.triarMotius(['precognicio_administrativa'], 3)));
comprova('esgotat el banc, triarMotius recicla els menys recents sense petar',
  C.triarMotius(C.BANC_MOTIUS_PKD.map(m => m.id), 3).length === 3);

// ── Auditoria sobre text correcte (el fals positiu és el defecte més car) ────
const contenet = readFileSync(new URL('./ajudes/conte_net.txt', import.meta.url), 'utf8');
const dossierNet = JSON.parse(JSON.stringify(dossierValid));
dossierNet.secundaris = [{ nom: 'Devereux', funcio: 'Arxiver', vol: 'x', amaga: 'y' }];
const auditoria = C.auditoriaDeterministaConte(contenet, [], dossierNet);
const altes = auditoria.problemes.filter(p => p.severitat === 'alta');
comprova('un conte català correcte no genera cap problema d\'alta severitat',
  altes.length === 0, JSON.stringify(altes.map(p => p.id + ': ' + p.detall)));
comprova('el conte de mostra queda dins de l\'interval',
  auditoria.dins_interval === true, `${auditoria.caracters} caràcters`);
comprova('tot problema porta cita o camp',
  auditoria.problemes.every(p => (p.cita && p.cita.length) || (p.camp && p.camp.length)));
comprova('cap cita passa de 12 paraules',
  auditoria.problemes.every(p => !p.cita || p.cita.split(/\s+/).length <= 13));

// ── Auditoria: casos que SÍ que ha de detectar ───────────────────────────────
const curt = C.auditoriaDeterministaConte('massa curt', [], dossierNet);
comprova('un text massa curt es detecta',
  curt.problemes.some(p => p.id === 'longitud' && p.severitat === 'alta'));

const ambRepeticio = contenet + '\n\n' + 'La numeració és el que digui el llibre i prou. '.repeat(3);
comprova('una frase repetida tres vegades es marca com a alta',
  C.auditoriaDeterministaConte(ambRepeticio, [], dossierNet).problemes
    .some(p => p.id.startsWith('repeticio') && p.severitat === 'alta'));

comprova('un castellanisme de la llista es detecta',
  C.auditoriaDeterministaConte(contenet + '\n\nBueno, entonces va marxar.', [], dossierNet).problemes
    .some(p => p.id.includes('castellanisme')));
comprova('un anglicisme es detecta',
  C.auditoriaDeterministaConte(contenet + '\n\nVa dir que tot estava ok i prou.', [], dossierNet).problemes
    .some(p => p.id.includes('anglicisme')));

const dossierAmbAbsent = JSON.parse(JSON.stringify(dossierNet));
dossierAmbAbsent.secundaris.push({ nom: 'Zarambaix Kolomiets', funcio: 'a', vol: 'b', amaga: 'c' });
comprova('un personatge del dossier absent del text es detecta',
  C.auditoriaDeterministaConte(contenet, [], dossierAmbAbsent).problemes
    .some(p => p.id.includes('personatge_absent')));

const dossierMaiDiria = JSON.parse(JSON.stringify(dossierNet));
dossierMaiDiria.protagonista.veu.mai_diria = ['La numeració és el que digui el llibre'];
comprova('una frase de mai_diria que apareix al text es marca com a alta',
  C.auditoriaDeterministaConte(contenet, [], dossierMaiDiria).problemes
    .some(p => p.id.startsWith('mai_diria') && p.severitat === 'alta'));

// ── Auditoria: els casos legítims que s'hi assemblen ─────────────────────────
comprova('un substantiu acabat en -ment no compta com a adverbi',
  C.densitatAdverbisMent('El pagament del coneixement i el plantejament del casament i el raonament del moviment').adverbis === 0);
comprova('un adverbi de veritat sí que compta',
  C.densitatAdverbisMent('Ho va fer lentament i clarament').adverbis === 2);
comprova('el llindar d\'adverbis no salta amb densitat normal',
  !C.auditoriaDeterministaConte(contenet, [], dossierNet).problemes.some(p => p.id === 'adverbis_ment'),
  `${C.densitatAdverbisMent(contenet).per_mil}‰`);
comprova('les cometes dins d\'un paràgraf no compten com a diàleg',
  !C.formatDialegInconsistent('—Digui —va dir.\nEl rètol deia «Tancat per inventari» i prou.\n—Ja ho veig.').inconsistent);
comprova('les cometes obrint paràgraf tres cops sí que es detecten',
  C.formatDialegInconsistent('—Digui.\n«Primera cita llarga.\n«Segona cita llarga.\n«Tercera cita llarga.').inconsistent);
comprova('un nom compost present pel cognom no es marca com a absent',
  !C.auditoriaDeterministaConte(contenet, [], dossierNet).problemes.some(p => p.id.includes('personatge_absent')));
comprova('el lint no marca text català correcte',
  C.lintCatalaParcial(contenet).troballes.length === 0,
  JSON.stringify(C.lintCatalaParcial(contenet).troballes.map(t => t.forma)));
comprova('el lint es declara sempre parcial', C.lintCatalaParcial('text').parcial === true);

// ── Longitud per escena ──────────────────────────────────────────────────────
// La primera se separa un 20% (per sobre de la tolerància del 15%); la resta
// queden dins, i la segona a un 14%, just per sota, per comprovar que el
// llindar no es dispara abans d'hora.
const escenesText = ['a'.repeat(2800), 'b'.repeat(3010), 'c'.repeat(3500), 'd'.repeat(3500), 'e'.repeat(3500)];
const textAmbSeparadors = escenesText.join(C.SEPARADOR_ESCENA);
const escaletaProva = escenesText.map((_, i) => ({ caracters_objectiu: 3500 }));
const audEscenes = C.auditoriaDeterministaConte(textAmbSeparadors, escaletaProva, dossierNet);
comprova('una escena que se separa més de la tolerància es detecta',
  audEscenes.problemes.some(p => p.id === 'escena_longitud_0'),
  JSON.stringify(audEscenes.problemes.map(p => p.id)));
comprova('les escenes dins de tolerància no es marquen',
  !audEscenes.problemes.some(p => ['escena_longitud_1', 'escena_longitud_2'].includes(p.id)));
comprova('si el text no es pot retallar per escenes, es diu en lloc de reportar dades falses',
  C.auditoriaDeterministaConte('text sense separadors', escaletaProva, dossierNet).problemes
    .some(p => p.id === 'escenes_no_delimitades'));

acabar();

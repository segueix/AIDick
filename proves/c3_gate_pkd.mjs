// c3 — La porta PKD.
// Una escaleta sense 'empatia' bloqueja; amb les tres funcions passa; i el
// fallback local no la pot satisfer per accident. Aquesta última és la
// important: si el fallback pogués assignar una funció PKD, la porta es
// tancaria sola i deixaria de mesurar res.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';
import { carregarNucliConte } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { CONTE_CORE: C } = carregarNucliConte();

// ── Nucli ────────────────────────────────────────────────────────────────────
const completa = [
  { funcio_pkd: 'mentida' }, { funcio_pkd: 'paranoia' },
  { funcio_pkd: 'esquerda' }, { funcio_pkd: 'cap' }, { funcio_pkd: 'empatia' }
];
comprova('amb esquerda, mentida i empatia la porta passa', C.validarGatePKD(completa).valid);

['esquerda', 'mentida', 'empatia'].forEach(f => {
  const sense = completa.map(e => e.funcio_pkd === f ? { funcio_pkd: 'cap' } : e);
  const r = C.validarGatePKD(sense);
  comprova(`sense «${f}» la porta bloqueja`, !r.valid && r.faltants.some(x => x.funcio === f));
  comprova(`el bloqueig per «${f}» ofereix com_resoldre`,
    r.faltants.find(x => x.funcio === f).com_resoldre.length > 0);
});

const senseParanoia = completa.map(e => e.funcio_pkd === 'paranoia' ? { funcio_pkd: 'cap' } : e);
comprova('sense «paranoia» la porta passa però avisa',
  C.validarGatePKD(senseParanoia).valid && C.validarGatePKD(senseParanoia).avis_paranoia.length > 0);

// ── El fallback local no pot tancar la porta ─────────────────────────────────
const dossier = {
  premissa: 'p', final_obligatori: 'f', esquerda: 'e', mentida_del_sistema: 'm', cost_empatia: 'c',
  protagonista: { nom: 'Halloran', feina_ordinaria: 'auxiliar', ferida: 'x', objectiu_extern: 'y', secret: 'z', veu: { registre: 'r', mai_diria: ['1', '2', '3'] } },
  secundaris: [{ nom: 'Devereux', funcio: 'a', vol: 'b', amaga: 'c' }],
  mon: { lloc: 'l', any: 'a', deteriorament: ['1', '2', '3'], objectes_consum_defectuosos: ['1', '2'] },
  objectes_clau: [], fets_canonics: ['f1'], cronologia: [{ quan: 'q', que: 'w' }], motius_triats: []
};

const nomesFallbacks = [0, 1, 2, 3, 4, 5].map(i => C.contracteFallbackLocal(i, dossier, 3000));
comprova('tots els contractes de fallback són estructuralment complets',
  nomesFallbacks.every(c => C.detectarFaltantsContracte(c).length === 0));
comprova('una escaleta feta només de fallbacks NO passa la porta PKD',
  !C.validarGatePKD(nomesFallbacks).valid);
comprova('el fallback no en tanca cap de les tres',
  C.validarGatePKD(nomesFallbacks).faltants.length === 3,
  JSON.stringify(C.validarGatePKD(nomesFallbacks).faltants.map(f => f.funcio)));
comprova('completar un contracte amb el fallback tampoc li assigna funció PKD',
  C.completarContracteAmbFallback({ index: 0 }, dossier, 3000).contracte.funcio_pkd === 'cap');
comprova('completar un contracte no canvia la funció PKD que ja tenia',
  C.completarContracteAmbFallback({ index: 0, funcio_pkd: 'empatia' }, dossier, 3000).contracte.funcio_pkd === 'empatia');

// ── El bloqueig a la interfície ──────────────────────────────────────────────
const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();
const { pagina } = await obrirApp(navegador);
await activarDemo(pagina);
await recorrerFins(pagina, 3);

comprova('l\'escaleta generada tanca la porta',
  await pagina.evaluate(() => CONTE_CORE.validarGatePKD(ESTAT_CONTE.escaleta.escenes).valid));

// Es treu l'escena d'empatia i s'ha de bloquejar amb les dues accions.
await pagina.evaluate(() => {
  ESTAT_CONTE.escaleta.escenes.forEach(e => { if (e.funcio_pkd === 'empatia') e.funcio_pkd = 'cap'; });
  ESTAT_CONTE.pas_obert = 3;
  renderitzar();
});
const textP3 = await pagina.locator('#pas-3').innerText();
comprova('sense empatia la UI ho diu', textP3.includes('empatia'), textP3.slice(0, 160));
const botons = await pagina.locator('#pas-3 .blocatge button').allInnerTexts();
comprova('el bloqueig ofereix reassignar la funció',
  botons.some(b => /Assigna/i.test(b)), botons.join(' | '));
comprova('el bloqueig ofereix regenerar l\'escaleta',
  botons.some(b => /Regenera/i.test(b)), botons.join(' | '));
comprova('amb la porta oberta no hi ha botó per continuar a la redacció',
  !(await pagina.locator('#pas-3').innerText()).includes('Continua a la redacció'));

// La reassignació manual la tanca sense gastar cap crida.
const cridesAbans = await pagina.evaluate(() => LLM_CLIENT.comptador.crides);
await pagina.evaluate(() => assignarFuncioAPrimeraLliure('empatia'));
comprova('reassignar manualment tanca la porta',
  await pagina.evaluate(() => CONTE_CORE.validarGatePKD(ESTAT_CONTE.escaleta.escenes).valid));
comprova('reassignar manualment no gasta cap crida',
  await pagina.evaluate(() => LLM_CLIENT.comptador.crides) === cridesAbans);

// ── Un contracte incomplet es tapa en local, sense crida ─────────────────────
const cridesAbansContracte = await pagina.evaluate(() => LLM_CLIENT.comptador.crides);
await pagina.evaluate(() => {
  editarContracte(0, JSON.stringify({ index: 0, pov: 'Halloran', caracters_objectiu: 3000, funcio_pkd: 'mentida' }));
});
comprova('un contracte incomplet queda complet via fallback local',
  await pagina.evaluate(() => CONTE_CORE.detectarFaltantsContracte(ESTAT_CONTE.escaleta.escenes[0]).length) === 0);
comprova('tapar un contracte no gasta cap crida',
  await pagina.evaluate(() => LLM_CLIENT.comptador.crides) === cridesAbansContracte);
comprova('tapar un contracte conserva el que ja tenia',
  await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes[0].pov) === 'Halloran' &&
  await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes[0].funcio_pkd) === 'mentida');

await navegador.close();
acabar();

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const recuperacio = readFileSync(new URL('../nkg_recovery.js', import.meta.url), 'utf8');
const models = readFileSync(new URL('../../models_openai.js', import.meta.url), 'utf8');

const resultats = [];
function comprova(nom, condicio, detall = '') {
  resultats.push({ nom, condicio });
  console.log(`${condicio ? '✅' : '❌'} ${nom}${detall ? ' — ' + detall : ''}`);
}

const documentFals = {
  readyState: 'complete',
  head: { appendChild() {} },
  getElementById() { return null; },
  querySelector() { return null; },
  addEventListener() {},
  createElement() {
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      appendChild() {},
      remove() {},
      parentElement: null
    };
  }
};

const context = {
  console,
  Date,
  Map,
  Set,
  Promise,
  document: documentFals,
  setTimeout() { return 0; },
  clearTimeout() {},
  setInterval() { return 0; },
  clearInterval() {},
  toast() {},
  ESTAT: {
    fase: 22,
    _nkg: {
      personatges: {},
      macronarrativa: {
        synopsis_core: 'Lisbeth Holm investiga una xarxa institucional i treballa amb Karin i Johan.'
      }
    },
    _escaletes: [
      {
        capitol: 1,
        escenes: [
          {
            personatges: ['Lisbeth Holm (documentalista)', 'Karin (editora)', 'un arxiver jove'],
            scene_contract: {
              pov: 'Lisbeth Holm',
              personatges_presents: ['Lisbeth Holm', 'Karin']
            }
          }
        ]
      },
      {
        capitol: 2,
        escenes: [
          {
            personatges: ['Lisbeth Holm', 'Johan (aliat)', 'capità d’una barca petita'],
            scene_contract: {
              pov: 'Lisbeth Holm',
              personatges_presents: ['Lisbeth Holm', 'Johan']
            }
          }
        ]
      }
    ],
    _estructuraCapitols: [
      { numero: 1, personatges: [] },
      { numero: 2, personatges: [] }
    ],
    bibliaNarrativa: { fitxes_personatges: [], regles_mon: ['regla'] },
    trames: {
      // Aquest repartiment divergent no s’ha d’imposar sobre les escaletes canòniques.
      subtrames: [{ personatges_implicats: ['Laia Ekström', 'Biel Andersson'] }]
    }
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(recuperacio, context, { filename: 'nkg_recovery.js' });

const reparacio = context.reconstruirPersonatgesNKGDesDePlanificacio();
const personatges = Object.values(context.ESTAT._nkg.personatges);
const noms = personatges.map(p => p.nom);

comprova('El mòdul s’exposa com a funció global',
  typeof context.reconstruirPersonatgesNKGDesDePlanificacio === 'function');
comprova('Es recuperen personatges des de les escaletes',
  reparacio.reparat === true && personatges.length >= 3,
  noms.join(', '));
comprova('La protagonista més recurrent queda identificada',
  personatges.some(p => p.nom === 'Lisbeth Holm' && p.rol === 'protagonista'));
comprova('Es conserven els secundaris amb nom explícit',
  noms.includes('Karin') && noms.includes('Johan'));
comprova('No es converteixen rols genèrics en personatges',
  !noms.some(n => /arxiver|capità/i.test(n)));
comprova('No s’imposa el repartiment divergent de les trames',
  !noms.includes('Laia Ekström') && !noms.includes('Biel Andersson'));
comprova('Els capítols recuperen la seva llista de personatges',
  context.ESTAT._estructuraCapitols.every(c => Array.isArray(c.personatges) && c.personatges.length > 0));
comprova('La bíblia rep fitxes mínimes per als generadors posteriors',
  context.ESTAT.bibliaNarrativa.fitxes_personatges.length === personatges.length);

const segona = context.reconstruirPersonatgesNKGDesDePlanificacio();
comprova('La recuperació és idempotent i no duplica personatges',
  segona.reparat === false && Object.values(context.ESTAT._nkg.personatges).length === personatges.length);
comprova('El carregador principal incorpora el mòdul de recuperació',
  models.includes("script.src = 'nkg_recovery.js'") && models.includes('booki-nkg-recovery-script'));
comprova('La fase 22 queda protegida abans de relacions, veu i autocompleció',
  ['autocompletarNKGSilent', 'assegurarMinimPersonatgesPerRelacions', 'generarBackstoryIRelacions', 'generarVeuExemples']
    .every(nom => recuperacio.includes(`'${nom}'`)));

const passades = resultats.filter(r => r.condicio).length;
console.log(`\n${passades}/${resultats.length} comprovacions passades`);
process.exit(passades === resultats.length ? 0 : 1);
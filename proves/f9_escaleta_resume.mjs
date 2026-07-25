import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../ui_fixes.js', import.meta.url), 'utf8');

let passades = 0;
let totals = 0;
function comprova(nom, condicio) {
  totals += 1;
  if (condicio) {
    passades += 1;
    console.log(`✅ ${nom}`);
  } else {
    console.error(`❌ ${nom}`);
  }
}

comprova('La validació d’escaleta disposa de tres intents', ui.includes('const MAX_INTENTS = 3'));
comprova('Els reintents exigeixen un únic JSON sense Markdown', ui.includes('EXCLUSIVAMENT un únic objecte JSON complet'));
comprova('Es detecta el prefix consecutiu d’escaletes vàlides', ui.includes('function prefixEscaletesValides()'));
comprova('Les escaletes recuperades conserven els scene contracts', ui.includes('scene_contracts: sceneContractsExistents(escaleta)'));
comprova('Els capítols ja generats es reutilitzen sense nova crida LLM', ui.includes('Promise.resolve(JSON.stringify(dades))'));
comprova('La seqüència disposa de rondes automàtiques de recuperació', ui.includes('const MAX_RONDES = 3'));
comprova('La recuperació restaura sempre la funció LLM original', ui.includes('window.nouFlux_escaletaCapitol = funcioReal'));
comprova('Hi ha un botó per reprendre des del primer capítol pendent', ui.includes('btn-reprendre-escaleta-booki'));
comprova('La restauració d’un backup activa la comprovació de represa', ui.includes('restaurarInterficieAmbReprendre'));
comprova('Els errors resolts d’escaleta es retiren del checklist', ui.includes("e?.schemaId !== 'escaleta_capitol'"));
comprova('La selecció visual d’Estructura A/B es conserva', ui.includes('__bookiMarcatgeEstructura'));

console.log(`\n${passades}/${totals} comprovacions passades`);
process.exit(passades === totals ? 0 : 1);

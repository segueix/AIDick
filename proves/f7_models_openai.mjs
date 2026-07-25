import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const perfils = readFileSync(new URL('../perfils_autor_base.js', import.meta.url), 'utf8');
const extensio = readFileSync(new URL('../models_openai.js', import.meta.url), 'utf8');

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

// El carregador document.write s'ha substituït per etiquetes directes a
// index.html: el que importa és que els dos mòduls es carreguin, no com.
comprova('index.html carrega els perfils originals', index.includes('<script src="perfils_autor_base.js">'));
comprova('index.html carrega l’extensió OpenAI', index.includes('<script src="models_openai.js">'));
comprova('El registre original de perfils es conserva', perfils.includes('const PERFILS_AUTOR = {'));
comprova('Booki manté tres selectors de model',
  ['selectModelDraft', 'selectModelGen', 'selectModelArq'].every(id => index.includes(`id="${id}"`)));
comprova('Tots els proveïdors mostren la configuració de tres rols',
  index.includes("document.getElementById('config-anthropic-fields').classList.remove('hidden')"));

comprova('Draft OpenAI econòmic: GPT-5 Nano', extensio.includes("draft: 'gpt-5-nano'"));
comprova('Generació OpenAI equilibrada: GPT-5 Mini', extensio.includes("generacio: 'gpt-5-mini'"));
comprova('Arquitectura OpenAI equilibrada: GPT-5 Mini', extensio.includes("arquitectura: 'gpt-5-mini'"));
comprova('GPT-5 Nano té cost oficial registrat',
  /'gpt-5-nano':[\s\S]*?input_per_m:\s*0\.05,[\s\S]*?output_per_m:\s*0\.40/.test(extensio));
comprova('GPT-5 Mini té cost oficial registrat',
  /'gpt-5-mini':[\s\S]*?input_per_m:\s*0\.25,[\s\S]*?output_per_m:\s*2\.00/.test(extensio));
comprova('Nano queda reservat al rol mecànic',
  extensio.includes("draft: 'gpt-5-nano'") &&
  !extensio.includes("generacio: 'gpt-5-nano'") &&
  !extensio.includes("arquitectura: 'gpt-5-nano'"));
comprova('Els models superiors continuen disponibles per pujar qualitat després',
  ['gpt-5.4-nano', 'gpt-5.6-luna', 'gpt-5.6-terra'].every(id => extensio.includes(`'${id}'`)));
comprova('Els models es registren abans de la inicialització de la pàgina',
  extensio.includes("document.addEventListener('DOMContentLoaded', installar"));
comprova('La configuració continua persistint els tres rols',
  index.includes('draft: modelDraft') && index.includes('generacio: modelGeneracio') && index.includes('arquitecte: modelArquitectura'));
comprova('La capçalera crea un camp visible per al Draft',
  extensio.includes("inputDraft.id = 'config-model-draft'"));
comprova('El camp Draft se sincronitza amb ESTAT._modelDraft',
  extensio.includes('ESTAT._modelDraft = modelId') && extensio.includes('sincronitzarCampDraft'));
comprova('Desar i actualitzar apliquen abans el Draft visible',
  extensio.includes("embolcallarFuncioGlobal('guardarIComencar', aplicarDraftDesDelCamp") &&
  extensio.includes("embolcallarFuncioGlobal('actualitzarConfiguracioActiva', aplicarDraftDesDelCamp"));

console.log(`\n${passades}/${totals} comprovacions passades`);
process.exit(passades === totals ? 0 : 1);

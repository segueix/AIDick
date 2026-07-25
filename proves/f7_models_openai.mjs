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
comprova('Draft OpenAI: GPT-5.4 Nano', extensio.includes("draft: 'gpt-5.4-nano'"));
comprova('Generació OpenAI: GPT-5.6 Luna', extensio.includes("generacio: 'gpt-5.6-luna'"));
comprova('Arquitecte OpenAI: GPT-5.6 Terra', extensio.includes("arquitectura: 'gpt-5.6-terra'"));
comprova('GPT-5.4 Nano té cost registrat',
  /'gpt-5\.4-nano':[\s\S]*?input_per_m:\s*0\.20,[\s\S]*?output_per_m:\s*1\.25/.test(extensio));
comprova('GPT-5.6 Luna té cost registrat',
  /'gpt-5\.6-luna':[\s\S]*?input_per_m:\s*1\.00,[\s\S]*?output_per_m:\s*6\.00/.test(extensio));
comprova('GPT-5.6 Terra té cost registrat',
  /'gpt-5\.6-terra':[\s\S]*?input_per_m:\s*2\.50,[\s\S]*?output_per_m:\s*15\.00/.test(extensio));
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
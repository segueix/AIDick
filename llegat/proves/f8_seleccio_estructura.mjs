import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../novella.html', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../../ui_fixes.js', import.meta.url), 'utf8');

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

// Igual que a f7: el carregador document.write ha desaparegut, però ui_fixes.js
// s'ha de seguir carregant.
comprova('index.html carrega les correccions UI', index.includes('<script src="../ui_fixes.js">'));
comprova('La selecció elimina btn-ghost del botó actiu', ui.includes("boto.classList.toggle('btn-ghost', !activa)"));
comprova('La selecció aplica btn-primary només al botó actiu', ui.includes("boto.classList.toggle('btn-primary', activa)"));
comprova('La targeta seleccionada rep vora destacada', ui.includes("'2px solid var(--accent)'"));
comprova('La targeta seleccionada rep fons destacat', ui.includes("'#1e1b38'"));
comprova('El botó informa visualment de la selecció', ui.includes('seleccionada`'));
comprova('El control exposa aria-pressed', ui.includes("setAttribute('aria-pressed'"));
comprova('La funció original continua executant-se', ui.includes('original.apply(this, arguments)'));

console.log(`\n${passades}/${totals} comprovacions passades`);
process.exit(passades === totals ? 0 : 1);

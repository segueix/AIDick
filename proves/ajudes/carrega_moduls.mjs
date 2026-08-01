// Carrega els mòduls del projecte a l'àmbit GLOBAL de node, tal com els carrega
// el navegador amb <script src>.
//
// nkg_core.js és un script clàssic sense module.exports: les seves funcions
// (parseJsonRobust, entre altres) només són accessibles com a globals. Amb
// require() quedarien tancades dins del mòdul i llm_client.js no les trobaria,
// que és exactament el que passa al navegador si l'ordre de càrrega és
// incorrecte. runInThisContext reprodueix el comportament real.
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';

const ARREL = new URL('../../', import.meta.url);

export function carregarGlobal(nomFitxer) {
  const codi = readFileSync(new URL(nomFitxer, ARREL), 'utf8');
  runInThisContext(codi, { filename: nomFitxer });
}

// Ordre idèntic al d'index.html.
export function carregarNucliConte() {
  carregarGlobal('perfils_autor_base.js');
  carregarGlobal('nkg_core.js');
  carregarGlobal('conte_core.js');
  carregarGlobal('llm_client.js');
  return {
    CONTE_CORE: globalThis.CONTE_CORE,
    LLM_CLIENT: globalThis.LLM_CLIENT,
    PERFILS_AUTOR: globalThis.PERFILS_AUTOR
  };
}

export function llegirFitxer(nomFitxer) {
  return readFileSync(new URL(nomFitxer, ARREL), 'utf8');
}

# Codi útil i funcionant (llibre de consolidació)

Aquest document és un **punt de consolidació** per anar separant del `index.html` gegant només les peces que:

1. tenen valor real al producte,
2. funcionen de manera estable,
3. passen una verificació mínima.

> Objectiu: reduir soroll, duplicació i regressions quan es retoca el pipeline.

---

## Com usar aquest document

Quan una funció o bloc compleixi criteris, afegeix-la aquí amb:

- **Nom de peça**
- **Responsabilitat única**
- **Dependències globals** (p.ex. `ESTAT`, `USER_CONFIG`, DOM IDs)
- **Contracte d'entrada/sortida**
- **Checks mínims de validació**
- **Ubicació actual a `index.html`**

---

## Criteris de “codi útil i funcionant”

Una peça entra aquí si compleix **tots** aquests punts:

- ✅ No introdueix errors de parseig JS (`node --check` net).
- ✅ No depèn de duplicació de UI innecessària.
- ✅ Té una responsabilitat clara i acotada.
- ✅ Es pot executar sense trencar globals bàsiques (`ESTAT`, handlers principals).
- ✅ Té verificació mínima repetible (manual o script).

---

## Inventari inicial (fase 10.x i NKG)

### 1) `tePerspectivaCronologiaPreparada()`

- **Responsabilitat**: verificar prerequisits de perspectiva/cronologia/timeline.
- **Dependències**: `ESTAT._nkg.context_creacio`, `ESTAT._nkg.timeline_accions`.
- **Contracte**: retorna `true/false` sense efectes laterals.
- **Checks mínims**:
  - retorna `false` si falta `perspectiva.tipus`.
  - retorna `false` si `pov_per_capitol` o `cronologia.per_capitol` són buits.
  - retorna `false` si `timeline_accions` és buida.

### 2) `assegurarPerspectivaCronologiaPipeline(setStatus)`

- **Responsabilitat**: injectar perspectiva+cronologia+timeline només si falten.
- **Dependències**: `tePerspectivaCronologiaPreparada`, `generarPerspectivaCronologia`, `injectarPerspectivaCronologia`, `USER_CONFIG`.
- **Contracte**:
  - si ja està preparat, no regenera.
  - si falta informació, genera i injecta.
  - actualitza estat visual via `setStatus` quan s'informa progrés.

### 3) `autocompletarNKGFaltantsManual()` (versió per passos)

- **Responsabilitat**: completar NKG pendent per fases detectables.
- **Dependències**: `detectarFaltantsNKG`, generadors/injectors de backstory, trets, objectes, mapa/regles, perspectiva/cronologia, veu.
- **Contracte**:
  - executa només passos necessaris,
  - refresca faltants després de cada pas,
  - limita passades de reintent.
- **Risc conegut**: funció gran; candidata a divisió en mòduls menors.

### 4) `selfCheckLockingInvariants()` (mode no disruptiu)

- **Responsabilitat**: avisar d'invariants de lock/jutge sense trencar el startup.
- **Contracte**: emet warnings en lloc de bloquejar inicialització.
- **Nota**: la verificació és informativa, no de control dur d'execució.

---

## Mòduls extrets (Etapa D — consolidats i funcionant)

### `perfils_autor.js`
- **Responsabilitat única**: registre `PERFILS_AUTOR` (larsson/tolkien/dick/castaneda) i utilitats d'estil/ambientació.
- **Conté**: `PERFILS_AUTOR`, `obtenirPerfilAutorId`, `obtenirAutorIdProjecte`, `reglaAmbientacioAutor`, `getGenreStyle`.
- **Dependències globals**: llegeix `ESTAT` en temps d'execució (cap dependència de DOM).
- **Contracte**: funcions de lectura pura; retornen strings/ids, mai muten estat.
- **Checks mínims**: `node --check` net; `obtenirPerfilAutorId('univers Tolkien')` → `'tolkien'`; `getGenreStyle('')` retorna bloc genèric.

### `nkg_core.js`
- **Responsabilitat única**: nucli NKG + contractes de validació LLM (Etapa E.1) + parseig robust.
- **Conté**: `crearNKG`, `detectarFaltantsNKG`, `validarNKGPreparatPerCapitol1`, `normalitzarVeuAvancada`, `parseJsonRobust`, `ESQUEMES_LLM`, `validarEsquemaLLM`, `registrarErrorValidacioLLM`, `generarJsonValidat`.
- **Dependències globals**: `registrarErrorValidacioLLM` escriu a `ESTAT._errorsValidacioLLM` (runtime); la resta és pur.
- **Contracte**: `crearNKG()` retorna l'estructura buida; `detectarFaltantsNKG(nkg, biblia)` retorna llista d'errors; `generarJsonValidat(schemaId, ferCrida)` retorna `{ok, dades|errors}` amb 1 reintent.
- **Checks mínims**: `node --check` net; `detectarFaltantsNKG({})` → `['NKG no inicialitzat.']`; `parseJsonRobust('{"a":1}')` → objecte.

> **Càrrega**: tots dos via `<script src>` just abans del primer bloc inline d'`index.html`
> (línia ~1671). L'app ja NO funciona com a fitxer únic: cal copiar els 3 fitxers junts.
> Pendent (pas 3 del pla original): `prompts.js` — les funcions de prompt criden
> `nouFluxCall`/`callLLMMulti` i toquen ESTAT; extreure-les requereix més cura.

## Peces consolidades a F0 i F1 (REVISIO_I_PLA_EXCELLENCIA.md)

### `completarMotorsDramaticsNKG(userConfig, onProgress)`
- **Responsabilitat**: omplir els blocants de `detectarFaltantsDramaNKG` (trames,
  objectius/secrets per personatge, contractes d'escena incomplets).
- **Dependències**: `generarIDesarTrames`, `generarObjectiusSecrets`,
  `generarCompletarSceneContracts`, i els predicats purs de `nkg_core.js`.
- **Contracte**: idempotent — cada pas només s'executa si el seu faltant hi és.
  Cap pas que falla atura els altres (es registra a consola).
- **Checks mínims**: després d'executar-la sobre un NKG del flux b1–b6,
  `validarNKGPreparatPerCapitol1(...).ok === true`.
- **Ubicació**: `index.html`, just després de `iniciarEscaletaSeqNou`.

### `generarIDesarTrames(userConfig, onProgress)`
- **Responsabilitat**: generar trama principal, subtrames i mapa entrellaçat i
  desar-los a `ESTAT.trames`, sense tocar la UI de la fase 18.
- **Contracte**: retorna `{ dades, textOriginal }`. `iniciarFaseTrames()` l'embolcalla
  per a la card; el flux b1–b6 i la compleció automàtica la criden directament.

### `efecteEscripturaHTML(elementId, htmlContent, msPerChar)` (reescrita)
- **Responsabilitat**: pintar HTML amb efecte de màquina d'escriure, cancel·lable.
- **Contracte**: un sol efecte viu per `elementId` (`_TOKENS_ESCRIPTURA`); una crida
  nova invalida l'anterior. Durada acotada a `PRESSUPOST_MS_ESCRIPTURA` (8 s)
  escrivint per lots. Respecta `USER_CONFIG.efecteEscriptura === false`.
- **Checks mínims**: dues crides encavalcades sobre el mateix element deixen
  només el contingut de la segona; 19k caràcters en menys de 12 s.

### `mostrarIAnarA(id, { ancora, retardMs })`
- **Responsabilitat**: `showCard` + scroll al destí, per no deixar transicions cegues.
- **Contracte**: tolera ids inexistents (avís per consola, sense excepció).

## Peces consolidades a F3 (estil dels 4 autors)

### `blocReglesEstilAutor(idPerfil)` — `perfils_autor.js`
- **Responsabilitat**: muntar el bloc «REGLES D'ESTIL» del prompt de novel·la a
  partir dels camps `regles_dures`, `prosa`, `exposicio` i `emocio` del perfil.
- **Contracte**: per a un perfil desconegut o buit retorna les regles genèriques
  (`REGLES_ESTIL_GENERIQUES`), idèntiques a les que hi havia abans de F3.
- **Checks mínims**: Tolkien no rep «Màxim 1 adjectiu»; Larsson sí; Castaneda no
  rep la prohibició global d'exposició.

### `blocCriterisExcellenciaGeneracio(idPerfil)` — `perfils_autor.js`
- **Responsabilitat**: convertir `criteris_excellencia` en condicions d'acceptació
  del capítol, injectades al prompt (abans només s'usaven a l'informe posterior).
- **Contracte**: retorna `''` si el perfil no té criteris.

### `resoldrePerfilAutor(text)` — `perfils_autor.js`
- **Responsabilitat**: punt únic de resolució del perfil. El perfil del projecte
  mana; la detecció per text és el pla B.
- **Nota**: `obtenirPerfilAutorId` distingeix ara identificadors forts (nom de
  l'autor) de pistes de gènere (`DETECCIONS_DEBILS`).

### `construirBlocHumanitzacio(capitolNum)` — `index.html`
- **Responsabilitat**: implementació de `humanitzacio_capitol_bloc.md`
  parametritzada pel perfil (gest inútil, objecte emocional, temps mort).
- **Dependències**: POV i `necessitat_interna` del NKG, `arc.waypoints`,
  `cap.temperatura_emocional`, `cap.ratio_dialeg`, `cap.cost_emocional`.
- **Contracte**: retorna `''` si no hi ha POV resoluble; mai llança.

### `escenesDesDeContractes(dades, capInfo, capitolNum)` — `index.html`
- **Responsabilitat**: convertir els `scene_contracts` d'un capítol en la seva
  llista d'escenes, amb POV, lloc, beat i objectiu de paraules per escena.
- **Contracte**: sense contractes, retorna una escena amb fallback vàlid.

> ⚠️ **Errata corregida a F3**: `ESTAT._estruturaCapitols` (sense la `c`) apareixia
> en 7 punts i no s'assigna enlloc. Deixava morta tota la capa d'arquitectura
> emocional: temperatura per capítol, ratio de diàleg i cost emocional no
> s'aplicaven mai. Si torna a aparèixer, la capa torna a quedar silenciosament morta.

## Peces consolidades a F2 (jutge d'interval)

### `tancamentBlocComplet(idx, bloc, userConfig)` — `index.html`
- **Responsabilitat**: orquestrar el tancament d'un bloc de 4 capítols —
  derivats → resums → jutge → resum consolidat.
- **Cridador**: `generarCapitol`, quan `esTancamentBloc(idx, totalCaps)`.
- **Contracte**: cap pas pot tombar el flux d'escriptura; tot va dins de
  try/catch i el loader es tanca sempre al `finally`.

### `executarJutgeInterval(fromIdx, toIdx, userConfig)` — `index.html`
- **Responsabilitat**: single-pass (`MAX_ITER = 1`) de detecció i, si escau,
  correcció d'un bloc.
- **Contracte**: si l'interval ja té lock, surt sense fer cap crida. En acabar
  sempre escriu `_intervalLocks[fromIdx-toIdx]`. Els locks de capítol només
  s'apliquen si `jutgePotReescriure()`.
- **Checks mínims**: dues execucions seguides sobre el mateix interval fan una
  sola crida a l'LLM.

### `jutgePotReescriure()` — `index.html`
- **Responsabilitat**: punt únic de decisió del mode del jutge
  (`USER_CONFIG.jutgeReescriu`, per defecte fals).
- **Governa**: si es reescriu el text, si es congelen els capítols i si es
  congela el BlockCanon 5-8.

### `jutgePanelIniciar / jutgePanelLog / jutgePanelFinalitzar` — `index.html`
- **Responsabilitat**: registre visible del jutge a `#jutge-panel` (el marcatge
  ja existia a la fase 23 i quedava sempre buit).

### `selfCheckLockingInvariants()` — `index.html`
- **Responsabilitat**: verificar invariants de **comportament** (cap stub, cap
  interval jutjat dues vegades, tancament de bloc connectat).
- **Nota**: s'executa a `load`, no amb `setTimeout(…, 0)`: el jutge viu al segon
  bloc `<script>` i el parser pot disparar un timer de 0 ms entremig.

## Peces consolidades a F4 (higiene)

### `MODELS_PER_PROVEIDOR` + `validarDefaultsModels()` — `index.html`
- **Responsabilitat**: font única dels models per defecte, per proveïdor i rol.
  Substitueix cinc taules d'IDs escampades que ja no coincidien entre elles.
- **Contracte**: tot ID ha d'existir a `MODEL_REGISTRY`; `validarDefaultsModels()`
  ho comprova a l'arrencada i avisa per consola si no.
- **Consumidors**: `getModelConfig` (fallbacks), `aplicarPreset`, el canvi de
  proveïdor i `PROVIDER_DEFAULTS` (segon bloc), que ara només aporta les URLs.

> **Regla**: si afegeixes un model, entra primer a `MODEL_REGISTRY` (amb preu,
> context i qualitat) i només després pot aparèixer a `MODELS_PER_PROVEIDOR`.
> Cap ID de model pot viure escrit a mà enlloc més.

### Codi eliminat a F4
- `renderitzarResumDramaticBiblia()` duplicada al segon bloc (idèntica; la
  segona sobreescrivia la primera).
- `validarIReomplirEscaleta()` — sense cridadors i perjudicial: regenerava
  escenes sense `scene_contract`.
- `revisioArquitectaAmbContinuitat()` — no-op que retornava `'APROVAT'`.
- `nkg_biblia.html` — app paral·lela congelada a la fase 0+1, sense referències.

> `applyPatch()` es manté tot i no tenir cridadors: és el mecanisme sancionat per
> a patches sota canon congelat i esborrar-lo deixaria òrfena la modalitat
> `'patch'` de `canRewrite`.

## Peces consolidades a F5 (verificació determinista)

### `registre_estat` + `registrarEsdevenimentEstat()` — `nkg_core.js`
- **Responsabilitat**: llibre major append-only de tots els canvis d'estat.
- **Contracte**: **no es trunca mai** (a diferència de les timelines, que van als
  prompts i es tallen a 40/20 entrades). És la font de l'auditoria.
- **Alimentat per**: `nkgRegistrarMovimentObjecte`, `nkgRegistrarCanvisPersonatge`,
  el canvi de `viu` i el camp `coneixement` de l'extracció post-capítol.

### `auditarCoherenciaNKG(nkg, opcions)` — `nkg_core.js`
- **Responsabilitat**: agregar els sis validaors deterministes (objectes,
  ubicacions, morts, cronologia, coneixement, fils) i ordenar per gravetat.
- **Contracte**: funció pura, sense LLM ni DOM. `{ ok, incidencies, altes,
  esdevenimentsAuditats }`. Els fils només es comproven si `novellaAcabada`.
- **Checks mínims**: cap incidència sobre un registre coherent; una incidència
  d'alta gravetat per cada contradicció plantada.

### `executarAuditoriaDeterminista(opcions)` — `index.html`
- **Responsabilitat**: embolcall d'aplicació — desa el resultat a
  `ESTAT._auditoriaDeterminista` i obre un fil `error-continuïtat` per cada
  incidència alta (idempotent: no duplica fils).
- **Cridada des de**: `tancamentBlocComplet` (abans del jutge), el botó de la
  fase 24 i `checklistSortidaNovella`.

### `construirBlocEstatInicialCapitol(capitolNum)` — `index.html`
- **Responsabilitat**: muntar del NKG l'estat real amb què comença el capítol
  (ubicació, estat físic, inventari, indumentària, què sap ja cada personatge,
  rellotge i morts) i injectar-lo al prompt.
- **Contracte**: cap crida a LLM. El coneixement es filtra per capítol: no pot
  llistar el que el personatge aprèn més endavant.

### `verificarNovellaTextComplet()` — `index.html`
- **Responsabilitat**: única passada que llegeix la novel·la sencera. Contrasta
  una llista tancada de fets canònics i incidències, no busca lliurement.
- **Contracte**: retalla al 60% del context del model si cal, i ho diu a la UI.

## Peces consolidades a F6 (lectura automàtica i calibratge)

### `criteris_avaluacio` (per perfil) — `perfils_autor.js`
- **Responsabilitat**: criteris d'examen redactats com a modes de fallada, que el
  generador no veu mai. Complementen `criteris_excellencia`, que sí que s'injecten.
- **Invariant**: cap dels dos conjunts pot contenir literals de l'altre.

### `seleccionarModelLector(userConfig)` — `index.html`
- **Responsabilitat**: triar un model per llegir que no sigui el que ha escrit.
- **Contracte**: `{ model, decorrelacio, escriptor }`. Ordre de preferència: altre
  proveïdor amb clau → altre model del mateix proveïdor → el mateix, amb
  `decorrelacio` començant per `CAP` perquè la UI ho pugui advertir.

### `lecturaAdversariaNovella()` — `index.html`
- **Responsabilitat**: lectura hostil del text complet amb els criteris ocults.
- **Contracte**: desa a `ESTAT._lecturaAdversaria`; retalla al 60% del context del
  model lector i ho declara.

### `calcularCalibratge(estat)` — `nkg_core.js`
- **Responsabilitat**: convertir les lectures humanes de mostra en recall i precisió.
- **Contracte**: funció pura. Retorna `fiable: false` i un avís explícit mentre la
  mostra sigui inferior a `MOSTRA_MINIMA_CALIBRATGE` (5), encara que els números
  surtin perfectes.
- **Checks mínims**: mostra 0 → "no calibrat"; mostra 1 perfecta → no fiable;
  recall < 0,6 → avís de que no substitueix una lectura.

### `suggerirUnitatsPerLlegir(estat, lectures, quantes)` — `nkg_core.js`
- **Responsabilitat**: dir quines unitats convé llegir a mà per calibrar millor.
- **Contracte**: exclou el ja calibrat; pondera per incidències d'auditoria i per
  troballes del lector; cada suggeriment porta el seu motiu.

## Proves de regressió

`proves/` conté sis suites de Playwright + Chromium que s'executen sobre
l'`index.html` real (**126 comprovacions**):

| Suite | Cobreix |
|---|---|
| `f0_f1.mjs` | desbloqueig del gate NKG i ordre visual |
| `f2_jutge.mjs` | jutge de bloc, locks i reconciliació cap endavant |
| `f3_estil_autors.mjs` | perfils d'autor, humanització i escenes per capítol |
| `f4_higiene.mjs` | duplicats, models per defecte i codi mort |
| `f5_verificacio.mjs` | validadors deterministes, llibre major i bloc d'estat |
| `f6_lectura.mjs` | separació de criteris, decorrelació del lector i calibratge |

```
npx http-server -p 8099 -c-1 .     # en una terminal
node proves/executa-totes.mjs      # en una altra
```

La suite de F2 simula l'LLM i **bloqueja `fetch`**, de manera que qualsevol crida
real que se li escapi falla de seguida en lloc de quedar-se penjada als reintents
amb backoff. És un patró a repetir en suites futures.

## Full de ruta de reducció de mida (pràctic)

1. **Consolidar** aquí una peça cada cop que es toqui i quedi estable.
2. **Retirar duplicació de UI** immediata (botons/handlers repetits).
3. **Extreure utilitats pures** (normalitzadors/validators) a fitxer separat quan sigui segur.
4. **Evitar funcions monolítiques** noves: màx. una responsabilitat per funció.
5. **Afegir smoke checks** de carregat (globals clau + parseig).

---


## Planning de migració `index.html` → `nkg_biblia.html` (fase a fase)

> ❌ **CANCEL·LAT (F4).** `nkg_biblia.html` s'ha eliminat del projecte: estava
> congelat a la fase 0+1 des de l'Etapa A, no el referenciava cap fitxer i portava
> una llista d'autors que contradiu els quatre perfils. La reorganització es fa in
> situ a `index.html` i la reducció de mida, extraient mòduls purs (Etapa D).
> Aquest planning es conserva només com a referència històrica; el fitxer és
> recuperable de l'històric de git.

> Objectiu: migrar només codi útil i estable, marcant cada fase com a feta.

### Regla UX obligatòria (abans de començar)

- [ ] **No mostrar selector d'autor a la pàgina principal**.
- [ ] El selector/perfil d'autor s'ha d'activar **només després de clicar el botó de confirmar la clau API**.
- [ ] Afegir check de regressió manual: en obrir l'app, sense confirmar API, no ha d'aparèixer cap selector d'autor.

### Fase 0 — Base i esquelet del nou HTML

- [ ] Deixar `nkg_biblia.html` amb estructura mínima de cards i navegació fins fase 10.8.
- [ ] Portar només utilitats comunes imprescindibles (`escHtml`, `toast`, loaders, `showCard/hideCard`).
- [ ] Definir `ESTAT` i `USER_CONFIG` mínims per al flux NKG+Bíblia.
- [ ] Check: càrrega sense errors de consola en fred.

### Fase 1 — Configuració API i gating de UI

- [ ] Migrar bloc de configuració de proveïdor i claus API.
- [ ] Implementar `guardarClausAPI` i estat de disponibilitat de models.
- [ ] Aplicar gating: mostrar opcions d'autor/estil només després de confirmar API.
- [ ] Check: flux UI correcte amb i sense API confirmada.

### Fase 2 — Entrada narrativa mínima

- [ ] Migrar les dades d'entrada necessàries (tema, sinopsi base, personatges inicials, món base).
- [ ] Eliminar dependències de fases de redacció (11+).
- [ ] Check: es pot arribar a crear NKG inicial sense cap funció de capítols.

### Fase 3 — Construcció NKG (nucli)

- [ ] Migrar `crearNKG` i normalitzadors essencials.
- [ ] Migrar injectors de backstory/relacions/objectes/llocs/regles/perspectiva/cronologia.
- [ ] Migrar validacions `detectarFaltantsNKG` i `validarNKGPreparatPerCapitol1`.
- [ ] Check: NKG coherent serialitzable a JSON.

### Fase 4 — Compleció guiada de faltants

- [ ] Migrar `mostrarFaltantsNKG` amb botó per item.
- [ ] Migrar `generarFaltantNKG` i mapatge `obtenirAccioGeneracioPerFaltant`.
- [ ] Garantir que els botons desapareixen quan el faltant queda resolt.
- [ ] Check: cada item es pot generar individualment sense trencar la resta.

### Fase 5 — Backstory i graf de relacions robust

- [ ] Migrar `generarBackstoryIRelacions` i `validarBackstoryIRelacions`.
- [ ] Mantenir fallback local amb `construirGrafRelacionsMinim`.
- [ ] Assegurar que mai es queda `relacions: []` si hi ha >=2 personatges.
- [ ] Check: no apareix "Falta graf de relacions" després de generar/fallback.

### Fase 6 — Perspectiva, cronologia i veu (fins 10.8)

- [ ] Migrar `tePerspectivaCronologiaPreparada` + `assegurarPerspectivaCronologiaPipeline`.
- [ ] Migrar fase 10.7 i 10.8 (sense entrar a redacció capítols).
- [ ] Migrar compleció de veu/exemples només com a prerequisit NKG.
- [ ] Check: en acabar 10.8, validació NKG completa en verd.

### Fase 7 — Exportació NKG + Bíblia

- [ ] Migrar exportadors mínims (`descarregarNKGiBiblia` i context necessari).
- [ ] Verificar export JSON i consistència de camps.
- [ ] Check: fitxer exportat usable i sense camps crítics buits.

### Fase 8 — Neteja final i tancament

- [ ] Eliminar codi mort i referències a fases 11+ del nou HTML.
- [ ] Revisar duplicacions de UI/handlers.
- [ ] Actualitzar aquest document marcant fases completades.
- [ ] Check final: parseig net + smoke end-to-end fins NKG/Bíblia.

### Criteri de "Fase feta"

Una fase només es marca com feta si compleix:

- [ ] Parseig JS net (`node --check`).
- [ ] Sense `ReferenceError` a startup.
- [ ] Prova manual del flux de la fase superada.
- [ ] Documentació actualitzada en aquest fitxer.

## Protocol curt abans de merge

- `node --check` del JS extret d'`index.html`
- càrrega de pàgina sense `ReferenceError` crítics a startup
- prova manual de flux afectat (mínim happy-path)

Si falla algun punt, la peça **no entra** a aquest document com a “funcionant”.

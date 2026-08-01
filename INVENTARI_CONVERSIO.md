# Inventari de conversió — de generador de novel·les a generador de contes PKD

Document de treball de la conversió descrita a `CONVERSIO_CONTES_PKD`. Registra què
es reutilitza del codi existent, què queda congelat a `llegat/` i què es descarta.

**Estat de partida:** commit de referència `cad471a`, suite del llegat en verd amb
**278/278 comprovacions** (mesurat abans de moure res).

---

## REUTILITZEM

Símbols que el generador de contes hereta. La columna «línia» és la posició al
fitxer indicat en el moment de fer aquest inventari.

| Fitxer | Símbol | Línia | Per què |
|---|---|---|---|
| `nkg_core.js` | `parseJsonRobust` | 102 | Recupera JSON de respostes brutes (tanques de codi, text abans i després, cometes tipogràfiques). És l'única porta d'entrada de dades estructurades del pipeline nou. |
| `nkg_core.js` | `crearSceneContractBase` | 356 | Model conceptual del contracte d'escena: `crearContracteEscena` de `conte_core.js` en calca l'enfocament (camps obligatoris, valors per defecte explícits). |
| `nkg_core.js` | `detectarFaltantsSceneContract` | 404 | Model conceptual de la detecció de forats: `detectarFaltantsContracte` en calca el contracte de retorn (llista de camps, no booleà). |
| `nkg_core.js` | `ESQUEMES_LLM` | 14 | Patró de validació d'esquemes de sortida LLM abans d'escriure a l'estat. |
| `perfils_autor_base.js` | `PERFILS_AUTOR` | 12 | Registre únic de perfils d'autor. Es manté sencer. |
| `perfils_autor_base.js` | perfil `dick` | 100 | Estil, `regles_dures`, `prosa`, `exposicio`, `emocio`, `intensitat`, `humanitzacio`, `criteris_avaluacio` i `criteris_excellencia` ja escrits i validats. El subobjecte `conte` s'hi afegeix a sobre sense tocar-ne cap camp. |
| `perfils_autor_base.js` | `obtenirPerfilAutorId` i `DETECCIONS_DEBILS` | 198, 207 | Detecció blindada de perfil, ja corregida contra falsos positius. |
| `perfils_autor_base.js` | `blocReglesEstilAutor` | 279 | Muntatge del bloc de regles d'estil per perfil. |
| `perfils_autor_base.js` | `blocCriterisExcellenciaGeneracio` | 299 | Precedent de la regla «els criteris d'excel·lència entren al prompt de generació». |
| `llegat/novella.html` | `MODELS_PER_PROVEIDOR` | 3595 | Font única de models per proveïdor i rol, amb `get`ters. Es reprèn a `llm_client.js`. |
| `llegat/novella.html` | `MODEL_REGISTRY` | 3604 | Preus, `context_max`, `max_output` i qualitat per model. Base de l'estimació i del cost real. |
| `llegat/novella.html` | `validarDefaultsModels` | 3703 | Comprova que cap model per defecte apunta fora del registre i que la font única no s'ha desincronitzat. |
| `llegat/novella.html` | `getModelConfig` | 3729 | Resolució de model per rol amb ordre de prioritat explícit. |
| `llegat/novella.html` | `PROVIDER_DEFAULTS` | 14281 | Endpoints per proveïdor amb el model llegit per `get`ter (mai per còpia). |
| `llegat/novella.html` | `fetchSegur` | 14348 | Backoff exponencial amb sostre d'intents i lectura de `Retry-After`. |
| `llegat/novella.html` | `analitzarRespostaGenerica` | 14397 | Extracció de text i detecció de tall (`textIncomplet`) agnòstica al proveïdor. |
| `llegat/novella.html` | `callLLMMulti` | 14541 | Router multi-proveïdor. El client nou n'hereta l'estructura amb un comptador al davant. |
| `llegat/novella.html` | `callLLMOneShotPlusCompletion` | 14601 | Patró de continuació quan la resposta arriba tallada. |
| `llegat/novella.html` | `reservaRaonamentGPT5` / `limitSortidaGPT5` | 14823, 14833 | Reserva proporcional de pressupost de raonament de GPT-5 amb mínim 4096, i sostre pel `max_output` del model. |
| `llegat/novella.html` | `buildOpenAIPayload` | 14841 | Construcció de payload per OpenAI amb `max_completion_tokens` per als models GPT-5. |
| `llegat/novella.html` | `executarOpenAIAmbControlBuit` | 14935 | Represa quan el raonament de GPT-5 es menja el límit i el contingut arriba buit o tallat. |
| `llegat/novella.html` | `callAnthropic`, `callOpenAI`, `callGemini` | 14751, 14980, 14993 | Crides per proveïdor, incloses les capçaleres CORS d'Anthropic i els `safetySettings` de Gemini. |
| `llegat/proves/f15_lint_catala.mjs` | `analitzarCatala` | 75 | Lint de català amb hunspell i llindar de paraules inexistents per mil. Es reprèn a `proves/c5_lint.mjs` per al text exportat; al navegador se'n fa una versió parcial i etiquetada com a tal. |
| `llegat/proves/executa-totes.mjs` | executor de suites | 1 | Patró de l'executor: recompte `N/M comprovacions passades` i codi de sortida. |

## CONGELEM

Es queda a `llegat/`, funciona, i no es toca.

| Element | On | Nota |
|---|---|---|
| App de novel·la sencera | `llegat/novella.html` | 22.572 línies. Només se n'han canviat les quatre rutes de `<script src>` a `../`. Cap canvi de lògica. |
| Suite de regressió de la novel·la | `llegat/proves/` (16 suites, `f0`…`f15`) | 278 comprovacions. Només se n'han canviat les rutes i les URL. Cap assert de comportament. |
| Mòdul de recuperació del NKG | `llegat/nkg_recovery.js` | Es carrega dinàmicament des de `models_openai.js` només quan hi ha el flux de novel·la al DOM. |

Els mòduls purs compartits (`perfils_autor_base.js`, `models_openai.js`,
`ui_fixes.js`, `nkg_core.js`) es queden a l'arrel: els comparteixen les dues apps.

## DESCARTEM

Maquinària que existeix per compensar que una novel·la no cap en un context. Un
conte de 15.000–20.000 caràcters hi cap sencer, i tot això deixa de tenir feina.

| Element | Per què no cal en un conte |
|---|---|
| NKG complet (graf de coneixement narratiu) | El seu paper és recordar fets a través de 30 capítols que no caben en context. El dossier del conte (< 3 kB) hi cap sencer a cada crida. |
| Bíblia narrativa | Mateix motiu: és un resum persistent d'un text que no cap. El conte sí que hi cap. |
| Jutge d'interval (cada 4 capítols) | Avalua trams perquè no es pot avaluar el conjunt. Un conte s'avalua sencer d'una sola passada. |
| Fils narratius i el seu seguiment | Un conte de 4–6 escenes té un sol fil; seguir-lo per codi no aporta res que no es vegi llegint l'escaleta. |
| Timelines i cronologia extensa | Substituïda pel camp `cronologia` del dossier: 3–6 fites, mai truncades. |
| Tancament per blocs / consolidació per blocs | Existeix perquè la reescriptura global no cap en una passada. La costura del conte es fa per pedaços sobre el text sencer. |
| Calibratge recall/precisió del lector | Necessita una mostra de moltes unitats llegides a mà. Amb un conte per sessió la mostra no arriba mai al mínim. |
| Control d'arcs de personatge | Un conte no té arc de transformació distribuït: té una decisió irreversible i el seu cost. |
| Epíleg | Forma pròpia de la novel·la. El desenllaç del conte és l'última escena i prou. |
| Panell de 25 píndoles d'estat | Reflecteix 25 fases. El pipeline nou en té 8 i el progrés cap en una sola barra. |
| Refinament arquitectònic per capítol (segona crida) | Duplicava el cost sense mètrica que demostrés que millorava res. El refinament del conte es fa un sol cop, a P5, i per pedaços. |
| Fases `fase-7`…`fase-24` de la interfície | Expansió a novel·la (món, elenc, veus, psicologia, matriu relacional, backstory, objectes, mapa, trames, estructura, escaleta, perspectiva, veu, control d'arcs). Cap d'elles cap en el pressupost de 24 crides. |

---

## Decisions preses durant E0 (contradiccions del pla amb el codi real)

Tres punts on l'encàrrec E0 xocava amb el repositori i com s'han resolt:

1. **`nkg_recovery.js` no era codi orfe.** El pla el descrivia com un fitxer que no
   carrega ningú. En realitat `models_openai.js` l'injectava dinàmicament a
   `DOMContentLoaded` (`carregarRecuperacioNKG`). S'ha mogut a `llegat/` amb la resta
   del mode novel·la i la injecció s'ha condicionat a la presència del flux de
   novel·la al DOM, perquè l'app de conte no en demani una còpia que no existeix.

2. **Servir des de `llegat/` no és compatible amb rutes `../`.** L'encàrrec demanava
   alhora que els `<script src>` apuntessin a `../` i que la suite s'executés amb el
   servidor arrelat a `llegat/`. Les dues coses juntes deixen els mòduls fora de
   l'arrel servida. El servidor s'arrela a l'arrel del repositori i l'app del llegat
   viu a `http://127.0.0.1:8099/llegat/novella.html`.

3. **Dos asserts comprovaven la ruta literal dels mòduls.** `f7` i `f8` comprovaven
   `<script src="perfils_autor_base.js">` i equivalents. Moure el document sense
   tocar-los els hauria fet fallar. S'ha actualitzat només el prefix de la cadena
   (`../`): la comprovació segueix sent la mateixa —que el mòdul es carrega— sobre la
   ruta nova. Cap assert de comportament s'ha tocat.

---

## Estat final de la conversió

| Element | Resultat |
|---|---|
| Suite del generador de contes | **234/234** comprovacions, codi de sortida 0 |
| Suite del mode novel·la congelat | **281/281** (eren 278: les 3 de diferència són l'autoprova de `f15`, que abans se saltava per manca de hunspell) |
| Crides per conte, camí típic | **11** (sostre dur 24) |
| Cost per conte, combinació recomanada | **0,41 $** · combinació econòmica **0,04 $** |
| Contes dins de [15.000, 20.000] sense intervenció | **5 de 5** perfils de desviació simulats |
| Motius repetits en deu generacions seguides | **0** |
| `llegat/` és esborrable sense trencar res | **Sí**, comprovat executant la suite sense el directori |

### Discrepàncies amb el pla que val la pena registrar

- **`nkg_recovery.js` no era codi orfe.** El pla demanava esborrar-lo perquè "no el
  carrega ningú"; en realitat `models_openai.js` l'injectava a `DOMContentLoaded`.
  S'ha mogut a `llegat/` amb la resta del mode novel·la i la injecció s'ha
  condicionat a la presència del flux de novel·la al DOM. Esborrar-lo hauria trencat
  el llegat congelat i la prova `f10`.
- **`nkg_core.js` no té el patró de doble entorn** que el pla donava per fet.
  És un script clàssic sense `module.exports`. `conte_core.js` i `llm_client.js` sí
  que el tenen; per carregar `nkg_core.js` des de node, les proves fan servir
  `runInThisContext`, que reprodueix el comportament del navegador.
- **El dossier ple ocupa ~3,5 kB, no menys de 3 kB.** Amb els mínims de l'esquema
  (4 fets canònics, 3 fites de cronologia, 1 secundari) baixa a 2,8 kB. El prompt
  limita cada camp de text a 160 caràcters i la interfície mostra la mida real amb el
  cost en tokens que suposa, perquè el dossier viatja sencer dins de cada crida
  d'escena. A la pràctica són ~1.000 tokens d'entrada per escena.
- **L'estimació inicial de 9 crides del pla era baixa.** El pipeline complet amb 5
  escenes en fa 11: 1 llavor + 1 dossier + 1 escaleta + 5 escenes + 1 costura +
  1 lectura + 1 pedaç dirigit. Segueix dins del marge declarat de 9–15.

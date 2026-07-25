# Revisió tècnica i pla de canvis — Booki

> Objectiu de l'encàrrec: (1) trobar per què l'app **dona errades**, (2) per què **no es genera
> visualment en ordre i sembla anar d'endavant cap enrere**, i (3) planificar els canvis per
> arribar a una novel·la d'excel·lència **amb l'estil real dels 4 autors** (Larsson, Dick,
> Castaneda, Tolkien).
>
> Data de la revisió: 2026-07-25 · Base: `54ea215`

---

## 0. Resum executiu

El codi **no està trencat sintàcticament**. Els dos blocs `<script>` d'`index.html` (18.775 línies
de JS) i els dos mòduls (`nkg_core.js`, `perfils_autor.js`) passen `node --check` net, i no hi ha
cap crida a funció inexistent. El problema és un altre, i és més greu:

1. **Hi ha un tall dur del flux que fa impossible acabar una novel·la nova.**
   Un projecte creat pel camí oficial (b1→b6) sempre acaba bloquejat abans del capítol 1, amb un
   missatge d'error i **sense cap botó que permeti resoldre'l**. No és intermitent: és determinista.

2. **El desordre visual té tres causes acumulades**, i la principal és un bug real de
   concurrència a l'efecte de màquina d'escriure: dos capítols poden escriure's **alhora dins del
   mateix contenidor**, barrejant text del capítol anterior amb el nou. A sobre, cada capítol
   força un `scrollIntoView` cap amunt mentre el text apareix cap avall.

3. **El motor de qualitat que la documentació promet ja no existeix al codi.**
   El jutge d'interval, el sistema de locks/immutabilitat i el bloc d'humanització estan
   *stubbed*, morts o mai implementats — però `AGENT.md`, el `README.md` i la pròpia UI els
   segueixen anunciant. La novel·la s'escriu, avui, sense cap control de coherència creuada.

4. **L'estil dels 4 autors arriba diluït i contradit.** El prompt base de novel·la imposa a totes
   les obres les tècniques de *Donna Tartt, Elena Ferrante i Carlos Ruiz Zafón* i una regla de
   "màxim 1 adjectiu per substantiu", que xoquen frontalment amb el perfil Tolkien i amb el
   registre didàctic de Castaneda. Els `criteris_excellencia` de cada autor existeixen però
   **només s'usen per avaluar a posteriori, mai per generar**.

El pla de la secció 5 ataca aquests quatre fronts en 5 fases, amb la F0 (desbloqueig) i la F1
(ordre visual) fent-se en el mateix dia de feina.

---

## 1. Com s'ha verificat

| Comprovació | Resultat |
|---|---|
| `node --check` dels 2 blocs inline + 2 mòduls | ✅ net |
| Crides a identificadors no definits (amb strings/comentaris/regex despullats) | ✅ cap |
| Funcions declarades dues vegades a nivell global | ⚠️ 1 (`renderitzarResumDramaticBiblia`, idèntica) |
| Traçat `funció → showCard(id)` de les 41 transicions de fase | ⚠️ 4 salts enrere i 1 sense scroll |
| Traçat del gate NKG des de b6 fins al capítol 1 | ⛔ bloqueig determinista |
| Cerca de codi mort després d'un `return;` primerenc | ⛔ 7 funcions del jutge |
| Cerca de cridadors de la capa de locks | ⛔ 0 cridadors |

---

## 2. Bloc A — Errors que trenquen el flux

### A1 ⛔ Un projecte nou **no pot arribar mai** al capítol 1 (bloquejant, determinista)

La cadena és aquesta:

1. `confirmarPersonatgesNou()` (`index.html:4390`) crea els personatges al NKG amb
   `objectius: []`, `secrets: []` i `trets_immutables: null` — sempre buits.
   El mateix passa al mode automàtic (`index.html:3793`).
2. En prémer "Redacció automàtica" o "Redacció manual" a la transició post-b6,
   `iniciarFase11()` executa el gate `validarNKGPreparatPerCapitol1()` (`index.html:9053`).
3. Aquest gate suma els errors de `detectarFaltantsDramaNKG()` (`nkg_core.js:557`), que per a
   cada personatge exigeix objectius i secrets, i a més exigeix
   **trama principal i subtrames** (`nkg_core.js:572-573`).
4. `ESTAT.trames` s'inicialitza a `{ trama_principal: null, subtrames: [] }` (`index.html:2934`) i
   **només l'omple `iniciarFaseTrames()` (fase-18)**, que el flux b1–b6 no visita mai.
5. Per tant el gate falla sempre → toast "Falten motors dramàtics al NKG" → `showCard('fase-22')`.

I aquí ve el problema real: **aquests errors no tenen cap manera de resoldre's des de la UI.**

- `renderitzarFaltantsDrama()` (`index.html:4916`) pinta els errors dramàtics com a `<li>` **sense
  cap botó d'acció**, a diferència dels errors de continuïtat.
- `mostrarFaltantsNKG()` (`index.html:4936-4941`) **deshabilita** el botó "Continuar → Escriptura"
  mentre hi hagi qualsevol error dramàtic.
- `obtenirAccioGeneracioPerFaltant()` (`index.html:4856`) no mapeja cap dels textos
  "no té objectius dramàtics accionables", "no té secrets…", "Falta trama principal…",
  "Falten subtrames connectades…", "massa personatges purament funcionals".
- `autocompletarNKGSilent()` (`index.html:5015`) itera **només** sobre `detectarFaltantsNKG`
  (continuïtat). No té cap pas per a objectius, secrets, trames ni subtrames.

Resultat: botó desactivat + llista d'errors sense botons = **cul-de-sac**. Existeixen
`generarObjectiusSecrets()` (`index.html:7051`) i `iniciarFaseTrames()` (`index.html:12357`) que
resoldrien el problema, però ningú els crida des d'aquí.

> **Detall revelador**: `ESTAT._modeCompatibilitatSnapshotsAntics` només s'assigna dins
> `aplicarSnapshotProjecte()` (`index.html:1869`), és a dir, en **importar una còpia**. Per a un
> projecte nou queda `undefined` → els errors dramàtics bloquegen. Un projecte antic importat, en
> canvi, passa. **Avui l'app funciona millor amb projectes vells que amb projectes nous.**

### A2 ⛔ El botó "Completar" dels contractes d'escena és codi inabastable

`obtenirAccioGeneracioPerFaltant()` retorna l'acció `scene_contracts` per als textos de contracte
incomplet, i `generarFaltantNKG()` la gestiona (`index.html:4901`). Però `mostrarFaltantsNKG()`
filtra les entrades dramàtiques **fora** de la llista que pinta botons (`index.html:4935`), i els
errors de contracte són dramàtics. La branca `scene_contracts` no s'executa mai des de la UI.

A més, quan una escaleta falla, `crearSceneContractFallbackLocal()` (`index.html:8835`) omple
`pov`, `objectiu_visible_pov`, `obstacle_concret` i `consequencia_narrativa` però deixa **buits**
`asimetria_poder`, `decisio_irreversible` i `cost_immediat`, que són obligatoris a
`detectarFaltantsSceneContract()` (`nkg_core.js:405`). El fallback genera, per disseny, un
bloqueig permanent.

### A3 ⚠️ `iniciarFase11()` esborra dades ja calculades

`index.html:9102` reinicialitza `ESTAT.llibreRegistre = { capitols: [], … }`, destruint els
`intensity_level` i `ganxo_final` per capítol que `confirmarEstructuraNou()` i
`iniciarEscaletaSeqNou()` acabaven d'omplir. El codi n'és conscient a mitges: hi ha un comentari a
`index.html:5146` que diu "persisteix quan iniciarFase11 reseteja llibreRegistre" i duplica només
els fils a `_estructuraCapitols`. La intensitat i el ganxo no es dupliquen.

### A4 ⚠️ Capa de locks i immutabilitat: morta

`setProvisionalLock()`, `setFinalLock()` i `congelerBloc()` (`index.html:9151-9192`) **no tenen cap
cridador**. `ESTAT._capitolsLocked[i] = true` només apareix a `index.html:16820`, que és codi mort
(darrere el `return;` de `executarJutgeInterval`). Conseqüència: `obtenirLockCapitol()` retorna
sempre `unlocked`, `canRewrite()` sempre autoritza, i tota la secció "Regles d'immutabilitat"
d'`AGENT.md` descriu un sistema que no s'executa.

### A5 ⚠️ El self-check d'invariants és buit

`selfCheckLockingInvariants()` (`index.html:9197`) valida que el codi font d'`executarJutgeInterval`
contingui `const MAX_ITER = 1;`. Com que la funció retorna a la segona línia i tota la
implementació queda com a codi mort **però present al `toString()`**, el check passa en verd
mentre el jutge no s'executa. És un test que no pot fallar.

### A6 ℹ️ Errors menors confirmats

| # | Ubicació | Problema |
|---|---|---|
| A6.1 | `index.html:1442` | Botó etiquetat "📖 Escriure capítols" que crida `iniciarFaseEscaleta()` i porta a l'escaleta (fase-20), no a l'escriptura. |
| A6.2 | `index.html:12218` i `16089` | `renderitzarResumDramaticBiblia()` declarada dues vegades, byte a byte idèntica. La segona guanya. |
| A6.3 | `perfils_autor.js:15` | `deteccio` de Larsson inclou `negr[ae]`. El to "humor negre i irònic" del selector (`index.html:886`) activa el perfil Larsson en textos on es passi el to. La detecció també depèn de l'ordre de claus de l'objecte: un text amb "noir" i "Tolkien" resol a Larsson. |
| A6.4 | `index.html:12588,12596` | `PROVIDER_DEFAULTS` porta `claude-opus-4-1` i `gemini-1.5-pro`, que no coincideixen amb el catàleg de models de `index.html:3001-3070`. Convé unificar-ho i revisar els identificadors contra la llista vigent de cada proveïdor abans de publicar. |
| A6.5 | `index.html:1686-1694` | `showCard/hideCard/showLoader/hideLoader/showBtn` fan `getElementById(...).classList` sense guarda de null: qualsevol id que no existeixi llança `TypeError` i talla el flux en sec en lloc d'avisar. |
| A6.6 | `index.html:5119` | Cada capítol es crea amb **exactament una escena** (`escenes: [{…}]`) i un sol `scene_contract`, amb `beat_narratiu: 'diàleg'` fix. Un capítol de 3.000 paraules amb un únic contracte dramàtic és estructuralment pla. |

---

## 3. Bloc B — Per què "no es genera visualment en ordre, anant d'endavant a enrere"

Són **tres causes independents** que se sumen. La primera és un bug de veritat; les altres dues
són decisions de disseny que produeixen la sensació de retrocés.

### B1 ⛔ Causa principal: l'efecte de màquina d'escriure no és cancel·lable

`efecteEscripturaHTML()` (`index.html:2489`) escriu caràcter a caràcter amb `await setTimeout` i
**no té cap token de cancel·lació**. `mostrarCapitol()` (`index.html:10958`) la crida
**sense `await`**, sempre sobre el mateix element `#capitol-actual-cos`.

Què passa quan el capítol N+1 arriba abans que acabi de "teclejar-se" el capítol N:

1. La segona invocació fa `el.innerHTML = ''`.
2. La primera invocació **continua viva**: manté referències als seus nodes `<p>` i segueix
   afegint-hi caràcters, i segueix afegint paràgrafs nous a `el`.
3. El resultat és text del capítol anterior intercalat entre paràgrafs del capítol nou,
   en ordre arbitrari. **Literalment, prosa que salta endavant i enrere.**
4. A més, el `el.onclick = null` de la crida vella (`index.html:2530`) elimina el gestor de
   "saltar l'efecte" que acaba d'instal·lar la crida nova.

Els números fan que això sigui gairebé inevitable: a `3 ms` per caràcter, un capítol de 3.000
paraules (~18.000 caràcters) triga **uns 54 segons** a acabar de pintar-se, i programa 18.000
`setTimeout`. Dins del bucle es llegeix `scrollHeight`/`scrollTop` a cada caràcter
(`index.html:2504-2507`), forçant 18.000 reflows.

El `saltarEfecte` tampoc salva la situació: només es comprova al bucle **exterior**, entre nodes de
primer nivell (`index.html:2523`). Clicant enmig d'un paràgraf llarg, no passa res fins que aquell
paràgraf acaba.

### B2 ⚠️ El scroll va cap amunt mentre el text apareix cap avall

`mostrarCapitol()` fa `setTimeout(() => fase-23.scrollIntoView({block:'start'}), 100)`
(`index.html:10955`). Això col·loca la vista a **l'inici de la card** — és a dir, a la llista de
capítols i al panell del jutge — just quan el text comença a escriure's molt més avall. L'usuari
veu la pàgina saltar cap amunt i el contingut créixer fora de la pantalla.

### B3 ⚠️ Salts de fase enrere, i un salt sense scroll

Les cards estan al DOM en ordre correcte (fase-0, b1…b6, 1…24) i només es commuta `hidden`. El
desordre el produeix el flux:

| Origen | Destí | Efecte |
|---|---|---|
| `iniciarFase11` (`index.html:9062`) | `fase-22` (línia 1474) | **Sense `scrollIntoView`.** L'usuari prem el botó al peu de fase-b6, la vista no es mou i sembla que el botó no faci res. És el símptoma "dona errades i no passa res". |
| `generarFaltantNKG` → `iniciarFaseMapaEspacialRegles` | `fase-17` (línia 1392) | Salt cap amunt, amb scroll. L'etiqueta del botó és literalment "Anar al pas 17". |
| `generarFaltantNKG` → `iniciarFasePerspectivaCronologia` | `fase-21` (línia 1457) | Ídem, "Anar al pas 21". |
| `iniciarFaseVeuExemples` (`index.html:8294`) | `fase-21` | Retrocés quan falta POV/cronologia. |
| `etapaContinuarFonaments` (`index.html:2645`) | **sempre `fase-b1`** | `ESTAT.fase` només s'assigna a `'b1'` (`index.html:3708,3719`); mai a `'b2'`…`'b6'`. Siguis on siguis dels fonaments, el botó del panell et torna al **primer** pas (els finals). |

I hi ha un quart retrocés, aquest a l'ordre de la novel·la mateixa: `esCapitolReservat()`
(`index.html:9725`) **exclou els dos últims capítols del bucle normal**. Es marquen com a pendents,
el bucle acaba, i després apareix un botó per generar-los a part
(`mostrarBotoGenerarReservats`, `index.html:10170`). La llista de capítols, doncs, es completa
1→11 i després torna enrere a omplir el 12 i el 13.

> Nota: que el **contingut** es dissenyi des del final cap enrere (b1 = final, b2 = tema…) és una
> decisió deliberada i correcta, i la card fase-0 ho explica ("partint del final"). Això no és el
> bug. El bug és B1, i la confusió és B2+B3.

---

## 4. Bloc C — Deute que impedeix l'excel·lència

### C1 ⛔ El jutge d'interval no existeix

Set funcions retornen abans d'executar res, amb tot el cos com a codi mort:

| Funció | Línia | Estat |
|---|---|---|
| `revisioArquitectaAmbContinuitat` | 9659 | `return { veredicte: 'APROVAT' }` incondicional |
| `reescriureAmbCorreccions` | 9664 | retorna el text sense tocar |
| `tancamentBlocComplet` | 9718 | no-op |
| `jutgePanelIniciar/Log/Finalitzar` | 16507-16509 | només `console.log` |
| `jutgeIntervalInconsistencies` | 16512 | retorna `net: true` sempre |
| `aplicarCorreccionsJutge` | 16628 | retorna `[]` |
| `executarJutgeInterval` | 16707 | `return;` a la segona línia |

Conseqüència directa sobre la qualitat: **cap contradicció entre capítols es detecta mai**. El que
queda viu és `processarDerivatsBlocAbansJutge()` (`index.html:9702`), que actualitza KSN, fils, NKG
i bíblia — o sigui, es *registra* l'estat però no es *verifica* res.

`AGENT.md` (§ "Regles del jutge d'interval"), el `README.md` ("Escriu capítols amb revisió") i el
panell d'etapes (`index.html:2606`: "Capítols amb jutge de coherència i humanització") descriuen
tots tres un sistema que no s'executa.

### C2 ⛔ El bloc d'humanització no s'ha implementat mai

`humanitzacio_capitol_bloc.md` defineix sis mecanismes concrets (microruptura, cos, objecte
emocional, temps mort, diàleg imperfecte, waypoint/cost) i `ESTRATEGIA_REORGANITZACIO.md` § 3 el
llista com a "palanca de qualitat ja existent — no tocar, només connectar".

**No hi és.** Cap cadena del fitxer (`MICRORUPTURA`, `TEMPS MORT`, `OBJECTE EMOCIONAL`, `gest
inútil`) apareix enlloc d'`index.html`. L'única coincidència de "humanitz" al codi és el text
`"per humanitzar la tensió"` dins d'una instrucció genèrica de sensorialitat
(`index.html:14468`). És, probablement, la peça amb millor relació valor/esforç de tot el projecte:
està escrita i només cal injectar-la.

### C3 ⛔ El prompt base contradiu els perfils d'autor

`getSystemPromptNovella()` (`index.html:13953`) injecta a **totes** les novel·les:

- `index.html:13954` — *"Apliques les tècniques de Donna Tartt, Elena Ferrante i Carlos Ruiz
  Zafón"*. Tres autors que no són cap dels quatre perfils, imposats per damunt del perfil triat.
  Una novel·la Tolkien rep instruccions de fer Ferrante.
- `index.html:13967` — *"PROSA: Evita el barroquisme. Màxim 1 adjectiu rellevant per substantiu."*
  Xoca frontalment amb el perfil Tolkien, que demana "prosa èpica, lírica i detallada" i "frases
  llargues i rítmiques" (`perfils_autor.js:53,56`).
- *"ANTI-EXPOSICIÓ: prohibit que cap personatge expliqui directament els seus plans o
  motivacions"*. Xoca amb Castaneda, on "el diàleg és el vehicle principal de l'ensenyament"
  i tota l'obra és un mestre explicant-se a un aprenent (`perfils_autor.js:107`).
- *"SHOW, DON'T TELL: prohibit etiquetar emocions"* aplicat sense matís retalla les espirals de
  pensament paranoic que el perfil Dick demana explícitament (`perfils_autor.js:83`).

El resultat previsible és una prosa mitjana homogènia: tots quatre autors sonen igual perquè el
80 % de les instruccions d'estil són compartides i les específiques queden en minoria.

### C4 ⚠️ Els perfils són asimètrics i els criteris d'excel·lència no generen res

| Camp | larsson | tolkien | dick | castaneda |
|---|:---:|:---:|:---:|:---:|
| `estil` | ✅ | ✅ | ✅ | ✅ |
| `ambientacio` | ✅ | ✅ | ✅ | ✅ |
| `criteris_excellencia` | ✅ | ✅ | ✅ | ✅ |
| `regles_dures` | ✅ | ❌ | ❌ | ❌ |
| `intensitat` | ❌ | ✅ | ❌ | ✅ |

`intensitat` només afecta Tolkien i Castaneda (`index.html:14462`); Larsson i Dick cauen a la
branca genèrica. `regles_dures` només existeix per a Larsson (`index.html:13951`).

I el més important: els `criteris_excellencia` **només s'usen a `generarInformeExcellencia()`**
(`index.html:2800`), una avaluació post-mortem, informativa, que a més només llegeix els primers
6.000 caràcters de cada capítol (~1/3 d'un capítol de 3.000 paraules). Mai s'injecten com a
restricció de generació. S'avalua allò que no s'ha demanat.

### C5 ⚠️ `reglaAmbientacioAutor` no arriba a l'escriptura

Es crida en set punts (`index.html:17363-17716`), tots dins dels prompts del flux b1–b6.
**Cap dins del prompt de capítol.** L'escriptura només rep la línia d'ambientació que ja va dins
del bloc `estil` del perfil, sense la prohibició explícita de traslladar l'acció a Catalunya. En
capítols llargs i tardans, el model deriva.

---

## 5. Pla de canvis

Cinc fases. La F0 i la F1 són el mínim per tenir una app utilitzable; la F2–F4 són el camí a
l'excel·lència. Cada fase té criteri de fet verificable.

### F0 — Desbloquejar el flux *(mig dia · imprescindible)*

L'objectiu és que un projecte nou pugui arribar al capítol 1 pel camí oficial, sense culs-de-sac.

**F0.1 · Omplir els motors dramàtics dins del flux b1–b6.**
A `confirmarPersonatgesNou()` (`index.html:4390`), després de poblar el NKG, encadenar
`generarObjectiusSecrets()` (ja existeix, `index.html:7051`) perquè `objectius` i `secrets` no
neixin buits. Aprofitar que el pas b3 ja té els personatges seleccionats i la sinopsi.

**F0.2 · Generar trames dins del flux.**
Afegir una crida a la generació de trames entre b5 (estructura) i b6 (escaleta), reutilitzant
`iniciarFaseTrames()`/`generarTrames()` en mode silenciós. Alternativament, derivar
`trama_principal` i `subtrames` de l'estructura de capítols ja generada. Sense això, els errors
"Falta trama principal" i "Falten subtrames connectades" són permanents.

**F0.3 · Cap error sense acció.**
Reescriure `renderitzarFaltantsDrama()` (`index.html:4916`) perquè pinti el mateix patró
`<li> + botó` que `mostrarFaltantsNKG()`, i estendre `obtenirAccioGeneracioPerFaltant()`
(`index.html:4856`) amb els mapatges que falten:

| Text del faltant | Acció nova |
|---|---|
| `no té objectius dramàtics accionables` | `objectius_secrets` → `generarObjectiusSecrets()` |
| `no té secrets, pressions ocultes` | `objectius_secrets` |
| `Falta trama principal amb conflicte causal` | `trames` → generació de trames |
| `Falten subtrames connectades` | `trames` |
| `Contracte d'escena … incomplet` | `scene_contracts` (ja existeix, avui inabastable) |

Regla que ha de quedar escrita a `AGENT.md`: **cap validador pot bloquejar un botó sense oferir
l'acció que resol el bloqueig.**

**F0.4 · Estendre `autocompletarNKGSilent()`** (`index.html:5015`) amb els passos
`objectius_secrets` i `trames`, i fer que iteri sobre `validarNKGPreparatPerCapitol1()` (errors de
continuïtat **i** dramàtics), no només sobre `detectarFaltantsNKG()`.

**F0.5 · Fallback de contracte d'escena complet.**
`crearSceneContractFallbackLocal()` (`index.html:8835`) ha d'omplir també `asimetria_poder`,
`decisio_irreversible` i `cost_immediat` amb valors derivats de la funció narrativa del capítol.
Un fallback que garanteix un estat invàlid no és un fallback.

**F0.6 · No destruir dades.**
A `iniciarFase11()` (`index.html:9102`), fusionar `llibreRegistre` en lloc de reinicialitzar-lo,
preservant `intensity_level`, `ganxo_final` i els fils per capítol.

**F0.7 · Guardes de null** a `showCard/hideCard/showLoader/hideLoader/showBtn`
(`index.html:1686-1694`): `document.getElementById(id)?.classList…` i un `console.warn` amb l'id.

*Criteri de fet F0*: crear un projecte nou de 10 capítols amb cada un dels 4 perfils i arribar al
capítol 1 **sense tocar cap card de les fases 7–22 manualment**, amb el checklist de faltants en
verd.

---

### F1 — Arreglar l'ordre visual *(mig dia · imprescindible)*

**F1.1 · Fer cancel·lable l'efecte d'escriptura.** *(la correcció clau)*
A `efecteEscripturaHTML()` (`index.html:2489`):

```js
const TOKENS_ESCRIPTURA = new Map();

async function efecteEscripturaHTML(elementId, htmlContent, msPerChar = 3) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const token = Symbol(elementId);
  TOKENS_ESCRIPTURA.set(elementId, token);      // invalida qualsevol efecte anterior
  const viu = () => TOKENS_ESCRIPTURA.get(elementId) === token;
  // … dins de typeNode i dels dos bucles: if (!viu()) return;
  // … el.onclick = null només si viu()
}
```

Amb això, quan arriba el capítol N+1, el bucle del capítol N mor en el següent caràcter en lloc de
seguir escrivint dins del mateix contenidor.

**F1.2 · Comprovar `saltarEfecte` també dins de `typeNode`**, no només entre nodes de primer
nivell, perquè el clic per accelerar respongui immediatament.

**F1.3 · Escala el temps al volum.** Substituir el `msPerChar` fix per un pressupost total:
`msPerChar = Math.max(0.2, PRESSUPOST_MS / htmlContent.length)` amb `PRESSUPOST_MS ≈ 8000`. Un
capítol es pinta en ~8 s en lloc de ~54 s, i el nombre de `setTimeout` cau un ordre de magnitud.
Afegir un interruptor "Desactivar l'efecte d'escriptura" a la configuració, per als usuaris que
generen novel·les de 20 capítols.

**F1.4 · Treure el reflow per caràcter.** El bloc de scroll de `index.html:2504-2507` s'executa a
cada lletra. Passar-lo a cada final de paràgraf o dins d'un `requestAnimationFrame`.

**F1.5 · Scroll a la posició correcta.** `mostrarCapitol()` (`index.html:10955`) ha de fer
`scrollIntoView({ block: 'start' })` sobre **`#capitol-actual-titol`**, no sobre `#fase-23`.

**F1.6 · Cap transició sense scroll.** Afegir `scrollIntoView` a `iniciarFase11()`
(`index.html:9062`) quan mostra `fase-22`, i convertir el toast en un missatge dins la card de
destí. Regla general: **tot `showCard(x)` d'una transició de flux ha d'anar seguit d'un scroll a
`x`.**

**F1.7 · `ESTAT.fase` real durant els fonaments.** Assignar `'b2'`…`'b6'` a cada
`confirmar*Nou()`, perquè `etapaContinuarFonaments()` (`index.html:2645`) et torni **al pas on
eres**, no sempre a b1.

**F1.8 · Fer visible que els dos últims capítols són reservats.** A `renderLlistaCapitols()`
(`index.html:9338`), marcar-los amb una icona i el text "reservat per a Opus" des del principi, en
lloc de deixar-los com a `○` pendents indistingibles. Així el retorn enrere a omplir-los deixa de
semblar un error.

**F1.9 · Reordenar les etiquetes contradictòries.** Corregir el botó de `index.html:1442`
("Escriure capítols" → "Escaleta per escenes"), i canviar "Anar al pas 17"/"Anar al pas 21" per
"Completar mapa i regles"/"Completar POV i cronologia" — el número de pas ja no vol dir res al
flux nou.

*Criteri de fet F1*: generar 4 capítols seguits en mode automàtic i verificar per gravació de
pantalla que (a) mai apareix text de dos capítols barrejat, (b) la vista queda sempre al títol del
capítol que s'està escrivint, (c) cap clic deixa la pàgina immòbil.

---

### F2 — Reactivar el control de coherència *(2-3 dies)*

Sense això no hi ha excel·lència possible: una novel·la de 13 capítols escrita sense cap
verificació creuada acumula contradiccions.

**F2.1 · Decidir i documentar.** Primer cal una decisió explícita: es recupera el jutge o es
declara mort? Avui està en un limbe que fa mentir tres documents i la UI. Si es recupera, el codi
mort de `executarJutgeInterval` (`index.html:16710-16830`) és una base sòlida i completa.

**F2.2 · Recuperar-lo com a jutge de bloc, single-pass i no destructiu.**
Mantenir `MAX_ITER = 1` i l'ordre descendent de reescriptura (cap.4→cap.1) que documenta
`AGENT.md`, però **sense reescriure res durant l'animació**: el jutge s'executa al tancament de
bloc, amb el panell `#jutge-panel` (que ja existeix i està buit) mostrant el progrés real.

**F2.3 · Substituir el self-check fals.** `selfCheckLockingInvariants()` (`index.html:9197`) ha de
comprovar **comportament**, no text del `toString()`: executar el jutge amb un bloc de prova i
verificar que fa exactament una iteració i que bloqueja l'interval.

**F2.4 · Activar la capa de locks.** Cridar `setProvisionalLock()` al tancament de cada bloc i
`congelerBloc()` quan el jutge acaba net (`index.html:9151-9192`, avui sense cridadors). Sense
això, `canRewrite()` sempre diu que sí i la immutabilitat és decorativa.

**F2.5 · Connectar el ganxo de contradiccions tardanes.**
`registrarContradiccioTardana()` (`index.html:2697`) està implementada i no la crida ningú des del
jutge (l'`ESTRATEGIA` ja ho reconeixia com a pendent). És el mecanisme correcte quan la
contradicció es detecta amb el capítol d'origen ja congelat: reconciliar cap endavant.

**F2.6 · Alinear la documentació amb la realitat.** `AGENT.md` § immutabilitat i § jutge, el
`README.md` i el text del panell (`index.html:2606`) han de descriure el que s'executa. Si una
peça queda desactivada, ha de dir-ho la UI, no un comentari al codi.

*Criteri de fet F2*: introduir deliberadament una contradicció factual al capítol 2 (canviar la
ubicació d'un objecte) i verificar que el jutge del bloc 1–4 la detecta, la corregeix o obre un fil
`error-continuïtat`, i que l'interval queda bloquejat després.

---

### F3 — L'estil dels 4 autors, de veritat *(2-3 dies · el nucli de l'encàrrec)*

**F3.1 · Netejar el prompt base.** Treure de `getSystemPromptNovella()` (`index.html:13953`) tot el
que és estilístic i no universal:

- Eliminar la línia de Tartt/Ferrante/Zafón (`index.html:13954`).
- Moure "Evita el barroquisme / màxim 1 adjectiu" (`index.html:13967`) a `regles_dures` de Larsson
  i Dick, i escriure la regla oposada per a Tolkien.
- Convertir "ANTI-EXPOSICIÓ" i "SHOW, DON'T TELL" en **camps per perfil**, no en regles globals.
  Castaneda necessita exposició didàctica; Dick necessita monòleg intern.

Al prompt base només hi han de quedar les regles realment invariables: llengua catalana, format de
diàleg amb guió llarg, prohibició de metadades, continuïtat entre escenes.

**F3.2 · Completar la matriu de perfils.** Que els quatre tinguin els cinc camps:

```js
larsson:   { …, regles_dures: ✅, intensitat: ← afegir }
tolkien:   { …, regles_dures: ← afegir (prosa àmplia, permet subordinades),
                intensitat: ✅ }
dick:      { …, regles_dures: ← afegir (frase curta, gir ontològic, monòleg permès),
                intensitat: ← afegir }
castaneda: { …, regles_dures: ← afegir (diàleg didàctic permès, ambigüitat no resolta),
                intensitat: ✅ }
```

**F3.3 · Convertir els `criteris_excellencia` en restriccions de generació.**
Avui només avaluen (`index.html:2800`). Injectar-los al prompt de capítol com a
"CONDICIONS D'ACCEPTACIÓ D'AQUEST CAPÍTOL", amb la clàusula que **almenys un** criteri s'ha de
manifestar de manera verificable a cada capítol. És el canvi de major impacte de tota la fase:
avui es demana prosa genèrica i s'avalua estil d'autor.

**F3.4 · Injectar `reglaAmbientacioAutor()` al prompt de capítol.** Afegir-la al `blocPerfilText`
de `construirPayload()` (`index.html:14414`), dins del bloc amb `cache_control` perquè no costi
tokens per capítol.

**F3.5 · Blindar la detecció de perfil.** A `obtenirPerfilAutorId()` (`perfils_autor.js:121`):
treure `negr[ae]` de la deteccio de Larsson (col·lisiona amb el to "humor negre" de
`index.html:886`), acotar `dick` a `philip.*dick` i, sobretot, **fer que el selector explícit
d'autor guanyi sempre** sobre qualsevol detecció per text. La detecció per regex només hauria de
ser un fallback per a snapshots antics, tal com ja diu la docstring.

**F3.6 · Connectar el bloc d'humanització.** Implementar `construirBlocHumanitzacio(capitol)` a
partir de `humanitzacio_capitol_bloc.md`, parametritzat per perfil tal com suggeria
`ESTRATEGIA_REORGANITZACIO.md` § 3:

| Perfil | "Gest inútil" | "Objecte emocional" |
|---|---|---|
| Larsson | ritual de cafè i tabac, revisar el mòbil sense mirar-lo | una carpeta d'arxiu amb l'etiqueta esborrada |
| Dick | comprovar dues vegades un aparell que ja funciona | un objecte de consum amb la marca mal impresa |
| Castaneda | endreçar les pertinences abans d'una tasca del mestre | una planta seca guardada en un drap |
| Tolkien | polir una eina que ja està neta | un anell, una fíbula, una moneda antiga |

Injectar-lo a `construirPayload()` amb els valors reals del capítol (personatge POV, necessitat
interna, waypoint, temperatura emocional), que ja són tots a `ESTAT`.

**F3.7 · Més d'una escena per capítol.** A `iniciarEscaletaSeqNou()` (`index.html:5119`), demanar
i desar **2-4 escenes per capítol** amb un `scene_contract` cadascuna, en lloc d'una sola amb
`beat_narratiu` fix. És el que la `README` § "Scene Conflict Layer" ja promet i el que evita el
capítol pla.

*Criteri de fet F3*: generar el mateix capítol 1 amb els 4 perfils a partir del mateix tema i
verificar a cegues que un lector els pot atribuir correctament. L'informe d'excel·lència ha de
donar ≥ 3/4 criteris complerts sense retocs manuals.

---

### F4 — Tancament i higiene *(1 dia)*

- **F4.1** Eliminar la duplicació de `renderitzarResumDramaticBiblia` (`index.html:12218`/`16089`).
- **F4.2** Unificar `PROVIDER_DEFAULTS` (`index.html:12585`) amb el catàleg de models
  (`index.html:3001`), i revisar els identificadors contra la llista vigent de cada proveïdor.
- **F4.3** Fer que `generarInformeExcellencia()` (`index.html:2800`) avaluï el capítol sencer, no
  els primers 6.000 caràcters.
- **F4.4** Decidir el futur de `nkg_biblia.html` — congelat des de l'Etapa A i amb una llista
  d'autors diferent (Rodoreda, Le Guin, Murakami). O s'elimina, o s'alinea.
- **F4.5** Actualitzar `AGENT.md`, `README.md` i `CODI_UTIL_FUNCIONANT.md` amb l'estat real
  després de F0–F3.

---

## 6. Ordre recomanat i dependències

```
F0 (desbloqueig) ──┬──> F2 (jutge)  ──┐
                   │                   ├──> F4 (higiene i docs)
F1 (ordre visual) ─┴──> F3 (estil) ───┘
```

F0 i F1 són independents entre elles i es poden fer en paral·lel; totes dues són prèvies a
qualsevol prova end-to-end seriosa. F3 és la que respon directament a l'encàrrec d'excel·lència,
però sense F0 no es pot arribar a escriure el capítol 1 per comprovar-ho.

**Si només es pot fer una cosa:** F0.1 + F0.3 (desbloqueig) i F1.1 (token de cancel·lació). Són
poques línies i eliminen els dos símptomes que l'usuari reporta.

---

## 7. Annex — Mapa de fases (l'estat real avui)

La numeració de funcions i la de cards fa temps que van divergir. Aquesta taula és la referència
per a qualsevol canvi al flux.

| Card | Contingut | Funció que la mostra | Següent segons el botó |
|---|---|---|---|
| `fase-0` | Crear nova novel·la | `guardarIComencar` | `iniciarNovaCreacio` → `iniciarModeGuiat` |
| `fase-b1` | Final narratiu | `iniciarModeGuiat` | `confirmarFinalNou` |
| `fase-b2` | Tema | `confirmarFinalNou` | `confirmarTemaNou` |
| `fase-b3` | Personatges | `confirmarTemaNou` | `confirmarPersonatgesNou` |
| `fase-b4` | Món | `confirmarPersonatgesNou` | `confirmarMonNou` |
| `fase-b5` | Estructura | `confirmarMonNou` | `confirmarEstructuraNou` |
| `fase-b6` | Escaleta | `confirmarEstructuraNou` | `mostrarResumNKGiTransicio` |
| — | *transició* | — | `modeRedaccioAutomatic` o `iniciarFase11` |
| `fase-7`…`fase-17` | Món, elenc, veus, psicologia, ferida, relacions, backstory, personatges, objectius, objectes, mapa | `iniciarFase7`…`iniciarFaseMapaEspacialRegles` | **no es visiten al flux nou** |
| `fase-18` | Trames | `iniciarFaseTrames` | **no es visita al flux nou** ⚠️ (causa d'A1) |
| `fase-19` | Estructura novel·la | **`iniciarFase10`** | `iniciarFaseEscaleta` (botó mal etiquetat) |
| `fase-20` | Escaleta per escenes | `iniciarFaseEscaleta` | `iniciarFasePerspectivaCronologia` |
| `fase-21` | POV i cronologia | `iniciarFasePerspectivaCronologia` | `iniciarFaseVeuExemples` |
| `fase-22` | Veu, exemples i **faltants NKG** | `iniciarFaseVeuExemples` / `iniciarFase11` | `iniciarFase11` |
| `fase-23` | Escriptura de capítols | **`iniciarFase11`** | `iniciarFase12` |
| `fase-24` | Control d'arcs i export | **`iniciarFase12`** | — |

Nota: `iniciarFase10` → card 19, `iniciarFase11` → card 23, `iniciarFase12` → card 24. Renombrar-les
(`iniciarFaseEstructuraNovella`, `iniciarFaseEscriptura`, `iniciarFaseControlArcs`) és barat i
elimina una font constant d'errors de manteniment.

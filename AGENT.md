# AGENTS.md — Booki

## Descripció del projecte

Booki és una aplicació web (single-file `index.html` amb JS incrustat) que transforma un conte breu en una novel·la completa mitjançant un pipeline seqüencial: configuració de models → món/personatges/veus/psicologia → disseny de trames → estructura → escaleta → escriptura de capítols amb revisió.

## Idioma

- Tot el text visible a la UI ha de ser en català.
- Tots els prompts interns enviats als LLM han de ser en català.
- Els comentaris al codi poden ser en català o anglès, però els noms de funcions i variables es mantenen tal com estan (no canviar noms existents sense instrucció explícita).

## Regles d'immutabilitat

1. **Capítols bloquejats són immutables.** Cap funció pot modificar el text d'un capítol que tingui `ESTAT._capitolsLocked[idx].locked === true`.
2. **Intervals bloquejats no es re-jutgen.** Si `ESTAT._intervalLocks[intervalId]` existeix i està bloquejat, el jutge d'interval no s'hi torna a executar.
3. **No hi ha reescriptures destructives.** Sobre capítols bloquejats només es permeten actualitzacions "gratuïtes": perfils, fets canònics, KSN. Mai retocar el text.

## Regles del jutge d'interval

- El jutge s'executa **exactament 1 vegada** per interval (single-pass). `MAX_ITER = 1`.
- S'invoca des de `tancamentBlocComplet`, que `generarCapitol` crida cada 4 capítols
  i al darrer (`esTancamentBloc`).
- **La detecció sempre s'executa; la reescriptura de capítols és opcional.**
  `USER_CONFIG.jutgeReescriu` (casella de configuració, desactivada per defecte)
  decideix quin dels dos modes s'aplica:
  - **desactivada (per defecte)**: el jutge no toca cap text. Cada instrucció de
    correcció es registra amb `registrarContradiccioTardana()` com a fil
    `error-continuïtat` d'alta prioritat, i el capítol següent l'ha de reconciliar.
    Els capítols queden editables.
  - **activada**: el jutge reescriu **en ordre descendent** (índex més alt primer:
    cap.4 → cap.3 → cap.2 → cap.1) i, en acabar, congela els capítols del bloc
    (`setFinalLock`), que passen a ser immutables.
- Després de cada reescriptura individual, es resincronitzen registre i NKG abans de
  passar al capítol següent.
- Un cop el jutge acaba, l'interval queda bloquejat (`_intervalLocks`) en tots dos
  modes: és el que garanteix el single-pass.
- Les correccions de perfils i fets canònics (`aplicarCorreccionsPerfilsJutge`) són
  "gratuïtes" i s'apliquen sempre: no toquen el text de cap capítol.
- `selfCheckLockingInvariants()` verifica **comportament**, no text del `toString()`.
  Si afegeixes una peça al jutge, afegeix-la també a la seva llista.

## Context als prompts (estalvi de tokens)

- **Capítols bloquejats** entren als prompts només com a KSN + resum curt. Mai text complet.
- **Capítols de l'interval actiu** entren com a KSN + resum llarg. Text complet només si cal verificar una contradicció factual concreta.
- **Fils narratius** entren com a estructura tipada (id, categoria, estat), no com a text lliure.

## Estructura KSN (Kernel de Seguiment Narratiu)

Cada capítol té un objecte `llibreRegistre.capitols[idx].ksn` amb:

```json
{
  "ksn_core": "string (80-140 paraules: situació final i ganxos)",
  "canon_facts": ["string (màx. 8 fets inamovibles)"],
  "character_end_state": { "nom": "ubicació + intenció + estat emocional" },
  "object_moves": [{ "objecte": "de/a + ubicació" }],
  "time_anchor": "string (opcional: data/hora si rellevant)",
  "threads_delta": {
    "opened_ids": ["màx. 3"],
    "advanced_ids": ["màx. 3"],
    "closed_ids": ["màx. 2"]
  },
  "constraints_next": ["string (màx. 6: 'No fer X / Has de mantenir Y')"]
}
```

## Fils narratius

- Límit dur: màxim **30 fils vius** simultàniament.
- Cada fil té: `id` estable, `descripció`, `categoria` (trama principal / subtrama / atmosfèric / worldbuilding / error-continuïtat), `prioritat`, `capitol_origen`, `capitol_objectiu_tancament`, `estat` (obert / avançat / tancat).
- La deduplicació es fa per `id` i per mapa d'aliassos, no per coincidència de text.
- Un fil nou ha de ser: aliàs d'un fil existent, part d'una subtrama existent, o rebutjat.

## Generació que escala amb la mida de la novel·la

Cap pas pot demanar a l'LLM una resposta que creixi amb el nombre de capítols
dins d'un límit de tokens fix. Si ho fa, una novel·la llarga topa amb el límit,
la resposta arriba tallada i `parseJsonRobust` la "repara": el pas sembla haver
anat bé però hi falten capítols, o mor amb un "Resposta invàlida".

Regles per a qualsevol pas nou que produeixi una llista per capítol:

1. **Genera per blocs** (`BLOC_PERSPECTIVA`, `BLOC` de l'escaleta) o, com a
   mínim, calcula `maxTokens` a partir del nombre de capítols
   (`pressupostTokensLlistaCapitols`, `pressupostTokensPerspectivaBloc`).
   Sempre passat per `capsMaxTokens` perquè no superi el `max_output` del model.
2. **Comprova la cobertura per capítol**, no que la llista no sigui buida
   (`faltantsPerspectivaCronologia`, `completarLlistaPerCapitol`).
3. **Reclama el que falti** i, si el model continua sense col·laborar, omple-ho
   per codi (`completarPerspectivaCronologiaLocal`). Els reintents han de tenir
   sostre: `MAX_RECUPERACIONS_PERSPECTIVA`.
4. **Informa del progrés** al loader de la fase: un pas llarg sense senyal de
   vida és indistingible d'un pas penjat.
5. **No enviïs el NKG ni les escaletes senceres** al prompt si el pas només
   necessita un resum: infla el prompt, el cost i el raonament del model.

### OpenAI (GPT-5) i el pressupost de raonament

A GPT-5 el raonament intern es descompta de `max_completion_tokens`, així que el
pressupost real de contingut és *(límit − tokens de raonament)*. `buildOpenAIPayload`
hi reserva un marge proporcional (`reservaRaonamentGPT5`, mínim 4096) i
`executarOpenAIAmbControlBuit` torna a demanar la resposta si arriba tallada amb
menys contingut del que s'havia demanat. No tornis a un marge fix.

## Funcions principals (referència ràpida)

| Àrea | Funcions |
|---|---|
| Jutge d'interval | `executarJutgeInterval`, `jutgeIntervalInconsistencies`, `aplicarCorreccionsJutge` |
| Pipeline post-capítol | `arxitectePostCapitol` |
| Reescriptura | `microReescripturaBlocOpus`, `executarLoopCoherenciaFinal` |
| Seguiment narratiu | `actualitzarFilsNarratius`, `reconciliarFilsRegistre`, `generarDirectivaFils` |
| NKG | `nkgActualitzarPostEscena` |
| Fase 21 per blocs | `generarPerspectivaCronologia`, `generarPerspectivaCronologiaBloc`, `fusionarBlocPerspectiva`, `completarPerspectivaCronologiaLocal` |
| Pressupost de tokens | `getMaxTokens`, `capsMaxTokens`, `limitSortidaGPT5`, `executarOpenAIAmbControlBuit` |
| Diagnòstic | `exportarDiagnosticResums` |

## Regles de dramatització 9/10

- Cap escena sense objectiu visible del POV.
- Cap escena sense obstacle concret o oposició activa.
- Cap escena sense cost immediat per algun personatge.
- Cap escena sense conseqüència narrativa o decisió irreversible.
- No substituir una escena per resum temàtic o formulació moral abstracta.
- No repetir motius simbòlics sense una nova funció dramàtica.

## Estat persistent (localStorage)

- `ESTAT._capitolsLocked`: `{ [idx]: { locked, lockedAtISO, intervalId, hash } }`
- `ESTAT._intervalLocks`: `{ [intervalId]: { fromIdx, toIdx, lockedAtISO, net } }`
- Les snapshots d'ESTAT es guarden a localStorage. No trencar l'estructura existent; afegir camps nous és acceptable.

## Regles de flux i validació (F0/F1)

- **Cap validador pot bloquejar un botó sense oferir l'acció que resol el bloqueig.**
  Si s'afegeix un error nou a `detectarFaltantsNKG` o `detectarFaltantsDramaNKG`, cal
  afegir-hi també el mapatge a `obtenirAccioGeneracioPerFaltant` i el pas corresponent
  a `autocompletarNKGSilent`.
- **Els noms de camp dels validadors han de coincidir amb els que generen els prompts.**
  Aquesta ha estat la causa de dos blocants permanents: `teTramaPrincipalClara` no
  acceptava `conflicte_central` i `teSubtramesConnectades` no acceptava
  `personatges_implicats`, que són exactament els camps que produeix el prompt de
  trames. Si canvies l'esquema d'un prompt, comprova qui el valida.
- **Cap funció de merge parcial pot escriure sobre entitats que no surten a la
  resposta.** `mergeObjectiusSecretsNKG` assignava `[]` a tothom qui no fos al tros
  actual i, com que es crida per trossos de 2, només sobrevivia l'últim.
- **Tot blocant del gate ha de tenir un fallback local determinista**, no només una
  via LLM: si la crida falla, l'usuari no pot quedar-se davant d'una llista de
  problemes per resoldre a mà. `completarMotorsDramaticsNKG` itera i, si el faltant
  hi segueix, el construeix des del NKG.
- **Cap fallback pot generar un estat invàlid.** Si una funció de fallback construeix
  una estructura que després es valida (p. ex. `crearSceneContractFallbackLocal` contra
  `detectarFaltantsSceneContract`), ha d'omplir tots els camps obligatoris.
- **Tota transició de flux ha de deixar la vista al destí**: usa `mostrarIAnarA(id)` en
  lloc de `showCard(id)` a soles.
- **Cap efecte visual de llarga durada sense cancel·lació.** `efecteEscripturaHTML`
  manté un token viu per contenidor; qualsevol animació incremental futura sobre un
  element compartit ha de seguir el mateix patró.
- `ESTAT.fase` ha de reflectir el pas real (`'b1'`…`'b6'` als fonaments, número a la
  resta): el panell d'etapes hi confia per tornar on eres.

## Regles d'estil per perfil d'autor (F3)

- **El prompt base no imposa cap autor de referència.** La identitat literària surt
  sempre de `PERFILS_AUTOR[id]`. No hi tornis a posar noms d'autors que no siguin un
  dels quatre perfils.
- **Cap regla d'estil discutible és global.** Prosa, exposició i emoció viuen als
  camps `prosa`, `exposicio` i `emocio` de cada perfil, perquè el que és correcte per
  a Larsson (frase curta, zero exposició) és fals per a Tolkien i Castaneda. Al prompt
  base només hi queden les regles realment invariables: llengua, format de diàleg,
  metadades i continuïtat d'escena.
- **Un camp nou al perfil s'ha d'omplir per als quatre**, o tenir un valor genèric de
  fallback a `REGLES_ESTIL_GENERIQUES` / `HUMANITZACIO_GENERICA`.
- `criteris_excellencia` són **només** condicions de generació. Els d'avaluació viuen a
  `criteris_avaluacio` i no s'injecten mai al prompt (F6.1): abans eren els mateixos, i
  això feia que l'examen mesurés el seu propi enunciat.
- El perfil del projecte (`ESTAT._autorPerfilId`) mana sobre qualsevol detecció per
  text. Usa `resoldrePerfilAutor(text)`, mai `obtenirPerfilAutorId(text) || ...`.

## Capa de verificació determinista (F5)

- **`nkg.registre_estat` és append-only i no es trunca MAI.** Les timelines
  (`timeline_objectes`, `timeline_personatges`, `timeline_accions`) sí que es
  trunquen, perquè van als prompts. Si algú posa un `slice()` al registre, l'auditoria
  deixa de veure la primera meitat de la novel·la i no ho dirà: fallarà en silenci.
- **Tot canvi d'estat auditable s'ha de registrar amb `registrarEsdevenimentEstat()`**
  al mateix punt on ja s'escriu la timeline. Tipus vigents: `ubicacio`, `objecte`,
  `mort`, `coneixement`, `fet`, `aparicio`.
- **Els validadors de `nkg_core.js` són purs i no poden fer falsos positius.** Un
  validador que es queixa d'una novel·la coherent és pitjor que no tenir-lo: la gent
  aprèn a ignorar l'avís. Cada validador nou necessita una prova del cas que detecta
  **i** una del cas legítim que s'hi assembla.
- El que es pot comprovar per codi no s'ha de preguntar a un LLM. L'auditoria
  s'executa abans del jutge i els seus resultats entren al seu context com a fets.

## Lectura automàtica i calibratge (F6)

- **`criteris_excellencia` generen; `criteris_avaluacio` avaluen. Mai es barregen.**
  Si un criteri d'avaluació arriba al prompt del generador, l'examen passa a mesurar
  el seu propi enunciat i el veredicte deixa de valer. La prova de F6 ho comprova als
  quatre perfils: si n'afegeixes un, afegeix-lo a la llista correcta.
- **El lector no pot ser el mateix model que escriu**, i quan no hi ha alternativa
  s'ha de dir a la UI. Un lector del mateix model comparteix els punts cecs del
  generador i tendeix a aprovar-se a si mateix.
- **L'enquadrament del lector és adversari**, no de puntuació: se li demana que trobi
  el pitjor amb cita, no que posi nota.
- **Cap mètrica de calibratge es dona per bona per sota de `MOSTRA_MINIMA_CALIBRATGE`.**
  Un recall del 100% sobre una sola lectura no vol dir res, i presentar-lo com si en
  volgués és la manera més ràpida de perdre la confiança del sistema sencer.
- Recall i precisió es reporten **per separat**. No inventis un índex únic: amaguen
  coses diferents (deixar-se problemes vs. fer soroll) i es corregeixen diferent.

## Models i defaults (F4)

- **Cap ID de model escrit a mà fora de `MODEL_REGISTRY` i `MODELS_PER_PROVEIDOR`.**
  Per afegir un model: primer entra al registre (preu, context, qualitat) i només
  després pot ser un default. `validarDefaultsModels()` avisa a l'arrencada si un
  default no és al registre.
- `PROVIDER_DEFAULTS` només aporta URLs d'API; els models els llegeix amb un
  **getter**, mai amb una còpia. `models_openai.js` muta `MODELS_PER_PROVEIDOR` a
  `DOMContentLoaded`, i una còpia feta en temps de parseig queda congelada amb el
  model antic: la font única deixa de ser-ho sense que res falli visiblement.
- `validarDefaultsModels()` comprova dues coses: que tot ID existeixi al registre
  **i** que `PROVIDER_DEFAULTS` no s'hagi desincronitzat de la font única. La
  primera sola no detectava la deriva, perquè el model obsolet també era al registre.
- **Els mòduls es carreguen amb `<script src>` directe a `index.html`.** No usis
  `document.write` per injectar-los: els navegadors bloquegen els scripts injectats
  així quan són cross-origin i la connexió és lenta, i l'app deixa d'arrencar sense
  cap error clar. Si afegeixes un mòdul, afegeix-hi també l'etiqueta.

## Proves

- Les suites de `proves/` s'executen sobre l'`index.html` real amb Playwright:
  `npx http-server -p 8099 -c-1 .` i després `node proves/executa-totes.mjs`.
- Qualsevol canvi al gate NKG, al flux visual, al jutge o als perfils d'autor ha de
  deixar les 79 comprovacions en verd, o actualitzar la suite corresponent explicant
  per què canvia el comportament esperat.
- Les suites que toquen crides LLM les simulen i **bloquegen `fetch`**: una crida
  real no simulada ha de fallar de seguida, no penjar-se als reintents.

## Restriccions generals per a qualsevol canvi

- No refactoritzar funcions que no estiguin explícitament mencionades al prompt.
- `index.html` carrega dos mòduls purs extrets (Etapa D): `perfils_autor.js` (perfils
  d'autor, estil, ambientació) i `nkg_core.js` (nucli NKG, validació LLM, parseig JSON).
  Els tres fitxers van junts. No extreure més mòduls tret que s'indiqui.
- No canviar el comportament de fases anteriors a l'escriptura de capítols (món, personatges, trames, escaleta) tret que s'indiqui.
- Preservar compatibilitat amb snapshots existents a localStorage.

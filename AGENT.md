# AGENTS.md — AIDick

## Descripció del projecte

AIDick és una aplicació web d'una sola pàgina (`index.html` amb JS incrustat) que
genera **contes de 15.000 a 20.000 caràcters** en estil Philip K. Dick, en català,
amb un pipeline de vuit passos: configuració → llavor → dossier → escaleta →
redacció per escenes → costura per pedaços → auditoria determinista → lectura
hostil → exportació.

El mode novel·la que hi havia abans està **congelat** a `llegat/novella.html`.
Funciona i no es toca. Res del generador de contes en depèn.

## Idioma

- Tot el text visible a la interfície ha de ser en català.
- Tots els prompts interns enviats als models han de ser en català.
- Els comentaris del codi poden ser en català o en anglès, però els noms de
  funcions i variables existents no es canvien sense instrucció explícita.
- Els prompts conserven l'onomàstica i els topònims del món de l'autor: la
  llengua de redacció és el català, però el món narrat no es catalanitza.

---

## Les regles que no es negocien

### 1. La mètrica canònica és el CARÀCTER amb espais

No la paraula. La interfície, els contractes d'escena, el pressupost i les proves
compten caràcters. Les paraules es poden mostrar com a informació secundària i
res més.

`comptaCaracters` normalitza abans de comptar (finals de línia, espais al final
de línia, salts múltiples) i la normalització està documentada a `conte_core.js`.
La xifra ha de ser reproduïble entre execucions i entre navegador i node.

### 2. Cap crida pot demanar una sortida que creixi amb la longitud del conte

El màxim que es demana mai en una sola crida és **una escena** (≈ 3.500
caràcters). El `maxTokens` de cada escena es deriva del seu `caracters_objectiu`,
mai del text acumulat, i sempre passa per `acotarMaxTokens`, que el limita al
`max_output` del model.

Aquesta és la regla que elimina la truncació silenciosa. El mode novel·la la
violava en diversos passos i el resultat era sempre el mateix: la resposta
arribava tallada, `parseJsonRobust` la "reparava" i el pas continuava amb
elements que faltaven sense avisar de res.

Corol·lari, i és una regla dura: **`cridarModelJSON` llança quan el proveïdor diu
que la resposta ha arribat tallada, encara que el parseig n'hagi tret un objecte
amb totes les claus.** Un objecte sintàcticament vàlid al qual li falten elements
és pitjor que un error, perquè passa les validacions.

### 3. El text acabat no es reescriu mai sencer

Tota correcció posterior a la redacció és una llista de pedaços
`{cerca, substitueix, motiu}` aplicada per `aplicarPedacos`, que verifica que
cada `cerca` apareix **exactament un cop** al text. Si no hi apareix, o hi
apareix dues vegades, el pedaç es rebutja i el motiu del rebuig **es mostra**.

Un pedaç rebutjat és informació útil: vol dir que el model no ha sabut citar el
text literalment i que aquell canvi no s'ha aplicat. Amagar-ho fa que l'usuari
cregui que s'ha corregit una cosa que segueix igual.

`aplicarPedacos` no llança mai cap excepció: sempre retorna un text, l'original
si no s'aplica res.

### 4. El que es pot comprovar per codi no es pregunta a cap model

Longitud, repeticions literals, adverbis, castellanismes, anglicismes, format de
diàleg, presència dels personatges del dossier, contradiccions numèriques amb els
fets canònics, desviació de cada escena: tot això és `auditoriaDeterministaConte`
i costa zero tokens.

### 5. Sostre dur de crides

`MAX_CRIDES_CONTE = 24`. `llm_client.js` compta cada petició que arriba a un
model i es nega a fer-ne cap més en arribar-hi, amb un error que diu **en quin
pas** s'ha esgotat. No s'exposa cap manera de pujar-lo des de la interfície.

A sobre hi ha sostres per pas a `LIMITS_DURS_PAS` (`index.html`): costura 2,
lectura 1, pedaç 2. Existeixen perquè cap pas pugui entrar en bucle de correcció,
que és exactament el patró que encaria el mode novel·la.

Els reintents de transport (429, 5xx) **no** compten contra el pressupost: el
model no ha arribat a respondre i no costen res. Els que sí que costen —la
represa per raonament de GPT-5— compten com a crida i es marquen com a represa
perquè es vegin.

Qualsevol bucle de reintent nou ha de tenir sostre. Un bucle sense sostre és un
defecte greu encara que "normalment" no s'activi.

### 6. Generar i avaluar no es barregen mai

`criteris_excellencia_conte` són condicions de **generació** i van al prompt del
redactor. `criteris_avaluacio_conte` són condicions d'**avaluació** i només poden
entrar al prompt de la lectura hostil.

Al codi hi ha dues funcions i prou: `blocSistemaGeneracio` (que no llegeix mai
`criterisAvaluacioConte`) i `blocSistemaLectura` (l'única que sí). Si un criteri
d'avaluació arriba al prompt del generador, l'examen mesura el seu propi enunciat
i el veredicte deixa de valdre. `c7_estil.mjs` ho comprova sobre els prompts
muntats de debò, no sobre el codi que els munta.

### 7. Cap identificador de model escrit a mà

Fora de `MODEL_REGISTRY` i `MODELS_PER_PROVEIDOR`, cap. Per afegir un model:
primer entra al registre (preu, context, `max_output`, qualitat) i només després
pot ser un valor per defecte. `cridarModel` rebutja qualsevol model que no hi
sigui.

**Els registres es llegeixen sempre per accessor, mai amb una còpia feta en temps
de parseig.** `models_openai.js` els muta a `DOMContentLoaded`; una còpia quedaria
congelada amb els models antics i la font única deixaria de ser-ho sense que res
fallés visiblement. A `llm_client.js` totes les lectures passen per
`registreModels()` i `modelsPerProveidor()`.

`validarDefaultsModels()` comprova que tot identificador per defecte existeix al
registre i que el proveïdor declarat quadra.

### 8. Cap validador bloqueja sense oferir l'acció que el resol

Tot faltant que retorna `validarDossier` porta un camp `com_resoldre`, que és el
text que la interfície ensenya al botó. Tot blocant ha de tenir un camí de
resolució **local i determinista** que funcioni encara que la crida al model
falli:

- Els faltants del dossier s'omplen primer amb `completarDossierLocalment` (zero
  tokens) i només després, si cal, amb una única crida de compleció.
- Els forats dels contractes d'escena els tapa `contracteFallbackLocal`, mai una
  segona crida.
- Si el text queda fora d'interval i el pas de costura ha esgotat les seves
  crides, s'ofereix editar a mà o acceptar-ho.

### 9. Cap fallback pot produir un estat que un validador rebutgi

`contracteFallbackLocal` ha de passar `detectarFaltantsContracte` sempre, amb
qualsevol dossier, inclòs un dossier buit.

**Excepció deliberada, i és el revés de la moneda:** el fallback deixa sempre
`funcio_pkd` a `'cap'`. Tapa forats estructurals, però **no pot tancar la porta
PKD**. Si pogués, la porta es tancaria sola i deixaria de mesurar res. La porta
l'ha de tancar el model o una persona.

### 10. Cap merge parcial pot buidar el que ja tenia valor

`fusionarDossierSenseBuidar` només escriu on el destí no té res útil. Un valor
entrant buit, nul o inservible no pot esborrar res.

Aquesta va ser una regressió real del projecte original: una funció de merge
assignava `[]` a tota entitat que no sortís a la resposta i, com que es cridava
per trossos, només sobrevivia l'últim.

### 11. Els noms de camp dels validadors han de coincidir amb els dels prompts

Ha estat la causa de dos blocants permanents al projecte original. Si canvies
l'esquema que demana un prompt, comprova qui el valida, camp per camp.

### 12. La interfície no pot presentar una heurística com un fet

- El lint del navegador és **parcial** i ho diu: llista tancada de formes
  conegudes, no és un corrector ortogràfic.
- Les comprovacions per coincidència de vocabulari van marcades com a
  **heurística**.
- L'estimació de cost es diu estimació i es mostra al costat del cost real amb la
  desviació.
- Si no hi ha cap model diferent per a la lectura hostil, es diu **abans** de
  llegir, no després.
- Si el lector contradiu la porta PKD que P3 havia validat, la contradicció es
  mostra en lloc de reconciliar-la.
- Un número presentat com a garantia quan només és un tast és un defecte.

### 13. Regles de flux visual

- Tota transició de pas ha de deixar la vista al destí.
- Cap efecte visual de llarga durada sense cancel·lació.
- Els mòduls es carreguen amb `<script src>` directe a `index.html`, en aquest
  ordre: `perfils_autor_base.js`, `models_openai.js`, `nkg_core.js`,
  `conte_core.js`, `llm_client.js`, `demo_conte.js`. **Mai amb
  `document.write`**: els navegadors bloquegen els scripts injectats així quan
  són cross-origin i la connexió és lenta, i l'app deixa d'arrencar sense cap
  error clar.

### 14. Compatibilitat de l'estat desat

`ESTAT_CONTE` es desa a `localStorage` amb versió d'esquema. `migrarEstat` parteix
d'un estat buit i hi copia el que existeixi i quadri de tipus; mai llança. Un
projecte desat amb una versió anterior s'ha de poder obrir, i la migració ho ha
de dir en lloc d'amagar-ho.

Les claus API es desen a part i **no s'inclouen mai** a l'exportació del projecte.

---

## Regles d'estil per perfil d'autor

- La identitat literària surt sempre de `PERFILS_AUTOR[id]`. El prompt base no
  imposa cap autor.
- Cap regla d'estil discutible és global. Prosa, exposició i emoció viuen als
  camps `prosa`, `exposicio` i `emocio` de cada perfil, perquè el que és correcte
  per a Larsson és fals per a Tolkien i per a Castaneda.
- Els paràmetres de forma breu viuen al subobjecte `conte` del perfil. Un perfil
  sense `conte` retorna cadena buida pels accessors i no peta.
- `dick` és el perfil per defecte. `larsson`, `tolkien` i `castaneda` es
  conserven sencers: les proves `f3` del llegat hi depenen i mantenir-los no costa
  res.

---

## Proves

```
npx http-server -p 8099 -c-1 .        # des de l'arrel
node proves/executa-totes.mjs         # 234/234 comprovacions
node llegat/proves/executa-totes.mjs  # 281/281 del mode novel·la congelat
```

- Les suites s'executen sobre l'`index.html` real amb Playwright.
- **Bloquegen el trànsit extern**: una crida real no simulada ha de fallar de
  seguida, no penjar-se als reintents.
- El mode demostració no simula el pipeline: l'executa sencer i només substitueix
  la resposta HTTP del proveïdor. Per això les proves poden comptar crides reals.
- **Cada comprovació nova de l'auditoria necessita dues proves**: el cas que ha de
  detectar i el cas legítim que s'hi assembla. Un validador que es queixa d'un
  conte correcte és pitjor que no tenir-lo, perquè la gent n'aprèn a ignorar
  l'avís.
- Qualsevol canvi al pressupost, a la porta PKD, als prompts o als perfils ha de
  deixar les 234 comprovacions en verd, o actualitzar la suite explicant per què
  canvia el comportament esperat.

---

## Restriccions generals per a qualsevol canvi

- No refactoritzis res que la instrucció no mencioni explícitament.
- No toquis `llegat/`. Està congelat i el generador de contes no en depèn.
- Preserva la compatibilitat amb els projectes desats a `localStorage`.
- Si trobes una contradicció entre aquestes regles i el codi, atura't i informa'n
  en lloc de decidir pel teu compte.

# AIDick

Generador de **contes de 15.000 a 20.000 caràcters** en estil Philip K. Dick, en català.
Aplicació d'una sola pàgina que funciona al navegador, sense servidor ni instal·lació.

```
npx http-server -p 8099 -c-1 .
# i obre http://127.0.0.1:8099/index.html
```

Necessites una clau API d'Anthropic, d'OpenAI o de Google Gemini. Les claus es
desen només al teu navegador i mai s'inclouen a l'exportació del projecte.

Si no en tens cap, el botó **Mode demostració** recorre el pipeline sencer amb
respostes fixes. No simula el pipeline: l'executa de debò —comptador, sostre de
crides, parseig, auditoria— i només substitueix la resposta HTTP del proveïdor,
així que les xifres de crides que hi veus són reals.

## Prompts inèdits i contes de mostra

Els tres prompts descarregables proposen premisses noves que **no corresponen als
tres contes ja escrits** i no n'inclouen cap resolució:

| Conte inèdit | Prompt | Conte complet |
|---|---|---|
| El padró de les ombres | [Descarrega el prompt](prompts/01-el-padro-de-les-ombres.txt) | [Descarrega el conte](contes/04-el-padro-de-les-ombres.txt) |
| Set minuts de garantia | [Descarrega el prompt](prompts/02-set-minuts-de-garantia.txt) | [Descarrega el conte](contes/05-set-minuts-de-garantia.txt) |
| La cua dels absents | [Descarrega el prompt](prompts/03-la-cua-dels-absents.txt) | [Descarrega el conte](contes/06-la-cua-dels-absents.txt) |

Separadament, el repositori conserva tres contes de mostra complets en text pla:
[Procedència](contes/01-procedencia.txt), [Escomesa cega](contes/02-escomesa-cega.txt)
i [Escolta ampliada](contes/03-escolta-ampliada.txt). El procés i l'avaluació són
a [`contes/CONTES_DE_PROVA.md`](contes/CONTES_DE_PROVA.md).

---

## Què fa

Un conte és curt. Hi cap sencer en un context i quasi sencer en una sola sortida.
Tota l'aplicació està construïda sobre aquesta única propietat.

**La mètrica canònica és el caràcter amb espais, no la paraula.** L'interval
vàlid és 15.000–20.000; l'objectiu central, 17.500 (≈ 2.900 paraules en català).

### El pipeline, en 8 passos

| Pas | Nom | Crides | Què fa |
|---|---|---|---|
| P0 | Configuració | 0 | Proveïdor, models per rol, perfil d'autor |
| P1 | Llavor | 1 | 6 propostes: premissa, esquerda, mentida del sistema, final obligatori, protagonista, cost de l'empatia |
| P2 | Dossier | 1 (+1 de compleció com a màxim) | L'única font de veritat narrativa: personatges, món, objectes, fets canònics, cronologia |
| P3 | Escaleta | 1 | 4–6 escenes amb contracte complet i pressupost de caràcters |
| P4 | Redacció | 1 per escena | Una crida per escena, mai més |
| P5 | Costura | màxim 2 | Llista de pedaços `{cerca, substitueix}`, mai el text sencer |
| P6 | Auditoria determinista | **0** | Informe per codi, zero tokens |
| — | Coherència global | **0** | Després de **tota** edició, sobre el text sencer |
| P7 | Lectura hostil | màxim 3 | Un model **diferent** busca el pitjor del conte, amb cita |
| P8 | Exportació | 0 | TXT, Markdown amb metadades, projecte JSON |

**Pressupost dur: 24 crides per conte.** L'aplicació les compta i es nega a
continuar en arribar-hi, dient en quin pas s'ha esgotat. No es pot pujar des de
la interfície. Un conte pel camí típic en gasta **11**.

### Les tres regles que fan que això sigui fiable

1. **Cap crida demana una sortida que creixi amb la longitud del conte.** El
   màxim que es demana mai és una escena (≈ 3.500 caràcters). Això elimina d'arrel
   la truncació silenciosa: no hi ha cap punt on la resposta pugui arribar tallada
   perquè el text acumulat ha crescut.
2. **El text acabat no es reescriu mai sencer.** Tota correcció posterior a P4 és
   una llista de pedaços aplicada per codi, amb verificació que cada `cerca`
   apareix **exactament un cop** al text. Si no hi apareix, o hi apareix dues
   vegades, el pedaç es rebutja i es mostra el motiu.
3. **El que es pot comprovar per codi no es pregunta a cap model.** Longitud,
   repeticions, adverbis, castellanismes, format de diàleg, presència dels
   personatges: auditoria determinista, zero tokens.

---

## Quant costa un conte

Amb els preus de `MODEL_REGISTRY` i un conte de 5 escenes (11 crides):

| Combinació de models | Cost per conte |
|---|---|
| GPT-5 Mini per tot + Gemini Flash de lector | **0,04 $** |
| GPT-5.6 Luna per tot + Terra de lector | **0,05 $** |
| Gemini Flash per tot + Sonnet de lector | **0,05 $** |
| GPT-5.6 Terra arquitectura · Luna prosa · Sol lector | **0,16 $** |
| Sonnet per tot + Gemini Pro de lector | **0,34 $** |
| Opus arquitectura · Sonnet prosa · Gemini Pro lector *(recomanada)* | **0,41 $** |
| Opus per tot + GPT-5.2 de lector | **0,54 $** |
| GPT-5.6 Sol per tot | **0,65 $** |

Desglossament de la combinació recomanada:

| Pas | Crides | Cost |
|---|---|---|
| llavor | 1 | 0,063 $ |
| dossier | 1 | 0,049 $ |
| escaleta | 1 | 0,062 $ |
| escena | 5 | 0,126 $ |
| costura | 1 | 0,042 $ |
| lectura | 1 | 0,027 $ |
| pedaç | 1 | 0,037 $ |

Són **estimacions** calculades a partir del registre de preus, i l'aplicació les
etiqueta com a tals. El cost real es compta crida a crida i apareix al costat de
l'estimat, amb la desviació, tant a la capçalera com a les metadades exportades.
Si l'estimació falla, es veu.

---

## La porta PKD

Un conte només és vàlid si l'escaleta declara —i el text compleix— quatre
condicions, derivades dels criteris d'excel·lència del perfil `dick`:

1. **Esquerda de realitat.** En almenys una escena el marc del que el lector
   creia real es trenca i **no es recompon**.
2. **Mentida verificable del sistema.** L'estat, la corporació o la tecnologia
   menteixen d'una manera que el lector pot comprovar dins del text: una dada que
   no quadra amb una altra dada del text, no perquè se'ns digui que menteixen.
3. **Paranoia funcional.** El protagonista raona amb mètode; les seves conclusions
   són versemblants encara que siguin falses. Recomanada, no bloquejant.
4. **Cost de l'empatia.** Hi ha una decisió en què ser empàtic li costa alguna
   cosa concreta al personatge.

La porta es comprova dos cops i **els dos resultats es mostren per separat**:

- A **P3**, sobre l'escaleta. Si falta una funció, el pas es bloqueja i ofereix
  dues sortides: reassignar-la a mà a una escena, o regenerar l'escaleta. El
  fallback local que tapa els forats dels contractes **no pot** assignar cap
  funció PKD: si pogués, la porta es tancaria sola i deixaria de mesurar res.
- A **P7**, segons el lector hostil, amb cita literal del text. Si el lector diu
  que no hi ha esquerda quan P3 havia validat que n'hi havia d'haver, la
  discrepància es mostra tal com arriba. L'escaleta declara intencions; el text
  és el que és.

---

## L'auditoria determinista

Zero crides i zero tokens. Comprova longitud, frases de 8 paraules o més
repetides literalment, densitat d'adverbis en -ment, castellanismes i
anglicismes, format de diàleg, personatges del dossier absents del text, fets
canònics contradits per una xifra diferent, frases que el protagonista havia
declarat que no diria mai, i la desviació de cada escena respecte del seu
pressupost.

Cada problema porta **una cita literal curta del text o el camp concret que
falla**. Un problema sense cap de les dues coses no es reporta: no es pot actuar
sobre un avís que no assenyala res.

**Els detectors de lèxic i d'adverbis van per llista tancada, no per sufix.** En
català hi ha desenes de substantius acabats en -ment (pagament, coneixement,
plantejament, casament, raonament) i una regla per sufix els marcaria tots. Un
validador que es queixa de text correcte és pitjor que no tenir-lo: la gent
n'aprèn a ignorar l'avís.

**El lint del navegador és parcial i la interfície ho diu.** Compara el text amb
una llista tancada de formes conegudes; **no** és un corrector ortogràfic i no
detecta paraules inventades. La comprovació completa amb hunspell s'executa sobre
el text exportat, a `proves/c5_lint.mjs`.

Les comprovacions per coincidència de vocabulari —fets canònics contradits,
compliment dels contractes d'escena— van marcades com a **heurística** a la
interfície. Són una pista, no un veredicte.

---

## Varietat: què impedeix que tots els contes s'assemblin

Un generador PKD sense control escriu sempre el mateix conte: androides, drogues,
simulació. Hi ha tres llistes, totes tres a `conte_core.js` i totes tres
editables.

**El banc de motius** reparteix de què va el conte: **30 entrades** que cobreixen
el ventall real de Dick —història alternativa, falsificacions, religions
mediatitzades, tests d'empatia, lliscaments temporals, corporacions pòstumes,
telèpates funcionaritzats, mitjans que fabriquen consens, colònies fracassades,
burocràcia que decideix qui existeix. Cada motiu porta la **tensió ontològica**
que obre i el **clixé concret** que tendeix a produir i que el prompt prohibeix
pel seu nom. **Sis estan vetats** i no es proposen mai —coincidien amb un
mecanisme de la llista de sota—, així que en queden 24 disponibles: vuit
generacions seguides sense repetir-ne cap.

**Els mecanismes vetats** (`MOTIUS_VETATS`) prohibeixen vuit dispositius del
cànon de Dick pel nom del mecanisme, no pel nom propi: entropia d'objectes,
precrim, entorn fals que amaga una realitat devastada, aparell que exigeix
pagament, records comprats, simulacre que dubta de la seva humanitat, droga que
obre capes de realitat i entitat que resulta ser una gravació. Cadascun porta
també **la forma en què torna disfressat**, que és com tornen sempre. Prohibir
«Ubik» no impedeix escriure mitja vida amb un altre vocabulari; prohibir el
mecanisme, sí.

**Els eixos de divergència** (`EIXOS_DIVERGENCIA`) reparteixen tota la resta, que
és el que feia que dos contes diferents s'assemblessin: feina del protagonista,
institució que menteix, escenari, veu narrativa, restricció formal i temperatura.
El codi en fixa una coordenada de cada abans de demanar res i les rota, de manera
que **dues generacions seguides no en comparteixen cap**. Les llistes tenen 12,
10, 9, 8, 6 i 5 opcions a propòsit: amb longituds iguals, els sis eixos
avançarien alhora i la combinació tornaria al desè conte. Els últims 15 noms de
protagonista utilitzats viatgen al prompt com a prohibició explícita.

Hi ha també una llista de **tòpics prohibits** amb els noms propis i les marques
de l'obra de Dick i de les seves adaptacions (Deckard, Ubik, Rekal, Precrim,
replicant…). L'objectiu és escriure com Dick, no fer un pastitx de les seves
pel·lícules.

L'ús de motius, coordenades i noms es registra a `localStorage`.

---

## Després de tota edició: la coherència global

`aplicarPedacos` garanteix que cada pedaç s'aplica on toca. No garanteix res
sobre **la resta del text**, i és allà on apareixien els destrosses: una revisió
de 90 caràcters que canviava una classificació impresa i deixava quatre línies
més avall una frase que parlava d'una paraula que ja no hi era.

`validarCoherenciaGlobal` s'executa **sempre després de qualsevol edició** —les
del model i les fetes a mà—, sobre el **text sencer** i no sobre el fragment
editat, i costa **zero tokens**:

1. **Frases duplicades** idèntiques o quasi a menys de tres paràgrafs.
2. **Referències trencades**: per cada designació que una edició treu d'un lloc,
   busca les altres aparicions al conte. Només designacions —majúscules, noms
   propis i vocabulari canònic del dossier—, perquè marcar qualsevol paraula que
   un pedaç d'estil canviï de lloc equival a no marcar res.
3. **Setups sense pagament**: objectes clau que surten un sol cop, el que
   l'escaleta posava en disputa i no hi és, i el que s'anuncia amb condició o
   horari i no torna.
4. **Clàusules òrfenes**: frases que justifiquen una cosa que l'edició ha
   esborrat.
5. **Comptador de caràcters** dins de l'interval.

Les dues comprovacions que necessiten saber què s'ha canviat es declaren **no
executades** quan no hi ha context d'edició, en lloc de sortir en verd.

## Pedaç o regeneració

Un pedaç canvia una frase. Si el diagnòstic és que la premissa és un recull de
coses ja vistes, que el registre és pla o que el protagonista no té res fora de
la trama, cap llista de `{cerca, substitueix}` no ho arregla: només ho amaga sota
una redacció millor.

El lector hostil ha de classificar cada defecte en una de sis categories.
**Premissa, prosa i personatge** tornen a generar, i cadascuna diu des de quin
pas. **Llengua, continuïtat i mecànica** es corregeixen amb un pedaç. Si el model
no dona categoria o se la inventa, es classifica per paraules clau; si no encaixa
enlloc, es diu que no s'ha pogut classificar i es tracta com a local. La decisió
no és un consell del prompt: `aplicarPedacDirigit` **rebutja el lot** si hi ha cap
defecte de regeneració, i no gasta la crida.

---

## Què NO fa

**No genera novel·les.** L'aplicació de novel·la que hi havia en aquest
repositori està congelada a `llegat/novella.html` i funciona igual que abans,
però no rep manteniment i no forma part d'aquest producte.

Amb ella s'han retirat el NKG complet, la bíblia narrativa, el jutge d'interval,
els fils narratius, les timelines, el tancament per blocs, el calibratge de
recall i precisió del lector, el control d'arcs i l'epíleg. Tot això era
maquinària per compensar que una novel·la no cap enlloc. El conte hi cap.

**No garanteix que els contes siguin bons.** La porta PKD és una condició
necessària i molt lluny de ser suficient: un text pot tenir esquerda, mentida
verificable i cost d'empatia i ser igualment mort. El que fa que un conte de Dick
funcioni —que el lector acabi desconfiant de la seva pròpia experiència de
lectura— no es pot comprovar per codi ni demanar a un jutge automàtic que
comparteix els punts cecs del generador. El valor d'aquest sistema és que fa
barat arribar a un esborrany estructuralment sòlid. La lectura segueix sent teva.

---

## Fitxers

| Fitxer | Què és |
|---|---|
| `index.html` | L'aplicació: interfície, estat, prompts i pipeline |
| `conte_core.js` | Nucli pur: recompte, repartiment, dossier, contractes, porta PKD, auditoria, pedaços, banc de motius. Sense DOM ni xarxa |
| `llm_client.js` | L'únic punt de pas de les crides: registre de models, payloads, comptador i sostre |
| `perfils_autor_base.js` | Perfils d'autor. El perfil `dick` i els seus paràmetres de forma breu |
| `models_openai.js` | Registra els models econòmics d'OpenAI al registre principal |
| `demo_conte.js` | Dades del mode demostració |
| `nkg_core.js` | Se'n reutilitza `parseJsonRobust`; la resta és del mode novel·la |
| `ui_fixes.js` | Pedaços d'interfície del mode novel·la |
| `proves/` | Suite de regressió del conte |
| `contes/` | Tres contes generats amb el prompt corregit i la seva avaluació |
| `llegat/` | Mode novel·la congelat, amb les seves proves i els seus documents |

---

## Proves

```
npx http-server -p 8099 -c-1 .        # des de l'arrel, en una terminal
node proves/executa-totes.mjs         # en una altra
```

**388/388 comprovacions**, codi de sortida 0.

| Suite | Comprovacions | Què cobreix |
|---|---|---|
| `c1_nucli.mjs` | 116 | `conte_core.js` amb node sol, sense navegador |
| `c2_pressupost.mjs` | 17 | El sostre de crides en tots els camins, forçats |
| `c3_gate_pkd.mjs` | 23 | La porta PKD i que el fallback no la pugui tancar |
| `c4_longitud.mjs` | 15 | Compensació per codi i ajust de longitud |
| `c5_lint.mjs` | 32 | Lint del navegador i hunspell sobre el text |
| `c6_flux.mjs` | 28 | P0..P8, recàrrega, migració d'esquema |
| `c7_estil.mjs` | 77 | Els prompts muntats de debò |
| `c8_coherencia.mjs` | 48 | La coherència global després de cada edició |
| `c9_regeneracio.mjs` | 32 | Quan s'apedaça i quan es torna a generar |

Les suites bloquegen el trànsit extern: una crida real no simulada falla de
seguida. Per a cada comprovació de l'auditoria hi ha el cas que ha de detectar i
el cas legítim que s'hi assembla.

La capa de hunspell de `c5` se salta sense fer fallar la suite si el diccionari
no hi és, i ho diu. Per instal·lar-lo: `apt-get install hunspell hunspell-ca`.

Les proves del mode novel·la congelat viuen a part i segueixen en verd:

```
node llegat/proves/executa-totes.mjs   # 281/281 comprovacions
```

(Eren 278 abans de la conversió: les tres de diferència són l'autoprova de
`f15_lint_catala.mjs`, que se saltava quan hunspell no estava instal·lat i ara
sí que s'executa. Cap comportament ha canviat.)

```
```

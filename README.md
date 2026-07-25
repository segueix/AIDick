# Booki

Booki és una aplicació web per convertir una idea breu en una novel·la completa. Combina planificació narrativa, Bíblia, NKG, escaleta per escenes, redacció de capítols i revisió editorial amb un sistema dual de models.

## Flux general

1. Configura proveïdor, models i estil.
2. Defineix tema, final, món i personatges.
3. Genera trames, estructura i escaleta.
4. Completa el NKG i la Bíblia narrativa.
5. Escriu capítols amb revisió i registre narratiu.
6. Exporta la novel·la, el NKG+Bíblia o el diagnòstic.

## Fitxers principals

- `index.html`: aplicació principal, UI, prompts, flux de generació, exportació i diagnòstics.
- `nkg_core.js`: nucli pur del NKG, parseig JSON, validacions, scene contracts i gates dramàtics.
- `perfils_autor.js`: perfils d'autor i guies d'estil.
- `AGENT.md`: normes de treball al repositori, immutabilitat i qualitat narrativa.

## Sistema NKG

El Narrative Knowledge Graph conserva macronarrativa, personatges, llocs, objectes, fets canònics, fils, timelines i estat narratiu. Serveix per evitar contradiccions i per donar context compacte als prompts.

## Scene Conflict Layer

Cada escena pot tenir un `scene_contract`: POV, personatges presents, objectius incompatibles, obstacle, asimetria de poder, objecte o informació en disputa, decisió irreversible, cost immediat i conseqüència narrativa. Aquesta capa evita capítols només temàtics o resumits.

## Jutge d'interval

Cada 4 capítols (i al final), Booki tanca el bloc: consolida derivats i resums i passa
un jutge de coherència que compara KSN, fets canònics i timelines. El jutge s'executa
**un sol cop per bloc**.

Per defecte **no reescriu res**: quan detecta una incoherència, obre un fil
`error-continuïtat` perquè el capítol següent la reconciliï cap endavant, com faria un
autor humà. Si actives «El jutge pot reescriure capítols» a la configuració, corregeix
el text directament i congela els capítols del bloc, que passen a ser immutables.

El progrés i les incidències es veuen al panell «⚖️ Jutge d'interval» de la fase
d'escriptura.

## Verificació determinista de continuïtat

Booki manté un llibre major complet de tots els canvis d'estat (qui és on, on és cada
objecte, qui és viu, qui sap què) i el comprova **per codi**, sense demanar-ho a cap
model. Detecta objectes que canvien de lloc sense moure's, personatges a dos llocs
alhora, morts que segueixen actuant, salts temporals no declarats i —el més freqüent
en novel·la— personatges que actuen sobre informació que encara no han rebut.

L'auditoria s'executa a cada tancament de bloc, té botó propi a la fase de revisió i és
una fila del checklist de sortida. El que troba no és una sospita d'un model: és una
contradicció demostrable a les dades.

Aquesta capa cobreix la continuïtat factual. La deriva de veu, si el final està guanyat
o si el llibre val la pena continuen sent judicis humans: Booki no pretén substituir
una lectura, sinó fer que amb una n'hi hagi prou.

## Lectura automàtica i calibratge

Booki pot llegir-se a si mateix: una lectura hostil del text complet, feta per un model
**diferent del que ha escrit** (d'un altre proveïdor si tens la clau) i amb criteris
d'avaluació que el generador no ha vist mai. Se li demana que hi trobi el pitjor amb
cites, no que posi nota.

Però un lector automàtic pot emetre un veredicte sense poder fonamentar-lo. Per això
Booki mesura **quant s'hi pot confiar**: llegeixes a mà una mostra de capítols i dius,
de les seves troballes, quantes eren reals, quantes eren soroll i quantes se li van
escapar. D'aquí surten dos números — quants problemes troba de debò (*recall*) i quants
dels seus avisos són certs (*precisió*)— i amb menys de cinc lectures humanes Booki no
te'ls dona per bons.

Això no fa que les novel·les siguin coherents sense revisió. El que fa és substituir un
acte de fe per una xifra: saps quant es deixa el lector, i decideixes tu quantes
novel·les et pots saltar.

## Quality Gate 9

El diagnòstic literari 9/10 analitza heurísticament abstractesa, repetició de motius, acció concreta, diàleg, contractes incomplets, tensió massa uniforme i personatges funcionals. No reescriu automàticament: diagnostica i proposa prioritats.

## Flux recomanat

- Completa personatges amb objectius externs i secrets.
- Genera trames abans de l'estructura.
- Revisa la fase de compleció NKG+Bíblia abans d'escriure.
- Obre la Bíblia Narrativa per veure motors dramàtics pendents.
- Exporta `NKG + Bíblia` i `Diagnòstic resums` si vols auditar la qualitat.

## Compatibilitat amb snapshots antics

Els projectes antics continuen important-se. Si falten `scene_contracts` o camps nous, Booki activa mode de compatibilitat: pots continuar, però és recomanable completar motors dramàtics abans de redactar nous capítols.

## Criteris de qualitat literària

- Cap escena sense objectiu visible.
- Cap escena sense obstacle concret.
- Cap escena sense cost immediat.
- Cap escena sense conseqüència narrativa.
- Mostrar conflicte amb acció, gest, objecte, espai o diàleg.
- Repetir motius només si canvien de funció dramàtica.

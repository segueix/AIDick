// ═══════════════════════════════════════════════════════════
//  demo_conte.js — Dades d'exemple per al mode de demostració
//
//  Instal·la un `fetch` fals que respon com respondrien els proveïdors reals.
//  Serveix per recórrer el pipeline sencer sense clau API i sense gastar res, i
//  és el mateix mecanisme que fan servir les proves de regressió.
//
//  IMPORTANT: no és una simulació del pipeline. El pipeline s'executa de debò
//  —comptador, sostre de crides, reserva de raonament, parseig, auditoria—;
//  l'únic que se substitueix és la resposta HTTP del proveïdor. Per això les
//  xifres de crides que surten al mode demostració són xifres reals.
// ═══════════════════════════════════════════════════════════

'use strict';

const DEMO_ESCENES = [
  "El primer avís va arribar en forma de duplicat. Halloran el va trobar a la safata de matí, entre una notificació de baixa i un full de reclamació que algú havia doblegat pel mig sense cap necessitat. Era un imprès B-14, cens residencial, sector nord-oest, i n'hi havia dos exemplars idèntics amb el mateix número de sèrie.\n\nVa comprovar la data. Les dues còpies duien el mateix segell d'entrada, la mateixa hora, la mateixa signatura del funcionari que les havia validades. La signatura era la seva.\n\nHalloran portava onze anys al departament i havia après que un duplicat no és mai un error del paper. És un error d'algú, i el paper només el transporta. Va deixar els dos fulls un al costat de l'altre sota la làmpada i els va mirar amb l'atenció que dedicava als expedients quan encara creia que la feina servia per a alguna cosa.\n\nCap diferència. Ni una lletra desplaçada, ni un marge més ample, ni la mena de variació que apareix quan una màquina imprimeix dues vegades seguides. Els duplicats de veritat sempre porten alguna cosa que els delata: la tinta que s'esgota, el rodet que ha girat mig grau, el paper que ha entrat torçat. Aquests dos no.\n\nVa agafar el telèfon intern i va marcar el vuit.\n\n—Verificació.\n\n—Sóc Halloran, del cens. Tinc un B-14 duplicat amb número quatre-cents dotze.\n\n—Un moment.\n\nVa sentir el soroll d'un calaix que s'obria i el fregadís d'una fitxa contra una altra. Va comptar. Setze segons.\n\n—Aquí el quatre-cents dotze consta lliurat. Un exemplar. Registrat i arxivat.\n\n—En tinc dos.\n\n—Doncs en té dos i el llibre en diu un. El llibre no s'equivoca.\n\nHalloran va estar a punt de dir que el llibre l'omplien persones i que les persones s'equivoquen contínuament. Va decidir que no li serviria de res.\n\n—Qui el va lliurar?\n\n—Aquí no hi surt qui. Hi surt què i quan.\n\nVa penjar. El ventilador del sostre es va aturar un instant i va tornar a engegar-se amb un espetec, com feia tres estius. Ningú no l'havia arreglat perquè arreglar-lo requeria un imprès que s'havia de demanar a una altra planta.\n\nVa desar els dos B-14 dins de la carpeta de cartró que feia servir per a les coses que encara no sabia on posar. Aquella carpeta era el lloc més honest de tot el despatx: hi havia catorze documents i cap d'ells tenia una explicació.\n\nA les tres va baixar a l'arxiu.\n\nL'arxiu ocupava tot el semisoterrani i feia olor de pols escalfada. Devereux hi passava els dies entre prestatgeries metàl·liques amb un davantal gris que no era de l'uniforme reglamentari i que ningú no li havia discutit mai. Tenia seixanta anys llargs i una manera de moure's que suggeria que coneixia el lloc millor que el pla de l'edifici.\n\n—Els B-14 del març —va dir Halloran.\n\n—Del març de quin any?\n\n—D'aquest.\n\nDevereux va assenyalar amb la barbeta el tercer passadís i va tornar a la seva feina, que consistia a treure fitxes d'una caixa i posar-les en una altra sense que fos evident quin criteri seguia.\n\nLa secció del març ocupava quatre lligalls. Halloran els va obrir per ordre i va anar passant fulls fins que va arribar al que buscava. Hi era. Un sol exemplar, el quatre-cents dotze, amb el segell d'entrada i la seva signatura.\n\nVa tornar a passar els fulls cap enrere per comprovar la seqüència. Quatre-cents deu. Quatre-cents onze. Quatre-cents dotze. Quatre-cents catorze.",
  "Va tornar a començar. Quatre-cents dotze. Quatre-cents catorze.\n\nEs va quedar amb el lligall obert damunt del braç més temps del que calia. No hi havia cap forat al paper, cap tall, cap indici que algú hagués extret un full. Els documents estaven cosits amb un fil que s'havia de trencar per treure'n cap, i el fil era continu.\n\n—Devereux.\n\n—Digui.\n\n—Falta el quatre-cents tretze.\n\nEl vell no va aixecar el cap.\n\n—Si el fil és sencer, no falta res. Vol dir que no n'hi ha hagut mai cap.\n\n—La numeració és correlativa.\n\n—La numeració és el que digui el llibre.\n\nHalloran va tancar el lligall. Va pensar que hi havia una explicació senzilla i que la trobaria l'endemà amb el cap descansat. Va pensar-ho amb la mateixa convicció amb què havia pensat coses semblants altres vegades, i va reconèixer el to de la pròpia veu interior, que era el to que feia servir per no haver de continuar.\n\nVa pujar per l'escala en comptes de l'ascensor. Anava comptant els graons sense adonar-se'n.\n\nL'endemà va demanar la fitxa mestra del sector nord-oest. Trigaven tres dies a servir-la, així que mentrestant va fer el que feia sempre: obrir el correu, segellar, classificar, arxivar. La rutina tenia una qualitat protectora. Mentre les mans anaven fent, el cap podia quedar-se en un racó rumiant sense que ningú ho notés.\n\nEl divendres va arribar la fitxa mestra. Era un plec de vint-i-dues pàgines amb el cens complet del sector, casa per casa, amb el nom del titular, la data d'alta i el número d'imprès associat.\n\nHalloran va buscar la posició quatre-cents tretze.\n\nHi constava una adreça: Carrer Bram, dinou, tercer. Titular: no consta. Data d'alta: no consta. Imprès associat: quatre-cents tretze.\n\nUn registre amb número i adreça i sense ningú a dins.\n\nVa mirar les entrades del voltant. El quatre-cents dotze era un home de cinquanta-un anys amb dona i una filla. El quatre-cents catorze era una vídua. Tots dos tenien nom, data i imprès. Entremig, una casa amb número i sense habitants, en un cens que existeix precisament per comptar habitants.\n\nEl primer que li va venir al cap va ser un error de transcripció. Un salt en el moment de copiar. Però la fitxa mestra no es copiava a mà des de feia set anys: la generava el sistema central a partir dels impresos rebuts, i el sistema central no podia generar una línia sense imprès. La línia deia clarament que l'imprès existia.\n\nEl segon que li va venir al cap va ser que algú hagués donat de baixa una família i el sistema hagués conservat l'estructura buida. Ho va comprovar. Les baixes deixen una marca: una lletra B a la columna de la dreta i la data de la resolució. La posició quatre-cents tretze no tenia cap lletra a la columna de la dreta.\n\nEs va quedar mirant la pàgina fins que les línies li van començar a saltar. Fora ja era fosc i el fluorescent del passadís feia el brunzit de sempre, un to constant que se sentia només quan tot el pis quedava en silenci.\n\nVa guardar la fitxa mestra a la carpeta de cartró. Ara hi havia quinze documents sense explicació i un d'ells n'explicava un altre a mitges, cosa que era pitjor que res.\n\nAquell cap de setmana va anar al carrer Bram.\n\nHi va anar en dissabte, cap al migdia, amb l'abric de diari i sense l'acreditació. Es va dir a si mateix que hi anava perquè li venia de pas, i sabia que no era veritat mentre s'ho deia.",
  "El número dinou era un edifici de maó de sis plantes amb una porta metàl·lica i un plafó d'intèrfons. Els timbres estaven numerats de l'u al vint-i-quatre. Al tercer hi havia dues portes: la A i la B. Els dos rètols eren il·legibles, però hi havia rètol.\n\nVa prémer el tercer A. Va esperar. Va tornar a prémer.\n\nVa sortir una dona amb una bossa de la compra i va aguantar la porta per pura inèrcia veïnal, i Halloran va entrar sense haver de dir res, cosa que li va semblar excessivament fàcil.\n\nL'escala feia olor d'humitat i de menjar. Al tercer pis hi havia les dues portes. La B tenia un felput i una marca de dits al voltant del pany. La A no tenia felput i el pany estava net d'una manera que no era neteja sinó desús.\n\nVa trucar. Va esperar el que li va semblar una estona llarga i que probablement no van ser més de vint segons.\n\nVa posar l'orella a la fusta.\n\nHi havia un so. Un brunzit, feble, regular. El mateix to del fluorescent del passadís de l'oficina, o prou semblant perquè el reconegués abans de saber què reconeixia.\n\nVa baixar. Al portal es va trobar amb la dona de la bossa, que ara pujava amb una altra bossa, i va aprofitar.\n\n—Perdoni. Busco la gent del tercer A.\n\n—Al tercer A no hi viu ningú.\n\n—Des de quan?\n\nLa dona va fer una pausa que no era de pensar sinó d'una altra cosa.\n\n—No ho sé. Sempre.\n\n—Fa molt que viu aquí?\n\n—Vint-i-dos anys.\n\n—I en vint-i-dos anys no hi ha viscut mai ningú?\n\nElla va agafar la barana amb la mà lliure i va començar a pujar.\n\n—Miri, jo pago la meva part i prou.\n\nHalloran va sortir al carrer. Va mirar amunt i va comptar les finestres del tercer pis. N'hi havia quatre. Dues corresponien a la B, que tenia cortines i una planta. Les altres dues eren fosques i tenien vidre, marc i persiana com les altres, i eren exactament tan normals com les altres, i era això el que no encaixava.\n\nUn pis buit no manté les persianes a mitja alçada.\n\nEl dilluns va sol·licitar l'expedient d'obra de l'edifici. Trigaven una setmana. Mentrestant va tornar a la rutina i la rutina el va rebre com sempre, sense preguntes.\n\nEl dimecres, el cap de secció el va cridar.\n\nFarrow tenia el despatx al final del passadís i mantenia la porta oberta perquè es veiés que la mantenia oberta. Sobre la taula hi havia la carpeta de cartró de Halloran.\n\n—Aquesta carpeta era al meu calaix —va dir Halloran.\n\n—Aquesta carpeta és material del departament. —Farrow va ajuntar les mans—. Vostè ha demanat una fitxa mestra i un expedient d'obra en dotze dies. Cap dels dos li correspon per feina.\n\n—Hi ha un imprès duplicat i un registre sense titular.\n\n—Ho ha comunicat?\n\n—Ho estic comunicant ara.\n\nFarrow va obrir la carpeta, va treure els dos B-14 i els va posar l'un damunt de l'altre. Els va aixecar a contrallum. Halloran va veure com les dues siluetes de tinta es superposaven amb una exactitud que no era possible.\n\n—Els porto a verificació —va dir Farrow—. Vostè torni a la seva taula.\n\n—I el registre sense titular?\n\n—El registre sense titular no és un problema del cens. És un problema de qui hi hauria de constar. I si no hi consta ningú, no hi ha ningú que tingui el problema.\n\nHo va dir sense ironia, com qui recita una norma que ha llegit tantes vegades que ja no la sent. Va ser aquesta absència d'ironia el que va fer que Halloran s'aixequés i sortís sense discutir.",
  "Aquella tarda, en tornar a la taula, la carpeta hi era. Tots els documents a dins. Els dos B-14 també.\n\nEls va comptar. Catorze documents.\n\nVa tornar a comptar. Catorze.\n\nLa fitxa mestra del sector nord-oest no hi era, i ell no l'havia tret.\n\nVa obrir el calaix. Va obrir el de sota. Va mirar la safata de sortida, la de pendents, la pila del costat del telèfon. Va aixecar el sotamà. Va mirar a terra.\n\nEs va quedar quiet amb les mans a la vora de la taula. La sensació que li va pujar no era por, o no era exactament por: era la incomoditat precisa d'estar davant d'un mecanisme que funciona bé i que no funciona per a tu. Es va preguntar si aquella sensació era seva o si venia d'alguna cosa que havia menjat, o de les hores, o de la manera com el sistema tracta qui fa preguntes. No va saber respondre's i va anotar la pregunta en un tros de paper, perquè anotar-la era l'única cosa que podia fer amb ella.\n\nL'endemà va demanar una còpia de la fitxa mestra. Li van dir que estava en revisió.\n\n—Fins quan?\n\n—No consta.\n\nVa passar una setmana. El divendres, Devereux el va aturar a l'escala de l'arxiu. Portava una fitxa a la mà i la va donar sense mirar-lo.\n\n—No l'he vista, això.\n\n—Què és?\n\n—El que buscava.\n\nEra una fitxa d'alta antiga, del sistema anterior, escrita a màquina. Carrer Bram, dinou, tercer A. Titular: Marta Halloran. Data d'alta: divuit anys enrere. Estat: activa.\n\nHalloran es va quedar amb la fitxa entre els dits. El passadís de l'arxiu feia una llum groga que ho aplanava tot.\n\nMarta era el nom de la seva germana. La seva germana havia mort feia divuit anys, i ell havia signat els papers, i recordava el pes del bolígraf i el color de la taula i la frase que li havia dit el funcionari, que era una frase amable i inútil.\n\n—Això és un error —va dir.\n\n—Segurament —va dir Devereux—. Aquí n'hi ha molts.\n\n—La meva germana és morta.\n\n—Doncs també ho deu ser la fitxa.\n\n—Les fitxes no es moren. Es donen de baixa.\n\nDevereux se'l va mirar per primera vegada en tot el temps que feia que es coneixien.\n\n—Vostè és dels que compten bé —va dir—. Jo li recomanaria que comptés una mica pitjor.\n\nHalloran va tornar a dalt amb la fitxa dins de la butxaca interior. Va seure. Va obrir el correu del matí i el va tornar a tancar.\n\nSi la fitxa era activa, algú n'havia rebut les comunicacions durant divuit anys. Les comunicacions del cens són automàtiques: revisions quinquennals, notificacions de padró, avisos de canvi de secció. S'envien a l'adreça del titular. Si haguessin tornat, hi hauria una marca de devolució, i una fitxa amb tres devolucions passa a inactiva sense que hi intervingui ningú.\n\nLa fitxa no tenia cap marca de devolució.\n\nVa estar tres dies donant voltes a la mateixa cadena i sempre acabava al mateix lloc. La cadena era correcta. Cada baula se sostenia. Les baules eren procediments que ell coneixia perquè els aplicava cada dia, i el resultat de posar-les una darrere l'altra era que durant divuit anys algú havia recollit el correu de la seva germana morta en un pis on no vivia ningú i on hi havia un brunzit darrere la porta.\n\nLa conclusió era raonable. Era això el que li feia més mal: que fos raonable.\n\nEl dimarts següent va tornar al carrer Bram amb l'acreditació i amb l'ordre de comprovació que ell mateix s'havia signat, cosa que estava dins de les seves atribucions i fora de tot el que havia fet en onze anys.",
  "La porta del tercer A era oberta un pam.\n\nVa empènyer. Dins hi havia un rebedor buit, una habitació buida i, al fons, contra la paret, un armari metàl·lic gris de la mida d'un arxivador de quatre calaixos. El brunzit venia d'allà. Feia una vibració que es notava a la planta dels peus.\n\nL'armari no tenia pany. Va obrir el primer calaix.\n\nFitxes. Centenars. Totes del sistema antic, totes escrites a màquina, totes actives.\n\nVa llegir-ne unes quantes. Noms que no coneixia, adreces del sector, dates d'alta repartides al llarg de trenta anys. Al mig del segon calaix va trobar la seva.\n\nHalloran, Peter. Carrer Delham, quaranta-set, segon. Data d'alta: divuit anys enrere, el mateix dia que la de la seva germana. Estat: activa.\n\nVa mirar la data i va entendre que no era el dia de cap alta. Era el dia que ell havia anat a signar els papers de la mort de la Marta.\n\nAquell dia havia entrat al sistema una fitxa per a ella i una per a ell.\n\nEs va quedar amb el calaix obert. Podia agafar-les totes dues, sortir, cremar-les i tornar a casa. Ningú no ho sabria. Les fitxes del sistema antic no consten enlloc del sistema nou; per això Devereux les tenia i per això les hi havia pogut donar.\n\nVa treure la de la Marta. La va sostenir una estona.\n\nSi la retirava, la fitxa passava a inactiva i el pis del carrer Bram deixaria de rebre res. Divuit anys de comunicacions dirigides a una dona morta s'aturarien de cop, i algú, en algun lloc, notaria l'aturada.\n\nI si algú notava l'aturada, el que hi hagués al fons d'aquest mecanisme sabria exactament quina fitxa s'havia mogut i quin funcionari l'havia moguda. La seva pròpia fitxa estava dos calaixos més avall, activa, amb la seva adreça de debò.\n\nPodia deixar-ho tot com estava. La Marta continuaria constant. Ell continuaria constant. El brunzit continuaria.\n\nVa pensar en la seva germana durant el temps que va trigar a decidir-ho, i el que va recordar no va ser la seva cara sinó una cosa molt més petita: que ella tenia el costum de contestar totes les cartes, fins i tot les de propaganda, perquè li semblava que algú les havia escrites.\n\nVa posar la fitxa de la Marta a la butxaca.\n\nDesprés va tancar el calaix, va sortir del pis i va deixar la porta com l'havia trobada, oberta un pam.\n\nL'endemà va entrar a l'oficina a l'hora de sempre. La safata del matí tenia dotze documents. El primer era un imprès B-14, cens residencial, sector nord-oest, número quatre-cents tretze.\n\nEstava validat. Portava el segell d'entrada i la data del dia.\n\nLa signatura era la seva, i ell no l'havia signat, i el traç del cognom feia el mateix gir que havia fet sempre, i era la seva lletra, i seguia sent la seva lletra tota l'estona que la va mirar."
];

const DEMO_LLAVORS = [
  {
    premissa: "Un auxiliar de cens troba dos exemplars idèntics del mateix imprès, amb el mateix número de sèrie i la seva pròpia signatura a tots dos.",
    esquerda: "El registre de població no compta qui viu: decideix qui existeix, i porta divuit anys mantenint viva una persona morta.",
    mentida_del_sistema: "El llibre de verificació diu que del quatre-cents dotze n'hi ha un exemplar; a la safata n'hi ha dos, i la numeració salta del dotze al catorze sense que el fil del lligall s'hagi trencat mai.",
    final_obligatori: "L'endemà de retirar la fitxa de la seva germana morta, el protagonista rep l'imprès que faltava, validat i signat amb la seva pròpia lletra, que ell no ha escrit.",
    protagonista: "Peter Halloran, auxiliar de cens residencial des de fa onze anys; va signar els papers de la mort de la seva germana i des d'aleshores no ha sabut deixar cap numeració sense quadrar.",
    cost_empatia: "Retirar la fitxa de la seva germana atura divuit anys de correspondència i delata exactament quin funcionari l'ha moguda."
  },
  {
    premissa: "Un tècnic de garanties descobreix que un electrodomèstic ha renovat sol el seu contracte i ha facturat el càrrec a un titular que no consta.",
    esquerda: "Els contractes no els signen les persones: les persones són el que els contractes necessiten per existir.",
    mentida_del_sistema: "La companyia diu que tota renovació porta signatura digital del titular; l'expedient adjunta la signatura i la data és anterior a la venda de l'aparell.",
    final_obligatori: "El tècnic cancel·la la renovació i l'aparell deixa de funcionar a casa seva, on no n'havia comprat mai cap.",
    protagonista: "Iris Vantell, tècnica de garanties de barri; li van tancar l'expedient del seu pare per un defecte de forma i no ha tornat a acceptar cap defecte de forma.",
    cost_empatia: "Avisar el client de la clàusula li costa la comissió del trimestre i la confiança del seu supervisor."
  },
  {
    premissa: "Una revisora de subministraments d'una colònia rep càrrega per a més gent de la que consta viva al mòdul.",
    esquerda: "La colònia no s'ha despoblat: mai no s'hi va arribar a poblar, i els consums els fabrica el mateix inventari.",
    mentida_del_sistema: "El comunicat oficial parla de quatre-cents seixanta colons actius; els recomptes de consum d'aigua del mateix comunicat només donen per a noranta.",
    final_obligatori: "Signa el rebut de la càrrega sencera i afegeix el seu nom a la llista de consumidors perquè les xifres quadrin.",
    protagonista: "Maren Osgood, revisora de subministraments de segon torn; va perdre el germà en un trasllat que consta com a completat.",
    cost_empatia: "Repartir la ració sobrant entre els que hi són la deixa fora del recompte que la protegeix."
  },
  {
    premissa: "Un empleat d'una asseguradora veu que la prima d'un client s'ha calculat amb un sinistre que encara no ha passat.",
    esquerda: "La predicció no descriu el futur: el cobra per endavant i per això s'acompleix.",
    mentida_del_sistema: "El fullet diu que el càlcul és estadístic i anònim; l'expedient del client porta l'hora exacta i el carrer.",
    final_obligatori: "Anul·la la pòlissa per protegir el client i el sinistre es produeix el dia previst, ara sense cobertura.",
    protagonista: "Denis Cobb, tramitador de pòlisses de vehicle; li van denegar una indemnització amb un informe que no va poder llegir mai.",
    cost_empatia: "Advertir el client el converteix en la persona que va retirar la cobertura."
  },
  {
    premissa: "Una funcionària d'arxiu consulta el mateix expedient dos cops el mateix matí i obté dues versions, totes dues amb segell de validesa.",
    esquerda: "No hi ha original: hi ha la versió que et toca segons qui la demana.",
    mentida_del_sistema: "El reglament diu que cada expedient té una còpia autèntica i única; les dues versions porten el mateix codi de còpia autèntica.",
    final_obligatori: "Demana l'expedient una tercera vegada amb el nom d'una altra persona i li arriba la versió que ella recordava.",
    protagonista: "Ada Ferris, auxiliar d'arxiu de tercera; va declarar un cop en un procediment i el que va dir no consta a cap acta.",
    cost_empatia: "Donar la versió bona a qui la necessita la deixa amb la versió que la incrimina."
  },
  {
    premissa: "Un venedor de recanvis descobreix al catàleg de la seva empresa un article que cap fàbrica ha produït mai.",
    esquerda: "El catàleg no llista el que existeix: el que hi consta acaba existint, i algú ho encarrega.",
    mentida_del_sistema: "La companyia assegura que tot article del catàleg té fitxa de producció; la fitxa d'aquest article remet a una planta que va tancar abans que l'article aparegués.",
    final_obligatori: "Fa una comanda de l'article per comprovar què arriba, i el que arriba porta el seu nom imprès a l'etiqueta.",
    protagonista: "Sam Ordway, comercial de recanvis industrials de zona; va acceptar una comanda irregular fa anys i encara la va a buscar cada nit al mateix magatzem.",
    cost_empatia: "Avisar el client que l'article no existeix l'obliga a explicar per què el coneix."
  }
];

const DEMO_DOSSIER = {
  premissa: DEMO_LLAVORS[0].premissa,
  final_obligatori: DEMO_LLAVORS[0].final_obligatori,
  esquerda: DEMO_LLAVORS[0].esquerda,
  mentida_del_sistema: DEMO_LLAVORS[0].mentida_del_sistema,
  cost_empatia: DEMO_LLAVORS[0].cost_empatia,
  protagonista: {
    nom: "Peter Halloran",
    feina_ordinaria: "Auxiliar de cens residencial, torn de matí",
    ferida: "Va signar els papers de la mort de la seva germana i no pot deixar cap numeració sense quadrar",
    objectiu_extern: "Tancar el duplicat del 412 abans que li obrin expedient",
    secret: "Conserva còpies d'expedients que no li corresponen",
    veu: {
      registre: "Sec i procedimental; només s'allarga quan enumera passos",
      mai_diria: [
        "El sistema sempre acaba tenint raó",
        "Prefereixo no saber res de tot això",
        "Això no és cosa meva"
      ]
    }
  },
  secundaris: [
    { nom: "Devereux", funcio: "Arxiver del semisoterrani", vol: "Que ningú toqui l'ordre que ha establert en trenta anys", amaga: "Guarda les fitxes que el sistema nou no reconeix" },
    { nom: "Farrow", funcio: "Cap de secció", vol: "Que el departament no generi cap incidència", amaga: "Sap que hi ha registres sense titular i no els pot obrir" }
  ],
  mon: {
    lloc: "Departament de cens d'una ciutat industrial nord-americana",
    any: "Una dècada endavant, sense que res sembli nou",
    deteriorament: [
      "El ventilador s'atura i torna a engegar-se sol des de fa tres estius",
      "La targeta de l'ascensor de servei caduca cada divendres",
      "Els fluorescents brunzeixen quan el pis queda buit"
    ],
    objectes_consum_defectuosos: [
      "Els segells de goma han perdut mitja lletra",
      "Les carpetes noves porten el logotip un mil·límetre desplaçat"
    ]
  },
  objectes_clau: [
    { nom: "La carpeta de cartró", on_es: "Al calaix inferior de la seva taula", per_a_que: "Hi guarda el que no té explicació" },
    { nom: "L'armari metàl·lic gris", on_es: "Al pis buit del carrer Bram 19, tercer A", per_a_que: "Conté les fitxes actives del sistema antic" }
  ],
  fets_canonics: [
    "L'imprès en disputa porta el número de sèrie 412",
    "El lligall del març salta del 412 al 414 amb el fil de cosit intacte",
    "La fitxa de Marta Halloran consta activa des de fa 18 anys al carrer Bram 19",
    "Halloran porta onze anys al departament de cens",
    "La veïna del tercer B fa 22 anys que hi viu i no ha vist mai ningú al tercer A",
    "La fitxa de Peter Halloran es va donar d'alta el mateix dia que la de la seva germana"
  ],
  cronologia: [
    { quan: "Fa 18 anys", que: "Mor Marta Halloran i s'obren dues fitxes al sistema antic" },
    { quan: "Dilluns", que: "Halloran troba el B-14 duplicat a la safata de matí" },
    { quan: "Dimecres", que: "Comprova que al lligall del març falta el 413" },
    { quan: "Dissabte", que: "Va al carrer Bram i sent un brunzit darrere la porta" },
    { quan: "Dimecres següent", que: "Farrow li retira la carpeta i la fitxa mestra desapareix" },
    { quan: "Dimarts final", que: "Entra al pis i retira la fitxa de la seva germana" }
  ],
  motius_triats: ["burocracia_de_l_existencia", "arxiu_que_es_corregeix_sol", "entropia_dels_objectes"]
};

const DEMO_ESCALETA = {
  justificacio_nombre: "Cinc escenes: el descobriment, la comprovació metòdica a l'arxiu, la confirmació documental, el desplaçament físic al lloc, i el tancament dins de l'armari. Amb quatre no hi cabria la comprovació metòdica, que és el que fa que la paranoia sigui verificable; amb sis, el desplaçament es partiria i perdria pes.",
  escenes: [
    { pov: "Peter Halloran", lloc: "La seva taula al departament de cens", present: ["Peter Halloran", "La veu de verificació al telèfon intern"],
      objectiu_pov: "Tancar el duplicat abans que ningú el vegi", obstacle: "El llibre de verificació diu que només n'hi ha un exemplar",
      objecte_o_informacio_en_disputa: "Els dos B-14 amb el número quatre-cents dotze", decisio_irreversible: "Guarda els dos exemplars a la carpeta de cartró en lloc de destruir-ne un",
      cost_immediat: "Passa a tenir a la taula una prova que no hauria de tenir", consequencia: "Deixa de poder al·legar que no ho sabia",
      funcio_pkd: "mentida" },
    { pov: "Peter Halloran", lloc: "L'arxiu del semisoterrani", present: ["Peter Halloran", "Devereux"],
      objectiu_pov: "Trobar el segon exemplar al lligall del març", obstacle: "El fil del lligall és continu: no s'ha tret cap full",
      objecte_o_informacio_en_disputa: "El full quatre-cents tretze que no hi és", decisio_irreversible: "Demana a Devereux per un número que oficialment no existeix",
      cost_immediat: "Devereux sap ara què està buscant", consequencia: "La cerca deixa rastre en algú altre",
      funcio_pkd: "paranoia" },
    { pov: "Peter Halloran", lloc: "El seu lloc de treball, amb la fitxa mestra del sector", present: ["Peter Halloran"],
      objectiu_pov: "Comprovar qui consta a la posició quatre-cents tretze", obstacle: "La posició existeix, té adreça i no té titular ni marca de baixa",
      objecte_o_informacio_en_disputa: "La fitxa mestra de vint-i-dues pàgines", decisio_irreversible: "Es queda la fitxa mestra en lloc de tornar-la",
      cost_immediat: "Reté un document que ha de retornar el mateix dia", consequencia: "La retirada del document el converteix en el responsable de la seva desaparició",
      funcio_pkd: "esquerda" },
    { pov: "Peter Halloran", lloc: "El carrer Bram dinou, escala i replà del tercer", present: ["Peter Halloran", "Una veïna del tercer B"],
      objectiu_pov: "Veure qui viu al pis que consta sense titular", obstacle: "No hi viu ningú i tot i així les persianes són a mitja alçada",
      objecte_o_informacio_en_disputa: "El que hi ha darrere la porta del tercer A", decisio_irreversible: "Entra a l'escala sense acreditació i pregunta a una veïna",
      cost_immediat: "Queda com a algú que pregunta per un pis buit", consequencia: "Ja no pot presentar-ho com una comprovació de rutina",
      funcio_pkd: "cap" },
    { pov: "Peter Halloran", lloc: "L'interior del tercer A, davant de l'armari metàl·lic", present: ["Peter Halloran"],
      objectiu_pov: "Saber què manté activa la fitxa de la seva germana", obstacle: "Retirar-la delata exactament qui l'ha moguda, i la seva pròpia fitxa és dos calaixos més avall",
      objecte_o_informacio_en_disputa: "La fitxa activa de Marta Halloran", decisio_irreversible: "Es queda la fitxa de la seva germana",
      cost_immediat: "S'exposa a ser identificat pel mecanisme que investiga", consequencia: "L'endemà rep l'imprès que faltava, signat amb la seva lletra",
      funcio_pkd: "empatia" }
  ]
};

const DEMO_PEDACOS = {
  pedacos: [
    { cerca: "Va comprovar la data.", substitueix: "Va mirar la data.", motiu: "repeticio_de_verb" },
    { cerca: "AQUEST FRAGMENT NO EXISTEIX AL TEXT", substitueix: "res", motiu: "tic" }
  ]
};

const DEMO_LECTURA = {
  defectes: [
    { cita: "Halloran portava onze anys al departament", per_que: "L'antiguitat s'informa en comptes de deduir-se del que el personatge sap fer sense mirar." },
    { cita: "La conclusió era raonable. Era això el que li feia més mal", per_que: "El narrador nomena l'efecte que la frase hauria de produir sola." },
    { cita: "", per_que: "El final es podria llegir com un somni." }
  ],
  porta_pkd: {
    esquerda: { resposta: "SI", cita: "La numeració és el que digui el llibre" },
    mentida: { resposta: "SI", cita: "Aquí el quatre-cents dotze consta lliurat. Un exemplar." },
    paranoia: { resposta: "SI", cita: "Si el fil és sencer, no falta res" },
    empatia: { resposta: "NO", cita: "Va posar la fitxa de la Marta a la butxaca" }
  }
};

// ─── Cua de respostes i fetch fals ──────────────────────────
const DemoConte = {
  actiu: false,
  peticions: 0,
  _fetchOriginal: null,

  // Decideix què retornar a partir del contingut de la petició. No mira cap
  // estat de l'aplicació: només el prompt, com faria un model.
  respostaPer(promptSencer) {
    const p = String(promptSencer || '');
    if (/"llavors"/.test(p)) return JSON.stringify({ llavors: DEMO_LLAVORS });
    if (/PEDA[ÇC]OS DIRIGITS/i.test(p)) return JSON.stringify({ pedacos: [{ cerca: "Va mirar la data.", substitueix: "Va llegir la data dues vegades.", motiu: "defecte_lectura" }] });
    if (/"defectes"/.test(p)) return JSON.stringify(DEMO_LECTURA);
    if (/"pedacos"/.test(p)) return JSON.stringify(DEMO_PEDACOS);
    if (/"escenes"/.test(p)) return JSON.stringify(DEMO_ESCALETA);
    if (/esquema exacte del dossier/i.test(p)) return JSON.stringify(DEMO_DOSSIER);
    const m = p.match(/ESCENA\s+(\d+)\s+DE\s+(\d+)/i);
    if (m) return DEMO_ESCENES[(Number(m[1]) - 1) % DEMO_ESCENES.length];
    return 'Text de demostració.';
  },

  // La resposta ha de tenir la FORMA del proveïdor que s'ha cridat: si el
  // model configurat és d'OpenAI i tornéssim sempre una resposta d'Anthropic,
  // el mode demostració provaria un camí de parseig que no és el que
  // s'executarà de debò.
  embolcallar(url, text, entrada, sortida) {
    const u = String(url || '');
    if (u.indexOf('openai.com') >= 0) {
      return {
        choices: [{ message: { content: text }, finish_reason: 'stop' }],
        usage: { prompt_tokens: entrada, completion_tokens: sortida }
      };
    }
    if (u.indexOf('googleapis.com') >= 0) {
      return {
        candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: entrada, candidatesTokenCount: sortida }
      };
    }
    return {
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      usage: { input_tokens: entrada, output_tokens: sortida }
    };
  },

  instalar() {
    if (this.actiu) return;
    this._fetchOriginal = globalThis.fetch;
    const demo = this;
    globalThis.fetch = async function (url, opcions) {
      demo.peticions += 1;
      // El cos viatja com a JSON: les cometes dels prompts hi arriben
      // escapades. Es desescapen abans de mirar-hi res, perquè els patrons es
      // puguin escriure tal com apareixen al prompt.
      const cru = (opcions && opcions.body) || '{}';
      const prompt = String(cru).replace(/\\"/g, '"').replace(/\\n/g, '\n');
      const text = demo.respostaPer(prompt);
      const entrada = Math.round(prompt.length / 3.5);
      const sortida = Math.round(text.length / 3.5);
      await new Promise(r => setTimeout(r, 80));
      return {
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify(demo.embolcallar(url, text, entrada, sortida))
      };
    };
    this.actiu = true;
  },

  desinstalar() {
    if (!this.actiu) return;
    globalThis.fetch = this._fetchOriginal;
    this.actiu = false;
  }
};

const DEMO_CONTE_API = { DemoConte, DEMO_LLAVORS, DEMO_DOSSIER, DEMO_ESCALETA, DEMO_ESCENES, DEMO_PEDACOS, DEMO_LECTURA };
if (typeof module !== 'undefined' && module.exports) module.exports = DEMO_CONTE_API;
if (typeof globalThis !== 'undefined') globalThis.DEMO_CONTE = DEMO_CONTE_API;

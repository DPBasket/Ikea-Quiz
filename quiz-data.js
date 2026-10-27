'use strict';
/*
 * IKEA QUIZ – contenuto della serata (dal PowerPoint "IKEA.pptx").
 * Resta SOLO sul server: i telefoni ricevono le soluzioni solo al momento della rivelazione.
 *
 * Tipi di domanda:
 *   choice : risposte multiple, `correct` = indice della risposta giusta
 *   order  : mettere in ordine (logo → anni); `items` sono già nell'ordine corretto
 * Campi immagine:
 *   img       : mostrata insieme alla domanda
 *   revealImg : mostrata solo quando si rivela la soluzione (per non suggerirla)
 * Per modificare il quiz basta cambiare questo file.
 */

const PARTS = [
  {
    n: 1, title: 'STORIA IKEA', subtitle: 'Da una fattoria svedese al mondo',
    rules: [
      'Leggi la domanda e premi PRONTO sul telefono',
      'Quando tutti sono pronti appaiono le risposte',
      'Tocca la risposta: è DEFINITIVA',
      'Più sei veloce, più punti fai (500 – 1000)'
    ],
    questions: [
      { type: 'choice', q: 'In quale anno è nata IKEA?', answers: ['1942', '1943', '1944', '1945'], correct: 1 },
      { type: 'choice', q: 'Il nome IKEA è un acronimo: le iniziali del fondatore, della fattoria di famiglia e del villaggio d\'origine. Quali sono?',
        answers: ['Ingvar Kamprad, Elmtaryd, Agunnaryd', 'Ingvar Karlsson, Elmhult, Agnestad', 'Ivar Andersson, Elmstad, Agnaryd', 'Ingvar Kampe, Elmtaryd, Agnaryd'], correct: 0 },
      { type: 'choice', q: 'Come nacque per caso l\'imballaggio piatto (flat-pack) di IKEA nel 1956?',
        answers: ['Per far stare un tavolo in auto', 'Per risparmiare sul magazzino', 'Per ridurre i costi di trasporto', 'Una geniale intuizione di Ingvar'], correct: 0 },
      { type: 'choice', q: 'Cosa introdusse IKEA nel 1960?',
        answers: ['Il primo ristorante', 'Il primo negozio negli USA', 'Le polpette', 'Il carrello'], correct: 0 },
      { type: 'choice', q: 'Cosa spinse IKEA a dare un nome ai prodotti invece di usare semplici numeri?',
        answers: ['La dislessia del fondatore', 'Il marketing svedese', 'Un\'idea della sua ragazza', 'Una richiesta dei clienti'], correct: 0 },
      { type: 'order', q: 'Metti in ordine i loghi IKEA, dal più vecchio al più recente',
        hint: 'Trascina i loghi (o usa ▲▼), poi premi CONFERMA',
        items: [
          { img: 'logo-1951.png', label: '1951' }, { img: 'logo-1954.png', label: '1954' }, { img: 'logo-1967.png', label: '1967' },
          { img: 'logo-1981.png', label: '1981' }, { img: 'logo-1983.png', label: '1983' }, { img: 'logo-2018.png', label: '2018' }
        ] }
    ]
  },
  {
    n: 2, title: 'INDOVINA L\'OGGETTO', subtitle: 'Come si chiama?',
    rules: [
      'Appare la foto di un prodotto IKEA',
      'Scegli il suo vero nome tra 5 nomi svedesi',
      'Risposta definitiva, più veloce = più punti',
      'Poteri attivi dalla 2ª domanda'
    ],
    questions: [
      { type: 'choice', q: 'Come si chiama?', img: 'img2.jpg', answers: ['GÅRDSMÄSTARE', 'DIMPA', 'STUK', 'KNAPPER', 'BAXNA'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'img3.jpg', answers: ['BRÄNNBOLL', 'SANDBI', 'EKET', 'JERKER', 'IVAR'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'img4.jpg', answers: ['HUVUDROLL', 'REFRÄNG', 'KNÄCKEBRÖD RÅG', 'DRYCK LINGON', 'SJÖRAPPORT'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'img5.jpg', answers: ['GRÄDDAT', 'HJÄLTEROLL', 'KORVBRÖD', 'LEKSANDS KNÄCKEBRÖD', 'SÅS SENAP & DILL'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'img6.jpg', answers: ['TIMMERFLOTTE', 'KAJPLATS', 'MYGGSPRAY', 'PILSKOTT', 'DUBBELKISEL'], correct: 0 },
      { type: 'choice', q: 'Come si chiama questa pianta?', img: 'img7.jpg', answers: ['MONSTERA DELICIOSA', 'SUCCULENT', 'FICUS MICROCARPA', 'FICUS ELASTICA ROBUSTA', 'HEDERA HELIX'], correct: 4 },
      { type: 'choice', q: 'Come si chiama?', img: 'img8.jpg', answers: ['RANTÄNEN', 'TANDÅN', 'BACKSJÖN', 'RÄNNILEN', 'BJÖRKÅN'], correct: 1 },
      { type: 'choice', q: 'Come si chiama?', img: 'img9.jpg', answers: ['STORKLINTA', 'KULLEN', 'GILLERSBERG', 'GILLERSBERGER', 'IKEA PS 2026'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'img10.jpg', answers: ['MALM', 'LAGKAPTEN / ALEX', 'LAGKAPTEN / ADILS', 'MULLSJÖ', 'HAALAND'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'img11.jpg', answers: ['FRIHETEN', 'SOLBAKKEN', 'BÅRSLÖV', 'SKÖNABÄCK', 'SALTSJÖBADEN'], correct: 0 }
    ]
  },
  {
    n: 3, title: 'PERSONA O MOBILE?', subtitle: 'Un nome… ma di chi?',
    rules: [
      'Appare un nome svedese',
      'Decidi: è una PERSONA vera o un MOBILE IKEA?',
      'Poi si scopre la foto',
      'Risposta definitiva, più veloce = più punti'
    ],
    questions: [
      { type: 'choice', word: 'TORBJÖRN', q: 'Persona o mobile?', answers: ['PERSONA', 'MOBILE'], correct: 1, revealImg: 'img12.jpg' },
      { type: 'choice', word: 'JERKA', q: 'Persona o mobile?', answers: ['PERSONA', 'MOBILE'], correct: 0, revealImg: 'img13.jpg' },
      { type: 'choice', word: 'INGVAR', q: 'Persona o mobile?', answers: ['PERSONA', 'MOBILE'], correct: 0, revealImg: 'img14.jpg' },
      { type: 'choice', word: 'KRONWALL', q: 'Persona o mobile?', answers: ['PERSONA', 'MOBILE'], correct: 0, revealImg: 'img15.jpg' },
      { type: 'choice', word: 'BONDHOLMEN', q: 'Persona o mobile?', answers: ['PERSONA', 'MOBILE'], correct: 1, revealImg: 'img16.jpg' },
      { type: 'choice', word: 'KJELLBERG', q: 'Persona o mobile?', answers: ['PERSONA', 'MOBILE'], correct: 0, revealImg: 'img17.jpg' },
      { type: 'choice', word: 'LUSTIGT', q: 'Persona o mobile?', answers: ['PERSONA', 'MOBILE'], correct: 1, revealImg: 'img18.jpg' }
    ]
  },
  {
    n: 4, title: 'CITTÀ SVEDESE O MOBILE?', subtitle: 'Svezia vera o catalogo IKEA?',
    rules: [
      'Prime 3 domande: 3 nomi sono mobili, 1 è una CITTÀ → trova la città',
      'Ultime 3 domande: 3 sono città, 1 è un MOBILE → trova il mobile',
      'La foto si scopre alla fine',
      'Risposta definitiva, più veloce = più punti'
    ],
    questions: [
      { type: 'choice', q: 'Quale di questi 4 è una CITTÀ? (gli altri 3 sono mobili)', answers: ['Svappavaara', 'DRAGON', 'SPJUTBO', 'FÖNSTERBLAD'], correct: 0, revealImg: 'img19.jpg' },
      { type: 'choice', q: 'Quale di questi 4 è una CITTÀ? (gli altri 3 sono mobili)', answers: ['Färjestaden', 'KLIPPAN', 'POÄNG', 'VÄRDERA'], correct: 0, revealImg: 'img20.jpg' },
      { type: 'choice', q: 'Quale di questi 4 è una CITTÀ? (gli altri 3 sono mobili)', answers: ['Luleå', 'KIVIK', 'LANDSKRONA', 'JÄTTEBO'], correct: 0, revealImg: 'img21.jpg' },
      { type: 'choice', q: 'E ora al contrario: quale di questi 4 è un MOBILE? (gli altri 3 sono città)', answers: ['Båtskärsnäs', 'Piteå', 'Hej', 'NÄMMARÖ'], correct: 3, revealImg: 'img22.jpg' },
      { type: 'choice', q: 'Quale di questi 4 è un MOBILE? (gli altri 3 sono città)', answers: ['Skänninge', 'TIGERFINK', 'Åre', 'Nybro'], correct: 1, revealImg: 'img23.jpg' },
      { type: 'choice', q: 'Quale di questi 4 è un MOBILE? (gli altri 3 sono città)', answers: ['Jönköping', 'Sjöbo', 'Baskemölla', 'SOLHETTA'], correct: 3, revealImg: 'img24.jpg' }
    ]
  }
];

/* Ordine della serata: una gara prima di ogni parte + la gara finale (vale doppio). */
const RACES = [
  { before: 1, trackId: 'showroom' },
  { before: 2, trackId: 'magazzino' },
  { before: 3, trackId: 'ristorante' },
  { before: 4, trackId: 'smaland' },
  { before: null, trackId: 'casse', final: true }
];

/*
 * POTERI (bonus e ostacoli) – segnaposto finché non decidi quelli definitivi.
 * kind: 'obstacle' → si sceglie un avversario   |   'bonus' → vale per te stesso
 * Per aggiungerne uno: nuova voce qui + il suo effetto in public/quiz-player.js (funzione applyEffects).
 */
const POWERS = {
  GHIACCIO: { kind: 'obstacle', label: 'GHIACCIO',   desc: 'Congela lo schermo: deve toccare 6 volte per romperlo' },
  MELMA:    { kind: 'obstacle', label: 'MELMA',      desc: 'Macchie di melma coprono le risposte: vanno pulite' },
  SCATOLE:  { kind: 'obstacle', label: 'SCATOLONI',  desc: 'Scatoloni coprono le risposte per 4 secondi' },
  SCUDO:    { kind: 'bonus',    label: 'SCUDO',      desc: 'Ti protegge dagli ostacoli in questa domanda' },
  DOPPIO:   { kind: 'bonus',    label: 'PUNTI ×2',   desc: 'Se rispondi giusto, punti doppi' }
};

const TIMES = {
  powers: 15000,        // scelta del potere
  reading: 30000,       // max per leggere la domanda (poi le risposte appaiono comunque)
  answer: 20000,        // tempo per rispondere
  order: 35000          // tempo per la domanda "metti in ordine"
};

module.exports = { PARTS, RACES, POWERS, TIMES };

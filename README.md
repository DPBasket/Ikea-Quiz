# IKEA QUIZ & RACE 🛒🏁❓

Party game per la serata: **quiz IKEA in stile "Sapere è Potere"** + **gare di kart** in 3D nel negozio IKEA.
La TV o il proiettore mostra la presentazione, ognuno gioca dal proprio telefono. Fino a **15 giocatori**.

> Questo è un sito **separato** da IKEA RACE: il vecchio sito di prova resta com'era.

## Mettere online (nuovo sito, nessuna installazione per chi gioca)

1. Su GitHub crea un **nuovo** repository, per esempio `Ikea-Quiz`.
2. Premi **Add file → Upload files** e trascina **tutto il contenuto** della cartella `ikea-quiz`: la cartella `public` (che contiene anche le foto del quiz, i file `q-…`), `server.js`, `quiz.js`, `quiz-data.js`, `package.json` e `README.md`. Poi premi **Commit changes**.
3. Su render.com: **New + → Web Service → Git Provider → GitHub**, scegli `Ikea-Quiz` e premi **Connect**.
4. Imposta **Build** `npm install`, **Start** `npm start`, **Instance Type** Free, poi premi **Deploy Web Service**.
5. Quando compare **Live**, apri il link sul PC collegato alla TV: è lo schermo della serata.

Il piano gratuito "si addormenta" dopo ~15 minuti senza uso: apri il link qualche minuto prima di iniziare.

## La serata

```
Benvenuto → 🏁 Gara 1 (Showroom) → PARTE 1 Storia IKEA
          → 🏁 Gara 2 (Magazzino) → PARTE 2 Indovina l'oggetto
          → 🏁 Gara 3 (Ristorante) → PARTE 3 Persona o mobile?
          → 🏁 Gara 4 (Småland) → PARTE 4 Città svedese o mobile?
          → 🏁 GARA FINALE (Casse, punti ×2) → 🏆 Classifica finale
```

Ogni parte inizia con una schermata di istruzioni. Ogni domanda segue questi passi:

1. **⚡ Poteri** (dalla 2ª domanda di ogni parte, mai subito dopo una gara): 30 s. A ognuno escono **3 poteri a caso** (diversi per ogni giocatore): ne sceglie uno o nessuno. Prima il potere, poi contro chi.
2. **Lettura**: la domanda appare su TV e telefoni, tutti premono **PRONTO**.
3. **Risposte**: appaiono quando tutti sono pronti, 30 secondi per rispondere. Si tocca la risposta sul telefono: è **definitiva**. Gli ostacoli ricevuti si attivano qui.
4. **Soluzione**: sulla TV la risposta giusta, chi ha scelto cosa e i punti guadagnati.

Le risposte compaiono **in ordine mescolato** (diverso a ogni partita).

**Punti quiz (scalano col numero di giocatori, N):** tra chi risponde giusto, il più veloce prende N×10, il secondo (N−1)×10 e così via; sbagliato o nessuna risposta 0. Con 6 giocatori: 60, 50, 40… Nella parte 3 (Persona o mobile, solo due risposte) i punti sono **la metà**. Nella domanda dei loghi i punti sono in proporzione ai loghi al posto giusto.

**Punti segreti:** durante il quiz ognuno vede solo i propri punti sul telefono. La TV mostra chi ha risposto giusto, ma non i punti.
La classifica appare solo **dopo le parti 1, 2 e 3**. Dopo la parte 4 resta segreta, e alla fine si scopre **dall'ultimo al primo**.

**Punti gara:** 1° N×10, poi 10 in meno per posizione, ultimo 10. La gara finale vale doppio. **Giro più veloce:** +10 punti e un potere esclusivo alla prima domanda della parte successiva (quella in cui normalmente i poteri sono spenti).
La **griglia di partenza** di ogni gara segue la classifica del quiz: chi è primo parte in pole.

### Comandi sullo schermo (host)
- **AVANTI ▶** (o freccia destra / spazio / invio) per andare avanti. Durante poteri, lettura e risposte serve a saltare l'attesa.
- Durante la gara: **✕ ANNULLA GARA**, poi **RIAVVIA** o **SALTA GARA**.
- Con un solo giocatore le gare vengono saltate.

### Uscire e rientrare senza perdere nulla
Se un telefono si spegne o si chiude la pagina, basta riaprire il link: si rientra **esattamente dov'eri**, con punti, risposta già data e potere scelto.
Il gioco aspetta chi è uscito fino allo scadere del tempo, così chi rientra in tempo può ancora rispondere.
Lo stato viene salvato anche su disco: se il server si riavvia, la partita riprende dalla stessa domanda.
Anche lo schermo TV si può ricaricare: con **RIPRENDI LA PARTITA** si torna alla serata.

## Comandi dal computer (schermo grande)
- **Menu** (in alto a destra, su ogni schermata tranne la lobby): *Vai alla lobby* (la partita resta, poi "Riprendi") oppure *Interrompi e azzera il quiz* (ferma anche una gara in corso e rimette i punti a zero). Nella lobby, a partita iniziata, c'è anche il bottone **Azzera il quiz**.
- **Togliere giocatori**: nella lobby passa col mouse su un giocatore e premi **×**. Il bottone **Togli chi è offline** toglie in un colpo chi ha chiuso il telefono. Si può fare solo tra una gara e l'altra.
- **Solo gare**: in alto a destra nella lobby scegli *Solo gare*, poi il percorso (anche SPAREGGIO, che così corrono tutti) e premi **Parti**. Dopo la gara, *Continua* riporta alla lobby.

## Gran finale: l'ultimo giro e la ruota
Se la classifica finale ha un vincitore chiaro (nessun pari merito, nessuno spareggio), dopo lo scontrino parte un voto: **"Un ultimo giro sulla pista 6?"**. Si vota Sì / No dal telefono (25 secondi). Se almeno **la metà** di chi ha votato dice sì, si corre.
- L'ultimo giro è sulla pista SPAREGGIO, da A a B. **Non vale punti**. La griglia segue la classifica finale: il primo parte in pole.
- Chi lo vince **gira la ruota** dal telefono (o il presentatore con "Gira per lui"). La ruota gira sullo schermo grande per circa 11 secondi. La probabilità di ogni casella è lo spazio che occupa: più un premio è grande, meno spazio ha. Il Rick roll è uno spicchio sottile, metà di uno normale.

| Casella | Spicchi | Probabilità | Cosa succede |
|---|---|---|---|
| Niente | 6 | 36% | la classifica resta com'è |
| Cioccolatino | 3 | 18% | vince un cioccolatino, classifica uguale |
| Scambio ↑ | 3 | 18% | scambia posto con chi gli sta sopra (se è già primo, niente) |
| Sposta 3 | 2 | 12% | 3 mosse da una posizione: può salire lui fino a 3 posti o spostare gli altri |
| Gira ancora | 1 | 6% | gira di nuovo la ruota |
| Decidi tu | 1 | 6% | mette lui in ordine tutta la classifica finale |
| Rick roll | ½ | 3% | parte il Rick roll sul suo telefono (e sulla TV), classifica uguale |

- Con *Sposta 3* e *Decidi tu* il vincitore ordina la classifica sul telefono con le frecce ▲▼ e preme **Conferma**. Intanto la TV mostra le mosse.
- Alla fine torna lo scontrino con la classifica nuova (i punti restano quelli, conta l'ordine).
- Sulla TV puoi anche saltare tutto con **Niente ultimo giro**. Con *Annulla la gara* durante l'ultimo giro la classifica resta com'era.
- Le caselle si cambiano in `quiz-data.js`: `WHEEL` è l'ordine degli spicchi, `WHEEL_W` gli spicchi sottili, `EXTRA.spinMs` quanto gira.

## Pari merito: la gara di spareggio
Se alla fine due o più giocatori hanno gli stessi punti, lo scontrino lo segna ("pari") e sullo schermo compare il bottone **Gara di spareggio**.
- Corrono **solo i giocatori a pari merito**, sul percorso extra **SPAREGGIO**: non è un giro, si parte da A e si arriva a B (circa 2 minuti), con tre passaggi sopraelevati (due ponti e un soppalco che porta all'arrivo) e nessun incrocio a raso.
- Lo spareggio non dà punti: chi arriva prima passa davanti in classifica. Gli altri sul telefono vedono "Gara di spareggio" e guardano la TV.
- Dopo la gara premi **Continua** e torni alla classifica finale aggiornata. Se restano altri pari merito (per esempio al 4° posto), il bottone ricompare.
- All'incrocio a raso non si può girare: chi sbaglia strada viene rimesso sul suo percorso dopo un secondo.
- Per provarlo prima della serata: nella lobby premi *Solo gare*, scegli SPAREGGIO e premi Parti.

## Gara: i lanci di chi è già arrivato
Chi taglia il traguardo può sabotare chi corre ancora: sul telefono sceglie cosa lanciare (purè, cuscino o scatola) e poi tocca il nome di un pilota. L'oggetto gli cade sulla strada poco davanti, nella sua corsia. Il 1° ha 4 lanci, l'ultimo 1. La TV annuncia ogni lancio ("SARA → una scatola davanti a POÄNG!").

## Gara: oggetti speciali
- I cubi "?" ricompaiono dopo mezzo secondo.
- Chi è indietro trova molto più spesso le polpette turbo.
- **Bandiera svedese:** rallenta tutti gli altri; più sei avanti, più dura (1° circa 4 s, ultimo circa 1,5 s).
- **Carrello razzo:** per 5 s il kart va veloce e si guida da solo seguendo la pista, ma puoi correggerlo. È immune agli oggetti, e chi tocchi si blocca come contro uno scatolone.

## Foto del quiz
Le foto sono nella cartella `public` e hanno nomi che iniziano con `q-`.
Se sullo schermo, nella lobby, compare l'avviso rosso "foto non trovate", vuol dire che su GitHub mancano quei file: ricaricali nella cartella `public`.

## Modificare domande e poteri
Tutto sta in **`quiz-data.js`**: domande, risposte (`correct` = indice della risposta giusta), immagini (file `q-…` in `public/`), istruzioni delle parti, ordine delle gare, tempi e poteri.

I **poteri**: ne escono 3 a caso a testa. Quelli semplici escono spesso, quelli che riempiono lo schermo (Faaah, Polpette, Scatoloni) circa un terzo delle volte.
- **Scudo**: protegge dagli ostacoli di questa domanda. Massimo 2 volte a partita.
- **Ruba i punti**: i punti che l'avversario fa in questa domanda vanno a te; se indovini tieni anche i tuoi.
- **Scambio punti**: scambi il totale con un avversario. Esce più spesso a chi è in fondo alla classifica, mai al primo.
- **Pole position**: paghi 30 punti e parti primo alla prossima gara.
- **In fondo alla griglia**: paghi 20 punti e scegli chi parte ultimo alla prossima gara.
- **Decidi la griglia** (solo parti 2 e 3, uno per parte): a fine parte, sul telefono, metti in ordine tutta la griglia della gara successiva. Chi ha comprato la pole o è stato mandato in fondo resta bloccato al suo posto.
- **Sbircia la classifica**: vedi la classifica attuale sul tuo telefono.
- **Punti ×2**: se rispondi giusto, punti doppi.
- **Togli una sbagliata**: sparisce una risposta sbagliata (non esce nella parte 3).
- **Faaah**: ai primi due tocchi dell'avversario su una risposta parte il suono col gattino e il tocco non vale; poi riprova.
- **Polpette**: polpette IKEA che rotolano sullo schermo dell'avversario.
- **Scatoloni**: scatoloni che cadono sulle risposte e le coprono per 8 secondi.
- **Sback** (sbrodolino + snack): sul telefono dell'avversario sparisce un quarto delle lettere delle risposte, con i segni dei morsi sulle caselle.
- Tra i 3 poteri che ti escono c'è **sempre almeno uno tra Sback, Scatoloni e Polpette** (anche quando arriva un Rick roll o Via la giusta, quello non viene tolto).

**Gli ostacoli si sommano.** Se più persone lanciano lo stesso ostacolo alla stessa vittima, ogni copia in più vale +0,5: con 2 lanci l'effetto è 1,5 volte, con 3 lanci 2 volte.

| Ostacolo | 1 lancio | 2 lanci | 3 lanci |
|---|---|---|---|
| Polpette | 10 polpette | 15 | 20 |
| Scatoloni | 8 s | 12 s | 16 s |
| Faaah | 2 tocchi mangiati | 3 | 4 |
| Sback | 1/4 delle lettere | 2/5 | 3/6 (non di più) |

Due poteri **speciali** non escono a caso: il quiz li dà a una sola persona.
- **Rick roll**: uno solo per parte (4 in tutto). Sul telefono dell'avversario parte il video (10 s) e non può rispondere finché dura. Chi lo riceve e non lo usa, al turno dopo non può scegliere poteri (penitenza).
- **Via la giusta**: da 1 a 2 volte in tutto il quiz. Sul telefono dell'avversario sparisce la risposta giusta, quindi sbaglia per forza. Lo scudo lo ferma.

Video e suono di Rick roll e Faaah partono da YouTube. Su alcuni telefoni (soprattutto iPhone) l'audio automatico può essere bloccato: per andare sul sicuro carica in `public/` un video `q-rickroll.mp4` e un suono `q-faaah.mp3`, e il gioco userà quelli.
Per aggiungerne uno nuovo serve una voce in `POWERS` (`quiz-data.js`) e il suo effetto in `public/quiz-player.js` (funzione `applyEffects`).

## Provare senza amici
Nella lobby: **+ 3 BOT DEMO** / **+ 7 BOT**. I bot rispondono, usano i poteri e corrono in gara.
Apri `/player.html` in un'altra finestra per giocare anche tu.

In locale: `npm install` e poi `npm start`, quindi apri `http://localhost:3000/host.html`.

## Stile grafico
Catalogo IKEA + libretto di istruzioni: blu `#0058AB`, giallo `#FFDA1A`, bianco, grigio magazzino `#F5F5F5`, nero `#111111`.
Titoli in **Plus Jakarta Sans** maiuscolo, numeri (codice, secondi, punti, tempi) in **Space Mono**. I font sono dentro `public/fonts`, quindi funzionano anche senza internet.
- Domande, risposte, punteggi e giocatori sono cartellini del prezzo: bordo nero 2px, angoli vivi, ombra netta.
- Risposta giusta: cartellino giallo con la spunta tonda. Risposta sbagliata (sul telefono): croce rossa e una piccola scossa.
- Regole di ogni parte come istruzioni di montaggio, con i passaggi cerchiati ① ② ③ e i disegni (chiave a brugola, matita, pacco piatto).
- Cambio schermata: una tendina gialla e blu attraversa lo schermo. Timer: barra gialla su fascia blu, con le tacche del metro.
- Gare: cartelli di corsia sospesi (“Corsia 01 · Scaffale A”), classifica a cartellini con il numero cerchiato e l'etichetta **1° POSTO**, che compare anche sopra il kart in testa.
- Pulsanti: sul computer si avvicinano al mouse, quando li premi si schiacciano; sul telefono una piccola vibrazione.

Lo stile sta in `public/theme-tv.css` (schermo), `public/theme-phone.css` (telefono) e `public/ikea-ui.js` (micro-animazioni): si possono cambiare senza toccare il gioco.

## File
```
server.js        server: gare (fisica, oggetti, bot) + collegamento al quiz
quiz.js          regia della serata: fasi, punti, poteri, rientro, salvataggio
quiz-data.js     contenuto: 41 domande, gare, poteri, tempi
public/host.html, quiz-host.js, quiz-host.css        schermo TV
public/player.html, quiz-player.js, quiz-player.css  telefono
public/render.js, tracks.js                          grafica 3D, piste, avatar
public/theme-tv.css, theme-phone.css, ikea-ui.js     stile IKEA e micro-animazioni
public/fonts.css, fonts/                             font Plus Jakarta Sans e Space Mono
public/q-*.jpg, q-logo-*.png                          foto delle domande e loghi
```

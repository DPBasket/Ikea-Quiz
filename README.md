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

## Pari merito: la gara di spareggio
Se alla fine due o più giocatori hanno gli stessi punti, lo scontrino lo segna ("pari") e sullo schermo compare il bottone **Gara di spareggio**.
- Corrono **solo i giocatori a pari merito**, sul percorso extra **SPAREGGIO**: non è un giro, si parte da A e si arriva a B (circa 2 minuti), con due ponti sopraelevati e un incrocio a raso.
- Lo spareggio non dà punti: chi arriva prima passa davanti in classifica. Gli altri sul telefono vedono "Gara di spareggio" e guardano la TV.
- Dopo la gara premi **Continua** e torni alla classifica finale aggiornata. Se restano altri pari merito (per esempio al 4° posto), il bottone ricompare.
- All'incrocio a raso non si può girare: chi sbaglia strada viene rimesso sul suo percorso dopo un secondo.
- Per provarlo prima della serata: nella lobby premi *Solo gare*, scegli SPAREGGIO e premi Parti.

## Gara: oggetti speciali
- I cubi "?" ricompaiono dopo mezzo secondo.
- Chi è indietro trova molto più spesso le polpette turbo.
- **Bandiera svedese:** rallenta tutti gli altri; più sei avanti, più dura (1° circa 4 s, ultimo circa 1,5 s).
- **Carrello razzo:** per 5,5 s il kart va veloce e si guida da solo seguendo la pista, ma puoi correggerlo. È immune agli oggetti, e chi tocchi si blocca come contro uno scatolone.

## Foto del quiz
Le foto sono nella cartella `public` e hanno nomi che iniziano con `q-`.
Se sullo schermo, nella lobby, compare l'avviso rosso "foto non trovate", vuol dire che su GitHub mancano quei file: ricaricali nella cartella `public`.

## Modificare domande e poteri
Tutto sta in **`quiz-data.js`**: domande, risposte (`correct` = indice della risposta giusta), immagini (file `q-…` in `public/`), istruzioni delle parti, ordine delle gare, tempi e poteri.

I **poteri** (13, ne escono 3 a caso a testa):
- **Scudo**: protegge dagli ostacoli di questa domanda. Massimo 2 volte a partita.
- **Ruba i punti**: i punti che l'avversario fa in questa domanda vanno a te; se indovini tieni anche i tuoi.
- **Scambio punti**: scambi il totale con un avversario. Esce più spesso a chi è in fondo alla classifica, mai al primo.
- **Pole position**: paghi 30 punti e parti primo alla prossima gara.
- **In fondo alla griglia**: paghi 20 punti e scegli chi parte ultimo alla prossima gara.
- **Rick roll**: sul telefono dell'avversario parte il video (10 s) e non può rispondere finché dura.
- **Faaah**: al primo tocco dell'avversario su una risposta parte il suono col gattino e la risposta non vale; poi riprova.
- **Sbircia la classifica**: vedi la classifica attuale sul tuo telefono.
- **Punti ×2**: se rispondi giusto, punti doppi.
- **Polpette**: polpette IKEA che rotolano sullo schermo dell'avversario.
- **Scatoloni**: scatoloni che coprono le risposte per 4 secondi.
- **Mangia lettere**: sul telefono dell'avversario spariscono lettere da domanda e risposte ("Apple" → "ple"); riappaiono poco a poco in 12 secondi.
- **Togli una sbagliata**: sparisce una risposta sbagliata (non esce nella parte 3).

Video e suono di Rick roll e Faaah partono da YouTube. Su alcuni telefoni (soprattutto iPhone) l'audio automatico può essere bloccato: per andare sul sicuro carica in `public/` un video `q-rickroll.mp4` e un suono `q-faaah.mp3`, e il gioco userà quelli.
Per aggiungerne uno nuovo serve una voce in `POWERS` (`quiz-data.js`) e il suo effetto in `public/quiz-player.js` (funzione `applyEffects`).

## Provare senza amici
Nella lobby: **+ 3 BOT DEMO** / **+ 7 BOT**. I bot rispondono, usano i poteri e corrono in gara.
Apri `/player.html` in un'altra finestra per giocare anche tu.

In locale: `npm install` e poi `npm start`, quindi apri `http://localhost:3000/host.html`.

## File
```
server.js        server: gare (fisica, oggetti, bot) + collegamento al quiz
quiz.js          regia della serata: fasi, punti, poteri, rientro, salvataggio
quiz-data.js     contenuto: 41 domande, gare, poteri, tempi
public/host.html, quiz-host.js, quiz-host.css        schermo TV
public/player.html, quiz-player.js, quiz-player.css  telefono
public/render.js, tracks.js                          grafica 3D, piste, avatar
public/q-*.jpg, q-logo-*.png                          foto delle domande e loghi
```

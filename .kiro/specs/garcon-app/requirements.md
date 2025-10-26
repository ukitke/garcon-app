# Requirements Document

## Introduction

Garçon è un'applicazione mobile che digitalizza l'esperienza del servizio al tavolo nei ristoranti. L'app utilizza la geolocalizzazione per identificare automaticamente il locale e permette ai clienti di ordinare dal menu, chiamare il cameriere e pagare direttamente dal proprio smartphone. Il sistema include anche una piattaforma di gestione per i proprietari dei locali per aggiornare menu e prezzi.

## Glossary

- **Garçon_App**: L'applicazione mobile per clienti disponibile su iOS e Android
- **Admin_Panel**: L'interfaccia web per proprietari di locali per gestire menu e impostazioni
- **Premium_Analytics**: Servizio a pagamento che fornisce analytics avanzate e insights di business
- **Reservation_System**: Sistema integrato per prenotazioni tavoli simile a TheFork
- **Group_Ordering**: Sistema che permette ordini multipli per tavolo con nomi fantasy e pagamenti separati
- **Review_System**: Sistema per lasciare recensioni e valutazioni del locale
- **Subscription_Model**: Sistema di abbonamento mensile per i ristoranti
- **Geolocation_Service**: Il servizio che identifica automaticamente il locale basandosi sulla posizione GPS
- **Order_System**: Il sistema che gestisce gli ordini dal menu pre-impostato
- **Waiter_Call_System**: Il sistema che permette di chiamare il cameriere tramite notifica
- **Payment_System**: Il sistema che gestisce i pagamenti digitali e tradizionali
- **Table_Management**: Il sistema che associa clienti a specifici tavoli numerati
- **Menu_Management**: Il sistema che permette ai proprietari di aggiornare menu e prezzi

## Requirements

### Requirement 1

**User Story:** Come cliente di un ristorante, voglio che l'app riconosca automaticamente dove mi trovo, così posso accedere rapidamente al menu del locale senza dover cercare manualmente.

#### Acceptance Criteria

1. WHEN il cliente apre Garçon_App, THE Geolocation_Service SHALL identificare automaticamente il locale entro 30 secondi
2. IF il cliente si trova fuori dal raggio di locali supportati, THEN THE Garçon_App SHALL mostrare un messaggio informativo
3. THE Garçon_App SHALL richiedere permessi di geolocalizzazione al primo avvio
4. WHEN la geolocalizzazione è disabilitata, THE Garçon_App SHALL permettere la selezione manuale del locale
5. THE Geolocation_Service SHALL mantenere una precisione di almeno 50 metri per l'identificazione del locale

### Requirement 2

**User Story:** Come cliente, voglio selezionare il mio numero di tavolo all'inizio della sessione, così i camerieri sanno esattamente dove trovarmi per ordini e richieste.

#### Acceptance Criteria

1. WHEN il locale è identificato, THE Garçon_App SHALL mostrare una schermata di selezione tavolo
2. THE Table_Management SHALL validare che il numero tavolo inserito esista nel locale
3. WHEN un tavolo è già occupato da un'altra sessione attiva, THE Garçon_App SHALL mostrare un avviso
4. THE Garçon_App SHALL permettere la modifica del numero tavolo durante la sessione
5. WHEN il numero tavolo è confermato, THE Garçon_App SHALL abilitare tutte le funzionalità principali

### Requirement 3

**User Story:** Come cliente, voglio ordinare dal menu pre-impostato del locale, così posso effettuare il mio ordine senza dover aspettare il cameriere.

#### Acceptance Criteria

1. WHEN il tavolo è selezionato, THE Order_System SHALL mostrare il menu completo del locale
2. THE Order_System SHALL permettere l'aggiunta di articoli al carrello con quantità personalizzabili
3. WHEN un articolo ha opzioni di personalizzazione, THE Order_System SHALL mostrare le opzioni disponibili
4. THE Order_System SHALL calcolare automaticamente il totale dell'ordine incluse tasse
5. WHEN l'ordine è confermato, THE Order_System SHALL inviare immediatamente la notifica alla cucina con numero tavolo

### Requirement 4

**User Story:** Come cliente, voglio chiamare un cameriere premendo il tasto "Garçon", così posso richiedere assistenza quando necessario.

#### Acceptance Criteria

1. THE Garçon_App SHALL mostrare un pulsante "Garçon" sempre visibile durante la sessione
2. WHEN il pulsante Garçon è premuto, THE Waiter_Call_System SHALL inviare una notifica immediata ai camerieri
3. THE Waiter_Call_System SHALL includere il numero tavolo nella notifica
4. WHEN un cameriere risponde alla chiamata, THE Garçon_App SHALL mostrare conferma al cliente
5. THE Waiter_Call_System SHALL permettere un solo call attivo per tavolo alla volta

### Requirement 5

**User Story:** Come cliente, voglio pagare il conto tramite l'app o richiedere il pagamento al tavolo, così posso scegliere il metodo più conveniente per me.

#### Acceptance Criteria

1. THE Payment_System SHALL supportare Google Pay, Apple Pay, PayPal, Satispay e carte Visa/Mastercard
2. WHEN il cliente sceglie pagamento digitale, THE Payment_System SHALL processare il pagamento in modo sicuro
3. THE Payment_System SHALL permettere la richiesta del conto al tavolo come opzione alternativa
4. WHEN il pagamento è completato, THE Payment_System SHALL inviare ricevuta digitale al cliente
5. THE Payment_System SHALL supportare divisione del conto per gruppi multipli

### Requirement 6

**User Story:** Come proprietario di un locale, voglio gestire il menu e i prezzi tramite un pannello amministrativo, così posso mantenere aggiornate le informazioni senza dipendere da terzi.

#### Acceptance Criteria

1. THE Admin_Panel SHALL permettere l'aggiunta, modifica e rimozione di articoli del menu
2. THE Menu_Management SHALL permettere l'aggiornamento dei prezzi in tempo reale
3. THE Admin_Panel SHALL supportare categorizzazione degli articoli (antipasti, primi, secondi, etc.)
4. WHEN le modifiche sono salvate, THE Menu_Management SHALL aggiornare immediatamente l'app cliente
5. THE Admin_Panel SHALL permettere l'upload di immagini per gli articoli del menu

### Requirement 7

**User Story:** Come cameriere, voglio ricevere notifiche in tempo reale per ordini e chiamate, così posso fornire un servizio tempestivo ai clienti.

#### Acceptance Criteria

1. WHEN un ordine è piazzato, THE Order_System SHALL inviare notifica push ai dispositivi dei camerieri
2. WHEN un cliente preme Garçon, THE Waiter_Call_System SHALL inviare notifica prioritaria
3. THE Garçon_App SHALL mostrare lo stato degli ordini (ricevuto, in preparazione, pronto)
4. THE Waiter_Call_System SHALL permettere ai camerieri di rispondere alle chiamate
5. THE Order_System SHALL mantenere cronologia degli ordini per tavolo con timestamp

### Requirement 8

**User Story:** Come cliente, voglio prenotare un tavolo e lasciare recensioni del locale, così posso pianificare la mia visita e condividere la mia esperienza.

#### Acceptance Criteria

1. THE Reservation_System SHALL permettere prenotazioni con data, ora e numero persone
2. THE Reservation_System SHALL mostrare disponibilità tavoli in tempo reale
3. THE Review_System SHALL permettere valutazioni da 1 a 5 stelle dopo il pagamento
4. THE Review_System SHALL permettere recensioni testuali opzionali
5. THE Garçon_App SHALL mostrare media recensioni e commenti per ogni locale

### Requirement 9

**User Story:** Come gruppo di clienti allo stesso tavolo, vogliamo ordinare individualmente con nomi divertenti e pagare separatamente, così ognuno può gestire il proprio ordine e conto.

#### Acceptance Criteria

1. WHEN più persone si uniscono allo stesso tavolo, THE Group_Ordering SHALL assegnare nomi fantasy casuali
2. THE Group_Ordering SHALL permettere ordini individuali tracciati per nome fantasy
3. THE Payment_System SHALL permettere pagamenti separati per ogni persona del gruppo
4. THE Group_Ordering SHALL permettere a chiunque di offrire e pagare per altri membri
5. THE Group_Ordering SHALL supportare un ordine unificato gestito da una sola persona come opzione

### Requirement 10

**User Story:** Come cliente, voglio aggiungere note speciali ai miei ordini, così posso comunicare preferenze specifiche o modifiche agli articoli.

#### Acceptance Criteria

1. THE Order_System SHALL fornire un campo note per ogni articolo ordinato
2. THE Order_System SHALL permettere note generali per l'intero ordine
3. WHEN note sono aggiunte, THE Order_System SHALL evidenziarle chiaramente nella notifica cucina
4. THE Order_System SHALL limitare le note a 200 caratteri per articolo
5. THE Order_System SHALL mostrare le note in modo prominente nell'interfaccia camerieri

### Requirement 11

**User Story:** Come proprietario di un locale, voglio accedere ad analytics premium a pagamento, così posso ottenere insights avanzati per ottimizzare il mio business.

#### Acceptance Criteria

1. THE Subscription_Model SHALL offrire abbonamento base gratuito con funzionalità limitate
2. THE Premium_Analytics SHALL fornire insights dettagliati su vendite, preferenze clienti e performance
3. THE Premium_Analytics SHALL identificare trend stagionali e pattern di consumo
4. THE Premium_Analytics SHALL suggerire ottimizzazioni di menu basate sui dati
5. THE Subscription_Model SHALL gestire pagamenti ricorrenti mensili per servizi premium

### Requirement 12

**User Story:** Come cameriere, voglio utilizzare tablet dedicati per gestire ordini e chiamate, così posso coordinare efficacemente il servizio con il team.

#### Acceptance Criteria

1. THE Garçon_App SHALL fornire interfaccia ottimizzata per tablet per camerieri
2. THE Order_System SHALL sincronizzare in tempo reale tra tutti i dispositivi del locale
3. THE Waiter_Call_System SHALL mostrare priorità delle chiamate sui tablet camerieri
4. THE Order_System SHALL permettere aggiornamento stato ordini dai tablet
5. THE Admin_Panel SHALL permettere configurazione numero e assegnazione tablet per locale
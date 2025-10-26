const readline = require('readline');
const fs = require('fs');

console.log('🍽️  GARÇON APP SIMULATOR');
console.log('========================');
console.log('Simulatore interattivo completo dell\'app Garçon');
console.log('Testa tutti i flussi utente senza bisogno del backend reale!\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Stato dell'applicazione
let appState = {
  currentUser: null,
  currentRestaurant: null,
  currentTable: null,
  cart: [],
  orders: [],
  notifications: [],
  isLoggedIn: false,
  fantasyName: null,
  tableSession: null
};

// Dati mock
const mockData = {
  restaurants: [
    {
      id: 1,
      name: "Ristorante Da Mario",
      address: "Via Roma 123, Milano",
      rating: 4.5,
      distance: "150m",
      tables: ["T001", "T002", "T003", "T004", "T005"]
    },
    {
      id: 2,
      name: "Pizzeria Bella Napoli",
      address: "Corso Buenos Aires 456, Milano", 
      rating: 4.2,
      distance: "300m",
      tables: ["T101", "T102", "T103"]
    },
    {
      id: 3,
      name: "Trattoria del Borgo",
      address: "Via Brera 789, Milano",
      rating: 4.7,
      distance: "500m",
      tables: ["B001", "B002", "B003", "B004"]
    }
  ],
  
  menus: {
    1: { // Da Mario
      categories: [
        {
          name: "Antipasti",
          items: [
            { id: 1, name: "Bruschette Miste", price: 8.50, description: "Pomodoro, aglio, basilico" },
            { id: 2, name: "Antipasto della Casa", price: 12.00, description: "Salumi e formaggi locali" }
          ]
        },
        {
          name: "Primi Piatti", 
          items: [
            { id: 3, name: "Spaghetti Carbonara", price: 14.00, description: "Uova, pancetta, pecorino" },
            { id: 4, name: "Risotto ai Funghi", price: 16.00, description: "Riso carnaroli, porcini" }
          ]
        },
        {
          name: "Secondi Piatti",
          items: [
            { id: 5, name: "Bistecca alla Fiorentina", price: 28.00, description: "1kg, per 2 persone" },
            { id: 6, name: "Branzino al Sale", price: 22.00, description: "Pesce fresco del giorno" }
          ]
        },
        {
          name: "Dolci",
          items: [
            { id: 7, name: "Tiramisu", price: 6.00, description: "Ricetta della nonna" },
            { id: 8, name: "Panna Cotta", price: 5.50, description: "Ai frutti di bosco" }
          ]
        }
      ]
    },
    2: { // Pizzeria
      categories: [
        {
          name: "Pizze Classiche",
          items: [
            { id: 9, name: "Margherita", price: 8.00, description: "Pomodoro, mozzarella, basilico" },
            { id: 10, name: "Marinara", price: 7.00, description: "Pomodoro, aglio, origano" },
            { id: 11, name: "Quattro Stagioni", price: 12.00, description: "Prosciutto, funghi, carciofi, olive" }
          ]
        },
        {
          name: "Pizze Speciali",
          items: [
            { id: 12, name: "Diavola", price: 10.00, description: "Pomodoro, mozzarella, salame piccante" },
            { id: 13, name: "Capricciosa", price: 11.50, description: "Prosciutto, funghi, carciofi, olive, uova" }
          ]
        }
      ]
    }
  },
  
  fantasyNames: [
    "Drago Rosso", "Fenice Dorata", "Lupo Argentato", "Aquila Nera", 
    "Tigre Bianca", "Falco Veloce", "Leone Coraggioso", "Orso Forte",
    "Volpe Astuta", "Cervo Elegante", "Pantera Silenziosa", "Gatto Magico"
  ]
};

// Utility functions
function clearScreen() {
  console.clear();
  console.log('🍽️  GARÇON APP SIMULATOR');
  console.log('========================\n');
}

function showMenu(options, title = "Scegli un'opzione:") {
  console.log(`📋 ${title}`);
  console.log('─'.repeat(50));
  options.forEach((option, index) => {
    console.log(`${index + 1}. ${option}`);
  });
  console.log('0. Torna indietro');
  console.log('─'.repeat(50));
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`❓ ${question} `, resolve);
  });
}

function showSuccess(message) {
  console.log(`✅ ${message}\n`);
}

function showError(message) {
  console.log(`❌ ${message}\n`);
}

function showInfo(message) {
  console.log(`ℹ️  ${message}\n`);
}

function formatPrice(price) {
  return `€${price.toFixed(2)}`;
}

// Main menu functions
async function showMainMenu() {
  clearScreen();
  
  if (appState.isLoggedIn) {
    console.log(`👤 Benvenuto, ${appState.currentUser}!`);
    if (appState.currentRestaurant) {
      console.log(`📍 Ristorante: ${appState.currentRestaurant.name}`);
    }
    if (appState.currentTable) {
      console.log(`🪑 Tavolo: ${appState.currentTable}`);
    }
    if (appState.fantasyName) {
      console.log(`🎭 Nome Fantasy: ${appState.fantasyName}`);
    }
    console.log();
  }
  
  const options = appState.isLoggedIn ? [
    "🏠 Home - Seleziona Ristorante",
    "🍽️  Menu e Ordinazione", 
    "🛒 Carrello",
    "📋 I Miei Ordini",
    "🔔 Notifiche",
    "👤 Profilo",
    "🚪 Logout"
  ] : [
    "🔐 Login",
    "📝 Registrazione",
    "ℹ️  Info App"
  ];
  
  showMenu(options, "Menu Principale");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  if (!appState.isLoggedIn) {
    switch(choice) {
      case '1': await handleLogin(); break;
      case '2': await handleRegistration(); break;
      case '3': await showAppInfo(); break;
      case '0': await exitApp(); break;
      default: 
        showError("Scelta non valida!");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return showMainMenu();
    }
  } else {
    switch(choice) {
      case '1': await handleRestaurantSelection(); break;
      case '2': await handleMenuAndOrdering(); break;
      case '3': await handleCart(); break;
      case '4': await handleOrders(); break;
      case '5': await handleNotifications(); break;
      case '6': await handleProfile(); break;
      case '7': await handleLogout(); break;
      case '0': await exitApp(); break;
      default:
        showError("Scelta non valida!");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return showMainMenu();
    }
  }
}

// Authentication functions
async function handleLogin() {
  clearScreen();
  console.log("🔐 LOGIN");
  console.log("─".repeat(20));
  
  const email = await askQuestion("Email:");
  const password = await askQuestion("Password:");
  
  // Simula login
  if (email && password) {
    appState.isLoggedIn = true;
    appState.currentUser = email.split('@')[0];
    showSuccess("Login effettuato con successo!");
    await new Promise(resolve => setTimeout(resolve, 1500));
  } else {
    showError("Credenziali non valide!");
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  return showMainMenu();
}

async function handleRegistration() {
  clearScreen();
  console.log("📝 REGISTRAZIONE");
  console.log("─".repeat(20));
  
  const name = await askQuestion("Nome completo:");
  const email = await askQuestion("Email:");
  const phone = await askQuestion("Telefono:");
  const password = await askQuestion("Password:");
  const confirmPassword = await askQuestion("Conferma password:");
  
  if (password !== confirmPassword) {
    showError("Le password non coincidono!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return handleRegistration();
  }
  
  if (name && email && phone && password) {
    showSuccess("Registrazione completata! Ora puoi effettuare il login.");
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    showError("Tutti i campi sono obbligatori!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return handleRegistration();
  }
  
  return showMainMenu();
}

async function showAppInfo() {
  clearScreen();
  console.log("ℹ️  INFORMAZIONI GARÇON APP");
  console.log("─".repeat(30));
  console.log("🍽️  Garçon è l'app che rivoluziona l'esperienza al ristorante!");
  console.log("");
  console.log("✨ Funzionalità principali:");
  console.log("• 📍 Rilevamento automatico della posizione");
  console.log("• 🪑 Selezione tavolo tramite QR code o numero");
  console.log("• 🍽️  Menu digitale interattivo");
  console.log("• 🛒 Carrello e ordinazione semplificata");
  console.log("• 💳 Pagamenti multipli (carta, PayPal, Apple Pay, etc.)");
  console.log("• 👥 Ordinazioni di gruppo con nomi fantasy");
  console.log("• 🔔 Chiamata cameriere in tempo reale");
  console.log("• ⭐ Sistema di recensioni e valutazioni");
  console.log("• 📅 Prenotazioni tavoli");
  console.log("");
  
  await askQuestion("Premi INVIO per continuare...");
  return showMainMenu();
}

// Restaurant selection
async function handleRestaurantSelection() {
  clearScreen();
  console.log("📍 SELEZIONE RISTORANTE");
  console.log("─".repeat(25));
  console.log("🛰️  Rilevamento posizione GPS... ✅");
  console.log("📡 Ricerca ristoranti nelle vicinanze...\n");
  
  console.log("🍽️  Ristoranti trovati:");
  mockData.restaurants.forEach((restaurant, index) => {
    console.log(`${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address}`);
    console.log(`   ⭐ ${restaurant.rating}/5 - 📏 ${restaurant.distance}`);
    console.log();
  });
  
  const choice = await askQuestion("Seleziona un ristorante (numero):");
  const restaurantIndex = parseInt(choice) - 1;
  
  if (restaurantIndex >= 0 && restaurantIndex < mockData.restaurants.length) {
    appState.currentRestaurant = mockData.restaurants[restaurantIndex];
    showSuccess(`Ristorante selezionato: ${appState.currentRestaurant.name}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return handleTableSelection();
  } else {
    showError("Selezione non valida!");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return handleRestaurantSelection();
  }
}

async function handleTableSelection() {
  clearScreen();
  console.log("🪑 SELEZIONE TAVOLO");
  console.log("─".repeat(20));
  console.log(`📍 ${appState.currentRestaurant.name}\n`);
  
  const options = [
    "📱 Scansiona QR Code",
    "⌨️  Inserisci numero tavolo manualmente",
    "👥 Unisciti a un tavolo esistente"
  ];
  
  showMenu(options, "Come vuoi selezionare il tavolo?");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1':
      return handleQRScan();
    case '2':
      return handleManualTableEntry();
    case '3':
      return handleJoinTable();
    case '0':
      return handleRestaurantSelection();
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handleTableSelection();
  }
}

async function handleQRScan() {
  clearScreen();
  console.log("📱 SCANSIONE QR CODE");
  console.log("─".repeat(20));
  console.log("📷 Fotocamera attivata...");
  console.log("🎯 Inquadra il QR code sul tavolo");
  console.log("");
  console.log("⏳ Scansione in corso...");
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simula scansione QR
  const randomTable = appState.currentRestaurant.tables[Math.floor(Math.random() * appState.currentRestaurant.tables.length)];
  
  console.log("✅ QR Code rilevato!");
  appState.currentTable = randomTable;
  showSuccess(`Tavolo ${randomTable} selezionato!`);
  
  return handleTableJoin();
}

async function handleManualTableEntry() {
  clearScreen();
  console.log("⌨️  INSERIMENTO MANUALE TAVOLO");
  console.log("─".repeat(30));
  console.log("Tavoli disponibili:");
  appState.currentRestaurant.tables.forEach(table => {
    console.log(`• ${table}`);
  });
  console.log();
  
  const tableNumber = await askQuestion("Inserisci il numero del tavolo:");
  
  if (appState.currentRestaurant.tables.includes(tableNumber)) {
    appState.currentTable = tableNumber;
    showSuccess(`Tavolo ${tableNumber} selezionato!`);
    return handleTableJoin();
  } else {
    showError("Numero tavolo non valido!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return handleManualTableEntry();
  }
}

async function handleJoinTable() {
  clearScreen();
  console.log("👥 UNISCITI A TAVOLO");
  console.log("─".repeat(20));
  
  const tableCode = await askQuestion("Inserisci il codice del tavolo condiviso:");
  
  if (tableCode) {
    // Simula join tavolo
    appState.currentTable = "T001";
    appState.tableSession = tableCode;
    
    // Genera nome fantasy
    const randomName = mockData.fantasyNames[Math.floor(Math.random() * mockData.fantasyNames.length)];
    appState.fantasyName = randomName;
    
    showSuccess(`Ti sei unito al tavolo! Il tuo nome fantasy è: ${randomName}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return showMainMenu();
  } else {
    showError("Codice tavolo non valido!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return handleJoinTable();
  }
}

async function handleTableJoin() {
  clearScreen();
  console.log("🎭 CONFIGURAZIONE TAVOLO");
  console.log("─".repeat(25));
  
  const options = [
    "👤 Ordina da solo",
    "👥 Crea sessione di gruppo",
    "🎲 Unisciti come gruppo (nome fantasy)"
  ];
  
  showMenu(options, "Come vuoi procedere?");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1':
      showSuccess("Sessione individuale creata!");
      break;
    case '2':
      const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      appState.tableSession = groupCode;
      showSuccess(`Sessione di gruppo creata! Codice: ${groupCode}`);
      showInfo("Condividi questo codice con i tuoi amici per farli unire al tavolo.");
      break;
    case '3':
      const randomName = mockData.fantasyNames[Math.floor(Math.random() * mockData.fantasyNames.length)];
      appState.fantasyName = randomName;
      showSuccess(`Il tuo nome fantasy è: ${randomName}`);
      break;
    case '0':
      return handleTableSelection();
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handleTableJoin();
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  return showMainMenu();
}

// Menu and ordering
async function handleMenuAndOrdering() {
  if (!appState.currentRestaurant) {
    showError("Seleziona prima un ristorante!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return showMainMenu();
  }
  
  clearScreen();
  console.log("🍽️  MENU E ORDINAZIONE");
  console.log("─".repeat(25));
  console.log(`📍 ${appState.currentRestaurant.name}`);
  console.log(`🪑 Tavolo: ${appState.currentTable || 'Non selezionato'}\n`);
  
  const menu = mockData.menus[appState.currentRestaurant.id];
  if (!menu) {
    showError("Menu non disponibile per questo ristorante!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return showMainMenu();
  }
  
  console.log("📋 Categorie disponibili:");
  menu.categories.forEach((category, index) => {
    console.log(`${index + 1}. ${category.name} (${category.items.length} piatti)`);
  });
  console.log("0. Torna al menu principale");
  
  const choice = await askQuestion("Seleziona una categoria:");
  const categoryIndex = parseInt(choice) - 1;
  
  if (choice === '0') {
    return showMainMenu();
  }
  
  if (categoryIndex >= 0 && categoryIndex < menu.categories.length) {
    return showCategoryItems(menu.categories[categoryIndex]);
  } else {
    showError("Selezione non valida!");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return handleMenuAndOrdering();
  }
}

async function showCategoryItems(category) {
  clearScreen();
  console.log(`🍽️  ${category.name.toUpperCase()}`);
  console.log("─".repeat(30));
  
  category.items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name} - ${formatPrice(item.price)}`);
    console.log(`   ${item.description}`);
    console.log();
  });
  
  console.log("0. Torna alle categorie");
  
  const choice = await askQuestion("Seleziona un piatto da aggiungere al carrello:");
  const itemIndex = parseInt(choice) - 1;
  
  if (choice === '0') {
    return handleMenuAndOrdering();
  }
  
  if (itemIndex >= 0 && itemIndex < category.items.length) {
    return addToCart(category.items[itemIndex]);
  } else {
    showError("Selezione non valida!");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return showCategoryItems(category);
  }
}

async function addToCart(item) {
  clearScreen();
  console.log("🛒 AGGIUNGI AL CARRELLO");
  console.log("─".repeat(25));
  console.log(`📦 ${item.name} - ${formatPrice(item.price)}`);
  console.log(`📝 ${item.description}\n`);
  
  const quantity = await askQuestion("Quantità (default: 1):");
  const notes = await askQuestion("Note speciali (opzionale):");
  
  const cartItem = {
    ...item,
    quantity: parseInt(quantity) || 1,
    notes: notes || '',
    total: item.price * (parseInt(quantity) || 1)
  };
  
  appState.cart.push(cartItem);
  
  showSuccess(`${cartItem.quantity}x ${item.name} aggiunto al carrello!`);
  
  const continueChoice = await askQuestion("Vuoi continuare a ordinare? (s/n):");
  
  if (continueChoice.toLowerCase() === 's' || continueChoice.toLowerCase() === 'si') {
    return handleMenuAndOrdering();
  } else {
    return showMainMenu();
  }
}

// Cart management
async function handleCart() {
  clearScreen();
  console.log("🛒 CARRELLO");
  console.log("─".repeat(15));
  
  if (appState.cart.length === 0) {
    console.log("🛒 Il carrello è vuoto!");
    console.log("Vai al menu per aggiungere dei piatti.\n");
    await askQuestion("Premi INVIO per continuare...");
    return showMainMenu();
  }
  
  let total = 0;
  console.log("📦 Articoli nel carrello:\n");
  
  appState.cart.forEach((item, index) => {
    console.log(`${index + 1}. ${item.quantity}x ${item.name}`);
    console.log(`   ${formatPrice(item.price)} cad. = ${formatPrice(item.total)}`);
    if (item.notes) {
      console.log(`   📝 Note: ${item.notes}`);
    }
    console.log();
    total += item.total;
  });
  
  console.log("─".repeat(30));
  console.log(`💰 TOTALE: ${formatPrice(total)}`);
  console.log("─".repeat(30));
  
  const options = [
    "✅ Procedi al pagamento",
    "✏️  Modifica quantità",
    "🗑️  Rimuovi articolo",
    "🛒 Continua a ordinare",
    "🧹 Svuota carrello"
  ];
  
  showMenu(options, "Cosa vuoi fare?");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1': return handlePayment(); 
    case '2': return modifyCartItem();
    case '3': return removeCartItem();
    case '4': return handleMenuAndOrdering();
    case '5': 
      appState.cart = [];
      showSuccess("Carrello svuotato!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return showMainMenu();
    case '0': return showMainMenu();
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handleCart();
  }
}

async function modifyCartItem() {
  clearScreen();
  console.log("✏️  MODIFICA QUANTITÀ");
  console.log("─".repeat(20));
  
  appState.cart.forEach((item, index) => {
    console.log(`${index + 1}. ${item.quantity}x ${item.name}`);
  });
  
  const choice = await askQuestion("Seleziona l'articolo da modificare:");
  const itemIndex = parseInt(choice) - 1;
  
  if (itemIndex >= 0 && itemIndex < appState.cart.length) {
    const newQuantity = await askQuestion("Nuova quantità:");
    const qty = parseInt(newQuantity);
    
    if (qty > 0) {
      appState.cart[itemIndex].quantity = qty;
      appState.cart[itemIndex].total = appState.cart[itemIndex].price * qty;
      showSuccess("Quantità aggiornata!");
    } else {
      showError("Quantità non valida!");
    }
  } else {
    showError("Selezione non valida!");
  }
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  return handleCart();
}

async function removeCartItem() {
  clearScreen();
  console.log("🗑️  RIMUOVI ARTICOLO");
  console.log("─".repeat(20));
  
  appState.cart.forEach((item, index) => {
    console.log(`${index + 1}. ${item.quantity}x ${item.name}`);
  });
  
  const choice = await askQuestion("Seleziona l'articolo da rimuovere:");
  const itemIndex = parseInt(choice) - 1;
  
  if (itemIndex >= 0 && itemIndex < appState.cart.length) {
    const removedItem = appState.cart.splice(itemIndex, 1)[0];
    showSuccess(`${removedItem.name} rimosso dal carrello!`);
  } else {
    showError("Selezione non valida!");
  }
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  return handleCart();
}

// Payment
async function handlePayment() {
  clearScreen();
  console.log("💳 PAGAMENTO");
  console.log("─".repeat(15));
  
  const total = appState.cart.reduce((sum, item) => sum + item.total, 0);
  console.log(`💰 Totale da pagare: ${formatPrice(total)}\n`);
  
  const paymentOptions = [
    "💳 Carta di Credito/Debito",
    "📱 Apple Pay",
    "🤖 Google Pay", 
    "💙 PayPal",
    "🟣 Satispay",
    "👥 Pagamento condiviso",
    "🧾 Richiedi conto al tavolo"
  ];
  
  showMenu(paymentOptions, "Seleziona il metodo di pagamento:");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1': return handleCardPayment(total);
    case '2': return handleDigitalPayment("Apple Pay", total);
    case '3': return handleDigitalPayment("Google Pay", total);
    case '4': return handleDigitalPayment("PayPal", total);
    case '5': return handleDigitalPayment("Satispay", total);
    case '6': return handleSplitPayment(total);
    case '7': return handleTraditionalPayment(total);
    case '0': return handleCart();
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handlePayment();
  }
}

async function handleCardPayment(total) {
  clearScreen();
  console.log("💳 PAGAMENTO CON CARTA");
  console.log("─".repeat(25));
  
  const cardNumber = await askQuestion("Numero carta (16 cifre):");
  const expiry = await askQuestion("Scadenza (MM/AA):");
  const cvv = await askQuestion("CVV (3 cifre):");
  const name = await askQuestion("Nome intestatario:");
  
  if (cardNumber.length === 16 && expiry.length === 5 && cvv.length === 3 && name) {
    console.log("\n💳 Elaborazione pagamento...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return completePayment("Carta di Credito", total);
  } else {
    showError("Dati carta non validi!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return handleCardPayment(total);
  }
}

async function handleDigitalPayment(method, total) {
  clearScreen();
  console.log(`📱 PAGAMENTO CON ${method.toUpperCase()}`);
  console.log("─".repeat(30));
  
  console.log(`📱 Apertura ${method}...`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log("🔐 Autenticazione biometrica...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log("✅ Autenticazione riuscita!");
  console.log("💳 Elaborazione pagamento...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return completePayment(method, total);
}

async function handleSplitPayment(total) {
  clearScreen();
  console.log("👥 PAGAMENTO CONDIVISO");
  console.log("─".repeat(25));
  
  console.log("💡 Opzioni di divisione:");
  console.log("1. Dividi equamente tra tutti");
  console.log("2. Paga solo i tuoi piatti");
  console.log("3. Offri a qualcuno");
  console.log("0. Torna indietro");
  
  const choice = await askQuestion("Come vuoi dividere?");
  
  switch(choice) {
    case '1':
      const people = await askQuestion("Numero di persone:");
      const splitAmount = total / parseInt(people);
      console.log(`💰 La tua parte: ${formatPrice(splitAmount)}`);
      return handleDigitalPayment("Pagamento Condiviso", splitAmount);
    
    case '2':
      console.log("📋 I tuoi piatti:");
      let myTotal = 0;
      appState.cart.forEach(item => {
        console.log(`• ${item.quantity}x ${item.name} = ${formatPrice(item.total)}`);
        myTotal += item.total;
      });
      console.log(`💰 Totale dei tuoi piatti: ${formatPrice(myTotal)}`);
      return handleDigitalPayment("Pagamento Individuale", myTotal);
    
    case '3':
      const giftAmount = await askQuestion(`Quanto vuoi offrire? (max ${formatPrice(total)}):`);
      const amount = parseFloat(giftAmount);
      if (amount > 0 && amount <= total) {
        console.log(`🎁 Stai offrendo ${formatPrice(amount)} al tavolo!`);
        return handleDigitalPayment("Offerta", amount);
      } else {
        showError("Importo non valido!");
        await new Promise(resolve => setTimeout(resolve, 1500));
        return handleSplitPayment(total);
      }
    
    case '0':
      return handlePayment();
    
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handleSplitPayment(total);
  }
}

async function handleTraditionalPayment(total) {
  clearScreen();
  console.log("🧾 RICHIESTA CONTO AL TAVOLO");
  console.log("─".repeat(30));
  
  console.log("📞 Invio richiesta al cameriere...");
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log("✅ Richiesta inviata!");
  console.log("⏰ Il cameriere arriverà a breve con il conto.");
  console.log(`💰 Totale: ${formatPrice(total)}`);
  
  // Aggiungi notifica
  appState.notifications.push({
    id: Date.now(),
    type: "bill_request",
    message: "Richiesta conto inviata",
    time: new Date().toLocaleTimeString()
  });
  
  await askQuestion("Premi INVIO per continuare...");
  return showMainMenu();
}

async function completePayment(method, amount) {
  clearScreen();
  console.log("✅ PAGAMENTO COMPLETATO!");
  console.log("─".repeat(25));
  
  const orderId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  console.log(`🧾 Numero ordine: ${orderId}`);
  console.log(`💳 Metodo: ${method}`);
  console.log(`💰 Importo: ${formatPrice(amount)}`);
  console.log(`⏰ Orario: ${new Date().toLocaleTimeString()}`);
  console.log();
  
  // Crea ordine
  const order = {
    id: orderId,
    items: [...appState.cart],
    total: amount,
    method: method,
    status: "Confermato",
    time: new Date().toLocaleTimeString(),
    restaurant: appState.currentRestaurant.name,
    table: appState.currentTable
  };
  
  appState.orders.push(order);
  appState.cart = []; // Svuota carrello
  
  // Aggiungi notifiche
  appState.notifications.push({
    id: Date.now(),
    type: "order_confirmed",
    message: `Ordine ${orderId} confermato`,
    time: new Date().toLocaleTimeString()
  });
  
  console.log("🍽️  Il tuo ordine è stato inviato alla cucina!");
  console.log("📱 Riceverai notifiche sullo stato di preparazione.");
  console.log();
  
  const options = [
    "📋 Visualizza ordine",
    "🔔 Chiama cameriere",
    "⭐ Lascia recensione",
    "🏠 Torna al menu principale"
  ];
  
  showMenu(options, "Cosa vuoi fare ora?");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1': return showOrderDetails(order);
    case '2': return callWaiter();
    case '3': return leaveReview();
    case '4': return showMainMenu();
    default: return showMainMenu();
  }
}

// Orders management
async function handleOrders() {
  clearScreen();
  console.log("📋 I MIEI ORDINI");
  console.log("─".repeat(20));
  
  if (appState.orders.length === 0) {
    console.log("📋 Nessun ordine trovato!");
    console.log("Effettua il tuo primo ordine dal menu.\n");
    await askQuestion("Premi INVIO per continuare...");
    return showMainMenu();
  }
  
  console.log("🍽️  Ordini recenti:\n");
  
  appState.orders.forEach((order, index) => {
    console.log(`${index + 1}. Ordine ${order.id}`);
    console.log(`   🏪 ${order.restaurant} - 🪑 ${order.table}`);
    console.log(`   💰 ${formatPrice(order.total)} - ⏰ ${order.time}`);
    console.log(`   📊 Stato: ${order.status}`);
    console.log();
  });
  
  const choice = await askQuestion("Seleziona un ordine per i dettagli (0 per tornare):");
  const orderIndex = parseInt(choice) - 1;
  
  if (choice === '0') {
    return showMainMenu();
  }
  
  if (orderIndex >= 0 && orderIndex < appState.orders.length) {
    return showOrderDetails(appState.orders[orderIndex]);
  } else {
    showError("Selezione non valida!");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return handleOrders();
  }
}

async function showOrderDetails(order) {
  clearScreen();
  console.log(`📋 DETTAGLI ORDINE ${order.id}`);
  console.log("─".repeat(30));
  
  console.log(`🏪 Ristorante: ${order.restaurant}`);
  console.log(`🪑 Tavolo: ${order.table}`);
  console.log(`⏰ Orario: ${order.time}`);
  console.log(`💳 Pagamento: ${order.method}`);
  console.log(`📊 Stato: ${order.status}`);
  console.log();
  
  console.log("🍽️  Articoli ordinati:");
  order.items.forEach(item => {
    console.log(`• ${item.quantity}x ${item.name} - ${formatPrice(item.total)}`);
    if (item.notes) {
      console.log(`  📝 ${item.notes}`);
    }
  });
  
  console.log();
  console.log(`💰 TOTALE: ${formatPrice(order.total)}`);
  
  const options = [
    "🔔 Chiama cameriere",
    "📱 Tracking ordine",
    "⭐ Lascia recensione",
    "🧾 Ricevuta digitale"
  ];
  
  showMenu(options, "Azioni disponibili:");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1': return callWaiter();
    case '2': return trackOrder(order);
    case '3': return leaveReview();
    case '4': return showReceipt(order);
    case '0': return handleOrders();
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return showOrderDetails(order);
  }
}

async function trackOrder(order) {
  clearScreen();
  console.log(`📱 TRACKING ORDINE ${order.id}`);
  console.log("─".repeat(30));
  
  const statuses = [
    { status: "Confermato", time: order.time, completed: true },
    { status: "In preparazione", time: "15:32", completed: true },
    { status: "Pronto", time: "15:45", completed: false },
    { status: "Servito", time: "", completed: false }
  ];
  
  console.log("📊 Stato preparazione:\n");
  
  statuses.forEach(step => {
    const icon = step.completed ? "✅" : "⏳";
    const timeStr = step.time ? ` (${step.time})` : "";
    console.log(`${icon} ${step.status}${timeStr}`);
  });
  
  console.log();
  console.log("⏱️  Tempo stimato di completamento: 5-10 minuti");
  
  await askQuestion("Premi INVIO per continuare...");
  return showOrderDetails(order);
}

async function showReceipt(order) {
  clearScreen();
  console.log("🧾 RICEVUTA DIGITALE");
  console.log("─".repeat(25));
  
  console.log(`${order.restaurant}`);
  console.log(`Tavolo: ${order.table}`);
  console.log(`Data: ${new Date().toLocaleDateString()}`);
  console.log(`Ora: ${order.time}`);
  console.log(`Ordine: ${order.id}`);
  console.log();
  console.log("─".repeat(25));
  
  order.items.forEach(item => {
    console.log(`${item.quantity}x ${item.name.padEnd(20)} ${formatPrice(item.total)}`);
  });
  
  console.log("─".repeat(25));
  console.log(`TOTALE${' '.repeat(16)}${formatPrice(order.total)}`);
  console.log(`Pagato con: ${order.method}`);
  console.log("─".repeat(25));
  console.log();
  console.log("Grazie per aver scelto Garçon!");
  console.log("📧 Ricevuta inviata via email");
  
  await askQuestion("Premi INVIO per continuare...");
  return showOrderDetails(order);
}

// Waiter call
async function callWaiter() {
  clearScreen();
  console.log("🔔 CHIAMA CAMERIERE");
  console.log("─".repeat(20));
  
  const reasons = [
    "❓ Informazioni sul menu",
    "🍽️  Problema con l'ordine", 
    "💧 Richiesta acqua/pane",
    "🧾 Richiesta conto",
    "🧹 Pulizia tavolo",
    "🆘 Assistenza generica"
  ];
  
  showMenu(reasons, "Motivo della chiamata:");
  
  const choice = await askQuestion("Seleziona il motivo:");
  
  if (choice === '0') {
    return showMainMenu();
  }
  
  const reasonIndex = parseInt(choice) - 1;
  if (reasonIndex >= 0 && reasonIndex < reasons.length) {
    const reason = reasons[reasonIndex];
    
    console.log(`\n📞 Invio chiamata: ${reason}`);
    console.log(`🪑 Tavolo: ${appState.currentTable}`);
    console.log("⏳ Chiamata in corso...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("✅ Chiamata inviata!");
    console.log("👨‍🍳 Il cameriere arriverà a breve al tuo tavolo.");
    
    // Aggiungi notifica
    appState.notifications.push({
      id: Date.now(),
      type: "waiter_called",
      message: `Cameriere chiamato: ${reason.substring(2)}`,
      time: new Date().toLocaleTimeString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simula risposta cameriere
    console.log("\n📱 Risposta del cameriere:");
    console.log("👨‍🍳 \"Arrivo subito al vostro tavolo!\"");
    
    appState.notifications.push({
      id: Date.now() + 1,
      type: "waiter_response", 
      message: "Il cameriere ha confermato: arrivo subito!",
      time: new Date().toLocaleTimeString()
    });
    
  } else {
    showError("Selezione non valida!");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return callWaiter();
  }
  
  await askQuestion("Premi INVIO per continuare...");
  return showMainMenu();
}

// Reviews
async function leaveReview() {
  clearScreen();
  console.log("⭐ LASCIA RECENSIONE");
  console.log("─".repeat(20));
  
  if (!appState.currentRestaurant) {
    showError("Nessun ristorante selezionato!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return showMainMenu();
  }
  
  console.log(`🏪 Recensione per: ${appState.currentRestaurant.name}\n`);
  
  console.log("⭐ Valutazione (1-5 stelle):");
  console.log("1 ⭐ - Pessimo");
  console.log("2 ⭐⭐ - Scarso");
  console.log("3 ⭐⭐⭐ - Buono");
  console.log("4 ⭐⭐⭐⭐ - Molto buono");
  console.log("5 ⭐⭐⭐⭐⭐ - Eccellente");
  
  const rating = await askQuestion("Inserisci la tua valutazione (1-5):");
  const ratingNum = parseInt(rating);
  
  if (ratingNum < 1 || ratingNum > 5) {
    showError("Valutazione non valida!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return leaveReview();
  }
  
  const comment = await askQuestion("Commento (opzionale):");
  
  console.log("\n📝 Invio recensione...");
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  showSuccess("Recensione inviata con successo!");
  console.log(`⭐ Valutazione: ${'⭐'.repeat(ratingNum)}`);
  if (comment) {
    console.log(`💬 Commento: "${comment}"`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  return showMainMenu();
}

// Notifications
async function handleNotifications() {
  clearScreen();
  console.log("🔔 NOTIFICHE");
  console.log("─".repeat(15));
  
  if (appState.notifications.length === 0) {
    console.log("🔔 Nessuna notifica!");
    await askQuestion("Premi INVIO per continuare...");
    return showMainMenu();
  }
  
  console.log("📱 Notifiche recenti:\n");
  
  appState.notifications.reverse().forEach((notification, index) => {
    const icon = notification.type === 'order_confirmed' ? '✅' :
                 notification.type === 'waiter_called' ? '🔔' :
                 notification.type === 'waiter_response' ? '👨‍🍳' :
                 notification.type === 'bill_request' ? '🧾' : '📱';
    
    console.log(`${icon} ${notification.message}`);
    console.log(`   ⏰ ${notification.time}`);
    console.log();
  });
  
  const clearChoice = await askQuestion("Vuoi cancellare tutte le notifiche? (s/n):");
  
  if (clearChoice.toLowerCase() === 's' || clearChoice.toLowerCase() === 'si') {
    appState.notifications = [];
    showSuccess("Notifiche cancellate!");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return showMainMenu();
}

// Profile
async function handleProfile() {
  clearScreen();
  console.log("👤 PROFILO UTENTE");
  console.log("─".repeat(20));
  
  console.log(`📧 Email: ${appState.currentUser}@example.com`);
  console.log(`👤 Nome: ${appState.currentUser}`);
  console.log(`📱 Telefono: +39 123 456 7890`);
  console.log(`📅 Membro dal: Gennaio 2024`);
  console.log(`🍽️  Ordini totali: ${appState.orders.length}`);
  console.log();
  
  if (appState.currentRestaurant) {
    console.log("📍 Sessione corrente:");
    console.log(`🏪 Ristorante: ${appState.currentRestaurant.name}`);
    console.log(`🪑 Tavolo: ${appState.currentTable || 'Non selezionato'}`);
    if (appState.fantasyName) {
      console.log(`🎭 Nome fantasy: ${appState.fantasyName}`);
    }
    console.log();
  }
  
  const options = [
    "✏️  Modifica profilo",
    "📋 Storico ordini",
    "⭐ Le mie recensioni",
    "📅 Prenotazioni",
    "⚙️  Impostazioni"
  ];
  
  showMenu(options, "Opzioni profilo:");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1':
      showInfo("Funzione di modifica profilo non implementata nel simulatore.");
      break;
    case '2':
      return handleOrders();
    case '3':
      showInfo("Storico recensioni non implementato nel simulatore.");
      break;
    case '4':
      return handleReservations();
    case '5':
      showInfo("Impostazioni non implementate nel simulatore.");
      break;
    case '0':
      return showMainMenu();
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handleProfile();
  }
  
  await askQuestion("Premi INVIO per continuare...");
  return handleProfile();
}

// Reservations
async function handleReservations() {
  clearScreen();
  console.log("📅 PRENOTAZIONI");
  console.log("─".repeat(15));
  
  const options = [
    "➕ Nuova prenotazione",
    "📋 Le mie prenotazioni",
    "🔍 Cerca disponibilità"
  ];
  
  showMenu(options, "Gestione prenotazioni:");
  
  const choice = await askQuestion("Inserisci la tua scelta:");
  
  switch(choice) {
    case '1': return makeReservation();
    case '2': return showMyReservations();
    case '3': return searchAvailability();
    case '0': return handleProfile();
    default:
      showError("Scelta non valida!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handleReservations();
  }
}

async function makeReservation() {
  clearScreen();
  console.log("➕ NUOVA PRENOTAZIONE");
  console.log("─".repeat(25));
  
  // Seleziona ristorante
  console.log("🏪 Seleziona ristorante:");
  mockData.restaurants.forEach((restaurant, index) => {
    console.log(`${index + 1}. ${restaurant.name}`);
  });
  
  const restaurantChoice = await askQuestion("Ristorante:");
  const restaurantIndex = parseInt(restaurantChoice) - 1;
  
  if (restaurantIndex < 0 || restaurantIndex >= mockData.restaurants.length) {
    showError("Ristorante non valido!");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return makeReservation();
  }
  
  const selectedRestaurant = mockData.restaurants[restaurantIndex];
  
  // Data e ora
  const date = await askQuestion("Data (DD/MM/YYYY):");
  const time = await askQuestion("Orario (HH:MM):");
  const people = await askQuestion("Numero persone:");
  const notes = await askQuestion("Note speciali (opzionale):");
  
  console.log("\n🔍 Verifica disponibilità...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("✅ Disponibilità confermata!");
  console.log("\n📋 Riepilogo prenotazione:");
  console.log(`🏪 Ristorante: ${selectedRestaurant.name}`);
  console.log(`📅 Data: ${date}`);
  console.log(`⏰ Orario: ${time}`);
  console.log(`👥 Persone: ${people}`);
  if (notes) {
    console.log(`📝 Note: ${notes}`);
  }
  
  const confirm = await askQuestion("Confermi la prenotazione? (s/n):");
  
  if (confirm.toLowerCase() === 's' || confirm.toLowerCase() === 'si') {
    const reservationId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    console.log("\n✅ PRENOTAZIONE CONFERMATA!");
    console.log(`🎫 Codice prenotazione: ${reservationId}`);
    console.log("📧 Email di conferma inviata");
    console.log("📱 Riceverai un promemoria il giorno prima");
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    showInfo("Prenotazione annullata.");
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  return handleReservations();
}

async function showMyReservations() {
  clearScreen();
  console.log("📋 LE MIE PRENOTAZIONI");
  console.log("─".repeat(25));
  
  // Prenotazioni mock
  const reservations = [
    {
      id: "ABC123",
      restaurant: "Ristorante Da Mario",
      date: "25/12/2024",
      time: "20:00",
      people: 4,
      status: "Confermata"
    },
    {
      id: "DEF456", 
      restaurant: "Pizzeria Bella Napoli",
      date: "31/12/2024",
      time: "19:30",
      people: 2,
      status: "In attesa"
    }
  ];
  
  if (reservations.length === 0) {
    console.log("📅 Nessuna prenotazione trovata!");
  } else {
    reservations.forEach((reservation, index) => {
      console.log(`${index + 1}. ${reservation.restaurant}`);
      console.log(`   📅 ${reservation.date} alle ${reservation.time}`);
      console.log(`   👥 ${reservation.people} persone`);
      console.log(`   📊 Stato: ${reservation.status}`);
      console.log(`   🎫 Codice: ${reservation.id}`);
      console.log();
    });
  }
  
  await askQuestion("Premi INVIO per continuare...");
  return handleReservations();
}

async function searchAvailability() {
  clearScreen();
  console.log("🔍 CERCA DISPONIBILITÀ");
  console.log("─".repeat(25));
  
  const date = await askQuestion("Data (DD/MM/YYYY):");
  const people = await askQuestion("Numero persone:");
  
  console.log("\n🔍 Ricerca disponibilità...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("📋 Disponibilità trovate:\n");
  
  mockData.restaurants.forEach((restaurant, index) => {
    const times = ["19:00", "19:30", "20:00", "20:30", "21:00"];
    const availableTimes = times.slice(0, Math.floor(Math.random() * 3) + 2);
    
    console.log(`🏪 ${restaurant.name}`);
    console.log(`   ⭐ ${restaurant.rating}/5`);
    console.log(`   ⏰ Orari disponibili: ${availableTimes.join(", ")}`);
    console.log();
  });
  
  await askQuestion("Premi INVIO per continuare...");
  return handleReservations();
}

// Logout
async function handleLogout() {
  clearScreen();
  console.log("🚪 LOGOUT");
  console.log("─".repeat(10));
  
  const confirm = await askQuestion("Sei sicuro di voler uscire? (s/n):");
  
  if (confirm.toLowerCase() === 's' || confirm.toLowerCase() === 'si') {
    // Reset stato
    appState = {
      currentUser: null,
      currentRestaurant: null,
      currentTable: null,
      cart: [],
      orders: [],
      notifications: [],
      isLoggedIn: false,
      fantasyName: null,
      tableSession: null
    };
    
    showSuccess("Logout effettuato con successo!");
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  return showMainMenu();
}

// Exit
async function exitApp() {
  clearScreen();
  console.log("👋 ARRIVEDERCI!");
  console.log("─".repeat(15));
  console.log("Grazie per aver testato il simulatore Garçon!");
  console.log("🍽️  Speriamo di rivederti presto nei nostri ristoranti partner!");
  console.log();
  console.log("📧 Per feedback: garcon@example.com");
  console.log("🌐 Sito web: www.garcon-app.com");
  console.log();
  
  rl.close();
  process.exit(0);
}

// Start the simulator
console.log("🚀 Avvio simulatore...");
setTimeout(() => {
  showMainMenu();
}, 1000);
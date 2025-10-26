# 🔍 Come Trovare/Creare il Servizio Backend su Railway

## 📋 **Scenario 1: Backend Esiste ma Non Lo Trovi**

### **Cosa Cercare:**
Nel tuo progetto Railway dovresti vedere:

```
Progetto: garcon-app
├── 🗄️ PostgreSQL (database)
└── 🚀 garcon-app (backend) ← QUESTO!
```

### **Caratteristiche del Servizio Backend:**
- ✅ Ha un **URL pubblico** (es: https://xxx.railway.app)
- ✅ Tab **"Deployments"** con build history
- ✅ Tab **"Logs"** con output server
- ✅ Tab **"Variables"** (qui devi aggiungere le variabili)
- ✅ Tab **"Settings"** con configurazioni

## 📋 **Scenario 2: Backend Non Esiste**

Se vedi solo il database PostgreSQL, devi collegare il repository:

### **Collegare Repository GitHub:**
1. **Nel progetto Railway, clicca "+ New"**
2. **Seleziona "GitHub Repo"**
3. **Scegli "ukitke/garcon-app"**
4. **Railway creerà automaticamente il servizio backend**

### **Configurazione Automatica:**
Railway rileverà:
- ✅ `Dockerfile` → Userà Docker build
- ✅ `railway.json` → Configurazioni deploy
- ✅ Repository → Collegamento GitHub

## 📋 **Scenario 3: Servizio con Nome Diverso**

Il servizio backend potrebbe avere un nome diverso:
- `garcon-app-production`
- `backend`
- `web`
- Nome generato automaticamente

### **Come Identificarlo:**
- ✅ Ha un **URL pubblico**
- ✅ **NON** è il database PostgreSQL
- ✅ Mostra build/deploy history

## 🎯 **Prossimo Passo**

1. **Identifica il servizio backend** nel tuo progetto
2. **Clicca su quel servizio** (non il database)
3. **Tab "Variables"** → Aggiungi le variabili
4. **Railway rifarà automaticamente il deploy**
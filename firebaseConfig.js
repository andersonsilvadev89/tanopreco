// Importando o `Constants` do Expo para acessar as variáveis de ambiente
import Constants from 'expo-constants';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getReactNativePersistence, GoogleAuthProvider, initializeAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// As chaves de configuração do cliente são lidas diretamente de `app.config.js`
const firebaseConfig = {
  apiKey: Constants.expoConfig.extra.firebaseApiKey,
  authDomain: Constants.expoConfig.extra.firebaseAuthDomain,
  databaseURL: "https://stoantoniobarbalhacliente-default-rtdb.firebaseio.com",
  projectId: Constants.expoConfig.extra.firebaseProjectId,
  storageBucket: Constants.expoConfig.extra.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig.extra.firebaseMessagingSenderId,
  appId: Constants.expoConfig.extra.firebaseAppId,
  measurementId: Constants.expoConfig.extra.firebaseMeasurementId
};

// As chaves de configuração do admin também são lidas de `app.config.js`
const firebaseConfigAdmin = {
  apiKey: Constants.expoConfig.extra.firebaseAdminApiKey,
  authDomain: "SEU_AUTH_DOMAIN", // Mantenha isso como um placeholder ou configure no .env
  databaseURL:"https://admin-42d85-default-rtdb.firebaseio.com/", // Mantenha se for estático ou configure no .env
  projectId: Constants.expoConfig.extra.firebaseAdminProjectId,
  storageBucket: "admin-42d85.firebasestorage.app", // Mantenha se for estático ou configure no .env
  messagingSenderId: "SEU_MESSAGING_SENDER_ID", // Mantenha como placeholder ou configure no .env
  appId: "1:761725954340:android:b61fa6cdb24afb79d8abb1", // Mantenha se for estático ou configure no .env
  measurementId: "SEU_MEASUREMENT_ID" // Mantenha como placeholder ou configure no .env
};

// Inicializa os aplicativos Firebase
const clienteApp = getApps().find(app => app.name === 'cliente') || initializeApp(firebaseConfig, 'cliente');
const adminApp = getApps().find(app => app.name === 'admin') || initializeApp(firebaseConfigAdmin, 'admin');

// Instâncias do Database
const database = getDatabase(clienteApp);
const adminDatabase = getDatabase(adminApp);

// Auth para o aplicativo padrão (cliente) com PERSISTÊNCIA garantida
const auth = initializeAuth(clienteApp, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const googleProvider = new GoogleAuthProvider();

// Storage para o aplicativo padrão (admin)
const storage = getStorage(clienteApp);

export { auth, googleProvider, database, adminDatabase, storage, clienteApp };
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, getReactNativePersistence, GoogleAuthProvider } from 'firebase/auth';import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suas configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBaMZ5Oylb-T9A7o2BgJ0ba50NvdOH1aKo",
  authDomain: "SEU_AUTH_DOMAIN",
  databaseURL:"https://stoantoniobarbalhacliente-default-rtdb.firebaseio.com",
  projectId: "stoantoniobarbalhacliente",
  storageBucket: "stoantoniobarbalhacliente.firebasestorage.app",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "1:161717540109:android:a5e5d4b112cb7d10704c44",
  measurementId: "SEU_MEASUREMENT_ID"
};

const firebaseConfigAdmin = {
  apiKey: "AIzaSyBdhPa_6LB4VXl1w40Zkhcqrr9sB-uuZq4",
  authDomain: "SEU_AUTH_DOMAIN",
  databaseURL:"https://admin-42d85-default-rtdb.firebaseio.com/",
  projectId: "admin-42d85",
  storageBucket: "admin-42d85.firebasestorage.app",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "1:761725954340:android:b61fa6cdb24afb79d8abb1",
  measurementId: "SEU_MEASUREMENT_ID"
};

const firebaseConfigEmpresa = {
    apiKey: "AIzaSyD_RNdExQtZlxA_nwhQDtKvIMKgCGTCZ-0",
    authDomain: "SEU_AUTH_DOMAIN",
    databaseURL: "https://stoantoniobarbalhaempresa-default-rtdb.firebaseio.com",
    projectId: "stoantoniobarbalhaempresa",
    storageBucket: "stoantoniobarbalhaempresa.firebasestorage.app",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "1:26806692492:android:296ae80d69c298cf65a9a9",
    measurementId: "SEU_MEASUREMENT_ID"
};

const firebaseConfigAdministrativo = {
    apiKey: "AIzaSyBH1sersmxuBF4dCIu_2MccFUg6P7QNKBk",
    authDomain: "SEU_AUTH_DOMAIN",
    databaseURL: "https://stoantoniobarbalhaadmin-default-rtdb.firebaseio.com/",
    projectId: "stoantoniobarbalhaadmin",
    storageBucket: "stoantoniobarbalhaadmin.firebasestorage.app",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "1:499239264827:android:0e50e2743992e42b9af21e",
    measurementId: "SEU_MEASUREMENT_ID"
};

// Inicializa os aplicativos Firebase
const clienteApp = getApps().find(app => app.name === 'cliente') || initializeApp(firebaseConfig, 'cliente');
const empresaApp = getApps().find(app => app.name === 'empresa') || initializeApp(firebaseConfigEmpresa, 'empresa');
const administrativoApp = getApps().find(app => app.name === 'administrativo') || initializeApp(firebaseConfigAdministrativo, 'administrativo');
const adminApp = getApps().find(app => app.name === 'admin') || initializeApp(firebaseConfigAdmin, 'admin');

// Instâncias do Database
const database = getDatabase(clienteApp);
const empresaDatabase = getDatabase(empresaApp);
const administrativoDatabase = getDatabase(administrativoApp);
const adminDatabase = getDatabase(adminApp);

// Auth para o aplicativo padrão (cliente)
const auth = getAuth(clienteApp);
const authPersistence = { persistence: getReactNativePersistence(AsyncStorage) };
// Remova a linha abaixo:
// initializeAuth(adminApp, authPersistence);
const googleProvider = new GoogleAuthProvider();

// Storage para o aplicativo padrão (admin)
const storage = getStorage(clienteApp);

export { auth, googleProvider, database, empresaDatabase, administrativoDatabase, adminDatabase, storage };
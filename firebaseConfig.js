import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getReactNativePersistence, GoogleAuthProvider, initializeAuth } from 'firebase/auth';import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCyKuYJzr_0w-pw5Ehmrf8i7TPRAxtbLbM",
  authDomain: "stoantoniobarbalhacliente.firebaseapp.com",
  databaseURL: "https://stoantoniobarbalhacliente-default-rtdb.firebaseio.com",
  projectId: "stoantoniobarbalhacliente",
  storageBucket: "stoantoniobarbalhacliente.firebasestorage.app",
  messagingSenderId: "161717540109",
  appId: "1:161717540109:web:1e24e04a1ff8cc7a704c44",
  measurementId: "G-2EQBK3SDK0"
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
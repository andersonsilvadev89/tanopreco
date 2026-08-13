import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider } from "firebase/auth";
import type { Database } from "firebase/database";
import type { FirebaseStorage } from "firebase/storage";

export const auth: Auth;
export const googleProvider: GoogleAuthProvider;
export const database: Database;
export const adminDatabase: Database;
export const storage: FirebaseStorage;
export const clienteApp: FirebaseApp;

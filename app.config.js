// app.config.js
export default {
  expo: {
    name: "TaNoPreco",
    slug: "TaNoPreco",
    platforms: ["android", "ios"],
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    scheme: "stoantoniobarbalhacliente",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    updates: {
      url: "https://u.expo.dev/24f376e8-afe2-4c3e-bab9-035b5e089295"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        },
      },
      versionCode: 18,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "com.google.android.gms.permission.AD_ID"
      ],
      package: "com.tanopreco",
      // Já está correto para Android: usa a variável de ambiente OU o arquivo local.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      queries: [
        {
          intent: {
            action: "android.intent.action.VIEW",
            data: {
              scheme: "https",
              host: "instagram.com"
            }
          }
        },
        {
          package: "com.instagram.android"
        }
      ]
    },
    ios: {
      bundleIdentifier: "com.tanopreco",
      buildNumber: "1",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      // 🛑 CORREÇÃO APLICADA AQUI 🛑
      // 1. Usamos a variável GOOGLE_SERVICES_FILE_IOS (o EAS usa este nome para Secret Files).
      // 2. Adicionamos um fallback (?? './GoogleService-Info.plist') para o caso de a variável não existir
      //    localmente, garantindo que o EAS CLI não falhe ao ler a configuração.
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE_IOS ?? './GoogleService-Info.plist', 
      infoPlist: {
        "ITSAppUsesNonExemptEncryption": false,
        NSPhotoLibraryUsageDescription: "Precisamos de acesso à sua galeria de fotos.",
        NSCameraUsageDescription: "Precisamos de acesso à sua câmera para você tirar uma foto de perfil.",
        NSLocationWhenInUseUsageDescription: "Precisamos da sua localização para mostrar seus amigos no mapa.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Precisamos da sua localização em segundo plano para que seus amigos possam te encontrar mesmo com o app fechado. É importante salientar que a sua localização só será vista caso você esteja próximo ou no local e na hora do evento",
        NSLocationAlwaysUsageDescription: "Precisamos da sua localização em segundo plano para que seus amigos possam te encontrar mesmo com o app fechado."
      },
      supportsTablet: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-splash-screen",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Permitir que $(PRODUCT_NAME) use sua localização para te mostrar no mapa."
        }
      ],
      "expo-secure-store"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      "firebaseApiKey": process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      "firebaseAuthDomain": process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      "firebaseProjectId": process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      "firebaseStorageBucket": process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      "firebaseMessagingSenderId": process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      "firebaseAppId": process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      "firebaseMeasurementId": process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      "eas": {
        projectId: "24f376e8-afe2-4c3e-bab9-035b5e089295"
      }
    },
    owner: "andersonsilva.dev89"
  }
};
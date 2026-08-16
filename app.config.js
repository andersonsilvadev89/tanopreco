import 'dotenv/config';

export default {
  name: "TaNoPreco",
  slug: "TaNoPreco",
  "newArchEnabled": true,
  platforms: ["android", "ios"],
  version: "1.0.4",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  scheme: "tanopreco",
  userInterfaceStyle: "automatic",
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
      }
    },
    versionCode: 32,
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
    buildNumber: "6",
    usesAppleSignIn: true,
    config: {
      googleMobileAdsAppId: "ca-app-pub-5241782827769638~8974053643"
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
    infoPlist: {
      "ITSAppUsesNonExemptEncryption": false,
      NSPhotoLibraryUsageDescription: "Precisamos de acesso à sua galeria de fotos. Para você selecionar sua foto de perfil e/ou postar fotos de produtos.",
      NSCameraUsageDescription: "Precisamos de acesso à sua câmera para você tirar uma foto de perfil.",
      NSLocationWhenInUseUsageDescription: "Sua localização é usada para buscar e exibir os preços e ofertas de lojas que estão mais próximas de você, garantindo a relevância dos resultados."
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
    "@react-native-voice/voice",
    "expo-splash-screen",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Permitir que $(PRODUCT_NAME) use sua localização para te mostrar no mapa."
      }
    ],
    "expo-apple-authentication",
    "@react-native-google-signin/google-signin",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-5241782827769638~1347375952",
        iosAppId: "ca-app-pub-5241782827769638~8974053643"
      }
    ],
    "expo-secure-store",
    [
      "expo-build-properties",
      {
        "android": {
          "newArchEnabled": true,
          "enableJetifier": true,
          "useLegacyPackaging": true
        },
        "ios": {
          "newArchEnabled": true
        }
      }
    ],
    [
      "expo-notifications",
      {
        "icon": "./assets/images/notification-icon.png",
        "color": "#ffffff"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    eas: {
      projectId: "24f376e8-afe2-4c3e-bab9-035b5e089295"
    }
  },
  owner: "andersonsilva.dev89"
};
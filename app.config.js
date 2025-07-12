export default {
  expo: {
    name: "Assistente de Eventos",
    slug: "petrolina",
    platforms: ["android", "ios"],
    version: "1.1.4",
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
    // --- INÍCIO DA ADIÇÃO PARA UPDATES OTA ---
    updates: {
      url: "https://u.expo.dev/c152364f-e543-4f21-9ed3-cfc5163afa10" // Seu Project ID do EAS
    },
    runtimeVersion: {
      policy: "appVersion" // Recomendado para a maioria dos casos
    },
    // --- FIM DA ADIÇÃO PARA UPDATES OTA ---
    android: {
      config: {
        googleMaps: {
          apiKey: "AIzaSyDOY_dZzTNgjeMX2z7ssWi755eznnBO68o"
        },
      },
      versionCode: 23,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "com.google.android.gms.permission.AD_ID"
      ],
      package: "com.ae.stoantoniobarbalhacliente",
      googleServicesFile: "./google-services.json",
      // --- INÍCIO DA ADIÇÃO DAS QUERIES ---
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
      // --- FIM DA ADIÇÃO DAS QUERIES ---
    },
    ios: {
      bundleIdentifier: "com.ae.stoantoniobarbalhacliente",
      buildNumber: "1",
      config: {
        googleMapsApiKey: "AIzaSyBY4ZBNVZ1VkyqJqY_M7u3LPdT6Ielcuw0",
      },
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        UIBackgroundModes: ["location"],
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
          locationAlwaysAndWhenInUsePermission: "Permitir que $(PRODUCT_NAME) use sua localização para te mostrar no mapa.",
          isAndroidBackgroundLocationEnabled: true
        }
      ],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      "firebaseApiKey": "AIzaSyCyKuYJzr_0w-pw5Ehmrf8i7TPRAxtbLbM",
      "firebaseAuthDomain": "stoantoniobarbalhacliente.firebaseapp.com",
      "firebaseProjectId": "stoantoniobarbalhacliente",
      router: {
        origin: false
      },
      eas: {
        projectId: "c152364f-e543-4f21-9ed3-cfc5163afa10"
      }
    },
    owner: "professor.anderson.a.silva"
  }
};
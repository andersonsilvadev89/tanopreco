export default {
  "expo": {
        "name": "petrolina",
        "slug": "petrolina",
        "platforms": [
            "android",
            "ios"
        ],
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": "./assets/images/icon.png",
        "splash": {
            "image": "./assets/images/splash-icon.png", // Use a imagem que você quer
            "resizeMode": "contain",
            "backgroundColor": "#ffffff"
        },
        "scheme": "myapp",
        "userInterfaceStyle": "automatic",
        "newArchEnabled": false,
        "android": {
            "config": {
                "googleMaps": {
                    "apiKey": "AIzaSyDOY_dZzTNgjeMX2z7ssWi755eznnBO68o"
                }
            },
            "versionCode": 1,
            "adaptiveIcon": {
                "foregroundImage": "./assets/images/adaptive-icon.png",
                "backgroundColor": "#ffffff"
            },
            "permissions": [
                "ACCESS_COARSE_LOCATION",
                "ACCESS_FINE_LOCATION",
                "ACCESS_BACKGROUND_LOCATION"
            ],
            "package": "com.ae.stoantoniobarbalhacliente",
            "googleServicesFile": "./google-services.json"
        },
        "ios": {
            "buildNumber": "1",
            "config": {
                "googleMapsApiKey": "AIzaSyBY4ZBNVZ1VkyqJqY_M7u3LPdT6Ielcuw0"
            },
            "bundleIdentifier": "com.ae.stoantoniobarbalhacliente",
            "googleServicesFile": "./GoogleService-Info.plist",
            "infoPlist": {
                "NSPhotoLibraryUsageDescription": "Precisamos de acesso à sua galeria de fotos.",
                "NSLocationWhenInUseUsageDescription": "Precisamos da sua localização para mostrar seus amigos no mapa.",
                "NSLocationAlwaysAndWhenInUseUsageDescription": "Precisamos da sua localização em segundo plano para que seus amigos possam te encontrar mesmo com o app fechado.",
                "NSLocationAlwaysUsageDescription": "Precisamos da sua localização em segundo plano para que seus amigos possam te encontrar mesmo com o app fechado."
            },
            "supportsTablet": true
        },
        "web": {
            "bundler": "metro",
            "output": "static",
            "favicon": "./assets/images/favicon.png"
        },
        "plugins": [
            "expo-router",
            "expo-splash-screen",
            ["expo-location",
                {
                    "locationAlwaysAndWhenInUsePermission": "Permitir que $(PRODUCT_NAME) use sua localização para te mostrar no mapa.",
                    "isAndroidBackgroundLocationEnabled": true
                }
            ],
            "expo-secure-store"  
        ],
        "experiments": {
            "typedRoutes": true
        },
        "extra": {
            "googleClientId": "161717540109-gts7cr66n24eh9jlcqohk2voo072n5va.apps.googleusercontent.com",
            "router": {
                "origin": false
            },
            "eas": {
                "projectId": "c152364f-e543-4f21-9ed3-cfc5163afa10"
            }
        },
        "owner": "professor.anderson.a.silva"
    }
}
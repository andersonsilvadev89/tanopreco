# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Google Sign-In no iOS

Configure no `.env` os OAuth Client IDs do tipo Web e iOS:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=seu-client-id-web.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=seu-client-id-ios.apps.googleusercontent.com
```

O Client ID iOS deve corresponder ao aplicativo registrado com o bundle ID `com.tanopreco`. Ele é usado pelo Google Sign-In nativo, e seu esquema de retorno é adicionado automaticamente à configuração iOS em novas builds.

Uma atualização JavaScript/OTA pode fornecer o Client ID iOS ao código atualizado e usar o esquema que já estiver registrado no app instalado. Ela não consegue adicionar um esquema de retorno ausente do binário; nesse caso, o login com Google no iOS só funcionará depois de uma nova build. Sem o Client ID iOS, o app não inicia o fluxo nativo.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

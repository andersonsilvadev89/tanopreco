import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import {
  ActivityIndicator,
  View,
  Alert,
  Platform,
  Text, // Certifique-se que 'Text' está importado, usado para as mensagens
} from "react-native";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";
import * as Application from "expo-application"; // Necessário para Application.nativeApplicationVersion
import Constants from "expo-constants"; // Necessário para Constants.expoConfig.version

export default function Index() {
  const { user, loading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false); // Estado para controlar o processo de atualização

  // Esta função é uma utilidade e não diretamente usada para a lógica OTA,
  // mas é útil se você for implementar verificação de atualização da loja no futuro.
  function compareVersions(v1: string, v2: string) {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  }

  useEffect(() => {
    async function onFetchUpdateAsync() {
      // IMPORTANTE: A verificação de atualização OTA só funciona em builds de produção ou quando
      // o app é publicado com `eas update`. Ela NÃO funciona no ambiente de desenvolvimento
      // do Expo Go (quando você roda `npx expo start`).
      if (!__DEV__) {
        // __DEV__ é true em desenvolvimento e false em produção
        try {
          setIsUpdating(true); // Indica que estamos verificando atualizações
          console.log("Verificando atualizações OTA...");
          const update = await Updates.checkForUpdateAsync();

          if (update.isAvailable) {
            console.log("Nova atualização OTA disponível. Baixando...");
            Alert.alert(
              "Atualização Disponível",
              "Uma nova versão do aplicativo está disponível. Deseja atualizar agora?",
              [
                {
                  text: "Atualizar Agora",
                  onPress: async () => {
                    await Updates.fetchUpdateAsync(); // Baixa a atualização
                    console.log("Atualização baixada. Recarregando app...");
                    await Updates.reloadAsync(); // Recarrega o app com a nova versão
                  },
                },
                {
                  text: "Depois",
                  style: "cancel",
                  onPress: () => {
                    console.log("Usuário optou por atualizar depois.");
                    setIsUpdating(false); // Termina o processo de atualização
                  },
                },
              ]
            );
          } else {
            console.log("Nenhuma atualização OTA disponível no momento.");
            setIsUpdating(false); // Termina o processo de atualização
          }
        } catch (error: unknown) {
          // TypeScript ainda o vê como unknown inicialmente
          let errorMessage = "Ocorreu um erro desconhecido."; // Mensagem padrão para erros não-identificados

          if (error instanceof Error) {
            // Verifica se 'error' é uma instância da classe Error
            errorMessage = error.message; // Agora TypeScript sabe que 'error' tem '.message'
          } else if (typeof error === "string") {
            // Ou se for uma string simples
            errorMessage = error;
          }
          // Você pode adicionar mais verificações aqui se esperar outros tipos de erro

          Alert.alert(
            "Erro de Atualização",
            `Não foi possível verificar atualizações: ${errorMessage}`
          );
          console.error("Erro ao verificar atualizações OTA:", error); // Aqui 'error' ainda é 'unknown' no console.error, o que é OK
          setIsUpdating(false);
        }
      } else {
        console.log(
          "Rodando em ambiente de desenvolvimento Expo Go (__DEV__ é true), pulando verificação de updates OTA."
        );
        setIsUpdating(false); // Termina o processo (não há update em dev)
      }
    }

    onFetchUpdateAsync();
  }, []); // O array vazio garante que o useEffect rode apenas uma vez ao montar o componente

  // Enquanto verifica a autenticação OU está processando uma atualização, mostramos um indicador
  if (loading || isUpdating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        {isUpdating && (
          <Text style={{ marginTop: 10 }}>Verificando atualizações...</Text>
        )}
        {loading && (
          <Text style={{ marginTop: 10 }}>Carregando dados do usuário...</Text>
        )}
        {/* Descomente abaixo para ver as versões, útil para depuração */}
        {/* <Text>Versão app.json: {Constants.expoConfig.version}</Text> */}
        {/* {Platform.OS === 'android' && <Text>Versão nativa Android: {Application.nativeApplicationVersion}</Text>} */}
        {/* {Platform.OS === 'ios' && <Text>Versão nativa iOS: {Application.nativeApplicationVersion}</Text>} */}
      </View>
    );
  }

  // Se não há usuário, redireciona para o fluxo de autenticação
  if (!user) {
    return <Redirect href="/(auth)/loginScreen" />;
  }

  // Se há um usuário logado, redireciona para a tela principal do app
  return <Redirect href="/(tabs)/homeScreen" />;
}

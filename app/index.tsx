import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import {
  ActivityIndicator,
  View,
  // Alert, // Removido o import de Alert para garantir que não será usado
  Platform,
  Text,
} from "react-native";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";
import * as Application from "expo-application";
import Constants from "expo-constants";

export default function Index() {
  const { user, loading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false); // Estado para controlar o processo de atualização

  // Esta função é uma utilidade e não diretamente usada para a lógica OTA,
  // mas é útil se você for implementar verificação de atualização da loja no futuro.
  // Mantenha-a se for usá-la em outro lugar, caso contrário, pode removê-la.
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
      if (!__DEV__) {
        try {
          setIsUpdating(true); // Indica que estamos verificando/baixando atualizações
          console.log("Verificando atualizações OTA (modo invisível)...");
          const update = await Updates.checkForUpdateAsync();

          if (update.isAvailable) {
            console.log("Nova atualização OTA disponível. Baixando e recarregando automaticamente...");
            await Updates.fetchUpdateAsync(); // Baixa a atualização
            await Updates.reloadAsync(); // Recarrega o app com a nova versão
          } else {
            console.log("Nenhuma atualização OTA disponível no momento.");
            setIsUpdating(false); // Termina o processo de atualização
          }
        } catch (error: unknown) {
          // Captura qualquer erro, loga no console, mas não mostra para o usuário.
          console.error("Erro SILENCIOSO ao verificar/baixar atualizações OTA:", error);
          setIsUpdating(false); // Garante que o indicador de loading seja desativado mesmo em caso de erro
        }
      } else {
        // Ambiente de desenvolvimento: não verifica updates OTA
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
          // Mensagem discreta de que algo está acontecendo
          <Text style={{ marginTop: 10, color: 'gray' }}>Verificando atualizações...</Text>
        )}
        {loading && (
          <Text style={{ marginTop: 10, color: 'gray' }}>Carregando dados do usuário...</Text>
        )}
      </View>
    );
  }

  // Se não há usuário, redireciona para o fluxo de autenticação
  if (!user) {
    return <Redirect href="/(auth)/loginScreen" />;
  }

  // Se há um usuário logado e não está atualizando, redireciona para a tela principal do app
  return <Redirect href="/(tabs)/homeScreen" />;
}
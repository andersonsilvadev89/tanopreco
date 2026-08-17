import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";

type VersionResponse = {
  android?: string;
  ios?: string;
  force?: boolean;
  message?: string;
};

export function useVersionCheck(versionUrl: string) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [message, setMessage] = useState("Há uma nova atualização disponível.");

  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    async function checkVersion() {
      try {
        const response = await fetch(versionUrl);
        const data: VersionResponse = await response.json();

        const storeVersion =
          Platform.OS === "android" ? data.android : data.ios;

        if (!storeVersion) return;

        const localVersion =
          Application.nativeApplicationVersion ?? "0.0.0";

        // Comparação simples de versão ("1.0.2" > "1.0.1")
        const isOutdated = compareVersions(localVersion, storeVersion);

        if (isOutdated) {
          setNeedsUpdate(true);
          setForceUpdate(data.force ?? false);
          setMessage(data.message ?? "Uma nova versão está disponível.");

          setStoreUrl(
            Platform.OS === "android"
              ? "https://play.google.com/store/apps/details?id=com.tanopreco"
              : "https://apps.apple.com/us/app/tanopreco/id6754825370"
          );

        }
      } catch (error) {
        console.log("Erro ao verificar versão remota:", error);
      }
    }

    checkVersion();
  }, [versionUrl]);

  // --------------------------------------------
  // FUNÇÃO DE REDIRECIONAMENTO PARA AS LOJAS
  // --------------------------------------------
  const redirectToStore = () => {
    if (!storeUrl) return;

    // Abrir link na loja
    import("expo-linking").then((Linking) => {
      Linking.openURL(storeUrl);
    });
  };

  return {
    needsUpdate,
    forceUpdate,
    message,
    redirectToStore,
  };
}

// ----------------------------------------------------
// Função auxiliar para comparar versões sem biblioteca
// ----------------------------------------------------
export function compareVersions(local: string, remote: string): boolean {
  const a = local.split(".").map(Number);
  const b = remote.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if ((b[i] ?? 0) > (a[i] ?? 0)) return true;
    if ((b[i] ?? 0) < (a[i] ?? 0)) return false;
  }

  return false;
}

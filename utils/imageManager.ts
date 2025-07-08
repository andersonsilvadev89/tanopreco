// utils/imageManager.ts
import { Alert } from "react-native";
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importa AsyncStorage
import { ref, get } from 'firebase/database';
import { adminDatabase } from '../firebaseConfig'; // Use 'adminDatabase' ou 'adminadminDatabase' conforme sua configuração principal

// Define os nomes dos arquivos que serão salvos localmente no FileSystem
const LOCAL_LOGO_FILENAME = 'cached_logo_evento.png';
const LOCAL_FUNDO_FILENAME = 'cached_fundo_app.png';

// Chaves para armazenar as URLs no AsyncStorage
const LAST_DOWNLOADED_LOGO_URL_KEY = 'last_downloaded_logo_url';
const LAST_DOWNLOADED_FUNDO_URL_KEY = 'last_downloaded_fundo_url';

// Caminhos completos para os arquivos locais
const localLogoUri = `${FileSystem.documentDirectory}${LOCAL_LOGO_FILENAME}`;
const localFundoUri = `${FileSystem.documentDirectory}${LOCAL_FUNDO_FILENAME}`;

/**
 * Verifica as URLs das imagens de logo e fundo no Firebase, compara com as URLs cacheadas localmente
 * e baixa/atualiza as imagens se necessário. Retorna as URIs locais das imagens a serem usadas.
 *
 * @returns Um objeto contendo a URL da logo (local) e a URL do fundo (local).
 */
export const checkAndDownloadImages = async (): Promise<{ logoUrl: string; fundoUrl: string }> => {
  console.log("Iniciando verificação e sincronização de imagens...");

  let currentLogoUrl = '';
  let currentFundoUrl = '';

  try {
    // 1. Obter as URLs atuais do Firebase
    const configRef = ref(adminDatabase, 'configuracoes_app'); // Confirme se 'adminDatabase' é a instância correta
    const snapshot = await get(configRef);
    const firebaseData = snapshot.exists() ? snapshot.val() : {};
    const firebaseLogoUrl = firebaseData.logoEventoUrl || '';
    const firebaseFundoUrl = firebaseData.fundoAppUrl || '';

    console.log("URLs do Firebase:", { firebaseLogoUrl, firebaseFundoUrl });

    // --- Processamento da LOGO ---
    const lastDownloadedLogoUrl = await AsyncStorage.getItem(LAST_DOWNLOADED_LOGO_URL_KEY);
    const logoFileInfo = await FileSystem.getInfoAsync(localLogoUri);

    if (firebaseLogoUrl && logoFileInfo.exists && lastDownloadedLogoUrl === firebaseLogoUrl) {
      // Caso 1: A URL do Firebase existe, o arquivo local existe e a URL corresponde à última baixada.
      // Usa a versão em cache localmente.
      currentLogoUrl = localLogoUri;
      console.log('Logo: Usando versão em cache (URL no Firebase não mudou).');
    } else if (firebaseLogoUrl) {
      // Caso 2: A URL do Firebase existe, mas o arquivo local não existe, ou a URL no Firebase mudou.
      // Precisa baixar ou atualizar.
      console.log('Logo: Baixando ou atualizando (arquivo não encontrado ou URL do Firebase mudou)...');
      try {
        await FileSystem.downloadAsync(firebaseLogoUrl, localLogoUri);
        await AsyncStorage.setItem(LAST_DOWNLOADED_LOGO_URL_KEY, firebaseLogoUrl);
        currentLogoUrl = localLogoUri;
        console.log('Logo: Download concluído e URL salva em cache.');
      } catch (downloadError) {
        console.error("Erro ao baixar a logo:", downloadError);
        Alert.alert("Erro de Download", "Não foi possível baixar a logo do evento. Usando fallback.");
        currentLogoUrl = ''; // Retorna vazio para que a tela use o asset local
      }
    } else {
      // Caso 3: Não há URL de logo válida no Firebase. Limpa o cache local e retorna vazio.
      console.log('Logo: Nenhuma URL no Firebase, limpando cache local e usando fallback.');
      await FileSystem.deleteAsync(localLogoUri, { idempotent: true }).catch(() => {}); // Tenta apagar, ignora erro se não existir
      await AsyncStorage.removeItem(LAST_DOWNLOADED_LOGO_URL_KEY);
      currentLogoUrl = ''; // Retorna vazio para que a tela use o asset local
    }

    // --- Processamento do FUNDO ---
    const lastDownloadedFundoUrl = await AsyncStorage.getItem(LAST_DOWNLOADED_FUNDO_URL_KEY);
    const fundoFileInfo = await FileSystem.getInfoAsync(localFundoUri);

    if (firebaseFundoUrl && fundoFileInfo.exists && lastDownloadedFundoUrl === firebaseFundoUrl) {
      // Caso 1: A URL do Firebase existe, o arquivo local existe e a URL corresponde à última baixada.
      // Usa a versão em cache localmente.
      currentFundoUrl = localFundoUri;
      console.log('Fundo: Usando versão em cache (URL no Firebase não mudou).');
    } else if (firebaseFundoUrl) {
      // Caso 2: A URL do Firebase existe, mas o arquivo local não existe, ou a URL no Firebase mudou.
      // Precisa baixar ou atualizar.
      console.log('Fundo: Baixando ou atualizando fundo (arquivo não encontrado ou URL do Firebase mudou)...');
      try {
        await FileSystem.downloadAsync(firebaseFundoUrl, localFundoUri);
        await AsyncStorage.setItem(LAST_DOWNLOADED_FUNDO_URL_KEY, firebaseFundoUrl);
        currentFundoUrl = localFundoUri;
        console.log('Fundo: Download concluído e URL salva em cache.');
      } catch (downloadError) {
        console.error("Erro ao baixar o fundo:", downloadError);
        Alert.alert("Erro de Download", "Não foi possível baixar a imagem de fundo. Usando fallback.");
        currentFundoUrl = ''; // Retorna vazio para que a tela use o asset local
      }
    } else {
      // Caso 3: Não há URL de fundo válida no Firebase. Limpa o cache local e retorna vazio.
      console.log('Fundo: Nenhuma URL no Firebase, limpando cache local e usando fallback.');
      await FileSystem.deleteAsync(localFundoUri, { idempotent: true }).catch(() => {}); // Tenta apagar, ignora erro se não existir
      await AsyncStorage.removeItem(LAST_DOWNLOADED_FUNDO_URL_KEY);
      currentFundoUrl = ''; // Retorna vazio para que a tela use o asset local
    }

    console.log("Verificação de imagens concluída.");
    // Retorna as URIs locais que devem ser usadas pelo app (ou vazias se houver erro ou não existir URL no Firebase)
    return { logoUrl: currentLogoUrl, fundoUrl: currentFundoUrl };

  } catch (error) {
    console.error("Erro geral na verificação/download de imagens:", error);
    Alert.alert("Erro de Sincronização", "Não foi possível sincronizar as imagens do aplicativo. Verifique sua conexão.");
    // Em caso de erro geral, retorna vazio para que a tela use os assets locais
    return { logoUrl: '', fundoUrl: '' };
  }
};
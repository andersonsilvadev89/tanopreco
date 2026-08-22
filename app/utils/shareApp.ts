import { Share } from "react-native";

const DEFAULT_APP_NAME = "TaNoPreço";

export const APP_SHARE_LINKS = {
  android: "https://play.google.com/store/apps/details?id=com.tanopreco&hl=pt_BR",
  ios: "https://apps.apple.com/br/app/tanopreco/id6754825370",
};

interface ShareAppOptions {
  appName?: string;
  message?: string;
}

export const buildShareAppMessage = (
  appName: string = DEFAULT_APP_NAME,
  customMessage?: string
) => {
  const trimmedMessage = customMessage?.trim();
  if (trimmedMessage) {
    return trimmedMessage;
  }

  return (
    `Encontrei um app muito bom para acompanhar ofertas na sua região: ${appName} o melhor preço, o mais perto de você.\n\n` +
    `Baixe agora:\n` +
    `Android: ${APP_SHARE_LINKS.android}\n` +
    `iOS: ${APP_SHARE_LINKS.ios}\n\n` +
    `Depois me conta o que achou!`
  );
};

export const shareApp = async ({
  appName = DEFAULT_APP_NAME,
  message,
}: ShareAppOptions = {}) => {
  const finalMessage = buildShareAppMessage(appName, message);

  return Share.share({
    title: `Compartilhar ${appName}`,
    message: finalMessage,
  });
};

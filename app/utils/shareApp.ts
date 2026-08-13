import { Share } from "react-native";

const DEFAULT_APP_NAME = "Expocrato";

export const APP_SHARE_LINKS = {
  android: "https://play.google.com/store/apps/details?id=com.ae.stoantoniobarbalhacliente",
  ios: "https://apps.apple.com/br/app/expocrato/id6747686374",
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
    `Baixe o app ${appName} e acompanhe tudo do evento!\n\n` +
    `Android: ${APP_SHARE_LINKS.android}\n` +
    `iOS: ${APP_SHARE_LINKS.ios}`
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

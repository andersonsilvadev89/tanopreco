import React from "react";
import {
  Alert,
  View,
  Text,
  Linking,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import {
  X,
  LogIn,
  LogOut,
  MapPin,
  Settings,
  Briefcase,
  CircleHelp,
  Sandwich,
  Toilet,
  Radio,
  Home,
  Share2,
  MessageCircle,
} from "lucide-react-native";
import { SHELL_COLORS } from "./shellColors";
import { shareApp } from "../../utils/shareApp";

const { width: screenWidth } = Dimensions.get("window");
const DRAWER_WIDTH = screenWidth * 0.72;
const WHATSAPP_URL = "https://wa.me/5588981026505";

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
  navigateTo: (path: string, requiresAuth: boolean) => void;
}

export const DrawerMenu: React.FC<DrawerProps> = ({
  visible,
  onClose,
  user,
  onLogout,
  navigateTo,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const handleShareApp = React.useCallback(async () => {
    try {
      await shareApp();
    } catch (error) {
      console.warn("Erro ao compartilhar o app:", error);
      Alert.alert("Falha ao compartilhar", "Nao foi possivel abrir o compartilhamento.");
    }
  }, []);

  const handleContactWhatsApp = React.useCallback(async () => {
    try {
      await Linking.openURL(WHATSAPP_URL);
    } catch (error) {
      console.warn("Erro ao abrir WhatsApp:", error);
      Alert.alert("Nao foi possivel abrir", "Tente novamente em alguns instantes.");
    }
  }, []);

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const menuItems = [
    { label: "Início (Home)",         icon: Home,       path: "/(tabs)/homeScreen",          requiresAuth: false },
    { label: "Configurações",         icon: Settings,   path: "/(empresa)/configuracoesScreen", requiresAuth: true  },
    { label: "Área da Empresa",       icon: Briefcase,  path: "/(empresa)/homeScreen",       requiresAuth: true  },
    { label: "Sobre o App",           icon: CircleHelp, path: "/(tabs)/sobreScreen",         requiresAuth: false },
  ];

  const userName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.email
    ? user.email.split("@")[0]
    : null;

  const userInitial = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.drawerBackdrop} onPress={onClose} />
      <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={s.drawerHeader}>
          <View style={[s.drawerAvatar, { backgroundColor: user ? SHELL_COLORS.accent : SHELL_COLORS.primaryLight }]}>
            {user ? (
              <Text style={s.drawerAvatarText}>{userInitial}</Text>
            ) : (
              <LogIn size={22} color={SHELL_COLORS.white} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.drawerUserName} numberOfLines={1}>
              {user ? `Ola, ${userName}!` : "Visitante"}
            </Text>
            {user?.email && (
              <Text style={s.drawerUserEmail} numberOfLines={1}>{user.email}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={s.drawerCloseBtn} activeOpacity={0.7}>
            <X size={20} color={SHELL_COLORS.white} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <TouchableOpacity
            style={s.drawerItem}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              setTimeout(() => {
                handleShareApp();
              }, 300);
            }}
          >
            <Share2 size={20} color={SHELL_COLORS.primaryLight} />
            <Text style={s.drawerItemText}>Compartilhar App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.drawerItem}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              setTimeout(() => {
                handleContactWhatsApp();
              }, 300);
            }}
          >
            <MessageCircle size={20} color={SHELL_COLORS.primaryLight} />
            <Text style={s.drawerItemText}>Dúvidas? Entre em contato!</Text>
          </TouchableOpacity>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.label}
                style={s.drawerItem}
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                  setTimeout(() => navigateTo(item.path, item.requiresAuth), 300);
                }}
              >
                <Icon size={20} color={SHELL_COLORS.primaryLight} />
                <Text style={s.drawerItemText}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.drawerFooter}>
          {user ? (
            <TouchableOpacity
              style={[s.drawerActionBtn, { borderColor: SHELL_COLORS.logoutRed }]}
              onPress={() => { onClose(); setTimeout(onLogout, 300); }}
              activeOpacity={0.8}
            >
              <LogOut size={18} color={SHELL_COLORS.logoutRed} />
              <Text style={[s.drawerActionBtnText, { color: SHELL_COLORS.logoutRed }]}>Sair da conta</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.drawerActionBtn, { borderColor: SHELL_COLORS.primaryLight }]}
              onPress={() => { onClose(); setTimeout(() => router.push("/(auth)/loginScreen"), 300); }}
              activeOpacity={0.8}
            >
              <LogIn size={18} color={SHELL_COLORS.primaryLight} />
              <Text style={[s.drawerActionBtnText, { color: SHELL_COLORS.primaryLight }]}>Fazer login</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  drawerBackdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawer: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: SHELL_COLORS.drawerBg,
    shadowColor: SHELL_COLORS.shadow,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  drawerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  drawerAvatarText: { color: SHELL_COLORS.white, fontSize: 20, fontWeight: "700" },
  drawerUserName: { color: SHELL_COLORS.white, fontSize: 15, fontWeight: "700" },
  drawerUserEmail: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
  drawerCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  drawerItemText: { color: SHELL_COLORS.white, fontSize: 14, fontWeight: "600", flex: 1 },
  drawerFooter: {
    padding: 20,
    paddingBottom: 100,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  drawerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  drawerActionBtnText: { fontSize: 14, fontWeight: "700" },
});

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Menu, LogIn, ChevronLeft } from "lucide-react-native";
import { SHELL_COLORS } from "./shellColors";
import { useAppAppearance } from "../../../context/AppAppearanceContext";
import { BRAND_COLORS } from "@/constants/BrandColors";

const logoEventoNoite = require("../../../assets/images/logoLarga.png");
const logoEventoDia = require("../../../assets/images/logoLargaDia.png");
const SPACING = 16;
const LOGO_OVERFLOW_BOTTOM = 0;

interface AppHeaderProps {
  user: any;
  paddingTop: number;
  onMenuOpen: () => void;
  onLogout: () => void;
  onBack?: () => void;
}

export const AppHeader = ({
  user,
  paddingTop,
  onMenuOpen,
  onLogout,
  onBack,
}: AppHeaderProps) => {
  const { isNightTheme } = useAppAppearance();
  const headerBgColor = isNightTheme ? SHELL_COLORS.primaryDark : BRAND_COLORS.primary;
  const headerLogo = isNightTheme ? logoEventoNoite : logoEventoDia;

  const userInitial = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : null;

  return (
    <>
      <StatusBar backgroundColor={headerBgColor} translucent={false} />
      <View style={[s.headerBar, { paddingTop, backgroundColor: headerBgColor }]}>
        <View style={s.header}>
          {onBack ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity style={s.headerIconBtn} onPress={onBack} activeOpacity={0.75}>
                <ChevronLeft size={24} color={SHELL_COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={s.headerIconBtn} onPress={onMenuOpen} activeOpacity={0.75}>
                <Menu size={22} color={SHELL_COLORS.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.headerIconBtn} onPress={onMenuOpen} activeOpacity={0.75}>
              <Menu size={24} color={SHELL_COLORS.white} />
            </TouchableOpacity>
          )}

          <View pointerEvents="none" style={s.logoWrap}>
            <Image source={headerLogo} style={s.logo} resizeMode="contain" />
          </View>

          {user ? (
            <TouchableOpacity
              style={[s.headerIconBtn, s.avatarBtn]}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <Text style={s.avatarText}>{userInitial}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.loginBadge}
              onPress={() => router.push("/(auth)/loginScreen")}
              activeOpacity={0.8}
            >
              <LogIn size={24} color={SHELL_COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const s = StyleSheet.create({
  headerBar: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: SPACING,
    paddingBottom: 12,
    shadowColor: SHELL_COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
    overflow: "visible",
    position: "relative",
    zIndex: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    position: "relative",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.headerIconOverlay,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    zIndex: 2,
  },
  logoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -LOGO_OVERFLOW_BOTTOM,
    alignItems: "center",
    zIndex: 1,
  },
  logo: {
    height: 42,
    width: "70%",
    backgroundColor: BRAND_COLORS.surfaceSoft,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 50,

  },
  avatarBtn: {
    backgroundColor: SHELL_COLORS.accent,
    shadowColor: SHELL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  avatarText: {
    color: SHELL_COLORS.white,
    fontSize: 17,
    fontWeight: "700",
  },
  loginBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SHELL_COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    zIndex: 2,
  },
});

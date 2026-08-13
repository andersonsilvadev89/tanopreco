import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppThemeMode = "auto" | "day" | "night";
export type ResolvedTheme = "day" | "night";

interface AppAppearanceContextType {
  mode: AppThemeMode;
  resolvedTheme: ResolvedTheme;
  isNightTheme: boolean;
  initialized: boolean;
  setThemeMode: (nextMode: AppThemeMode) => Promise<void>;
  setManualTheme: (theme: ResolvedTheme) => Promise<void>;
  useAutomaticTheme: () => Promise<void>;
}

const STORAGE_KEY = "@app_theme_mode";

const AppAppearanceContext = createContext<AppAppearanceContextType>({
  mode: "auto",
  resolvedTheme: "day",
  isNightTheme: false,
  initialized: false,
  setThemeMode: async () => {},
  setManualTheme: async () => {},
  useAutomaticTheme: async () => {},
});

const isNightByHour = (hour: number) => hour >= 18 || hour < 6;

export const AppAppearanceProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppThemeMode>("auto");
  const [initialized, setInitialized] = useState(false);
  const [hourNow, setHourNow] = useState(new Date().getHours());

  useEffect(() => {
    let isMounted = true;

    const loadMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (isMounted && (savedMode === "auto" || savedMode === "day" || savedMode === "night")) {
          setMode(savedMode);
        }
      } catch (error) {
        console.warn("Nao foi possivel carregar preferencia de tema:", error);
      } finally {
        if (isMounted) {
          setInitialized(true);
        }
      }
    };

    loadMode();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "auto") {
      return;
    }

    const timer = setInterval(() => {
      setHourNow(new Date().getHours());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [mode]);

  const setThemeMode = async (nextMode: AppThemeMode) => {
    setMode(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch (error) {
      console.warn("Nao foi possivel salvar preferencia de tema:", error);
    }
  };

  const setManualTheme = async (theme: ResolvedTheme) => {
    await setThemeMode(theme);
  };

  const useAutomaticTheme = async () => {
    await setThemeMode("auto");
  };

  const resolvedTheme: ResolvedTheme = mode === "auto" ? (isNightByHour(hourNow) ? "night" : "day") : mode;

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      isNightTheme: resolvedTheme === "night",
      initialized,
      setThemeMode,
      setManualTheme,
      useAutomaticTheme,
    }),
    [mode, resolvedTheme, initialized]
  );

  return <AppAppearanceContext.Provider value={value}>{children}</AppAppearanceContext.Provider>;
};

export const useAppAppearance = () => useContext(AppAppearanceContext);

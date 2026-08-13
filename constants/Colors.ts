import { BRAND_COLORS } from "./BrandColors";

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = BRAND_COLORS.primary;
const tintColorDark = BRAND_COLORS.white;

export const Colors = {
  light: {
    text: BRAND_COLORS.text,
    background: BRAND_COLORS.surface,
    tint: tintColorLight,
    icon: BRAND_COLORS.iconMuted,
    tabIconDefault: BRAND_COLORS.iconMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#EAF1FF',
    background: BRAND_COLORS.primaryDeep,
    tint: tintColorDark,
    icon: '#A6BADB',
    tabIconDefault: '#A6BADB',
    tabIconSelected: tintColorDark,
  },
};

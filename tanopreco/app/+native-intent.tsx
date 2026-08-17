// app/+native-intent.tsx
export function redirectSystemPath({ path }: { path: string }) {
  // qualquer coisa que venha do AuthSession cai aqui
  if (path.startsWith('/expo-auth-session')) {
    // Apenas ignore ou redirecione para a home
    return '/(tabs)/homeScreen';      // ou outra rota inicial
  }
  return path; // mantém o comportamento padrão
}

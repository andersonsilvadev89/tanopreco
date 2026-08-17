import React, { useState, useEffect } from "react";
import {
  View,
  Alert,
  TextInput,
  Button,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, database, adminDatabase } from "../../firebaseConfig";
import { ref, set, onValue, query, orderByChild, equalTo, get } from "firebase/database"; // Adicionado 'get', 'query', 'orderByChild', 'equalTo'
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Feather } from "@expo/vector-icons";
import { MaskedTextInput } from "react-native-mask-text";
import { router } from "expo-router";
import { AppHeaderTitle } from "../components/shell/AppHeaderTitle";
import CpfInput from "../components/CpfInput";
import CnpjInput from "../components/CnpjInput";
import { BRAND_COLORS } from "@/constants/BrandColors";

// Constante para o nome do app que estamos buscando
const TARGET_APP_NAME = "TaNoPreco";
// A coleção é a mesma que definimos na tela anterior
const FIREBASE_COLLECTION = "configuracoes_apps";


export default function CadastroScreen() {
  const [nome, setNome] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [palavrasChave, setPalavrasChave] = useState("");
  const [telefone, setTelefone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [produtosDisponiveis, setProdutosDisponiveis] = useState(5);
  const [destaquesDisponiveis, setDestaquesDisponiveis] = useState(0);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imagem, setImagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [termoAceito, setTermoAceito] = useState(false);
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState<string | null>(null);
  const [loadingPrivacyPolicyUrl, setLoadingPrivacyPolicyUrl] = useState(true);
  const [localizacaoCarregada, setLocalizacaoCarregada] = useState(false);

  const camposPreenchidos = () =>
    nomeEmpresa &&
    nome &&
    email &&
    senha &&
    confirmarSenha &&
    (cpf || cnpj) &&
    palavrasChave;

  useEffect(() => {
    const carregarLocalizacao = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão de Localização",
          "Permita o acesso à sua localização para que possamos mostrar sua empresa no mapa."
        );
        setLocalizacaoCarregada(true);
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
      } catch (error) {
        console.error("Erro ao obter a localização:", error);
        Alert.alert(
          "Erro de Localização",
          "Não foi possível obter sua localização. Tente novamente mais tarde."
        );
      }
      setLocalizacaoCarregada(true);
    };

    // === FUNÇÃO CORRIGIDA PARA BUSCAR URL PELO NOME DO APP ===
    const carregarPrivacyPolicy = () => {
      // Referencia a coleção de apps
      const appsRef = ref(adminDatabase, FIREBASE_COLLECTION);
      
      const unsubscribe = onValue(
        appsRef,
        (snapshot) => {
          const settings = snapshot.val();
          let foundUrl: string | null = null;
          
          if (settings) {
            // Itera sobre todos os IDs (chaves) na coleção
            const appIds = Object.keys(settings);
            for (const id of appIds) {
              const app = settings[id];
              // Verifica se o nome do app corresponde ao alvo
              if (app && app.nomeApp === TARGET_APP_NAME && app.privacyPolicyUrl) {
                foundUrl = app.privacyPolicyUrl;
                break; // Paramos assim que encontramos o app correto
              }
            }
          }
          
          if (foundUrl) {
            setPrivacyPolicyUrl(foundUrl);
          } else {
            console.warn(
              `URL da política de privacidade não encontrada para o app "${TARGET_APP_NAME}".`
            );
            Alert.alert(
              "Atenção",
              `A URL da Política de Privacidade para o app "${TARGET_APP_NAME}" não foi encontrada. Por favor, contate o suporte.`
            );
            setPrivacyPolicyUrl(null);
          }
          
          setLoadingPrivacyPolicyUrl(false);
        },
        (error) => {
          console.error(
            "Erro ao carregar URL da política de privacidade:",
            error
          );
          Alert.alert(
            "Erro",
            "Não foi possível carregar a URL da Política de Privacidade. Verifique sua conexão."
          );
          setLoadingPrivacyPolicyUrl(false);
          setPrivacyPolicyUrl(null);
        }
      );
      return unsubscribe;
    };
    // ========================================================

    carregarLocalizacao();
    const unsubscribePrivacyPolicy = carregarPrivacyPolicy();

    return () => unsubscribePrivacyPolicy();
  }, []);

  const handleOpenPrivacyPolicy = () => {
    if (privacyPolicyUrl) {
      Linking.openURL(privacyPolicyUrl).catch((err) => {
        console.error("Erro ao abrir link da política de privacidade:", err);
        Alert.alert(
          "Erro",
          "Não foi possível abrir a Política de Privacidade. Verifique sua conexão e a validade da URL."
        );
      });
    } else if (!loadingPrivacyPolicyUrl) {
      Alert.alert(
        "Erro",
        "A URL da Política de Privacidade não está disponível. Tente novamente mais tarde."
      );
    }
  };

  const selecionarImagem = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "Você precisa permitir o acesso à galeria para selecionar uma foto."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagem(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível abrir a galeria de imagens.");
    }
  };

  const tirarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "Você precisa permitir o acesso à câmera para tirar uma foto."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagem(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível abrir a câmera.");
    }
  };

  const handleSelecionarFoto = () => {
    Alert.alert(
      "Escolher Foto de Perfil",
      "Como você gostaria de adicionar sua foto?",
      [
        { text: "Tirar Foto", onPress: tirarFoto },
        { text: "Selecionar da Galeria", onPress: selecionarImagem },
        { text: "Cancelar", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const uploadImagem = async () => {
    if (!imagem) return null;
    const formData = new FormData();
    formData.append("file", {
      uri: imagem,
      type: "image/jpeg",
      name: "perfil.jpg",
    } as any);
    formData.append("upload_preset", "tanopreco");
    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dvekhdfgc/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      return data.secure_url || "";
    } catch (error: any) {
      Alert.alert("Erro", "Erro ao enviar imagem de perfil. Tente novamente.");
      return "";
    }
  };

  const checkDuplicateField = async (
    fieldName: string,
    value: string
  ): Promise<boolean> => {
    if (!value) return false;
    const usersRef = ref(database, "usuariosEmpresa");
    const snapshot = await get(
      query(usersRef, orderByChild(fieldName), equalTo(value))
    );
    return snapshot.exists();
  };

  const cadastrarUsuario = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!camposPreenchidos()) {
      setErro(
        "Preencha os campos obrigatórios: Nome da Empresa, Nome, Email, Senha e Confirmar Senha, CPF ou CNPJ e Palavras-chave."
      );
      return;
    }
    if (!termoAceito) {
      setErro("Você precisa aceitar o termo para continuar.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem!");
      return;
    }

    if (latitude === null || longitude === null) {
      setErro(
        "Não foi possível obter sua localização. Verifique as permissões do aplicativo e sua conexão com a internet."
      );
      return;
    }

    setLoading(true);
    setErro("");

    // Processar Instagram para garantir que o formato de verificação é o correto
    let processedInstagram: string | null = null;
    const rawInstagramInput = instagram?.trim();

    if (rawInstagramInput) {
      const instagramUrlRegex =
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/;
      const match = rawInstagramInput.match(instagramUrlRegex);

      if (match && match[1]) {
        processedInstagram = match[1];
      } else {
        processedInstagram = rawInstagramInput.startsWith("@")
          ? rawInstagramInput.substring(1)
          : rawInstagramInput;
      }
    }

    try {
      // 1. Verificar Duplicidade no Firebase Auth (Email)
      const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (methods.length > 0) {
        setErro("Email já cadastrado em outra conta.");
        setLoading(false);
        return;
      }

      // 2. Verificar Duplicidade no Realtime Database (CPF, CNPJ, Instagram)
      if (cpf && await checkDuplicateField("cpf", cpf)) {
        setErro("CPF já cadastrado em outra conta de empresa.");
        setLoading(false);
        return;
      }
      if (cnpj && await checkDuplicateField("cnpj", cnpj)) {
        setErro("CNPJ já cadastrado em outra conta de empresa.");
        setLoading(false);
        return;
      }
      if (processedInstagram && await checkDuplicateField("instagram", processedInstagram)) {
        setErro("Instagram já cadastrado em outra conta de empresa.");
        setLoading(false);
        return;
      }

      // 3. Criar o Usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        senha
      );
      const userId = userCredential.user.uid;

      // 4. Fazer Upload da Imagem
      const imageUrl = await uploadImagem();

      // 5. Salvar Dados da Empresa no Realtime Database
      await set(ref(database, "usuariosEmpresa/" + userId), {
        nome,
        nomeEmpresa,
        email: normalizedEmail,
        telefone: telefone || null,
        instagram: processedInstagram,
        imagem: imageUrl,
        cpf: cpf || null,
        cnpj: cnpj || null,
        palavrasChave,
        produtosDisponiveis,
        destaquesDisponiveis,
        termosAceitos: true,
        latitude,
        longitude,
      });

      Alert.alert("Sucesso", "Cadastro realizado com sucesso!");
      setNome("");
      setNomeEmpresa("");
      setEmail("");
      setTelefone("");
      setInstagram("");
      setSenha("");
      setConfirmarSenha("");
      setImagem(null);
      setTermoAceito(false);
      router.replace("/(auth)/loginScreen");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      // setErro(error.message); // Mantive a linha original comentada caso queira usar a mensagem de erro padrão do Firebase Auth
      let message = "Erro ao cadastrar. Por favor, tente novamente.";
      if (error.code === "auth/weak-password") {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (error.code === "auth/invalid-email") {
        message = "O endereço de e-mail é inválido.";
      } else if (error.code === "auth/email-already-in-use") {
        message = "O e-mail já está sendo utilizado por outra conta.";
      }
      setErro(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCpfChange = (maskedValue: string, unmaskedValue: string) => {
    setCpf(unmaskedValue);
  };

  if (loadingPrivacyPolicyUrl || !localizacaoCarregada) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text style={styles.loadingText}>
          {loadingPrivacyPolicyUrl
            ? "Preparando tela de cadastro..."
            : "Obtendo sua localização..."}
        </Text>
      </View>
    );
  }
  const handleCnpjChange = (maskedValue: string, unmaskedValue: string) => {
    setCnpj(unmaskedValue);
  };

  return (
    <View style={styles.background}>
      <AppHeaderTitle
        title="Criar conta"
        user={null}
        paddingTop={18}
        onBack={() => {}}
        onMenuOpen={() => {}}
        onLogout={() => {}}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Criar Conta</Text>

          <View style={styles.rowContainer}>
            <View style={styles.inputsContainer}>
              <MaskedTextInput
                mask="(99) 99999-9999"
                value={telefone}
                onChangeText={(text) => setTelefone(text)}
                placeholder="Telefone (opcional)"
                keyboardType="phone-pad"
                style={styles.input}
                placeholderTextColor={BRAND_COLORS.textMuted}
              />
              <TextInput
                placeholder="Instagram (opcional)"
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
                style={styles.input}
                placeholderTextColor={BRAND_COLORS.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={handleSelecionarFoto}
            >
              {imagem ? (
                <Image source={{ uri: imagem }} style={styles.profileImage} />
              ) : (
                <Text style={styles.addPhotoText}>Adicionar Foto</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Nome da Empresa*"
            value={nomeEmpresa}
            onChangeText={setNomeEmpresa}
            style={styles.input}
            placeholderTextColor={BRAND_COLORS.textMuted}
          />

          <TextInput
            placeholder="Nome Completo*"
            value={nome}
            onChangeText={setNome}
            style={styles.input}
            placeholderTextColor={BRAND_COLORS.textMuted}
          />
          <TextInput
            placeholder="Email*"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor={BRAND_COLORS.textMuted}
          />
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Senha*"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              style={styles.inputSenha}
              placeholderTextColor={BRAND_COLORS.textMuted}
            />
            <TouchableOpacity
              onPress={() => setMostrarSenha(!mostrarSenha)}
              style={styles.eyeIcon}
            >
              {mostrarSenha ? (
                <Feather name="eye-off" size={24} color={BRAND_COLORS.iconMuted} />
              ) : (
                <Feather name="eye" size={24} color={BRAND_COLORS.iconMuted} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Confirmar Senha*"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry={!mostrarConfirmarSenha}
              style={styles.inputSenha}
              placeholderTextColor={BRAND_COLORS.textMuted}
            />
            <TouchableOpacity
              onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
              style={styles.eyeIcon}
            >
              {mostrarConfirmarSenha ? (
                <Feather name="eye-off" size={24} color={BRAND_COLORS.iconMuted} />
              ) : (
                <Feather name="eye" size={24} color={BRAND_COLORS.iconMuted} />
              )}
            </TouchableOpacity>
          </View>
          <CpfInput value={cpf} onChangeText={handleCpfChange} />
          <CnpjInput value={cnpj} onChangeText={handleCnpjChange} />
          <TextInput
            placeholder="Palavras-chave*"
            value={palavrasChave}
            onChangeText={setPalavrasChave}
            style={styles.input}
            placeholderTextColor={BRAND_COLORS.textMuted}
          />
          <View style={styles.termoContainer}>
            <TouchableOpacity
              onPress={() => setTermoAceito(!termoAceito)}
              style={[styles.checkbox, termoAceito && styles.checkboxAtivo]}
            >
              {termoAceito && <Text style={styles.checkboxMarcado}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.termoTexto}>
              Eu concordo com os{" "}
              <TouchableOpacity
                style={{ opacity: loadingPrivacyPolicyUrl ? 0.5 : 1 }}
                onPress={handleOpenPrivacyPolicy}
                disabled={loadingPrivacyPolicyUrl || !privacyPolicyUrl}
              >
                <Text style={styles.link}>
                  Termos de uso e política de privacidade
                </Text>
              </TouchableOpacity>
              .
            </Text>
          </View>
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          {loading ? (
            <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
          ) : (
            <Button
              title="Cadastrar"
              onPress={cadastrarUsuario}
              disabled={!camposPreenchidos() || !termoAceito}
            />
          )}

          <TouchableOpacity
            onPress={() => router.push("/(auth)/loginScreen")}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>Já tem uma conta? Faça Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: BRAND_COLORS.surfaceSoft },
  scrollContent: { justifyContent: "center", padding: 10 },
  container: {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: BRAND_COLORS.primaryDeep,
  },

  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  inputsContainer: {
    flex: 1,
    marginRight: 10,
  },
  profileImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: BRAND_COLORS.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginTop: 5,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  addPhotoText: {
    fontSize: 12,
    color: BRAND_COLORS.text,
    fontWeight: "bold",
    textAlign: "center",
  },

  input: {
    height: 45,
    borderColor: BRAND_COLORS.border,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: BRAND_COLORS.surface,
    color: BRAND_COLORS.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: BRAND_COLORS.surface,
  },
  inputSenha: { flex: 1, height: 45, fontSize: 16, paddingHorizontal: 15 },
  eyeIcon: { padding: 10 },
  erro: { color: BRAND_COLORS.danger, marginBottom: 12, textAlign: "center" },
  termoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primary,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxAtivo: { backgroundColor: BRAND_COLORS.primary },
  checkboxMarcado: { color: BRAND_COLORS.white, fontSize: 16, fontWeight: "bold" },
  termoTexto: { flex: 1, fontSize: 14, color: BRAND_COLORS.text },
  link: { color: BRAND_COLORS.primaryDark, textDecorationLine: "underline" },
  loginLink: { marginTop: 15, alignItems: "center" },
  loginText: { color: BRAND_COLORS.primaryDark, fontSize: 14 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.surface,
  },
  loadingText: {
    marginTop: 10,
    color: BRAND_COLORS.primary,
    fontSize: 16,
  },
});
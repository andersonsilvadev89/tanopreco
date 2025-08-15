import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  StyleSheet,
  ImageBackground,
  FlatList, // Importar FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import 'moment/locale/pt-br';
import { TextInputMask } from 'react-native-masked-text';
import { useNavigation } from '@react-navigation/native';
import AdBanner from '../components/AdBanner';

// --- Importar o gerenciador de imagens para o fundo ---
import { checkAndDownloadImages } from '../../utils/imageManager'; // Ajuste o caminho

// --- URL padrão de fallback para o fundo local ---
const defaultFundoLocal = require('../../assets/images/fundo.png');

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dz37srew5/image/upload';
const UPLOAD_PRESET = 'expocrato';

interface LineUpItem {
  id?: string;
  imagemUrl?: string;
  nomeBanda: string;
  dataMomento: string;
  horaInicio: string;
  local: string;
  duracao: string;
}

interface Local {
  id?: string;
  descricao: string;
  latitude: number;
  longitude: number;
}

export default function CadastroLineUp() {
  const navigation = useNavigation();
  const [imagemUrl, setImagemUrl] = useState<string | undefined>();
  const [imagemUri, setImagemUri] = useState<string | undefined>();
  const [nomeBanda, setNomeBanda] = useState('');
  const [dataMomento, setDataMomento] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [localSelecionado, setLocalSelecionado] = useState('');
  const [locaisDisponiveis, setLocaisDisponiveis] = useState<Local[]>([]);
  const [duracao, setDuracao] = useState('15 minutos');
  const [lineUpItens, setLineUpItens] = useState<LineUpItem[]>([]);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [carregandoLocais, setCarregandoLocais] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // --- Novos estados para o carregamento da imagem de fundo dinâmica ---
  const [fundoAppReady, setFundoAppReady] = useState(false);
  const [currentFundoSource, setCurrentFundoSource] = useState<any>(defaultFundoLocal);

  // --- Novo estado para controlar a visibilidade da lista de itens ---
  const [listaVisivel, setListaVisivel] = useState(true); // Começa visível por padrão

  const scrollRef = useRef<ScrollView>(null);
  const userId = auth.currentUser?.uid;

  // --- NOVO useEffect para carregar a imagem de fundo dinâmica ---
  useEffect(() => {
    const loadFundoImage = async () => {
      try {
        const { fundoUrl } = await checkAndDownloadImages();
        setCurrentFundoSource(fundoUrl ? { uri: fundoUrl } : defaultFundoLocal);
      } catch (error) {
        console.error("Erro ao carregar imagem de fundo na CadastroLineUp:", error);
        setCurrentFundoSource(defaultFundoLocal); // Em caso de erro, usa o fallback local
      } finally {
        setFundoAppReady(true); // Indica que o fundo foi processado
      }
    };
    loadFundoImage();
  }, []); // Executa apenas uma vez ao montar o componente

  useEffect(() => {
    if (!userId) {
      setCarregandoLocais(false);
      return;
    }

    const lineUpRef = ref(database, `lineup`);
    const unsubscribeLineUp = onValue(lineUpRef, (snapshot) => {
      const data = snapshot.val();
      const lista: LineUpItem[] = data
        ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
        : [];
      setLineUpItens(lista.reverse()); // Mantido o reverse para a ordem de exibição
    });

    const locaisRef = ref(database, 'locais');
    const unsubscribeLocais = onValue(locaisRef, (snapshot) => {
      const data = snapshot.val();
      const lista: Local[] = data
        ? Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }))
        : [];
      setLocaisDisponiveis(lista);
      setCarregandoLocais(false);
    }, (error) => {
      console.error("Erro ao carregar locais:", error);
      Alert.alert("Erro", "Não foi possível carregar os locais disponíveis.");
      setCarregandoLocais(false);
    });

    return () => {
      unsubscribeLineUp();
      unsubscribeLocais();
    };
  }, [userId]);

  const validarData = (data: string): boolean => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      return false;
    }
    const [dia, mes, ano] = data.split('/').map(Number);
    if (ano < 1900 || ano > new Date().getFullYear() + 5) {
      return false;
    }
    if (mes < 1 || mes > 12) {
      return false;
    }
    const diasNoMes = new Date(ano, mes, 0).getDate();
    if (dia < 1 || dia > diasNoMes) {
      return false;
    }
    return true;
  };

  const validarHora = (hora: string): boolean => {
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return false;
    }
    const [horas, minutos] = hora.split(':').map(Number);
    return horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59;
  };

  const salvarLineUpItem = async () => {
    if (!nomeBanda.trim() || !dataMomento.trim() || !horaInicio.trim() || !localSelecionado.trim() || !duracao.trim()) {
      Alert.alert('Erro', 'Todos os campos com * são obrigatórios.');
      return;
    }

    if (!validarData(dataMomento)) {
      Alert.alert('Erro', 'A data deve estar no formato DD/MM/AAAA e ser válida.');
      return;
    }

    if (!validarHora(horaInicio)) {
      Alert.alert('Erro', 'A hora deve estar no formato HH:MM (formato 24 horas) e ser válida.');
      return;
    }

    if (!userId) return;

    if (localSelecionado === 'adicionar_novo_local') {
      Alert.alert('Erro', 'Por favor, selecione um local válido ou adicione um novo.');
      return;
    }

    setLoadingUpload(true);
    const imageUrlToSave = imagemUri ? await enviarImagemParaCloudinary(imagemUri) : imagemUrl;
    setLoadingUpload(false);

    if (!imageUrlToSave && imagemUri) {
        Alert.alert('Erro no Upload', 'Não foi possível enviar a imagem. Por favor, tente novamente.');
        return;
    }

    const lineUpRef = ref(database, `lineup`);
    const lineUpItem: LineUpItem = {
      imagemUrl: imageUrlToSave,
      nomeBanda,
      dataMomento,
      horaInicio,
      local: localSelecionado,
      duracao,
    };

    if (editandoId) {
      const itemEditarRef = ref(database, `lineup/${editandoId}`);
      update(itemEditarRef, lineUpItem);
      Alert.alert('Sucesso', 'Item da LineUp atualizado!');
    } else {
      const novoRef = push(lineUpRef);
      set(novoRef, lineUpItem);
      Alert.alert('Sucesso', 'Item da LineUp salvo com sucesso!');
    }

    limparFormulario();
  };

  const limparFormulario = () => {
    setImagemUrl(undefined);
    setImagemUri(undefined);
    setNomeBanda('');
    setDataMomento('');
    setHoraInicio('');
    setLocalSelecionado('');
    setDuracao('15 minutos');
    setEditandoId(null);
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const excluirLineUpItem = (id: string) => {
    Alert.alert('Confirmação', 'Deseja excluir este item da LineUp?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const itemRef = ref(database, `lineup/${id}`);
          remove(itemRef);
        },
      },
    ]);
  };

  const editarLineUpItem = (item: LineUpItem) => {
    setImagemUrl(item.imagemUrl);
    setImagemUri(undefined);
    setNomeBanda(item.nomeBanda);
    setDataMomento(item.dataMomento);
    setHoraInicio(item.horaInicio);
    setLocalSelecionado(item.local);
    setDuracao(item.duracao);
    setEditandoId(item.id || null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const escolherImagem = () => {
    Alert.alert('Selecionar imagem', 'Escolha uma opção', [
      { text: 'Galeria', onPress: selecionarDaGaleria },
      { text: 'Câmera', onPress: selecionarDaCamera },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const selecionarDaGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImagemUri(uri);
      setImagemUrl(undefined);
    }
  };

  const selecionarDaCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImagemUri(uri);
      setImagemUrl(undefined);
    }
  };

  const enviarImagemParaCloudinary = async (uri: string): Promise<string | undefined> => {
    try {
      setLoadingUpload(true);
      const data = new FormData();
      data.append('file', {
        uri,
        type: 'image/jpeg',
        name: `lineup_${Date.now()}.jpg`,
      } as any);
      data.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
      });

      const file = await res.json();
      if (file.secure_url) {
        return file.secure_url;
      } else {
        console.error('Erro ao enviar imagem, URL segura não recebida:', file);
        return undefined;
      }
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      Alert.alert('Erro ao enviar imagem. Verifique sua conexão e tente novamente.');
      return undefined;
    } finally {
      setLoadingUpload(false);
    }
  };

  const gerarOpcoesDuracao = () => {
    const options = [];
    for (let hora = 0; hora < 3; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 15) {
        const horaStr = hora > 0 ? `${hora} hora${hora > 1 ? 's' : ''}` : '';
        const minutoStr = minuto > 0 ? `${minuto} minuto${minuto > 1 ? 's' : ''}` : '';
        let valor = '';
        if (horaStr && minutoStr) {
          valor = `${horaStr} e ${minutoStr}`;
        } else if (horaStr) {
          valor = horaStr;
        } else if (minutoStr) {
          valor = minutoStr;
        }
        if (valor.trim()) {
          options.push(valor);
        }
      }
    }
    for (let i = 3; i <= 10; i++) {
      options.push(`${i} horas`);
    }
    return [...new Set(options)].sort((a, b) => {
      const partsA = a.match(/(\d+)\s*hora/);
      const hoursA = partsA ? parseInt(partsA[1], 10) : 0;
      const partsMinutesA = a.match(/(\d+)\s*minuto/);
      const minutesA = partsMinutesA ? parseInt(partsMinutesA[1], 10) : 0;

      const partsB = b.match(/(\d+)\s*hora/);
      const hoursB = partsB ? parseInt(partsB[1], 10) : 0;
      const partsMinutesB = b.match(/(\d+)\s*minuto/);
      const minutesB = partsMinutesB ? parseInt(partsMinutesB[1], 10) : 0;

      if (hoursA !== hoursB) {
        return hoursA - hoursB;
      }
      return minutesA - minutesB;
    });
  };

  const duracaoOptions = gerarOpcoesDuracao();

  const handleLocalChange = (itemValue: string) => {
    if (itemValue === 'adicionar_novo_local') {
      navigation.navigate('locaisScreen' as never);
      setLocalSelecionado('');
    } else {
      setLocalSelecionado(itemValue);
    }
  };

  // --- Condição de carregamento geral: Espera os locais e o fundo do app ---
  if (carregandoLocais || !fundoAppReady) {
    return (
      <ImageBackground source={currentFundoSource} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={currentFundoSource}
      style={styles.backgroundImage}
    >
      <AdBanner />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Cadastro da LineUp</Text>

            <TouchableOpacity
              onPress={escolherImagem}
              accessible
              accessibilityLabel="Escolher imagem da banda"
              style={styles.imageInputTouchable}
            >
              {loadingUpload ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator size="large" color="#000" />
                  <Text style={styles.imagePlaceholderText}>Enviando imagem...</Text>
                </View>
              ) : (imagemUri || imagemUrl) ? (
                <Image source={{ uri: imagemUri || imagemUrl }} style={styles.fullWidthImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>Toque para selecionar imagem</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text>Nome da Banda *</Text>
            <TextInput
              value={nomeBanda}
              onChangeText={setNomeBanda}
              placeholder="Nome da banda ou artista"
              style={styles.input}
              accessibilityLabel="Campo para inserir o nome da banda"
            />

            <Text>Data *</Text>
            <TextInputMask
              type={'datetime'}
              options={{
                format: 'DD/MM/YYYY',
              }}
              value={dataMomento}
              onChangeText={(text) => {
                setDataMomento(text);
              }}
              placeholder="DD/MM/AAAA"
              style={styles.input}
              keyboardType="number-pad"
              accessibilityLabel="Campo para inserir a data do evento no formato DD/MM/AAAA"
              onBlur={() => {
                if (dataMomento.length === 10 && !validarData(dataMomento)) {
                  Alert.alert('Atenção', 'A data digitada não é válida.');
                }
              }}
            />

            <Text>Hora de Início *</Text>
            <TextInputMask
              type={'datetime'}
              options={{
                format: 'HH:MM',
              }}
              value={horaInicio}
              onChangeText={(text) => {
                setHoraInicio(text);
              }}
              placeholder="HH:MM"
              style={styles.input}
              keyboardType="number-pad"
              accessibilityLabel="Campo para inserir a hora de início no formato HH:MM (24 horas)"
              onBlur={() => {
                if (horaInicio.length === 5 && !validarHora(horaInicio)) {
                  Alert.alert('Atenção', 'A hora digitada não é válida (formato 24 horas).');
                }
              }}
            />

            <Text>Local *</Text>
            {carregandoLocais ? (
              <ActivityIndicator size="small" color="#0000ff" style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={localSelecionado}
                  onValueChange={handleLocalChange}
                  accessibilityLabel="Selecione o local da apresentação"
                >
                  <Picker.Item label="Selecione um local" value="" enabled={false} />
                  {locaisDisponiveis.map((loc) => (
                    <Picker.Item key={loc.id} label={loc.descricao} value={loc.descricao} />
                  ))}
                  <Picker.Item label="Adicionar Novo Local..." value="adicionar_novo_local" />
                </Picker>
              </View>
            )}

            <Text>Tempo de Duração *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={duracao}
                onValueChange={(itemValue) => setDuracao(itemValue)}
                accessibilityLabel="Selecione o tempo de duração da apresentação"
              >
                {duracaoOptions.map((item, index) => (
                  <Picker.Item key={index} label={item} value={item} />
                ))}
              </Picker>
            </View>

            <Button title={editandoId ? "Atualizar Item" : "Salvar Item"} onPress={salvarLineUpItem} accessibilityLabel="Botão para salvar ou atualizar o item da LineUp" />
            {editandoId && (
              <TouchableOpacity style={styles.cancelButton} onPress={limparFormulario}>
                <Text style={styles.cancelButtonText}>Cancelar Edição</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setListaVisivel(!listaVisivel)}
            accessibilityLabel={`Clique para ${listaVisivel ? 'esconder' : 'mostrar'} os itens da LineUp`}
          >
            <Text style={styles.toggleButtonText}>
              {listaVisivel ? 'Esconder Itens Cadastrados' : 'Mostrar Itens Cadastrados'}
            </Text>
          </TouchableOpacity>

          {listaVisivel && (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>Itens da LineUp Cadastrados</Text>
              {lineUpItens.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum item cadastrado na LineUp.</Text>
              ) : (
                <FlatList
                  data={lineUpItens}
                  keyExtractor={(item) => item.id!}
                  renderItem={({ item }) => (
                    <View style={styles.listItem}>
                      {item.imagemUrl && (
                        <Image source={{ uri: item.imagemUrl }} style={styles.listItemImage} />
                      )}
                      <View style={styles.listItemDetails}>
                        <Text style={styles.listItemTextBold}>{item.nomeBanda}</Text>
                        <Text style={styles.listItemText}>Data: {item.dataMomento}</Text>
                        <Text style={styles.listItemText}>Hora: {item.horaInicio}</Text>
                        <Text style={styles.listItemText}>Local: {item.local}</Text>
                        <Text style={styles.listItemText}>Duração: {item.duracao}</Text>
                      </View>
                      <View style={styles.listItemButtons}>
                        <Button title="Editar" onPress={() => editarLineUpItem(item)} accessibilityLabel={`Editar o item ${item.nomeBanda}`} />
                        <Button title="Excluir" onPress={() => excluirLineUpItem(item.id!)} color="red" accessibilityLabel={`Excluir o item ${item.nomeBanda}`} />
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  scrollViewContent: {
    padding: 10,
    paddingBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  formContainer: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
  },
  imageInputTouchable: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  fullWidthImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
  },
  listContainer: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    paddingVertical: 10,
  },
  listItem: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  listItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: 'cover',
  },
  listItemDetails: {
    flex: 1,
  },
  listItemTextBold: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  listItemText: {
    fontSize: 14,
  },
  listItemButtons: {
    marginLeft: 10,
    justifyContent: 'space-around',
    height: 80,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Estilos para o estado de carregamento do fundo
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#007BFF',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Novos estilos para o botão de alternar a lista
  toggleButton: {
    backgroundColor: '#007BFF', // Azul
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
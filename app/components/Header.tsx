import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Alert, 
  Modal, 
  TouchableWithoutFeedback,
  LayoutAnimation, // Importado para animação
  Platform, // Importado para verificar SO
  UIManager // Importado para animação no Android
} from 'react-native';
import { auth, database } from "../../firebaseConfig";
import { ref, onValue, off } from "firebase/database";
import { LinearGradient } from 'expo-linear-gradient';

// Habilitar animações de layout no Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const iconOfertas = require('../../assets/botoes/icon.png');
const iconLogout = require('../../assets/botoes/logout.png');

interface Mensagem {
  id: string;
  texto: string;
}

interface HeaderProps {
  title: string | undefined;
  nomeUsuario: string;
  onPressOfertas: () => void;
  onPressLogout: () => void;
}

const Header = ({ onPressOfertas, onPressLogout, title, nomeUsuario }: HeaderProps) => {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  
  // Estados para controlar o Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<string>('');

  // NOVO: Estado para controlar o Acordeão
  const [expanded, setExpanded] = useState(false);

  const uidUsuario = auth.currentUser?.uid;

  useEffect(() => {
    if (!uidUsuario) return;

    const mensagensRef = ref(database, `mensagensNotificacoes`);

    const onValueChange = onValue(mensagensRef, (snapshot) => {
      const dadosMensagens = snapshot.val();
      const mensagensEncontradas: Mensagem[] = [];

      if (dadosMensagens) {
        Object.keys(dadosMensagens).forEach(key => {
          const mensagem = dadosMensagens[key];
          mensagensEncontradas.push({ id: key, texto: mensagem.mensagem }); 
        });
      }
      setMensagens(mensagensEncontradas.reverse());
    }, error => {
      console.error("Erro ao ler mensagens: ", error);
      Alert.alert("Erro", "Não foi possível carregar as mensagens.");
    });

    return () => off(mensagensRef, 'value', onValueChange);
  }, [uidUsuario]);

  // Função para abrir o modal com a mensagem completa
  const handleOpenMessage = (texto: string) => {
    setMensagemSelecionada(texto);
    setModalVisible(true);
  };

  // NOVO: Função para alternar o acordeão com animação
  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <LinearGradient
      colors={['#064ec7', '#04358a', '#011b4aff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.headerContainer}
    >
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onPressOfertas} style={styles.ofertasButton}>
          <Image source={iconOfertas} style={styles.ofertasIcon} resizeMode="cover" />
          <Text style={styles.buttonText}>Ofertas!</Text>
        </TouchableOpacity>

        <View style={styles.saudacao}>
          <Text style={styles.userText}>Olá, {nomeUsuario}</Text>
          <Text style={styles.titleText}>{title}</Text>
        </View>

        <TouchableOpacity onPress={onPressLogout} style={styles.logoutButton}>
          <Image source={iconLogout} style={styles.logoutIcon} resizeMode="cover" />
          <Text style={styles.buttonText}>Logout!</Text>
        </TouchableOpacity>
      </View>

      {/* Container de Notificações (Acordeão) */}
      <View style={[styles.notificationsBox, expanded ? styles.notificationsBoxExpanded : null]}>
        
        {/* Cabeçalho do Acordeão (Clicável) */}
        <TouchableOpacity onPress={toggleAccordion} style={styles.accordionHeader} activeOpacity={0.7}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.notificacaoText}>Mensagens e Notificações</Text>
            
            {/* NOVO: Badge contador vermelho */}
            {mensagens.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {mensagens.length > 99 ? '+99' : mensagens.length}
                </Text>
              </View>
            )}
          </View>
          {/* Ícone de seta indicando se está aberto ou fechado (Simulado com texto para não depender de libs de ícones) */}
          <Text style={styles.arrowIcon}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {/* Conteúdo do Acordeão (Só renderiza se expanded for true) */}
        {expanded && (
          <View style={styles.accordionContent}>
            {mensagens.length > 0 ? (
              <ScrollView
                style={styles.messagesScroll}
                nestedScrollEnabled={true} 
              >
                {mensagens.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.messageCard}
                    onPress={() => handleOpenMessage(item.texto)}
                  >
                    <Text 
                      style={styles.messageText} 
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                    >
                      • {item.texto}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyMessagesText}>Não há novas mensagens.</Text>
            )}
          </View>
        )}
      </View>

      {/* Modal para exibir mensagem completa */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Mensagem Completa</Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  <Text style={styles.modalBodyText}>{mensagemSelecionada}</Text>
                </ScrollView>
                
                <TouchableOpacity 
                  style={styles.closeModalButton} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeModalText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    paddingBottom: 0,
    paddingTop: 5,
    zIndex: 1, // Garante prioridade visual
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 5,
    marginBottom: 0,
  },
  ofertasButton: {
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 40,
    backgroundColor: '#ffffffff',
    borderWidth: 4,
    padding: 0,
    borderColor: '#ffffffc3',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#f41c24',
    width: 60,
    height: 60,
    borderRadius: 40,
    borderWidth: 4,
    padding: 0,
    borderColor: '#ffffffc3',
  },
  ofertasIcon: {
    width: 50,
    height: 50,
    borderRadius: 40,
    marginBottom: 5,
    padding: 0,
  },
  logoutIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 5,
    padding: 0,
  },
  saudacao: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userText: {
    maxWidth: 250,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  titleText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 5,
  },
  buttonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  
  // ESTILOS DO ACORDEÃO E NOTIFICAÇÕES
  notificationsBox: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingVertical: 10, // Reduzido para ficar compacto quando fechado
    marginTop: 15,
    marginBottom: -5, // Ajuste fino para "colar" no fundo se necessário
    minHeight: 50, // Altura mínima quando fechado
    // Removemos a altura fixa para permitir expansão
  },
  notificationsBoxExpanded: {
    paddingBottom: 20, // Espaço extra quando aberto
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificacaoText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000ff',
  },
  // Estilo do Badge (Contador)
  badgeContainer: {
    backgroundColor: '#ff0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  arrowIcon: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  accordionContent: {
    marginTop: 10,
  },
  messagesScroll: {
    maxHeight: 150, // Limita a altura da lista para não ocupar a tela toda
  },
  messageCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  emptyMessagesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 10,
  },

  // ESTILOS DO MODAL (Mantidos)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#04358a',
  },
  modalBodyText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'justify',
    marginBottom: 20,
  },
  closeModalButton: {
    backgroundColor: '#04358a',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    paddingHorizontal: 30,
    marginTop: 10,
  },
  closeModalText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Header;
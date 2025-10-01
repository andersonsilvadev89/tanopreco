import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { auth, database } from "../../firebaseConfig";
import { ref, onValue, off } from "firebase/database";
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
  const uidUsuario = auth.currentUser?.uid;

  useEffect(() => {
    if (!uidUsuario) {
      // Retorna se o usuário não estiver logado
      return;
    }

    const mensagensRef = ref(database, `mensagens/${uidUsuario}`);
    
    // A função de listener de dados
    const onValueChange = onValue(mensagensRef, (snapshot) => {
      const dadosMensagens = snapshot.val();
      const mensagensEncontradas: Mensagem[] = [];

      if (dadosMensagens) {
        Object.keys(dadosMensagens).forEach(key => {
          const mensagem = dadosMensagens[key];
          
          // Adiciona a mensagem se for para o usuário logado OU para "todos"
          if (mensagem.uidUsuario === uidUsuario || mensagem.uidUsuario === 'todos') {
            mensagensEncontradas.push({ id: key, texto: mensagem.texto });
          }
        });
      }
      setMensagens(mensagensEncontradas.reverse()); // Use .reverse() para mostrar a mais nova primeiro
    }, error => {
      console.error("Erro ao ler mensagens: ", error);
      Alert.alert("Erro", "Não foi possível carregar as mensagens.");
    });

    // Retorna a função de cleanup do listener
    return () => off(mensagensRef, 'value', onValueChange);
  }, [uidUsuario]);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onPressOfertas} style={styles.ofertasButton}>
          <Image source={iconOfertas} style={styles.ofertasIcon} resizeMode="cover"/>
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

      <View style={styles.notificationsBox}>
        <Text style={styles.notificacaoText}>Mensagens e Notificações</Text>
        {mensagens.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          >
            {mensagens.map((item) => (
              <View key={item.id} style={styles.messageCard}>
                <Text style={styles.messageText}>{item.texto}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyMessagesText}>Não há novas mensagens.</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor:'#064ec7',
    paddingBottom: 0,
    paddingTop: 50,
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
  smallText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 5,
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
  notificacaoText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000ff',
    textAlign: 'center',
    marginBottom: 15,
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
  notificationsBox: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 30,
    marginHorizontal: 0,
    paddingHorizontal: 20,  
    paddingVertical: 15,
    marginTop: 20,
    marginBottom: -25,
    height: 150,
  },
  carouselContent: {
    paddingRight: 15,
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    minWidth: 200,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  emptyMessagesText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Header;
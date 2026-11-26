import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebaseConfig";
import { BRAND_COLORS } from "@/constants/BrandColors";
import AdCard from "./AdCard";

const PRODUTOS_POR_ADCARD = 3;

export interface UnidadeLoja {
  nome: string;
  latitude: number;
  longitude: number;
}

export interface OfertaWeb {
  id: string;
  lojaId: string;
  descricao: string;
  preco: string;
  imagemUrl?: string;
  nomeLoja: string;
  cidade?: string;
  categoria?: string;
  urlProduto: string;
  atualizadoEm?: string;
}

interface OfertasWebSectionProps {
  termoBusca: string;
  categoriaSelecionada?: string | null;
  userLocation: { latitude: number; longitude: number } | null;
  ordenarPorPreco: boolean;
  ordenacaoManual: boolean;
  onVerNoMapa?: (local: { latitude: number; longitude: number; nome: string }) => void;
  onReivindicarLoja?: (nomeLoja: string) => void;
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const LOJAS_POR_CATEGORIA: Record<string, string[]> = {
  mercado: ["diniz", "saoluiz", "atacadao"],
  saude: ["paguemenos", "feitosa"],
  utilidades: ["freitas", "corba"],
  construcao: ["casadoeletricista"],
};

const PALAVRAS_POR_CATEGORIA: Record<string, string[]> = {
  alimentacao: [
    "arroz", "feijao", "acucar", "oleo", "macarrao", "carne", "frango", "queijo",
    "biscoito", "pao", "chocolate", "cereal", "fruta", "pitaia", "panetone", "bolo",
    "molho", "tempero", "farinha", "manteiga", "margarina", "iogurte", "presunto",
    "salsicha", "ovo", "azeite", "bolacha", "sorvete", "pizza", "hamburguer", "leite condensado",
  ],
  bebidas: [
    "cerveja", "suco", "refrigerante", "agua", "vinho", "whisky", "vodka", "energetico",
    "cha ", "achocolatado", "guarana", "coca", "pepsi", "heineken", "budweiser", "brahma",
    "skol", "itaipava", "sprite", "fanta", "leite", "cafe", "espumante", "gin", "isotonic",
  ],
  saude: [
    "dipirona", "paracetamol", "vitamina", "xarope", "comprimido", "capsula", "pomada",
    "nasal", "neosoro", "suplemento", "termometro", "curativo", "alcool", "dorflex",
    "advil", "benegrip", "medicamento", "remedio", "solucao", "gotas", "mg",
  ],
  beleza: [
    "shampoo", "condicionador", "sabonete", "hidratante", "creme", "protetor solar",
    "desodorante", "perfume", "maquiagem", "batom", "esmalte", "tintura", "cabelo",
    "facial", "serum", "colonia", "escova", "secador", "barbear", "depil",
  ],
  kids: [
    "fralda", "lenco umedecido", "mamadeira", "chupeta", "infantil", "bebe", "brinquedo",
    "assadura", "aptamil", "ninho", "nan ", "kids",
  ],
  utilidades: [
    "panela", "copo", "prato", "jarra", "talher", "garrafa", "pote", "balde", "vassoura",
    "rodo", "lixeira", "tapete", "toalha", "lencol", "travesseiro", "organizador", "forma",
    "frigideira", "chaleira", "batedeira", "liquidificador", "air fryer", "fritadeira",
    "cafeteira", "ventilador", "ferro", "aspirador", "lampada", "extensao", "lanterna",
  ],
  tecnologia: [
    "celular", "fone", "carregador", "cabo", "usb", "caixa de som", "mouse", "teclado",
    "smart", "notebook", "tablet", "pilha", "bateria", "eletronico",
  ],
  moveis: [
    "cadeira", "mesa", "sofa", "estante", "armario", "cama", "colchao", "banqueta",
    "rack", "prateleira",
  ],
};

function pertenceACategoria(item: OfertaWeb, categoriaSelecionada: string): boolean {
  const catNorm = normalizarTexto(categoriaSelecionada);

  if (item.categoria && normalizarTexto(item.categoria).includes(catNorm)) {
    return true;
  }

  const lojasDaCategoria = LOJAS_POR_CATEGORIA[catNorm];
  if (lojasDaCategoria?.includes(item.lojaId)) {
    return true;
  }

  const palavras = PALAVRAS_POR_CATEGORIA[catNorm];
  if (palavras) {
    const descNorm = normalizarTexto(item.descricao);
    return palavras.some((palavra) => descNorm.includes(palavra));
  }

  return false;
}

function embaralhar<T>(array: T[]): T[] {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function intercalarPorLoja(gruposPorLoja: OfertaWeb[][]): OfertaWeb[] {
  const gruposEmbaralhados = gruposPorLoja.map((grupo) => embaralhar(grupo));
  const resultado: OfertaWeb[] = [];
  const maiorGrupo = Math.max(0, ...gruposEmbaralhados.map((g) => g.length));

  for (let i = 0; i < maiorGrupo; i++) {
    for (const grupo of gruposEmbaralhados) {
      if (grupo[i]) {
        resultado.push(grupo[i]);
      }
    }
  }

  return resultado;
}

function calcularDistanciaKm(
  origem: { latitude: number; longitude: number },
  destino: { latitude: number; longitude: number }
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(destino.latitude - origem.latitude);
  const dLon = toRad(destino.longitude - origem.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(origem.latitude)) *
      Math.cos(toRad(destino.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getUnidadeMaisProxima(
  unidades: UnidadeLoja[] | undefined,
  userLocation: { latitude: number; longitude: number } | null
) {
  if (!unidades?.length || !userLocation) return null;

  let maisProxima = unidades[0];
  let menorDistancia = calcularDistanciaKm(userLocation, unidades[0]);

  for (let i = 1; i < unidades.length; i++) {
    const dist = calcularDistanciaKm(userLocation, unidades[i]);
    if (dist < menorDistancia) {
      menorDistancia = dist;
      maisProxima = unidades[i];
    }
  }

  return { unidade: maisProxima, distanciaKm: menorDistancia };
}

function parsePreco(preco: string) {
  const limpo = preco.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(limpo);
  return Number.isNaN(num) ? Infinity : num;
}

function formatarUltimaAtualizacao(ofertas: OfertaWeb[]): string | null {
  let maisRecente = 0;

  for (const item of ofertas) {
    if (!item.atualizadoEm) continue;
    const timestamp = Date.parse(item.atualizadoEm);
    if (!Number.isNaN(timestamp) && timestamp > maisRecente) {
      maisRecente = timestamp;
    }
  }

  if (!maisRecente) return null;

  const data = new Date(maisRecente);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const minuto = String(data.getMinutes()).padStart(2, "0");

  return `${dia}/${mes} às ${hora}:${minuto}`;
}

export function OfertasWebSection({
  termoBusca,
  categoriaSelecionada,
  userLocation,
  ordenarPorPreco,
  ordenacaoManual,
  onVerNoMapa,
  onReivindicarLoja,
}: OfertasWebSectionProps) {
  const [ofertas, setOfertas] = useState<OfertaWeb[]>([]);
  const [unidadesPorLoja, setUnidadesPorLoja] = useState<Record<string, UnidadeLoja[]>>({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const ofertasRef = ref(database, "ofertasMonitoradas");
    const unsubscribeOfertas = onValue(
      ofertasRef,
      (snapshot) => {
        const gruposPorLoja: OfertaWeb[][] = [];

        if (snapshot.exists()) {
          snapshot.forEach((lojaSnapshot) => {
            const lojaId = lojaSnapshot.key!;
            const itensDaLoja: OfertaWeb[] = [];

            lojaSnapshot.forEach((produtoSnapshot) => {
              itensDaLoja.push({
                id: produtoSnapshot.key!,
                lojaId,
                ...produtoSnapshot.val(),
              });
            });

            if (itensDaLoja.length > 0) {
              gruposPorLoja.push(itensDaLoja);
            }
          });
        }

        setOfertas(intercalarPorLoja(gruposPorLoja));
        setCarregando(false);
      },
      () => setCarregando(false)
    );

    const unidadesRef = ref(database, "unidadesMonitoradas");
    const unsubscribeUnidades = onValue(unidadesRef, (snapshot) => {
      if (snapshot.exists()) {
        setUnidadesPorLoja(snapshot.val());
      }
    });

    return () => {
      unsubscribeOfertas();
      unsubscribeUnidades();
    };
  }, []);

  const ofertasFiltradas = useMemo(() => {
    const busca = normalizarTexto(termoBusca.trim());

    let filtradas = ofertas;

    if (categoriaSelecionada) {
      filtradas = filtradas.filter((item) => pertenceACategoria(item, categoriaSelecionada));
    }

    if (busca) {
      const termos = busca.split(/\s+/).filter(Boolean);
      filtradas = filtradas.filter((item) => {
        const alvo = normalizarTexto(`${item.descricao} ${item.nomeLoja} ${item.cidade || ""}`);
        return termos.every((t) => alvo.includes(t));
      });
    }

    if (!busca && !categoriaSelecionada && !ordenacaoManual) {
      return filtradas;
    }

    return [...filtradas].sort((a, b) => {
      const precoA = parsePreco(a.preco);
      const precoB = parsePreco(b.preco);
      const distA =
        getUnidadeMaisProxima(unidadesPorLoja[a.lojaId], userLocation)?.distanciaKm ?? Infinity;
      const distB =
        getUnidadeMaisProxima(unidadesPorLoja[b.lojaId], userLocation)?.distanciaKm ?? Infinity;

      if (ordenarPorPreco) {
        if (precoA !== precoB) return precoA - precoB;
        return distA - distB;
      } else {
        const diffDist = distA - distB;
        if (Math.abs(diffDist) > 0.005) return diffDist;
        return precoA - precoB;
      }
    });
  }, [
    ofertas,
    termoBusca,
    categoriaSelecionada,
    unidadesPorLoja,
    userLocation,
    ordenarPorPreco,
    ordenacaoManual,
  ]);

  const ultimaAtualizacao = useMemo(
    () => formatarUltimaAtualizacao(ofertasFiltradas),
    [ofertasFiltradas]
  );

  const abrirLinkExterno = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o site da loja.");
    }
  };

  if (carregando) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  if (ofertasFiltradas.length === 0) {
    return null;
  }

  const tituloSecao = termoBusca.trim()
    ? "Encontrado em sites locais"
    : categoriaSelecionada
      ? `Na Web (${categoriaSelecionada})`
      : "Monitorado na Web (Região)";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrapper}>
          <Feather name="globe" size={16} color={BRAND_COLORS.primaryDark} />
          <Text style={styles.sectionTitle}>{tituloSecao}</Text>
        </View>
        <Text style={styles.countBadge}>{ofertasFiltradas.length} itens</Text>
      </View>

      <FlatList
        data={ofertasFiltradas}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        renderItem={({ item, index }) => {
          const proxima = getUnidadeMaisProxima(unidadesPorLoja[item.lojaId], userLocation);

          return (
            <React.Fragment key={item.id}>
              <View style={styles.card}>
                <View style={styles.webTag}>
                  <Text style={styles.webTagText}>Preço na Web</Text>
                </View>

                {item.imagemUrl ? (
                  <Image source={{ uri: item.imagemUrl }} style={styles.image} resizeMode="contain" />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Feather name="shopping-bag" size={24} color={BRAND_COLORS.textMuted} />
                  </View>
                )}

                <Text style={styles.descricao} numberOfLines={2}>
                  {item.descricao}
                </Text>

                <Text style={styles.preco}>{item.preco}</Text>

                <Text style={styles.lojaNome} numberOfLines={1}>
                  {item.nomeLoja}
                </Text>

                {proxima && (
                  <Text style={styles.distanciaTexto} numberOfLines={1}>
                    ≈ {proxima.distanciaKm.toFixed(1)} km • {proxima.unidade.nome}
                  </Text>
                )}

                <View style={styles.botoesRow}>
                  <TouchableOpacity
                    style={styles.verSiteButton}
                    onPress={() => abrirLinkExterno(item.urlProduto)}
                    activeOpacity={0.85}
                  >
                    <Feather name="external-link" size={12} color={BRAND_COLORS.white} />
                    <Text style={styles.verSiteText}>Site</Text>
                  </TouchableOpacity>

                  {proxima && onVerNoMapa && (
                    <TouchableOpacity
                      style={styles.rotaButton}
                      onPress={() =>
                        onVerNoMapa({
                          latitude: proxima.unidade.latitude,
                          longitude: proxima.unidade.longitude,
                          nome: `${item.nomeLoja} - ${proxima.unidade.nome}`,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Feather name="map-pin" size={12} color={BRAND_COLORS.white} />
                      <Text style={styles.verSiteText}>Mapa</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {onReivindicarLoja && (
                  <TouchableOpacity
                    style={styles.reivindicarButton}
                    onPress={() => onReivindicarLoja(item.nomeLoja)}
                  >
                    <Text style={styles.reivindicarText}>É sua loja? Reivindicar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {(index + 1) % PRODUTOS_POR_ADCARD === 0 && <AdCard />}
            </React.Fragment>
          );
        }}
      />

      <View style={styles.disclaimerBox}>
        <Feather name="info" size={12} color={BRAND_COLORS.textMuted} style={styles.disclaimerIcon} />
        <Text style={styles.disclaimerText}>
          Preços coletados de sites públicos, sujeitos a alteração sem aviso prévio pela loja.
          {ultimaAtualizacao ? ` Última atualização: ${ultimaAtualizacao}.` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 16,
    alignItems: "center",
  },
  container: {
    marginTop: 18,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    color: "#063494",
    fontSize: 16,
    fontWeight: "800",
  },
  countBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: BRAND_COLORS.primaryDark,
    backgroundColor: "rgba(10, 79, 203, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  listContent: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  card: {
    width: 175,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 12,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    elevation: 2,
  },
  webTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(10, 79, 203, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  webTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: BRAND_COLORS.primaryDark,
  },
  image: {
    width: "100%",
    height: 95,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.surfaceSoft,
  },
  descricao: {
    fontSize: 13,
    fontWeight: "600",
    color: BRAND_COLORS.text,
    minHeight: 34,
  },
  preco: {
    fontSize: 16,
    fontWeight: "900",
    color: BRAND_COLORS.success,
    marginTop: 4,
  },
  lojaNome: {
    fontSize: 11,
    fontWeight: "700",
    color: BRAND_COLORS.text,
    marginTop: 2,
  },
  distanciaTexto: {
    fontSize: 10,
    color: BRAND_COLORS.primary,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 8,
  },
  botoesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  verSiteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 7,
    borderRadius: 8,
  },
  rotaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: BRAND_COLORS.success,
    paddingVertical: 7,
    borderRadius: 8,
  },
  verSiteText: {
    color: BRAND_COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
  reivindicarButton: {
    marginTop: 6,
    alignItems: "center",
  },
  reivindicarText: {
    fontSize: 10,
    color: BRAND_COLORS.primaryDark,
    textDecorationLine: "underline",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    paddingHorizontal: 6,
    gap: 5,
  },
  disclaimerIcon: {
    marginTop: 1,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: BRAND_COLORS.textMuted,
  },
});
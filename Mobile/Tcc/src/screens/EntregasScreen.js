import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";

import CabecalhoEntregador from "../components/cabecalho";

const RED = "#ff3131";

// Android Emulator
const API_URL = "http://10.0.2.2:3000";

// Atualiza a lista sozinho a cada 10 segundos
const INTERVALO_ATUALIZACAO = 10000;

function numeroPedido(id) {
  return "Pedido #" + String(id).padStart(4, "0");
}

async function lerRespostaJson(resposta) {
  const conteudo = await resposta.text();
  if (!conteudo) return {};
  try {
    return JSON.parse(conteudo);
  } catch {
    throw new Error(
      `A API retornou uma resposta inválida (HTTP ${resposta.status}). Confira se a rota existe no backend.`
    );
  }
}

function montarDestino(pedido) {
  const partes = [
    [pedido.rua, pedido.numero].filter(Boolean).join(", "),
    pedido.bairro,
    pedido.cep,
    "Brasil",
  ];
  return partes.filter(Boolean).join(", ");
}

function abrirRota(pedido) {
  const url =
    "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" +
    encodeURIComponent(montarDestino(pedido));

  Linking.openURL(url).catch(() =>
    Alert.alert("Rei do Rango", "Não foi possível abrir o mapa.")
  );
}

function formatarDistancia(km) {
  if (km === null || km === undefined) {
    return "—";
  }

  return String(km).replace(".", ",") + "Km";
}

export default function EntregasScreen({ entregador, onAbrirPedido, onSair }) {
  const [pedidos, setPedidos] = useState([]);
  const [selecionado, setSelecionado] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const sairRef = useRef(onSair);
  sairRef.current = onSair;

  const aceitandoRef = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/entregas/disponiveis`, {
        headers: {
          Authorization: `Bearer ${entregador.token}`,
        },
      });

      if (resposta.status === 401 || resposta.status === 403) {
        Alert.alert("Rei do Rango", "Sua sessão expirou. Entre novamente.");
        sairRef.current();
        return;
      }

      const dados = await lerRespostaJson(resposta);

      if (!resposta.ok) {
        setErro(
          dados.message ||
            `Não foi possível buscar os pedidos (HTTP ${resposta.status}).`
        );
        return;
      }

      const lista = Array.isArray(dados) ? dados : dados.pedidos || [];

      setPedidos(lista);
      setErro("");

      // Se o pedido selecionado foi pego por outro entregador, limpa a seleção
      setSelecionado((atual) =>
        atual && lista.some((p) => p.id_pedido === atual)
          ? atual
          : null
      );
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      setErro(
        error.message && error.message.startsWith("A API")
          ? error.message
          : "Não foi possível conectar com o servidor."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [entregador.token]);

  useEffect(() => {
    carregar();

    const timer = setInterval(carregar, INTERVALO_ATUALIZACAO);

    return () => clearInterval(timer);
  }, [carregar]);

  function puxarParaAtualizar() {
    setAtualizando(true);
    carregar();
  }

  async function aceitarEAbrirRota(pedido) {
    if (aceitandoRef.current) return;
    aceitandoRef.current = true;

    try {
      const resposta = await fetch(
        `${API_URL}/entregas/${pedido.id_pedido}/aceitar`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${entregador.token}`,
          },
        }
      );

      if (resposta.status === 401 || resposta.status === 403) {
        Alert.alert("Rei do Rango", "Sua sessão expirou. Entre novamente.");
        sairRef.current();
        return;
      }

      const dados = await lerRespostaJson(resposta);

      if (!resposta.ok) {
        Alert.alert(
          "Rei do Rango",
          dados.message || "Não foi possível aceitar este pedido."
        );
        carregar();
        return;
      }

      // Já aceitou: vai para os detalhes com os botões de rota e de concluir
      onAbrirPedido(pedido, true);
      abrirRota(pedido);
    } catch (error) {
      console.error("Erro ao aceitar pedido:", error);
      Alert.alert(
        "Rei do Rango",
        error.message || "Não foi possível conectar com o servidor."
      );
    } finally {
      aceitandoRef.current = false;
    }
  }

  function tocarPedido(pedido) {
    setSelecionado(pedido.id_pedido);

    Alert.alert(
      numeroPedido(pedido.id_pedido),
      `Entregar em:\n${montarDestino(pedido)}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceitar e abrir rota",
          onPress: () => aceitarEAbrirRota(pedido),
        },
      ]
    );
  }

  function verDetalhes() {
    const pedido = pedidos.find((p) => p.id_pedido === selecionado);

    if (pedido) {
      onAbrirPedido(pedido);
    }
  }

  function renderPedido({ item }) {
    const ativo = item.id_pedido === selecionado;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, ativo && styles.cardAtivo]}
        onPress={() => tocarPedido(item)}
      >
        <View style={styles.cardTextos}>
          <Text style={styles.nome} numberOfLines={1}>
            {item.cliente_nome || "Cliente"}
          </Text>

          <Text style={styles.numero}>{numeroPedido(item.id_pedido)}</Text>
        </View>

        <View style={styles.distancia}>
          <Text style={styles.distanciaTexto}>
            {formatarDistancia(item.distancia_km)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <CabecalhoEntregador titulo="Pedidos disponíveis" onVoltar={onSair} />

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={RED} />
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => String(item.id_pedido)}
          renderItem={renderPedido}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={puxarParaAtualizar}
              colors={[RED]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.vazio}>
              {erro || "Nenhum pedido disponível no momento."}
            </Text>
          }
        />
      )}

      <View style={styles.rodape}>
        <TouchableOpacity
          style={[styles.botao, !selecionado && styles.botaoDesativado]}
          onPress={verDetalhes}
          disabled={!selecionado}
        >
          <Text style={styles.botaoTexto}>Ver detalhes do pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  lista: {
    flexGrow: 1,
    padding: 14,
  },

  vazio: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
    fontSize: 13,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#e5e5e5",
    borderRadius: 14,
    marginBottom: 10,
    minHeight: 80,
    overflow: "hidden",
  },

  cardAtivo: {
    backgroundColor: "#b9b0b0",
  },

  cardTextos: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  nome: {
    fontSize: 13,
    color: "#222",
  },

  numero: {
    fontSize: 12,
    color: "#222",
  },

  distancia: {
    width: 70,
    backgroundColor: RED,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },

  distanciaTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  rodape: {
    padding: 14,
  },

  botao: {
    height: 47,
    borderRadius: 25,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
  },

  botaoDesativado: {
    opacity: 0.5,
  },

  botaoTexto: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
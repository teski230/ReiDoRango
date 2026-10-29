import React, { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";

import CabecalhoEntregador from "../components/cabecalho";

const RED = "#ff3131";

// Android Emulator
const API_URL = "http://10.0.2.2:3000";

function numeroPedido(id) {
  return "#" + String(id).padStart(4, "0");
}

function horario(data) {
  const d = new Date(data);

  if (isNaN(d.getTime())) {
    return null;
  }

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  return `${hh}:${mm}`;
}

function dinheiro(valor) {
  const n = Number(valor);

  if (isNaN(n)) {
    return null;
  }

  return "R$ " + n.toFixed(2).replace(".", ",");
}

function textoItens(itens) {
  if (!itens) {
    return null;
  }

  if (typeof itens === "string") {
    return itens;
  }

  if (Array.isArray(itens)) {
    return itens
      .map((i) =>
        typeof i === "string"
          ? i
          : `${i.quantidade ? i.quantidade + "x " : ""}${i.nome || ""}`
      )
      .join("\n");
  }

  return null;
}

function Campo({ rotulo, valor }) {
  if (!valor) {
    return null;
  }

  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

export default function DetalhesEntregaScreen({
  entregador,
  pedido,
  jaEmRota,
  onVoltar,
  onConcluida,
}) {
  const [emRota, setEmRota] = useState(jaEmRota);
  const [enviando, setEnviando] = useState(false);

  const cabecalhos = {
    Authorization: `Bearer ${entregador.token}`,
  };

  function abrirMapa() {
    const destino = encodeURIComponent(pedido.endereco_completo);

    const url =
      `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Rei do Rango",
        "Não foi possível abrir o Google Maps neste aparelho."
      );
    });
  }

  async function entregar() {
    try {
      setEnviando(true);

      const resposta = await fetch(
        `${API_URL}/entregas/${pedido.id_pedido}/aceitar`,
        { method: "PUT", headers: cabecalhos }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        Alert.alert(
          "Rei do Rango",
          dados.message || "Não foi possível aceitar esta entrega.",
          [{ text: "OK", onPress: onVoltar }]
        );
        return;
      }

      setEmRota(true);
      abrirMapa();
    } catch (error) {
      console.error("Erro ao aceitar entrega:", error);

      Alert.alert(
        "Erro de conexão",
        "Não foi possível conectar com o servidor."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function concluir() {
    try {
      setEnviando(true);

      const resposta = await fetch(
        `${API_URL}/entregas/${pedido.id_pedido}/concluir`,
        { method: "PUT", headers: cabecalhos }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        Alert.alert(
          "Rei do Rango",
          dados.message || "Não foi possível concluir a entrega."
        );
        return;
      }

      Alert.alert(
        "Entrega concluída!",
        "Pedido finalizado com sucesso. Agora você verá os próximos pedidos disponíveis para entrega.",
        [{ text: "OK", onPress: onConcluida }]
      );
    } catch (error) {
      console.error("Erro ao concluir entrega:", error);

      Alert.alert(
        "Erro de conexão",
        "Não foi possível conectar com o servidor."
      );
    } finally {
      setEnviando(false);
    }
  }

  const observacoes = pedido.observacoes || pedido.observacao;

  const pagamento = pedido.forma_pagamento
    ? pedido.troco_para
      ? `${pedido.forma_pagamento} (troco para ${dinheiro(pedido.troco_para)})`
      : pedido.forma_pagamento
    : null;

  return (
    <View style={styles.screen}>
      <CabecalhoEntregador
        titulo="Detalhes do pedido"
        onVoltar={emRota ? null : onVoltar}
      />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.card}>
          <Campo rotulo="Nome do Cliente:" valor={pedido.cliente_nome} />
          <Campo rotulo="ID do Pedido:" valor={numeroPedido(pedido.id_pedido)} />
          <Campo rotulo="Horário:" valor={horario(pedido.data_pedido)} />
          <Campo rotulo="Endereço de entrega:" valor={pedido.endereco} />
          <Campo rotulo="Complemento:" valor={pedido.complemento} />
          <Campo rotulo="Telefone:" valor={pedido.telefone} />
          <Campo rotulo="Pagamento:" valor={pagamento} />
          <Campo rotulo="Valor:" valor={dinheiro(pedido.valor)} />
          <Campo rotulo="Pedido:" valor={textoItens(pedido.itens)} />
          <Campo rotulo="Observações do Pedido:" valor={observacoes} />
        </View>
      </ScrollView>

      <View style={styles.rodape}>
        {!emRota ? (
          <TouchableOpacity
            style={[styles.botao, enviando && styles.botaoDesativado]}
            onPress={entregar}
            disabled={enviando}
          >
            <Text style={styles.botaoTexto}>
              {enviando ? "Aguarde..." : "Entregar"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.botao, styles.botaoContorno]}
              onPress={abrirMapa}
              disabled={enviando}
            >
              <Text style={[styles.botaoTexto, styles.botaoContornoTexto]}>
                Abrir rota no Google Maps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botao,
                styles.botaoSegundo,
                enviando && styles.botaoDesativado,
              ]}
              onPress={concluir}
              disabled={enviando}
            >
              <Text style={styles.botaoTexto}>
                {enviando ? "Aguarde..." : "Confirmar entrega concluída"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  conteudo: {
    padding: 16,
  },

  card: {
    backgroundColor: "#e5e5e5",
    borderRadius: 14,
    padding: 16,
  },

  campo: {
    marginBottom: 10,
  },

  rotulo: {
    fontSize: 12,
    color: "#666",
  },

  valor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    marginTop: 2,
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

  botaoSegundo: {
    marginTop: 10,
  },

  botaoContorno: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: RED,
  },

  botaoDesativado: {
    opacity: 0.6,
  },

  botaoTexto: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  botaoContornoTexto: {
    color: RED,
  },
});
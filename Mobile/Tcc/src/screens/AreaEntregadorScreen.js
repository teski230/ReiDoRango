import React, { useState, useEffect } from "react";

import { View, ActivityIndicator } from "react-native";

import EntregasScreen from "./EntregasScreen";
import DetalhesEntregaScreen from "./DetalhesScreen";

const RED = "#ff3131";

// Android Emulator
const API_URL = "http://10.0.2.2:3000";

/*
  Área do entregador: controla qual tela aparece (lista ou detalhes).

  Props:
    entregador: dados do login (precisa ter o token)
    onSair: chamado quando o entregador sai da área
*/
export default function AreaEntregador({ entregador, onSair }) {
  const [pedido, setPedido] = useState(null);
  const [emRota, setEmRota] = useState(false);
  const [verificando, setVerificando] = useState(true);

  // Se o entregador fechou o app no meio de uma entrega, retoma de onde parou
  useEffect(() => {
    async function buscarEmAndamento() {
      try {
        const resposta = await fetch(`${API_URL}/entregas/em-andamento`, {
          headers: {
            Authorization: `Bearer ${entregador.token}`,
          },
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.pedido) {
          setPedido(dados.pedido);
          setEmRota(true);
        }
      } catch (error) {
        console.error("Erro ao verificar entrega em andamento:", error);
      } finally {
        setVerificando(false);
      }
    }

    buscarEmAndamento();
  }, [entregador.token]);

  function voltarParaLista() {
    setPedido(null);
    setEmRota(false);
  }

  if (verificando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  if (pedido) {
    return (
      <DetalhesEntregaScreen
        entregador={entregador}
        pedido={pedido}
        jaEmRota={emRota}
        onVoltar={voltarParaLista}
        onConcluida={voltarParaLista}
      />
    );
  }

  return (
    <EntregasScreen
      entregador={entregador}
      onAbrirPedido={(p, jaAceito) => {
        setPedido(p);
        setEmRota(!!jaAceito);
      }}
      onSair={onSair}
    />
  );
}

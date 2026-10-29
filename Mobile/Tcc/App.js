import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

import {
  SafeAreaView,
  SafeAreaProvider,
} from "react-native-safe-area-context";

import LoginScreen from "./src/screens/LoginScreen";
import CadastroScreen from "./src/screens/CadastroScreen";
import CardapioScreen from "./src/screens/CardapioScreen";
import AreaEntregador from "./src/screens/AreaEntregadorScreen";

export default function App() {
  const [tela, setTela] = useState("login");
  const [usuario, setUsuario] = useState(null);

  function loginSucesso(dadosUsuario) {
    setUsuario(dadosUsuario);

    if (dadosUsuario.tipo === "entregador") {
      setTela("entregas");
    } else {
      setTela("cardapio");
    }
  }

  function sair() {
    setUsuario(null);
    setTela("login");
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        {tela === "login" && (
          <LoginScreen
            onCadastro={() => setTela("cadastro")}
            onLoginSucesso={loginSucesso}
          />
        )}

        {tela === "cadastro" && (
          <CadastroScreen
            onEntrar={() => setTela("login")}
          />
        )}

        {tela === "cardapio" && (
          <CardapioScreen
            cliente={usuario}
            onVoltar={sair}
          />
        )}

        {tela === "entregas" && (
          <AreaEntregador
            entregador={usuario}
            onSair={sair}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
import React, { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";

import Logo from "../components/Logo";
import TopSwitch from "../components/TopSwitch";
import RoleSwitch from "../components/RoleSwitch";
import Input from "../components/Input";

const RED = "#ff3131";
const CARD = "#eee9e9";

// Android Emulator
const API_URL = "http://10.0.2.2:3000";

export default function LoginScreen({
  onCadastro,
  onLoginSucesso,
}) {
  const [tipo, setTipo] = useState("entrar");
  const [role, setRole] = useState("cliente");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [entrando, setEntrando] = useState(false);

  // Status do entregador: null | "pendente" | "rejeitado"
  const [statusEntregador, setStatusEntregador] = useState(null);
  const [mensagemStatus, setMensagemStatus] = useState("");

  function trocarRole(valor) {
    setRole(valor);
    setStatusEntregador(null);
    setMensagemStatus("");
  }

  async function entrar() {
    if (!email.trim() || !senha.trim()) {
      Alert.alert(
        "Rei do Rango",
        "Preencha email e senha."
      );
      return;
    }

    setStatusEntregador(null);
    setMensagemStatus("");

    const rota =
      role === "entregador" ? "/entregadores/login" : "/login";

    try {
      setEntrando(true);

      const resposta = await fetch(`${API_URL}${rota}`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim(),
          senha: senha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        // O servidor usa "mensagem" no login e "message" em outras rotas
        const texto =
          dados.mensagem ||
          dados.message ||
          "Email ou senha incorretos.";

        // Entregador com cadastro pendente ou rejeitado
        if (role === "entregador" && resposta.status === 403) {
          const rejeitado =
            dados.status === "rejeitado" ||
            texto.toLowerCase().includes("rejeitado");

          setStatusEntregador(rejeitado ? "rejeitado" : "pendente");
          setMensagemStatus(texto);
          return;
        }

        Alert.alert("Login", texto);
        return;
      }

      console.log("Dados recebidos no login:", dados);

      /*
        A API devolve { success, token, user }.
        Juntamos o token ao usuário para o resto do app poder usar.
      */
      const usuario = dados.user || dados.cliente || dados.usuario || dados;

      const logado = {
        ...usuario,
        token: dados.token,
        tipo: role,
      };

      if (onLoginSucesso) {
        onLoginSucesso(logado);
      }

    } catch (error) {
      console.error("Erro no login:", error);

      Alert.alert(
        "Erro de conexão",
        "Não foi possível conectar com a API. Verifique se o servidor está funcionando."
      );
    } finally {
      setEntrando(false);
    }
  }

  function mudarTela(valor) {
    setTipo(valor);

    if (valor === "cadastrar") {
      onCadastro();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Logo />

        <View style={styles.card}>
          <TopSwitch
            active={tipo}
            onChange={mudarTela}
          />

          <RoleSwitch
            role={role}
            onChange={trocarRole}
          />

          <View style={styles.form}>
            <Input
              label="Email / Nome de usuário"
              placeholder="Digite seu email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Senha"
              placeholder="Digite sua senha"
              secureTextEntry={true}
              value={senha}
              onChangeText={setSenha}
            />

            {statusEntregador === "pendente" && (
              <View style={[styles.statusBox, styles.statusPendente]}>
                <Text style={[styles.statusTitulo, styles.textoPendente]}>
                  Cadastro em análise
                </Text>
                <Text style={[styles.statusTexto, styles.textoPendente]}>
                  {mensagemStatus}
                </Text>
              </View>
            )}

            {statusEntregador === "rejeitado" && (
              <View style={[styles.statusBox, styles.statusRejeitado]}>
                <Text style={[styles.statusTitulo, styles.textoRejeitado]}>
                  Cadastro não aprovado
                </Text>
                <Text style={[styles.statusTexto, styles.textoRejeitado]}>
                  {mensagemStatus}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                entrando && styles.buttonDisabled,
              ]}
              onPress={entrar}
              disabled={entrando}
            >
              <Text style={styles.buttonText}>
                {entrando
                  ? "Entrando..."
                  : statusEntregador === "pendente"
                  ? "Verificar status"
                  : "Entrar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 25,
  },

  card: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 10,
    paddingBottom: 18,
  },

  form: {
    paddingHorizontal: 1,
    paddingTop: 20,
  },

  statusBox: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },

  statusPendente: {
    backgroundColor: "#fff3cd",
  },

  statusRejeitado: {
    backgroundColor: "#f8d7da",
  },

  statusTitulo: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },

  statusTexto: {
    fontSize: 12,
  },

  textoPendente: {
    color: "#856404",
  },

  textoRejeitado: {
    color: "#842029",
  },

  button: {
    height: 47,
    borderRadius: 25,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
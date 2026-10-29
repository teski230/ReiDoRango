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

export default function CadastroScreen({ onEntrar, onCadastroSucesso }) {
  const [tipo, setTipo] = useState("cadastrar");
  const [role, setRole] = useState("cliente");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // Campos do entregador
  const [cnh, setCnh] = useState("");
  const [telefone, setTelefone] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [placa, setPlaca] = useState("");

  const [cadastrando, setCadastrando] = useState(false);

  async function confirmar() {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      Alert.alert(
        "Rei do Rango",
        "Preencha nome, email e senha."
      );
      return;
    }

    if (
      role === "entregador" &&
      (!cnh.trim() || !telefone.trim() || !veiculo.trim() || !placa.trim())
    ) {
      Alert.alert(
        "Rei do Rango",
        "Preencha CNH, telefone, veículo e placa."
      );
      return;
    }

    try {
      setCadastrando(true);

      const corpo = {
        nome: nome.trim(),
        email: email.trim(),
        senha: senha,
      };

      if (role === "entregador") {
        // O servidor espera "CNH" em maiúsculo
        corpo.CNH = cnh.trim();
        corpo.telefone = telefone.trim();
        corpo.veiculo = veiculo.trim();
        corpo.placa = placa.trim().toUpperCase();
      }

      const rota =
        role === "entregador" ? "/entregadores/solicitar" : "/cadastro";

      const resposta = await fetch(`${API_URL}${rota}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        Alert.alert(
          "Erro no cadastro",
          dados.message || "Não foi possível realizar o cadastro."
        );
        return;
      }

      Alert.alert(
        "Cadastro realizado!",
        role === "entregador"
          ? "Seu cadastro foi enviado e está aguardando a aprovação do administrador."
          : "Seu cadastro foi realizado com sucesso.",
        [
          {
            text: "Continuar",
            onPress: () => {
              if (onCadastroSucesso) {
                onCadastroSucesso();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Erro no cadastro:", error);

      Alert.alert(
        "Erro de conexão",
        "Não foi possível conectar com a API. Verifique se o servidor está funcionando."
      );
    } finally {
      setCadastrando(false);
    }
  }

  function mudarTela(valor) {
    setTipo(valor);

    if (valor === "entrar") {
      onEntrar();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            onChange={setRole}
          />

          <View style={styles.form}>

            <Input
              label="Nome Completo"
              placeholder="Digite seu nome"
              value={nome}
              onChangeText={setNome}
            />

            <Input
              label="Email"
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

            {role === "entregador" && (
              <>
                <Input
                  label="CNH"
                  placeholder="Digite sua CNH"
                  keyboardType="numeric"
                  value={cnh}
                  onChangeText={setCnh}
                />

                <Input
                  label="Telefone"
                  placeholder="Digite seu telefone"
                  keyboardType="phone-pad"
                  value={telefone}
                  onChangeText={setTelefone}
                />

                <Input
                  label="Veículo"
                  placeholder="Ex: Honda CG 160"
                  value={veiculo}
                  onChangeText={setVeiculo}
                />

                <Input
                  label="Placa"
                  placeholder="Ex: ABC1D23"
                  autoCapitalize="characters"
                  value={placa}
                  onChangeText={setPlaca}
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                cadastrando && styles.buttonDisabled,
              ]}
              onPress={confirmar}
              disabled={cadastrando}
            >
              <Text style={styles.buttonText}>
                {cadastrando ? "Cadastrando..." : "Cadastrar"}
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
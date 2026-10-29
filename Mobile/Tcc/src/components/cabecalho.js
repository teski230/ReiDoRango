import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

const RED = "#ff3131";

export default function CabecalhoEntregador({ titulo, onVoltar }) {
  return (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View style={styles.esquerda}>
        {onVoltar && (
          <TouchableOpacity
            onPress={onVoltar}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
        )}

        <Text style={styles.titulo}>{titulo}</Text>
      </View>

      <Image
        source={require("../../assets/LogoB.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: RED,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },

  esquerda: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  titulo: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 14,
  },

  logo: {
    width: 54,
    height: 54,
    
  },
});

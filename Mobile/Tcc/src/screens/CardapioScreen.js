import React, { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

const LOGO = require("../../assets/LogoB.png");

const RED = "#ff3131";
const CARD = "#eee9e9";
const TEXT = "#222";

const API_URL = "http://10.0.2.2:3000";

const CATEGORIAS = [
  { id: 0, nome: "Todos" },
  { id: 1, nome: "Hambúrguer" },
  { id: 2, nome: "Frango" },
  { id: 3, nome: "Bebidas" },
  { id: 4, nome: "Sobremesas" },
];

const ADICIONAIS = [
  { id: 1, nome: "Bacon", preco: 0 },
  { id: 2, nome: "Queijo", preco: 0 },
  { id: 3, nome: "Maionese", preco: 0 },
  { id: 4, nome: "Cebola", preco: 0 },
];

const CATEGORIAS_COM_ADICIONAIS = [1, 2];

const LIMITE_COMENTARIO = 140;


const TAXA_ENTREGA = 5;

// Converte número/null/undefined em string, para poder usar .trim() sem erro
function texto(valor) {
  return valor === null || valor === undefined ? "" : String(valor);
}

function obterToken(cliente) {
  return cliente?.token || cliente?.accessToken || cliente?.access_token || null;
}

// Lê a resposta da API sem quebrar se o servidor devolver HTML/vazio
async function lerRespostaJson(resposta) {
  const conteudo = await resposta.text();
  if (!conteudo) return {};
  try {
    return JSON.parse(conteudo);
  } catch {
    throw new Error(
      `A API retornou uma resposta inválida (HTTP ${resposta.status}). Confira o terminal do backend.`
    );
  }
}

export default function CardapioScreen({
  cliente,
  onVoltar,
}) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [aba, setAba] = useState("cardapio");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(0);

  const [carrinho, setCarrinho] = useState([]);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [produtoModal, setProdutoModal] = useState(null);
  const [editandoUid, setEditandoUid] = useState(null);
  const [qtdModal, setQtdModal] = useState(1);
  const [adicionaisModal, setAdicionaisModal] = useState([]);
  const [comentarioModal, setComentarioModal] = useState("");
  // =========================
  // FINALIZAÇÃO DO PEDIDO
  // =========================

  const [checkoutVisivel, setCheckoutVisivel] = useState(false);
  const [finalizandoPedido, setFinalizandoPedido] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [trocoPara, setTrocoPara] = useState("");

  // Modal de pedido confirmado
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
  const animEscala = useRef(new Animated.Value(0.8)).current;
  const animOpacidade = useRef(new Animated.Value(0)).current;
  const animCheck = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pedidoConfirmado) return;

    animEscala.setValue(0.8);
    animOpacidade.setValue(0);
    animCheck.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(animEscala, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(animOpacidade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.spring(animCheck, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [pedidoConfirmado]);

  const [enderecoPedido, setEnderecoPedido] = useState({
    rua: "",
    numero: "",
    bairro: "",
    cep: "",
    complemento: "",
    telefone: "",
  });

  


  // =========================
  // PERFIL
  // =========================

  
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const [perfil, setPerfil] = useState({
    id_cliente: "",
    nome: "",
    email: "",
    telefone: "",
    bairro: "",
    rua: "",
    N_casa: "",
    foto: "",
  });

  const [perfilOriginal, setPerfilOriginal] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  // =========================
  // MEUS PEDIDOS
  // =========================

  const [pedidosVisivel, setPedidosVisivel] = useState(false);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    if (cliente) {
      const dados = {
        id_cliente: texto(cliente.id_cliente || cliente.id),
        nome: texto(cliente.nome),
        email: texto(cliente.email),
        telefone: texto(cliente.telefone),
        bairro: texto(cliente.bairro),
        rua: texto(cliente.rua),
        N_casa: texto(cliente.N_casa || cliente.n_casa),
        foto: texto(cliente.foto),
      };

      setPerfil(dados);
      setPerfilOriginal(dados);
    }
  }, [cliente]);

  // O login só devolve id, nome e email; o resto do perfil vem de GET /clientes/:id
  useEffect(() => {
    const idCliente = cliente?.id_cliente || cliente?.id;
    const token = obterToken(cliente);

    if (!idCliente || !token) return;

    let ativo = true;

    async function carregarPerfil() {
      try {
        const resposta = await fetch(`${API_URL}/clientes/${idCliente}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const dados = await lerRespostaJson(resposta);

        if (!resposta.ok || !ativo) return;

        const completo = {
          id_cliente: texto(dados.id_cliente || idCliente),
          nome: texto(dados.nome),
          email: texto(dados.email),
          telefone: texto(dados.telefone),
          bairro: texto(dados.bairro),
          rua: texto(dados.rua),
          N_casa: texto(dados.N_casa),
          foto: texto(dados.foto),
        };

        setPerfil(completo);
        setPerfilOriginal(completo);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    }

    carregarPerfil();

    return () => {
      ativo = false;
    };
  }, [cliente]);

  // Preenche o endereço do checkout com os dados do perfil
  useEffect(() => {
    setEnderecoPedido((atual) => ({
      ...atual,
      rua: texto(perfil.rua),
      numero: texto(perfil.N_casa),
      bairro: texto(perfil.bairro),
      telefone: texto(perfil.telefone),
    }));
  }, [perfil.rua, perfil.N_casa, perfil.bairro, perfil.telefone]);

  async function carregarProdutos() {
    try {
      const resposta = await fetch(`${API_URL}/produtos`);

      if (!resposta.ok) {
        throw new Error("Erro ao buscar produtos");
      }

      const dados = await resposta.json();

      setProdutos(
        Array.isArray(dados) ? dados : dados.produtos || []
      );
    } catch (error) {
      console.error(
        "Erro ao carregar produtos:",
        error
      );

      Alert.alert(
        "Rei do Rango",
        "Não foi possível carregar o cardápio."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  function formatarPreco(preco) {
    return Number(preco || 0)
      .toFixed(2)
      .replace(".", ",");
  }

  function urlImagem(item) {
    if (!item || !item.imagem) {
      return null;
    }

    return item.imagem.startsWith("http")
      ? item.imagem
      : `${API_URL}${item.imagem}`;
  }

  function aceitaAdicionais(produto) {
    return (
      !!produto &&
      CATEGORIAS_COM_ADICIONAIS.includes(
        Number(produto.categoria)
      )
    );
  }

  function nomesAdicionais(ids) {
    return ADICIONAIS
      .filter((a) => ids.includes(a.id))
      .map((a) => a.nome);
  }

  function precoUnitario(produto, ids) {
    const extras = ADICIONAIS
      .filter((a) => ids.includes(a.id))
      .reduce(
        (soma, a) =>
          soma + Number(a.preco),
        0
      );

    return (
      Number(produto.preco) + extras
    );
  }

  const produtosFiltrados =
    categoriaSelecionada === 0
      ? produtos
      : produtos.filter(
          (item) =>
            Number(item.categoria) ===
            categoriaSelecionada
        );

  const totalItensCarrinho =
    carrinho.reduce(
      (soma, item) =>
        soma + item.quantidade,
      0
    );

  // =========================
  // MODAL DO PRODUTO
  // =========================

  function abrirModalNovo(produto) {
    setProdutoModal(produto);
    setEditandoUid(null);
    setQtdModal(1);
    setAdicionaisModal([]);
    setComentarioModal("");
    setModalVisivel(true);
  }

  function abrirModalEditar(itemCarrinho) {
    setProdutoModal(
      itemCarrinho.produto
    );

    setEditandoUid(
      itemCarrinho.uid
    );

    setQtdModal(
      itemCarrinho.quantidade
    );

    setAdicionaisModal(
      itemCarrinho.adicionais
    );

    setComentarioModal(
      itemCarrinho.comentario
    );

    setModalVisivel(true);
  }

  function fecharModal() {
    setModalVisivel(false);
  }

  function alternarAdicional(id) {
    setAdicionaisModal((atual) =>
      atual.includes(id)
        ? atual.filter(
            (a) => a !== id
          )
        : [...atual, id]
    );
  }

  function confirmarModal() {
    if (!produtoModal) {
      return;
    }

    if (editandoUid) {
      setCarrinho((atual) =>
        atual.map((item) =>
          item.uid === editandoUid
            ? {
                ...item,
                quantidade:
                  qtdModal,
                adicionais:
                  adicionaisModal,
                comentario:
                  comentarioModal.trim(),
              }
            : item
        )
      );
    } else {
      const novoItem = {
        uid: `${Date.now()}-${Math.random()}`,
        produto: produtoModal,
        quantidade: qtdModal,
        adicionais:
          adicionaisModal,
        comentario:
          comentarioModal.trim(),
      };

      setCarrinho((atual) => [
        ...atual,
        novoItem,
      ]);
    }

    fecharModal();
  }

  // =========================
  // CARRINHO
  // =========================

  function removerDoCarrinho(uid) {
    setCarrinho((atual) =>
      atual.filter(
        (item) => item.uid !== uid
      )
    );
  }

  function removerDoModal() {
    removerDoCarrinho(editandoUid);
    fecharModal();
  }

  function alterarQuantidadeCarrinho(
    uid,
    delta
  ) {
    setCarrinho((atual) =>
      atual.map((item) =>
        item.uid === uid
          ? {
              ...item,
              quantidade: Math.max(
                1,
                item.quantidade + delta
              ),
            }
          : item
      )
    );
  }

  // =========================
  // PRODUTO
  // =========================

  function renderProduto({ item }) {
    const imagem = urlImagem(item);

    return (
      <TouchableOpacity
        style={styles.produto}
        activeOpacity={0.9}
        onPress={() =>
          abrirModalNovo(item)
        }
      >
        {imagem ? (
          <Image
            source={{ uri: imagem }}
            style={styles.imagem}
          />
        ) : (
          <View
            style={styles.semImagem}
          >
            <Text
              style={
                styles.semImagemTexto
              }
            >
              🍔
            </Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.nome}>
            {item.nome}
          </Text>

          <Text style={styles.descricao}>
            {item.descricao ||
              "Delicioso produto do Rei do Rango"}
          </Text>

          <Text style={styles.preco}>
            R$ {formatarPreco(item.preco)}
          </Text>

          <TouchableOpacity
            style={styles.botao}
            onPress={() =>
              abrirModalNovo(item)
            }
          >
            <Text
              style={styles.botaoTexto}
            >
              Adicionar
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // =========================
  // ITEM CARRINHO
  // =========================

  function renderItemCarrinho({
    item,
  }) {
    const imagem = urlImagem(
      item.produto
    );

    const extras = nomesAdicionais(
      item.adicionais
    );

    const totalItem =
      precoUnitario(
        item.produto,
        item.adicionais
      ) * item.quantidade;

    return (
      <TouchableOpacity
        style={
          styles.itemCarrinho
        }
        activeOpacity={0.9}
        onPress={() =>
          abrirModalEditar(item)
        }
      >
        <View
          style={
            styles.itemCarrinhoTopo
          }
        >
          {imagem ? (
            <Image
              source={{ uri: imagem }}
              style={
                styles.itemCarrinhoImagem
              }
            />
          ) : (
            <View
              style={
                styles.itemCarrinhoSemImagem
              }
            >
              <Text
                style={{
                  fontSize: 26,
                }}
              >
                🍔
              </Text>
            </View>
          )}

          <View
            style={
              styles.itemCarrinhoInfo
            }
          >
            <Text
              style={
                styles.itemCarrinhoNome
              }
            >
              {item.produto.nome}
            </Text>

            {extras.length > 0 && (
              <Text
                style={
                  styles.itemCarrinhoDetalhe
                }
              >
                + {extras.join(", ")}
              </Text>
            )}

            {item.comentario !==
              "" && (
              <Text
                style={
                  styles.itemCarrinhoComentario
                }
              >
                “{item.comentario}”
              </Text>
            )}

            <Text
              style={
                styles.itemCarrinhoEditar
              }
            >
              Toque para editar
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.botaoLixeira
            }
            onPress={() =>
              removerDoCarrinho(
                item.uid
              )
            }
          >
            <Text
              style={
                styles.lixeiraTexto
              }
            >
              🗑
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.itemCarrinhoRodape
          }
        >
          <View
            style={
              styles.stepperPequeno
            }
          >
            <TouchableOpacity
              style={
                styles.stepperBotaoPequeno
              }
              onPress={() =>
                alterarQuantidadeCarrinho(
                  item.uid,
                  -1
                )
              }
            >
              <Text
                style={
                  styles.stepperSinalPequeno
                }
              >
                −
              </Text>
            </TouchableOpacity>

            <Text
              style={
                styles.stepperQtdPequeno
              }
            >
              {item.quantidade}
            </Text>

            <TouchableOpacity
              style={
                styles.stepperBotaoPequeno
              }
              onPress={() =>
                alterarQuantidadeCarrinho(
                  item.uid,
                  1
                )
              }
            >
              <Text
                style={
                  styles.stepperSinalPequeno
                }
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={
              styles.itemCarrinhoPreco
            }
          >
            R${" "}
            {formatarPreco(
              totalItem
            )}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }


  
  function alterarEnderecoPedido(campo, valor) {
  setEnderecoPedido((atual) => ({
    ...atual,
    [campo]: valor,
  }));
}

function abrirCheckout() {
  if (carrinho.length === 0) {
    Alert.alert("Carrinho vazio", "Adicione produtos antes de finalizar.");
    return;
  }

  setCheckoutVisivel(true);
}

async function finalizarPedido() {
  if (finalizandoPedido) return;

  const rua = texto(enderecoPedido.rua).trim();
  const numero = texto(enderecoPedido.numero).trim();
  const bairro = texto(enderecoPedido.bairro).trim();
  const cep = texto(enderecoPedido.cep).trim();
  const complemento = texto(enderecoPedido.complemento).trim();
  const telefone = texto(enderecoPedido.telefone).trim();

  if (!carrinho.length) {
    Alert.alert("Carrinho vazio", "Adicione um produto antes de finalizar.");
    return;
  }

  if (!rua || !numero || !bairro) {
    Alert.alert(
      "Endereço incompleto",
      "Preencha a rua, o número e o bairro para continuar."
    );
    return;
  }

  const totalProdutos = carrinho.reduce(
    (soma, item) =>
      soma +
      precoUnitario(item.produto, item.adicionais) *
        item.quantidade,
    0
  );

  const totalPedido = totalProdutos + TAXA_ENTREGA;

  let valorTroco = null;

  if (formaPagamento === "dinheiro") {
    if (!texto(trocoPara).trim()) {
      Alert.alert(
        "Troco",
        "Informe o valor para o qual precisa de troco."
      );
      return;
    }

    valorTroco = Number(texto(trocoPara).trim().replace(",", "."));

    if (!Number.isFinite(valorTroco)) {
      Alert.alert(
        "Valor inválido",
        "Digite um valor numérico para o troco. Ex.: 50,00"
      );
      return;
    }

    if (valorTroco < totalPedido) {
      Alert.alert(
        "Valor inválido",
        `O total com a entrega é R$ ${formatarPreco(totalPedido)}. O valor para troco precisa ser igual ou maior.`
      );
      return;
    }
  }

  // O backend exige autenticação.
  const token = obterToken(cliente);

  if (!token) {
    Alert.alert(
      "Sessão não encontrada",
      "Não encontrei o token de login. É necessário usar o token retornado pela API ao fazer login para registrar o pedido."
    );
    return;
  }

  const itensPedido = carrinho.map((item) => ({
    id_produto:
      item.produto.id_produto || item.produto.id,
    quantidade: item.quantidade,

    // O backend recebe os adicionais como objetos.
    adicionais: ADICIONAIS
      .filter((adicional) =>
        item.adicionais.includes(adicional.id)
      )
      .map((adicional) => ({
        id: adicional.id,
        nome: adicional.nome,
        preco: Number(adicional.preco),
      })),

    observacao: item.comentario || "",
  }));

  try {
    setFinalizandoPedido(true);

    const resposta = await fetch(`${API_URL}/pedidos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rua,
        numero,
        bairro,
        cep,
        complemento,
        telefone,
        forma_pagamento: formaPagamento,
        troco_para: valorTroco,
        itens: itensPedido,
      }),
    });

    const dados = await lerRespostaJson(resposta);

    if (!resposta.ok) {
      throw new Error(
        dados.message ||
          dados.mensagem ||
          "Não foi possível registrar o pedido."
      );
    }

    setCheckoutVisivel(false);
    setCarrinho([]);
    setTrocoPara("");
    setFormaPagamento("pix");
    setAba("cardapio");

    setPedidoConfirmado({
      numero: dados.id_pedido || dados.id || dados.insertId || null,
      total: totalPedido,
      formaPagamento,
    });
  } catch (erro) {
    console.error("Erro ao finalizar pedido:", erro);

    Alert.alert(
      "Erro ao finalizar",
      erro.message || "Não foi possível conectar ao servidor."
    );
  } finally {
    setFinalizandoPedido(false);
  }
}
  // =========================
  // CARRINHO
  // =========================

  function renderCarrinho() {
    const total =
      carrinho.reduce(
        (soma, item) =>
          soma +
          precoUnitario(
            item.produto,
            item.adicionais
          ) *
            item.quantidade,
        0
      );

    return (
      <View
        style={styles.paginaInterna}
      >
        <Text
          style={styles.tituloInterno}
        >
          Meu Carrinho
        </Text>

        {carrinho.length === 0 ? (
          <View
            style={
              styles.vazioInterno
            }
          >
            <Text
              style={
                styles.iconeGrande
              }
            >
              🛒
            </Text>

            <Text
              style={styles.vazioTitulo}
            >
              Seu carrinho está vazio
            </Text>

            <Text
              style={styles.vazioTexto}
            >
              Adicione alguns produtos
              do nosso cardápio.
            </Text>

            <TouchableOpacity
              style={
                styles.botaoVoltarCardapio
              }
              onPress={() =>
                setAba("cardapio")
              }
            >
              <Text
                style={
                  styles.botaoTexto
                }
              >
                Ver Cardápio
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={carrinho}
              keyExtractor={(item) =>
                item.uid
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.listaCarrinho
              }
              renderItem={
                renderItemCarrinho
              }
            />

            <View
              style={styles.totalBox}
            >
              <Text
                style={styles.totalTexto}
              >
                Total
              </Text>

              <Text
                style={styles.totalValor}
              >
                R$ {formatarPreco(total)}
              </Text>
            </View>

                        
                        <TouchableOpacity
              style={styles.botaoFinalizar}
              onPress={abrirCheckout}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoTexto}>
                Continuar para pagamento
              </Text>
            </TouchableOpacity>

                      </>
                    )}
                  </View>
                );
              }

  // =========================
  // ALTERAR CAMPO DO PERFIL
  // =========================

  function alterarPerfil(
    campo,
    valor
  ) {
    setPerfil((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function iniciarEdicaoPerfil() {
    setPerfilOriginal({
      ...perfil,
    });

    setEditandoPerfil(true);
  }

  function cancelarEdicaoPerfil() {
    if (perfilOriginal) {
      setPerfil({
        ...perfilOriginal,
      });
    }

    setEditandoPerfil(false);
  }

  // =========================
  // FOTO DE PERFIL
  // =========================

  async function escolherFotoPerfil() {
    if (enviandoFoto) return;

    const token = obterToken(cliente);

    if (!token || !perfil.id_cliente) {
      Alert.alert(
        "Faça login novamente",
        "Não foi possível identificar sua conta. Entre novamente para trocar a foto."
      );
      return;
    }

    const permissao =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        "Rei do Rango",
        "Permita o acesso às fotos para escolher uma foto de perfil."
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (resultado.canceled || !resultado.assets?.length) return;

    const imagem = resultado.assets[0];
    const tipo = imagem.mimeType || "image/jpeg";
    const extensao = tipo.split("/")[1] || "jpg";

    const formulario = new FormData();
    formulario.append("foto", {
      uri: imagem.uri,
      name: imagem.fileName || `perfil-${perfil.id_cliente}.${extensao}`,
      type: tipo,
    });

    try {
      setEnviandoFoto(true);

      const resposta = await fetch(
        `${API_URL}/clientes/${perfil.id_cliente}/foto`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formulario,
        }
      );

      const dados = await lerRespostaJson(resposta);

      if (!resposta.ok) {
        throw new Error(
          dados.message ||
            dados.mensagem ||
            `Não foi possível enviar a foto (HTTP ${resposta.status}).`
        );
      }

      setPerfil((atual) => ({ ...atual, foto: texto(dados.foto) }));
      setPerfilOriginal((atual) =>
        atual ? { ...atual, foto: texto(dados.foto) } : atual
      );
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      Alert.alert(
        "Foto de perfil",
        error.message || "Não foi possível conectar ao servidor."
      );
    } finally {
      setEnviandoFoto(false);
    }
  }

  // =========================
  // SALVAR PERFIL
  // =========================

  
async function salvarPerfil() {
  if (salvandoPerfil) return;

  const dadosPerfil = {
    nome: texto(perfil.nome).trim(),
    email: texto(perfil.email).trim(),
    telefone: texto(perfil.telefone).trim(),
    bairro: texto(perfil.bairro).trim(),
    rua: texto(perfil.rua).trim(),
    N_casa: texto(perfil.N_casa).trim(),
  };

  if (!dadosPerfil.nome) {
    Alert.alert("Rei do Rango", "Digite seu nome.");
    return;
  }

  if (!dadosPerfil.email) {
    Alert.alert("Rei do Rango", "Digite seu email.");
    return;
  }

  if (!perfil.id_cliente) {
    Alert.alert(
      "Erro",
      "Não foi possível identificar o cliente. Saia da conta e entre novamente."
    );
    return;
  }

  const token = obterToken(cliente);

  if (!token) {
    Alert.alert(
      "Erro de autenticação",
      "O token de acesso não foi encontrado. Saia da conta e entre novamente."
    );
    return;
  }

  try {
    setSalvandoPerfil(true);

    const resposta = await fetch(
      `${API_URL}/clientes/${perfil.id_cliente}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(dadosPerfil),
      }
    );

    // Evita quebrar se o servidor devolver HTML em vez de JSON.
    const texto = await resposta.text();
    let dados = {};

    try {
      dados = texto ? JSON.parse(texto) : {};
    } catch {
      throw new Error(
        `A API devolveu uma resposta inválida (HTTP ${resposta.status}). Verifique se a rota PUT /clientes/:id existe e se o backend está rodando.`
      );
    }

    if (!resposta.ok) {
      throw new Error(
        dados.message ||
        dados.mensagem ||
        `Falha ao salvar o perfil (HTTP ${resposta.status}).`
      );
    }

    const perfilAtualizado = { ...perfil, ...dadosPerfil };

    setPerfil(perfilAtualizado);
    setPerfilOriginal(perfilAtualizado);
    setEditandoPerfil(false);

    Alert.alert(
      "Rei do Rango",
      "Seus dados foram atualizados com sucesso!"
    );
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);

    Alert.alert(
      "Erro ao salvar perfil",
      error.message ||
      "Não foi possível salvar as alterações."
    );
  } finally {
    setSalvandoPerfil(false);
  }
}


  // =========================
  // PERFIL
  // =========================

  function renderCampoPerfil(
    label,
    campo,
    placeholder,
    keyboardType = "default"
  ) {
    return (
      <View
        style={styles.campoPerfil}
      >
        <Text
          style={
            styles.labelPerfil
          }
        >
          {label}
        </Text>

        <TextInput
          style={
            styles.inputPerfil
          }
          value={String(
            perfil[campo] || ""
          )}
          onChangeText={(valor) =>
            alterarPerfil(
              campo,
              valor
            )
          }
          placeholder={
            placeholder
          }
          placeholderTextColor="#999"
          keyboardType={
            keyboardType
          }
          editable={
            editandoPerfil
          }
          autoCapitalize={
            campo === "email"
              ? "none"
              : "sentences"
          }
        />
      </View>
    );
  }

  function renderPerfil() {
    return (
      <ScrollView
        style={styles.perfilScroll}
        contentContainerStyle={
          styles.perfilConteudo
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text
          style={styles.tituloInterno}
        >
          Meu Perfil
        </Text>

        <View
          style={styles.perfilCard}
        >
          <TouchableOpacity
            style={styles.avatar}
            onPress={escolherFotoPerfil}
            disabled={enviandoFoto}
            activeOpacity={0.8}
          >
            {enviandoFoto ? (
              <ActivityIndicator color="#fff" />
            ) : perfil.foto ? (
              <Image
                source={{ uri: urlImagem({ imagem: perfil.foto }) }}
                style={styles.avatarImagem}
              />
            ) : (
              <Text
                style={
                  styles.avatarTexto
                }
              >
                👤
              </Text>
            )}
          </TouchableOpacity>

          {!editandoPerfil && (
            <>
              <Text
                style={styles.perfilNome}
              >
                {perfil.nome ||
                  "Cliente"}
              </Text>

              <Text
                style={
                  styles.perfilEmail
                }
              >
                {perfil.email ||
                  "Email não informado"}
              </Text>
            </>
          )}

          {editandoPerfil ? (
            <View
              style={
                styles.formPerfil
              }
            >
              <Text
                style={
                  styles.tituloDados
                }
              >
                Editar meus dados
              </Text>

              {renderCampoPerfil(
                "Nome",
                "nome",
                "Digite seu nome"
              )}

              {renderCampoPerfil(
                "Email",
                "email",
                "Digite seu email",
                "email-address"
              )}

              {renderCampoPerfil(
                "Telefone",
                "telefone",
                "Digite seu telefone",
                "phone-pad"
              )}

              {renderCampoPerfil(
                "Bairro",
                "bairro",
                "Digite seu bairro"
              )}

              {renderCampoPerfil(
                "Rua",
                "rua",
                "Digite sua rua"
              )}

              {renderCampoPerfil(
                "Número da casa",
                "N_casa",
                "Digite o número",
                "numeric"
              )}

              <View
                style={
                  styles.botoesPerfil
                }
              >
                <TouchableOpacity
                  style={
                    styles.botaoCancelar
                  }
                  onPress={
                    cancelarEdicaoPerfil
                  }
                  disabled={
                    salvandoPerfil
                  }
                >
                  <Text
                    style={
                      styles.textoCancelar
                    }
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.botaoSalvar
                  }
                  onPress={
                    salvarPerfil
                  }
                  disabled={
                    salvandoPerfil
                  }
                >
                  <Text
                    style={
                      styles.textoSalvar
                    }
                  >
                    {salvandoPerfil
                      ? "Salvando..."
                      : "Salvar alterações"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View
                style={
                  styles.dadosPerfil
                }
              >
                <Text
                  style={
                    styles.tituloDados
                  }
                >
                  Meus dados
                </Text>

                <View
                  style={
                    styles.linhaDado
                  }
                >
                  <Text
                    style={
                      styles.iconeDado
                    }
                  >
                    📱
                  </Text>

                  <View
                    style={
                      styles.textosDado
                    }
                  >
                    <Text
                      style={
                        styles.labelDado
                      }
                    >
                      Telefone
                    </Text>

                    <Text
                      style={
                        styles.valorDado
                      }
                    >
                      {perfil.telefone ||
                        "Não informado"}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.linhaDado
                  }
                >
                  <Text
                    style={
                      styles.iconeDado
                    }
                  >
                    📍
                  </Text>

                  <View
                    style={
                      styles.textosDado
                    }
                  >
                    <Text
                      style={
                        styles.labelDado
                      }
                    >
                      Endereço
                    </Text>

                    <Text
                      style={
                        styles.valorDado
                      }
                    >
                      {perfil.rua ||
                        "Rua não informada"}
                      {perfil.N_casa
                        ? `, ${perfil.N_casa}`
                        : ""}
                    </Text>

                    <Text
                      style={
                        styles.valorDadoSecundario
                      }
                    >
                      {perfil.bairro ||
                        "Bairro não informado"}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={
                  styles.opcaoPerfil
                }
                onPress={
                  iniciarEdicaoPerfil
                }
              >
                <Text
                  style={
                    styles.opcaoTexto
                  }
                >
                  ✏️  Editar perfil
                </Text>

                <Text
                  style={styles.seta}
                >
                  ›
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.opcaoPerfil
                }
                onPress={abrirMeusPedidos}
              >
                <Text
                  style={
                    styles.opcaoTexto
                  }
                >
                  📋  Meus pedidos
                </Text>

                <Text
                  style={styles.seta}
                >
                  ›
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {!editandoPerfil && (
          <TouchableOpacity
            style={
              styles.botaoSair
            }
            onPress={() => {
              Alert.alert(
                "Sair da conta",
                "Deseja realmente sair?",
                [
                  {
                    text: "Cancelar",
                    style: "cancel",
                  },
                  {
                    text: "Sair",
                    onPress: () => {
                      if (onVoltar) {
                        onVoltar();
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text
              style={
                styles.textoSair
              }
            >
              Sair da conta
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // =========================
  // MEUS PEDIDOS
  // =========================

  async function abrirMeusPedidos() {
    const token = obterToken(cliente);

    if (!token) {
      Alert.alert(
        "Faça login novamente",
        "Não foi possível identificar sua conta. Entre novamente para ver seus pedidos."
      );
      return;
    }

    if (!perfil.id_cliente) {
      Alert.alert(
        "Faça login novamente",
        "Não foi possível identificar sua conta. Entre novamente para ver seus pedidos."
      );
      return;
    }

    setPedidos([]);
    setPedidosVisivel(true);

    try {
      setCarregandoPedidos(true);

      const resposta = await fetch(`${API_URL}/pedidos/cliente/${perfil.id_cliente}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const dados = await lerRespostaJson(resposta);

      if (!resposta.ok) {
        throw new Error(
          dados.message ||
            dados.mensagem ||
            `Não foi possível carregar seus pedidos (HTTP ${resposta.status}).`
        );
      }

      const lista = Array.isArray(dados) ? dados : dados.pedidos || [];
      setPedidos(lista);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      setPedidosVisivel(false);
      Alert.alert(
        "Meus pedidos",
        error.message || "Não foi possível conectar ao servidor."
      );
    } finally {
      setCarregandoPedidos(false);
    }
  }

  function formatarData(valor) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return texto(valor);
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderMeusPedidos() {
    return (
      <Modal
        visible={pedidosVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setPedidosVisivel(false)}
      >
        <View style={styles.checkoutFundo}>
          <View style={styles.checkoutCard}>
            <View style={styles.checkoutCabecalho}>
              <View>
                <Text style={styles.checkoutTitulo}>
                  Meus pedidos
                </Text>
                <Text style={styles.checkoutSubtitulo}>
                  Histórico dos seus pedidos
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setPedidosVisivel(false)}
                style={styles.checkoutFechar}
              >
                <Text style={styles.checkoutFecharTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            {carregandoPedidos ? (
              <ActivityIndicator
                size="large"
                color={RED}
                style={{ marginVertical: 30 }}
              />
            ) : pedidos.length === 0 ? (
              <Text style={styles.vazioTexto}>
                Você ainda não fez nenhum pedido.
              </Text>
            ) : (
              <FlatList
                data={pedidos}
                keyExtractor={(pedido, index) =>
                  String(pedido.id_pedido || pedido.id || index)
                }
                showsVerticalScrollIndicator={false}
                renderItem={({ item: pedido }) => (
                  <View style={styles.checkoutResumo}>
                    <View style={styles.checkoutLinhaResumo}>
                      <Text style={styles.checkoutTotalTexto}>
                        Pedido nº {pedido.id_pedido || pedido.id}
                      </Text>
                      <Text style={styles.checkoutTotalValor}>
                        R${" "}
                        {formatarPreco(
                          pedido.valor ??
                            pedido.valor_total ??
                            pedido.total
                        )}
                      </Text>
                    </View>

                    {!!(pedido.data_pedido || pedido.criado_em || pedido.created_at || pedido.data) && (
                      <View style={styles.checkoutLinhaResumo}>
                        <Text style={styles.checkoutResumoTexto}>Data</Text>
                        <Text style={styles.checkoutResumoValor}>
                          {formatarData(
                            pedido.data_pedido ||
                              pedido.criado_em ||
                              pedido.created_at ||
                              pedido.data
                          )}
                        </Text>
                      </View>
                    )}

                    {!!pedido.status && (
                      <View style={styles.checkoutLinhaResumo}>
                        <Text style={styles.checkoutResumoTexto}>Status</Text>
                        <Text style={styles.checkoutResumoValor}>
                          {pedido.status}
                        </Text>
                      </View>
                    )}

                    {!!pedido.forma_pagamento && (
                      <View style={styles.checkoutLinhaResumo}>
                        <Text style={styles.checkoutResumoTexto}>Pagamento</Text>
                        <Text style={styles.checkoutResumoValor}>
                          {pedido.forma_pagamento}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // =========================
  // MODAL PRODUTO
  // =========================

  function renderModal() {
    if (!produtoModal) {
      return null;
    }

    const imagem =
      urlImagem(produtoModal);

    const totalModal =
      precoUnitario(
        produtoModal,
        adicionaisModal
      ) * qtdModal;

    return (
      <Modal
        visible={modalVisivel}
        animationType="slide"
        onRequestClose={
          fecharModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalContainer
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: 20,
            }}
          >
            {imagem ? (
              <Image
                source={{
                  uri: imagem,
                }}
                style={
                  styles.modalImagem
                }
              />
            ) : (
              <View
                style={
                  styles.modalSemImagem
                }
              >
                <Text
                  style={{
                    fontSize: 70,
                  }}
                >
                  🍔
                </Text>
              </View>
            )}

            <View
              style={
                styles.modalConteudo
              }
            >
              <Text
                style={
                  styles.modalNome
                }
              >
                {produtoModal.nome}
              </Text>

              <Text
                style={
                  styles.modalDescricao
                }
              >
                {produtoModal.descricao ||
                  "Delicioso produto do Rei do Rango"}
              </Text>

              <Text
                style={
                  styles.modalPreco
                }
              >
                R${" "}
                {formatarPreco(
                  produtoModal.preco
                )}
              </Text>

              {aceitaAdicionais(
                produtoModal
              ) && (
                <>
                  <View
                    style={
                      styles.adicionaisTitulo
                    }
                  >
                    <Text
                      style={
                        styles.adicionaisTituloTexto
                      }
                    >
                      Deseja adicionar algum ingrediente?
                    </Text>

                    <Text
                      style={
                        styles.adicionaisSubtitulo
                      }
                    >
                      Escolha os adicionais que quiser.
                    </Text>
                  </View>

                  {ADICIONAIS.map(
                    (adicional) => {
                      const marcado =
                        adicionaisModal.includes(
                          adicional.id
                        );

                      return (
                        <TouchableOpacity
                          key={
                            adicional.id
                          }
                          style={
                            styles.adicionalLinha
                          }
                          onPress={() =>
                            alternarAdicional(
                              adicional.id
                            )
                          }
                        >
                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={
                                styles.adicionalNome
                              }
                            >
                              {
                                adicional.nome
                              }
                            </Text>

                            <Text
                              style={
                                styles.adicionalDescricao
                              }
                            >
                              Adicionar{" "}
                              {adicional.nome.toLowerCase()}
                              {adicional.preco >
                              0
                                ? ` (+ R$ ${formatarPreco(
                                    adicional.preco
                                  )})`
                                : ""}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.adicionalSinal,
                              marcado &&
                                styles.adicionalSinalAtivo,
                            ]}
                          >
                            <Text
                              style={[
                                styles.adicionalSinalTexto,
                                marcado &&
                                  styles.adicionalSinalTextoAtivo,
                              ]}
                            >
                              {marcado
                                ? "✓"
                                : "+"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </>
              )}

              <View
                style={
                  styles.comentarioTopo
                }
              >
                <Text
                  style={
                    styles.comentarioTitulo
                  }
                >
                  Algum comentário?
                </Text>

                <Text
                  style={
                    styles.comentarioContador
                  }
                >
                  {
                    comentarioModal.length
                  }{" "}
                  / {LIMITE_COMENTARIO}
                </Text>
              </View>

              <TextInput
                style={
                  styles.comentarioInput
                }
                placeholder="Ex: tirar cebola, maionese à parte etc."
                placeholderTextColor="#999"
                multiline
                maxLength={
                  LIMITE_COMENTARIO
                }
                value={
                  comentarioModal
                }
                onChangeText={
                  setComentarioModal
                }
                textAlignVertical="top"
              />

              {editandoUid && (
                <TouchableOpacity
                  style={
                    styles.botaoRemoverModal
                  }
                  onPress={
                    removerDoModal
                  }
                >
                  <Text
                    style={
                      styles.botaoRemoverModalTexto
                    }
                  >
                    🗑  Remover do carrinho
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={
              styles.modalFechar
            }
            onPress={
              fecharModal
            }
          >
            <Text
              style={
                styles.modalFecharTexto
              }
            >
              ✕
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.modalRodape
            }
          >
            <View
              style={styles.stepper}
            >
              <TouchableOpacity
                style={
                  styles.stepperBotao
                }
                onPress={() =>
                  setQtdModal(
                    (q) =>
                      Math.max(
                        1,
                        q - 1
                      )
                  )
                }
              >
                <Text
                  style={
                    styles.stepperSinal
                  }
                >
                  −
                </Text>
              </TouchableOpacity>

              <Text
                style={
                  styles.stepperQtd
                }
              >
                {qtdModal}
              </Text>

              <TouchableOpacity
                style={
                  styles.stepperBotao
                }
                onPress={() =>
                  setQtdModal(
                    (q) => q + 1
                  )
                }
              >
                <Text
                  style={
                    styles.stepperSinal
                  }
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={
                styles.botaoConfirmar
              }
              onPress={
                confirmarModal
              }
            >
              <Text
                style={
                  styles.botaoConfirmarTexto
                }
              >
                {editandoUid
                  ? "Salvar"
                  : "Adicionar"}
              </Text>

              <Text
                style={
                  styles.botaoConfirmarTexto
                }
              >
                R${" "}
                {formatarPreco(
                  totalModal
                )}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // =========================
  // CARREGANDO
  // =========================

  if (carregando) {
    return (
      <View
        style={styles.carregando}
      >
        <ActivityIndicator
          size="large"
          color={RED}
        />

        <Text
          style={
            styles.carregandoTexto
          }
        >
          Carregando cardápio...
        </Text>
      </View>
    );
  }

  // =========================
  // TELA
  // =========================

  return (
    <View
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={
            styles.botaoVoltar
          }
          onPress={() => {
            if (onVoltar) {
              onVoltar();
            }
          }}
        >
          <Text
            style={
              styles.voltarTexto
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerTextos
          }
        >
          <Text
            style={styles.titulo}
          >
            Rei do Rango
          </Text>

          <Text
            style={
              styles.subtitulo
            }
          >
            Nosso Cardápio
          </Text>
        </View>

        <View
          style={
            styles.configuracao
          }
        >
          <Image
            source={LOGO}
            style={styles.configLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {aba === "cardapio" && (
        <View
          style={
            styles.categoriasBox
          }
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            style={
              styles.categoriasScroll
            }
            contentContainerStyle={
              styles.categoriasContent
            }
          >
            {CATEGORIAS.map(
              (cat) => {
                const ativa =
                  categoriaSelecionada ===
                  cat.id;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      ativa &&
                        styles.chipAtivo,
                    ]}
                    onPress={() =>
                      setCategoriaSelecionada(
                        cat.id
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.chipTexto,
                        ativa &&
                          styles.chipTextoAtivo,
                      ]}
                    >
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>
        </View>
      )}

      {aba === "cardapio" && (
        <>
          {produtosFiltrados.length ===
          0 ? (
            <View
              style={styles.vazio}
            >
              <Text
                style={
                  styles.vazioTitulo
                }
              >
                Nenhum produto encontrado
              </Text>

              <Text
                style={
                  styles.vazioTexto
                }
              >
                {produtos.length ===
                0
                  ? "Cadastre produtos pelo painel administrativo."
                  : "Não há produtos nesta categoria no momento."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={
                produtosFiltrados
              }
              keyExtractor={(item) =>
                String(
                  item.id_produto
                )
              }
              renderItem={
                renderProduto
              }
              contentContainerStyle={
                styles.lista
              }
              showsVerticalScrollIndicator={
                false
              }
            />
          )}
        </>
      )}

      {aba === "carrinho" &&
        renderCarrinho()}

      {aba === "perfil" &&
        renderPerfil()}

        <Modal
  visible={checkoutVisivel}
  animationType="slide"
  transparent
  onRequestClose={() => setCheckoutVisivel(false)}
>
  <KeyboardAvoidingView
    style={styles.checkoutFundo}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
  >
    <View style={styles.checkoutCard}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.checkoutCabecalho}>
          <View>
            <Text style={styles.checkoutTitulo}>
              Finalizar pedido
            </Text>
            <Text style={styles.checkoutSubtitulo}>
              Confira os dados da entrega
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setCheckoutVisivel(false)}
            style={styles.checkoutFechar}
          >
            <Text style={styles.checkoutFecharTexto}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.checkoutSecao}>
          📍 Endereço de entrega
        </Text>

        {[
          ["rua", "Rua", "Nome da rua"],
          ["numero", "Número", "Número da casa"],
          ["bairro", "Bairro", "Seu bairro"],
          ["cep", "CEP", "00000-000"],
          ["complemento", "Complemento", "Apartamento, referência (opcional)"],
          ["telefone", "Telefone", "Seu telefone"],
        ].map(([campo, rotulo, placeholder]) => (
          <View key={campo} style={styles.checkoutCampo}>
            <Text style={styles.checkoutLabel}>{rotulo}</Text>

            <TextInput
              style={styles.checkoutInput}
              value={enderecoPedido[campo]}
              onChangeText={(valor) =>
                alterarEnderecoPedido(campo, valor)
              }
              placeholder={placeholder}
              placeholderTextColor="#999"
              keyboardType={
                campo === "numero" || campo === "telefone"
                  ? "phone-pad"
                  : "default"
              }
              autoCapitalize="sentences"
            />
          </View>
        ))}

        <Text style={styles.checkoutSecao}>
          💳 Forma de pagamento
        </Text>

        {[
          ["pix", "Pix", "Pagamento fictício via Pix"],
          ["cartao", "Cartão", "Pagamento fictício via cartão"],
          ["dinheiro", "Dinheiro", "Pagar na entrega"],
        ].map(([valor, titulo, descricao]) => (
          <TouchableOpacity
            key={valor}
            style={[
              styles.checkoutPagamento,
              formaPagamento === valor &&
                styles.checkoutPagamentoSelecionado,
            ]}
            onPress={() => setFormaPagamento(valor)}
            activeOpacity={0.8}
          >
            <View style={styles.checkoutRadio}>
              {formaPagamento === valor && (
                <View style={styles.checkoutRadioDentro} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.checkoutPagamentoTitulo}>
                {titulo}
              </Text>
              <Text style={styles.checkoutPagamentoDescricao}>
                {descricao}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {formaPagamento === "dinheiro" && (
          <View style={styles.checkoutCampo}>
            <Text style={styles.checkoutLabel}>
              Troco para quanto?
            </Text>

            <TextInput
              style={styles.checkoutInput}
              value={trocoPara}
              onChangeText={setTrocoPara}
              placeholder="Ex.: 50,00"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>
        )}

        <View style={styles.checkoutResumo}>
          <View style={styles.checkoutLinhaResumo}>
            <Text style={styles.checkoutResumoTexto}>
              Produtos
            </Text>
            <Text style={styles.checkoutResumoValor}>
              R${" "}
              {formatarPreco(
                carrinho.reduce(
                  (soma, item) =>
                    soma +
                    precoUnitario(
                      item.produto,
                      item.adicionais
                    ) * item.quantidade,
                  0
                )
              )}
            </Text>
          </View>

          <View style={styles.checkoutLinhaResumo}>
            <Text style={styles.checkoutResumoTexto}>
              Taxa de entrega
            </Text>
            <Text style={styles.checkoutResumoValor}>
              R$ {formatarPreco(TAXA_ENTREGA)}
            </Text>
          </View>

          <View style={styles.checkoutDivisor} />

          <View style={styles.checkoutLinhaResumo}>
            <Text style={styles.checkoutTotalTexto}>
              Total
            </Text>
            <Text style={styles.checkoutTotalValor}>
              R${" "}
              {formatarPreco(
                carrinho.reduce(
                  (soma, item) =>
                    soma +
                    precoUnitario(
                      item.produto,
                      item.adicionais
                    ) * item.quantidade,
                  0
                ) + TAXA_ENTREGA
              )}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutBotaoConfirmar,
            finalizandoPedido && { opacity: 0.6 },
          ]}
          onPress={finalizarPedido}
          disabled={finalizandoPedido}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBotaoTexto}>
            {finalizandoPedido
              ? "Registrando pedido..."
              : "Confirmar pedido"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkoutBotaoCancelar}
          onPress={() => setCheckoutVisivel(false)}
          disabled={finalizandoPedido}
        >
          <Text style={styles.checkoutCancelarTexto}>
            Voltar ao carrinho
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>

      <Modal
        visible={!!pedidoConfirmado}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPedidoConfirmado(null)}
      >
        <View style={styles.sucessoFundo}>
          <Animated.View
            style={[
              styles.sucessoCard,
              { opacity: animOpacidade, transform: [{ scale: animEscala }] },
            ]}
          >
            <View style={styles.sucessoTopo}>
              <Animated.View
                style={[styles.sucessoCirculo, { transform: [{ scale: animCheck }] }]}
              >
                <Text style={styles.sucessoCheck}>✓</Text>
              </Animated.View>
            </View>

            <View style={styles.sucessoCorpo}>
              <Text style={styles.sucessoTitulo}>Pedido confirmado!</Text>
              <Text style={styles.sucessoSubtitulo}>
                Recebemos seu pedido e ele já vai para a cozinha 🍔
              </Text>

              <View style={styles.sucessoResumo}>
                {pedidoConfirmado?.numero ? (
                  <View style={styles.sucessoLinha}>
                    <Text style={styles.sucessoRotulo}>Pedido</Text>
                    <Text style={styles.sucessoValor}>#{pedidoConfirmado.numero}</Text>
                  </View>
                ) : null}

                <View style={styles.sucessoLinha}>
                  <Text style={styles.sucessoRotulo}>Pagamento</Text>
                  <Text style={styles.sucessoValor}>
                    {pedidoConfirmado?.formaPagamento === "pix"
                      ? "Pix"
                      : pedidoConfirmado?.formaPagamento === "cartao"
                      ? "Cartão"
                      : "Dinheiro"}
                  </Text>
                </View>

                <View style={[styles.sucessoLinha, styles.sucessoLinhaTotal]}>
                  <Text style={styles.sucessoRotuloTotal}>Total</Text>
                  <Text style={styles.sucessoValorTotal}>
                    R$ {formatarPreco(pedidoConfirmado?.total)}
                  </Text>
                </View>
              </View>

              <View style={styles.sucessoAviso}>
                <Text style={styles.sucessoAvisoTexto}>
                  ℹ️ Pagamento fictício — nenhuma cobrança foi realizada.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sucessoBotao}
                activeOpacity={0.85}
                onPress={() => setPedidoConfirmado(null)}
              >
                <Text style={styles.sucessoBotaoTexto}>Continuar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sucessoBotaoSecundario}
                onPress={() => {
                  setPedidoConfirmado(null);
                  abrirMeusPedidos();
                }}
              >
                <Text style={styles.sucessoBotaoSecundarioTexto}>
                  Ver meus pedidos
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>



      <View
        style={
          styles.menuInferior
        }
      >
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            setAba("cardapio")
          }
        >
          <Text
            style={[
              styles.menuIcone,
              aba === "cardapio" &&
                styles.menuAtivo,
            ]}
          >
            🏠
          </Text>

          <Text
            style={[
              styles.menuTexto,
              aba === "cardapio" &&
                styles.menuAtivo,
            ]}
          >
            Cardápio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            setAba("carrinho")
          }
        >
          <View>
            <Text
              style={[
                styles.menuIcone,
                aba === "carrinho" &&
                  styles.menuAtivo,
              ]}
            >
              🛒
            </Text>

            {totalItensCarrinho >
              0 && (
              <View
                style={
                  styles.badge
                }
              >
                <Text
                  style={
                    styles.badgeTexto
                  }
                >
                  {
                    totalItensCarrinho
                  }
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[
              styles.menuTexto,
              aba === "carrinho" &&
                styles.menuAtivo,
            ]}
          >
            Carrinho
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            setAba("perfil")
          }
        >
          <Text
            style={[
              styles.menuIcone,
              aba === "perfil" &&
                styles.menuAtivo,
            ]}
          >
            👤
          </Text>

          <Text
            style={[
              styles.menuTexto,
              aba === "perfil" &&
                styles.menuAtivo,
            ]}
          >
            Perfil
          </Text>
        </TouchableOpacity>
      </View>

      {renderModal()}

      {renderMeusPedidos()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    backgroundColor: RED,
    paddingTop: 42,
    paddingBottom: 18,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  botaoVoltar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(0,0,0,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  voltarTexto: {
    color: "#fff",
    fontSize: 35,
    lineHeight: 38,
    marginTop: -4,
  },

  headerTextos: {
    flex: 1,
    marginLeft: 12,
  },

  titulo: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "800",
  },

  subtitulo: {
    color: "#fff",
    fontSize: 14,
    marginTop: 2,
  },

  configuracao: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(0,0,0,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  configTexto: {
    color: "#fff",
    fontSize: 21,
  },

  configLogo: {
    width: 42,
    height: 42,
  },

  categoriasBox: {
    paddingTop: 14,
  },

  categoriasScroll: {
    flexGrow: 0,
  },

  categoriasContent: {
    paddingHorizontal: 15,
    alignItems: "center",
  },

  chip: {
    paddingHorizontal: 18,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: RED,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  chipAtivo: {
    backgroundColor: RED,
  },

  chipTexto: {
    color: RED,
    fontSize: 14,
    fontWeight: "700",
  },

  chipTextoAtivo: {
    color: "#fff",
  },

  lista: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 95,
  },

  produto: {
    backgroundColor: CARD,
    borderRadius: 19,
    marginBottom: 16,
    overflow: "hidden",
  },

  imagem: {
    width: "100%",
    height: 175,
    resizeMode: "cover",
  },

  semImagem: {
    width: "100%",
    height: 175,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },

  semImagemTexto: {
    fontSize: 55,
  },

  info: {
    padding: 14,
  },

  nome: {
    fontSize: 21,
    fontWeight: "800",
    color: TEXT,
  },

  descricao: {
    fontSize: 13,
    color: "#666",
    marginTop: 5,
    marginBottom: 10,
    lineHeight: 18,
  },

  preco: {
    fontSize: 19,
    fontWeight: "800",
    color: RED,
    marginBottom: 12,
  },

  botao: {
    backgroundColor: RED,
    height: 43,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  botaoTexto: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  menuInferior: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 5,
  },

  menuItem: {
    width: "33.33%",
    height: 65,
    alignItems: "center",
    justifyContent: "center",
  },

  menuIcone: {
    fontSize: 23,
    marginBottom: 3,
  },

  menuTexto: {
    fontSize: 11,
    color: "#777",
    fontWeight: "600",
  },

  menuAtivo: {
    color: RED,
    fontWeight: "800",
  },

  badge: {
    position: "absolute",
    right: -9,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },

  badgeTexto: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  paginaInterna: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 85,
  },

  tituloInterno: {
    fontSize: 25,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 15,
  },

  listaCarrinho: {
    paddingBottom: 10,
  },

  itemCarrinho: {
    backgroundColor: CARD,
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
  },

  itemCarrinhoTopo: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  itemCarrinhoImagem: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },

  itemCarrinhoSemImagem: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },

  itemCarrinhoInfo: {
    flex: 1,
    marginLeft: 12,
  },

  itemCarrinhoNome: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },

  itemCarrinhoDetalhe: {
    fontSize: 12,
    color: "#555",
    marginTop: 3,
  },

  itemCarrinhoComentario: {
    fontSize: 12,
    color: "#777",
    fontStyle: "italic",
    marginTop: 3,
  },

  itemCarrinhoEditar: {
    fontSize: 11,
    color: RED,
    fontWeight: "700",
    marginTop: 5,
  },

  botaoLixeira: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  lixeiraTexto: {
    fontSize: 17,
  },

  itemCarrinhoRodape: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  itemCarrinhoPreco: {
    color: RED,
    fontSize: 17,
    fontWeight: "800",
  },

  stepperPequeno: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
  },

  stepperBotaoPequeno: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  stepperSinalPequeno: {
    color: RED,
    fontSize: 22,
    fontWeight: "700",
  },

  stepperQtdPequeno: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },

  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 15,
    marginTop: 5,
  },

  totalTexto: {
    fontSize: 18,
    fontWeight: "700",
  },

  totalValor: {
    fontSize: 21,
    fontWeight: "800",
    color: RED,
  },

  botaoFinalizar: {
    backgroundColor: RED,
    height: 48,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  // =========================
  // PERFIL
  // =========================

  perfilScroll: {
    flex: 1,
  },

  perfilConteudo: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 110,
  },

  perfilCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarTexto: {
    fontSize: 36,
  },

  avatarImagem: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },

  perfilNome: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
    marginTop: 12,
  },

  perfilEmail: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
    marginBottom: 18,
  },

  dadosPerfil: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
  },

  tituloDados: {
    width: "100%",
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 10,
  },

  linhaDado: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  iconeDado: {
    fontSize: 22,
    width: 38,
  },

  textosDado: {
    flex: 1,
  },

  labelDado: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },

  valorDado: {
    fontSize: 14,
    color: TEXT,
    fontWeight: "600",
  },

  valorDadoSecundario: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  opcaoPerfil: {
    width: "100%",
    height: 52,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  opcaoTexto: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
  },

  seta: {
    fontSize: 25,
    color: "#777",
  },

  formPerfil: {
    width: "100%",
    marginTop: 18,
  },

  campoPerfil: {
    width: "100%",
    marginBottom: 12,
  },

  labelPerfil: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginBottom: 5,
  },

  inputPerfil: {
    width: "100%",
    height: 46,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: TEXT,
  },

  botoesPerfil: {
    width: "100%",
    flexDirection: "row",
    marginTop: 8,
  },

  botaoCancelar: {
    flex: 1,
    height: 47,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: RED,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  textoCancelar: {
    color: RED,
    fontSize: 13,
    fontWeight: "800",
  },

  botaoSalvar: {
    flex: 1.5,
    height: 47,
    borderRadius: 24,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  textoSalvar: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  botaoSair: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: RED,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },

  textoSair: {
    color: RED,
    fontSize: 14,
    fontWeight: "800",
  },

  // =========================
  // MODAL
  // =========================

  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },

  modalImagem: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },

  modalSemImagem: {
    width: "100%",
    height: 250,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },

  modalFechar: {
    position: "absolute",
    top: 40,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  modalFecharTexto: {
    fontSize: 18,
    color: "#555",
    fontWeight: "700",
  },

  modalConteudo: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  modalNome: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT,
  },

  modalDescricao: {
    fontSize: 14,
    color: "#777",
    marginTop: 6,
  },

  modalPreco: {
    fontSize: 25,
    fontWeight: "800",
    color: RED,
    marginTop: 14,
    marginBottom: 16,
  },

  adicionaisTitulo: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },

  adicionaisTituloTexto: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },

  adicionaisSubtitulo: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  adicionalLinha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  adicionalNome: {
    fontSize: 15,
    fontWeight: "700",
    color: "#444",
  },

  adicionalDescricao: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },

  adicionalSinal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  adicionalSinalAtivo: {
    backgroundColor: RED,
  },

  adicionalSinalTexto: {
    fontSize: 26,
    color: RED,
    lineHeight: 28,
  },

  adicionalSinalTextoAtivo: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  comentarioTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 8,
  },

  comentarioTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#444",
  },

  comentarioContador: {
    fontSize: 12,
    color: "#888",
  },

  comentarioInput: {
    height: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: TEXT,
  },

  botaoRemoverModal: {
    marginTop: 18,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: RED,
    justifyContent: "center",
    alignItems: "center",
  },

  botaoRemoverModalTexto: {
    color: RED,
    fontSize: 14,
    fontWeight: "800",
  },

  modalRodape: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginRight: 12,
  },

  stepperBotao: {
    width: 40,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },

  stepperSinal: {
    color: RED,
    fontSize: 26,
    fontWeight: "700",
  },

  stepperQtd: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
  },

  botaoConfirmar: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: RED,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  botaoConfirmarTexto: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  // =========================
  // VAZIO / CARREGANDO
  // =========================

  vazioInterno: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  iconeGrande: {
    fontSize: 55,
    marginBottom: 15,
  },

  vazioTitulo: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT,
    textAlign: "center",
  },

  vazioTexto: {
    marginTop: 8,
    color: "#666",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },

  botaoVoltarCardapio: {
    backgroundColor: RED,
    height: 45,
    borderRadius: 23,
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  carregando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  carregandoTexto: {
    marginTop: 12,
    fontSize: 16,
    color: "#444",
  },

  vazio: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  // CHECKOUT
checkoutFundo: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "flex-end",
},

checkoutCard: {
  backgroundColor: "#fff",
  borderTopLeftRadius: 26,
  borderTopRightRadius: 26,
  paddingHorizontal: 22,
  paddingTop: 24,
  paddingBottom: 28,
  maxHeight: "94%",
},

checkoutCabecalho: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
},

checkoutTitulo: {
  color: "#222",
  fontSize: 25,
  fontWeight: "bold",
},

checkoutSubtitulo: {
  color: "#777",
  fontSize: 13,
  marginTop: 4,
},

checkoutFechar: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: "#f1f1f1",
  alignItems: "center",
  justifyContent: "center",
},

checkoutFecharTexto: {
  color: "#333",
  fontSize: 18,
  fontWeight: "bold",
},

checkoutSecao: {
  color: "#222",
  fontSize: 17,
  fontWeight: "bold",
  marginTop: 10,
  marginBottom: 14,
},

checkoutCampo: {
  marginBottom: 13,
},

checkoutLabel: {
  fontSize: 13,
  color: "#555",
  fontWeight: "600",
  marginBottom: 6,
},

checkoutInput: {
  backgroundColor: "#f7f7f7",
  borderWidth: 1,
  borderColor: "#e5e5e5",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontSize: 15,
  color: "#222",
},

checkoutPagamento: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#e5e5e5",
  borderRadius: 14,
  padding: 14,
  marginBottom: 10,
  backgroundColor: "#fff",
},

checkoutPagamentoSelecionado: {
  borderColor: "#ff3131",
  backgroundColor: "#fff5f5",
},

checkoutRadio: {
  width: 21,
  height: 21,
  borderRadius: 11,
  borderWidth: 2,
  borderColor: "#aaa",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

checkoutRadioDentro: {
  width: 11,
  height: 11,
  borderRadius: 6,
  backgroundColor: "#ff3131",
},

checkoutPagamentoTitulo: {
  color: "#222",
  fontSize: 15,
  fontWeight: "bold",
},

checkoutPagamentoDescricao: {
  color: "#777",
  fontSize: 12,
  marginTop: 3,
},

checkoutResumo: {
  backgroundColor: "#f7f7f7",
  padding: 16,
  borderRadius: 14,
  marginTop: 16,
  marginBottom: 18,
},

checkoutLinhaResumo: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginVertical: 5,
},

checkoutResumoTexto: {
  color: "#666",
  fontSize: 14,
},

checkoutResumoValor: {
  color: "#333",
  fontSize: 14,
  fontWeight: "600",
},

checkoutDivisor: {
  height: 1,
  backgroundColor: "#ddd",
  marginVertical: 10,
},

checkoutTotalTexto: {
  color: "#222",
  fontSize: 17,
  fontWeight: "bold",
},

checkoutTotalValor: {
  color: "#ff3131",
  fontSize: 21,
  fontWeight: "bold",
},

checkoutBotaoConfirmar: {
  backgroundColor: "#ff3131",
  paddingVertical: 16,
  borderRadius: 14,
  alignItems: "center",
},

checkoutBotaoTexto: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold",
},

checkoutBotaoCancelar: {
  paddingVertical: 15,
  alignItems: "center",
  marginTop: 4,
},

checkoutCancelarTexto: {
  color: "#666",
  fontSize: 14,
  fontWeight: "600",
},

sucessoFundo: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
},

sucessoCard: {
  width: "100%",
  maxWidth: 340,
  backgroundColor: "#fff",
  borderRadius: 24,
  overflow: "hidden",
  elevation: 12,
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
},

sucessoTopo: {
  backgroundColor: "#ff3131",
  alignItems: "center",
  paddingTop: 28,
  paddingBottom: 44,
},

sucessoCirculo: {
  width: 84,
  height: 84,
  borderRadius: 42,
  backgroundColor: "#fff",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 4,
  borderColor: "rgba(255,255,255,0.5)",
  elevation: 6,
},

sucessoCheck: {
  color: "#ff3131",
  fontSize: 46,
  fontWeight: "bold",
  lineHeight: 52,
},

sucessoCorpo: {
  backgroundColor: "#fff",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  marginTop: -24,
  paddingHorizontal: 22,
  paddingTop: 22,
  paddingBottom: 18,
  alignItems: "center",
},

sucessoTitulo: {
  fontSize: 23,
  fontWeight: "bold",
  color: "#222",
  textAlign: "center",
},

sucessoSubtitulo: {
  fontSize: 15,
  color: "#666",
  textAlign: "center",
  marginTop: 6,
  marginBottom: 18,
  lineHeight: 21,
},

sucessoResumo: {
  width: "100%",
  backgroundColor: "#eee9e9",
  borderRadius: 16,
  paddingVertical: 6,
  paddingHorizontal: 16,
  marginBottom: 14,
},

sucessoLinha: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 8,
},

sucessoLinhaTotal: {
  borderTopWidth: 1,
  borderTopColor: "#ddd6d6",
  marginTop: 2,
},

sucessoRotulo: {
  fontSize: 14,
  color: "#666",
},

sucessoValor: {
  fontSize: 14,
  color: "#222",
  fontWeight: "600",
},

sucessoRotuloTotal: {
  fontSize: 16,
  color: "#222",
  fontWeight: "bold",
},

sucessoValorTotal: {
  fontSize: 19,
  color: "#ff3131",
  fontWeight: "bold",
},

sucessoAviso: {
  width: "100%",
  backgroundColor: "#fff5f5",
  borderWidth: 1,
  borderColor: "#ffc9c9",
  borderRadius: 12,
  paddingVertical: 9,
  paddingHorizontal: 12,
  marginBottom: 18,
},

sucessoAvisoTexto: {
  fontSize: 12.5,
  color: "#b71c1c",
  textAlign: "center",
},

sucessoBotao: {
  width: "100%",
  backgroundColor: "#ff3131",
  paddingVertical: 15,
  borderRadius: 14,
  alignItems: "center",
},

sucessoBotaoTexto: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold",
},

sucessoBotaoSecundario: {
  paddingVertical: 12,
  alignItems: "center",
  marginTop: 2,
},

sucessoBotaoSecundarioTexto: {
  color: "#ff3131",
  fontSize: 14,
  fontWeight: "bold",
},

});
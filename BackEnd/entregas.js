// ======================================================
// ÁREA DO ENTREGADOR
// Pedidos disponíveis, aceitar entrega e concluir entrega.
//
// Como usar no servidor (depois de criar o `db` e o `autenticarToken`):
//     require('./entregas')(app, db, autenticarToken);
// ======================================================


// ---------- CONFIGURAÇÃO: PREENCHA AQUI ----------

// Local fixo do estabelecimento (de onde sai a entrega).
// Dica: no Google Maps, clique com o botão direito no local e copie as coordenadas.
const ESTABELECIMENTO = {
    nome: "Rei do Rango",
    latitude: -22.121434618505628,    
    longitude: -51.40519273701929    
};

// Cidade usada para localizar os endereços dos pedidos
const CIDADE_ESTADO = "presidente prudente, SP, Brasil";

// Status em que o pedido aparece para os entregadores
const STATUS_DISPONIVEIS = ["pendente", "confirmado", "preparando"];

// Quantos endereços novos localizar por consulta (o serviço gratuito limita 1 por segundo)
const MAX_LOCALIZACOES_POR_CONSULTA = 5;

// -------------------------------------------------


// ---------- DISTÂNCIA ----------

function distanciaKm(lat1, lon1, lat2, lon2) {

    const R = 6371;
    const rad = (graus) => (graus * Math.PI) / 180;

    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) *
        Math.cos(rad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estabelecimentoDefinido() {
    return (
        ESTABELECIMENTO.latitude !== null &&
        ESTABELECIMENTO.longitude !== null
    );
}


// ---------- LOCALIZAR ENDEREÇO (OpenStreetMap / Nominatim) ----------

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let ultimaConsulta = 0;

const falhouLocalizar = new Set();

async function consultarEndereco(texto) {

    const espera = 1100 - (Date.now() - ultimaConsulta);

    if (espera > 0) {
        await esperar(espera);
    }

    ultimaConsulta = Date.now();

    const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=" +
        encodeURIComponent(texto);

    const resposta = await fetch(url, {
        headers: { "User-Agent": "ReiDoRango-TCC/1.0" }
    });

    if (!resposta.ok) {
        return null;
    }

    const dados = await resposta.json();

    if (!dados.length) {
        return null;
    }

    return {
        latitude: parseFloat(dados[0].lat),
        longitude: parseFloat(dados[0].lon)
    };
}

async function localizarPedido(pedido) {

    const tentativas = [
        `${pedido.rua}, ${pedido.numero}, ${pedido.bairro}, ${CIDADE_ESTADO}`,
        `${pedido.rua}, ${pedido.bairro}, ${CIDADE_ESTADO}`,
        `${pedido.bairro}, ${CIDADE_ESTADO}`
    ];

    for (const texto of tentativas) {

        try {

            const coordenadas = await consultarEndereco(texto);

            if (coordenadas) {
                return coordenadas;
            }

        } catch (error) {

            console.error("Erro ao localizar endereço:", error.message);
            return null;
        }
    }

    return null;
}


// ---------- FORMATAR PEDIDO PARA O APP ----------

function montarPedido(p) {

    let distancia = null;

    if (
        estabelecimentoDefinido() &&
        p.latitude !== null &&
        p.latitude !== undefined &&
        p.longitude !== null &&
        p.longitude !== undefined
    ) {
        distancia =
            Math.round(
                distanciaKm(
                    ESTABELECIMENTO.latitude,
                    ESTABELECIMENTO.longitude,
                    Number(p.latitude),
                    Number(p.longitude)
                ) * 10
            ) / 10;
    }

    return {
        ...p,
        endereco: `${p.bairro} - ${p.rua} ${p.numero}`,
        endereco_completo: `${p.rua}, ${p.numero}, ${p.bairro}, ${CIDADE_ESTADO}`,
        distancia_km: distancia
    };
}


// ---------- ROTAS ----------

module.exports = function registrarRotasEntregas(app, db, autenticarToken) {

    // Só entregador logado pode usar estas rotas
    const apenasEntregador = (req, res, next) => {

        if (req.user.role !== "entregador") {
            return res.status(403).json({
                success: false,
                message: "Acesso restrito a entregadores"
            });
        }

        next();
    };

    async function completarCoordenadas(rows) {

        if (!estabelecimentoDefinido()) {
            return;
        }

        let feitas = 0;

        for (const p of rows) {

            if (p.latitude !== null || falhouLocalizar.has(p.id_pedido)) {
                continue;
            }

            if (feitas >= MAX_LOCALIZACOES_POR_CONSULTA) {
                break;
            }

            feitas++;

            const coordenadas = await localizarPedido(p);

            if (!coordenadas) {
                falhouLocalizar.add(p.id_pedido);
                continue;
            }

            p.latitude = coordenadas.latitude;
            p.longitude = coordenadas.longitude;

            await db.query(
                "UPDATE pedidos SET latitude = ?, longitude = ? WHERE id_pedido = ?",
                [coordenadas.latitude, coordenadas.longitude, p.id_pedido]
            );
        }
    }


    // ==================== PEDIDOS DISPONÍVEIS ====================

    app.get("/entregas/disponiveis", autenticarToken, apenasEntregador, async (req, res) => {

        try {

            const [rows] = await db.query(
                `
                SELECT
                    p.*,
                    c.nome AS cliente_nome
                FROM pedidos p
                LEFT JOIN clientes c
                    ON p.id_cliente = c.id_cliente
                WHERE p.id_entregador IS NULL
                  AND p.status IN (?)
                ORDER BY p.id_pedido ASC
                `,
                [STATUS_DISPONIVEIS]
            );

            await completarCoordenadas(rows);

            res.json({
                success: true,
                pedidos: rows.map(montarPedido)
            });

        } catch (error) {

            console.error("Erro ao listar entregas disponíveis:", error);

            res.status(500).json({
                success: false,
                message: "Erro ao buscar pedidos disponíveis"
            });
        }
    });


    // ==================== ENTREGA EM ANDAMENTO ====================

    app.get("/entregas/em-andamento", autenticarToken, apenasEntregador, async (req, res) => {

        try {

            const [rows] = await db.query(
                `
                SELECT
                    p.*,
                    c.nome AS cliente_nome
                FROM pedidos p
                LEFT JOIN clientes c
                    ON p.id_cliente = c.id_cliente
                WHERE p.id_entregador = ?
                  AND p.status = 'saiu_entrega'
                ORDER BY p.id_pedido DESC
                LIMIT 1
                `,
                [req.user.id]
            );

            res.json({
                success: true,
                pedido: rows.length ? montarPedido(rows[0]) : null
            });

        } catch (error) {

            console.error("Erro ao buscar entrega em andamento:", error);

            res.status(500).json({
                success: false,
                message: "Erro ao buscar entrega em andamento"
            });
        }
    });


    // ==================== ACEITAR ENTREGA ====================

    app.put("/entregas/:id/aceitar", autenticarToken, apenasEntregador, async (req, res) => {

        try {

            const { id } = req.params;

            // O UPDATE só funciona se ninguém pegou o pedido antes
            const [resultado] = await db.query(
                `
                UPDATE pedidos
                SET id_entregador = ?, status = 'saiu_entrega'
                WHERE id_pedido = ?
                  AND id_entregador IS NULL
                  AND status IN (?)
                `,
                [req.user.id, id, STATUS_DISPONIVEIS]
            );

            if (resultado.affectedRows === 0) {

                const [rows] = await db.query(
                    "SELECT id_entregador, status FROM pedidos WHERE id_pedido = ?",
                    [id]
                );

                if (rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Pedido não encontrado"
                    });
                }

                // Se já era dele (toque duplo, por exemplo), segue normalmente
                if (
                    rows[0].id_entregador === req.user.id &&
                    rows[0].status === "saiu_entrega"
                ) {
                    return res.json({
                        success: true,
                        message: "Esta entrega já está com você"
                    });
                }

                return res.status(409).json({
                    success: false,
                    message: "Este pedido não está mais disponível."
                });
            }

            res.json({
                success: true,
                message: "Entrega aceita"
            });

        } catch (error) {

            console.error("Erro ao aceitar entrega:", error);

            res.status(500).json({
                success: false,
                message: "Erro ao aceitar entrega"
            });
        }
    });


    // ==================== CONCLUIR ENTREGA ====================

    app.put("/entregas/:id/concluir", autenticarToken, apenasEntregador, async (req, res) => {

        try {

            const { id } = req.params;

            const [resultado] = await db.query(
                `
                UPDATE pedidos
                SET status = 'entregue'
                WHERE id_pedido = ?
                  AND id_entregador = ?
                  AND status = 'saiu_entrega'
                `,
                [id, req.user.id]
            );

            if (resultado.affectedRows === 0) {
                return res.status(409).json({
                    success: false,
                    message: "Não foi possível concluir esta entrega."
                });
            }

            res.json({
                success: true,
                message: "Entrega concluída"
            });

        } catch (error) {

            console.error("Erro ao concluir entrega:", error);

            res.status(500).json({
                success: false,
                message: "Erro ao concluir entrega"
            });
        }
    });
};
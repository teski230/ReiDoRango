const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const multer = require("multer");

const app = express();
const PORT = 3000;

// Ideal: definir JWT_SECRET como variável de ambiente.
// Enquanto isso, continua usando a chave antiga para não invalidar os tokens atuais.
const api_chave = process.env.JWT_SECRET || "sua_chave_secreta_aqui";

// Nome do papel (role) do administrador no token. Ajuste se o seu for diferente.
const ADMIN_ROLE = "admin";

const TAXA_ENTREGA = 5;

// Valores do front -> valores do ENUM da tabela pedidos
const FORMAS_PAGAMENTO = {
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    cartao: 'Cartão',
    
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {
        const nome = Date.now() + "-" + file.originalname;
        cb(null, nome);
    }
});

const upload = multer({
    storage: storage
});


// ==================== MIDDLEWARES ====================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use("/uploads", express.static("uploads"));


// ==================== CONEXÃO COM BANCO ====================

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tcc',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// ==================== AUTENTICAÇÃO ====================

const autenticarToken = (req, res, next) => {

    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            mensagem: "Token não fornecido"
        });
    }

    jwt.verify(token, api_chave, (err, user) => {

        if (err) {
            return res.status(403).json({
                success: false,
                mensagem: "Token inválido ou expirado"
            });
        }

        req.user = user;

        next();
    });
};

// Restringe uma rota a certos papéis: exigirRole('admin'), exigirRole('entregador')
const exigirRole = (...roles) => (req, res, next) => {

    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Sem permissão para esta ação"
        });
    }

    next();
};


// ==================== LOGIN CLIENTE ====================

app.post("/login", async (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            success: false,
            mensagem: "Email e senha são obrigatórios"
        });
    }

    try {

        const [rows] = await db.query(
            "SELECT * FROM clientes WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                mensagem: "Email não encontrado"
            });
        }

        const user = rows[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            user.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                success: false,
                mensagem: "Senha incorreta"
            });
        }

        const token = jwt.sign(
            {
                id: user.id_cliente,
                email: user.email,
                role: user.role || "user"
            },
            api_chave,
            {
                expiresIn: "24h"
            }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id_cliente,
                nome: user.nome,
                email: user.email
            }
        });

    } catch (error) {

        console.error("Erro no Login:", error);

        res.status(500).json({
            success: false,
            mensagem: "Erro interno no servidor"
        });
    }
});


// ==================== CADASTRO CLIENTE ====================

app.post('/cadastro', async (req, res) => {

    try {

        const {
            nome,
            email,
            senha,
            bairro,
            rua,
            telefone,
            N_casa
        } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                success: false,
                message: "Nome, email e senha são obrigatórios"
            });
        }

        const [existeEmail] = await db.query(
            "SELECT id_cliente FROM clientes WHERE email = ?",
            [email]
        );

        if (existeEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email já cadastrado"
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [resultado] = await db.query(
            `INSERT INTO clientes
            (nome, email, senha, bairro, rua, telefone, N_casa)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                email,
                senhaHash,
                bairro || null,
                rua || null,
                telefone || null,
                N_casa || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Cadastrado com sucesso",
            id: resultado.insertId
        });

    } catch (error) {

        console.error("Erro no cadastro:", error);

        res.status(500).json({
            success: false,
            message: "Erro interno no servidor"
        });
    }
});


// ==================== PRODUTOS ====================

// Listar produtos

app.get('/produtos', async (req, res) => {

    try {

        const [rows] = await db.query(
            'SELECT * FROM produtos ORDER BY id_produto'
        );

        res.json(rows);

    } catch (error) {

        console.error("Erro ao buscar produtos:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao buscar produtos"
        });
    }
});


// Buscar produto por ID

app.get('/produtos/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(
            'SELECT * FROM produtos WHERE id_produto = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Produto não encontrado"
            });
        }

        res.json(rows[0]);

    } catch (error) {

        console.error("Erro ao buscar produto:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao buscar produto"
        });
    }
});


// ==================== ADICIONAR PRODUTO ====================

app.post('/ADCprodutos', autenticarToken, upload.single("imagem"), async (req, res) => {
    try {

        const {
            nome,
            descricao,
            preco,
            categoria
        } = req.body;

        if (!nome || !preco || !categoria) {
            return res.status(400).json({
                success: false,
                message: "Nome, preço e categoria são obrigatórios"
            });
        }

        // Verifica se a categoria existe
        const [categoriaExiste] = await db.query(
            "SELECT id_categoria FROM categorias WHERE id_categoria = ?",
            [categoria]
        );

        if (categoriaExiste.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Categoria não encontrada"
            });
        }

        // Caminho da imagem
        let imagem = null;

        if (req.file) {
            imagem = "/uploads/" + req.file.filename;
        }

        // Cadastra o produto
        const [resultado] = await db.query(
            `INSERT INTO produtos
            (nome, descricao, preco, categoria, imagem)
            VALUES (?, ?, ?, ?, ?)`,
            [
                nome,
                descricao || null,
                preco,
                categoria,
                imagem
            ]
        );

        res.status(201).json({
            success: true,
            message: "Produto adicionado com sucesso",
            id: resultado.insertId,
            imagem: imagem
        });

    } catch (error) {

        console.error("ERRO AO ADICIONAR PRODUTO:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao adicionar produto",
            erro: error.message
        });
    }
});


// ==================== ATUALIZAR PRODUTO ====================

app.put('/ATZprodutos/:id', autenticarToken, async (req, res) => {
    try {

        const { id } = req.params;

        const {
            nome,
            descricao,
            preco,
            categoria,
            imagem
        } = req.body;

        if (!nome || !preco || !categoria) {
            return res.status(400).json({
                success: false,
                message: "Nome, preço e categoria são obrigatórios"
            });
        }

        // Verifica se o produto existe
        const [produto] = await db.query(
            'SELECT id_produto FROM produtos WHERE id_produto = ?',
            [id]
        );

        if (produto.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Produto não encontrado"
            });
        }

        // Verifica a categoria
        const [categoriaExiste] = await db.query(
            'SELECT id_categoria FROM categorias WHERE id_categoria = ?',
            [categoria]
        );

        if (categoriaExiste.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Categoria não encontrada"
            });
        }

        const sql = `
            UPDATE produtos
            SET
                nome = ?,
                descricao = ?,
                preco = ?,
                categoria = ?,
                imagem = ?
            WHERE id_produto = ?
        `;

        await db.query(sql, [
            nome,
            descricao || null,
            preco,
            categoria,
            imagem || null,
            id
        ]);

        res.json({
            success: true,
            message: "Produto atualizado com sucesso"
        });

    } catch (error) {

        console.error("ERRO AO ATUALIZAR PRODUTO:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao atualizar produto",
            erro: error.message
        });

    }
});


// ==================== DELETAR PRODUTO ====================

app.delete('/DELprodutos/:id', autenticarToken, async (req, res) => {

    try {

        const { id } = req.params;

        const [existe] = await db.query(
            'SELECT id_produto FROM produtos WHERE id_produto = ?',
            [id]
        );

        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Produto não encontrado"
            });
        }

        await db.query(
            'DELETE FROM produtos WHERE id_produto = ?',
            [id]
        );

        res.json({
            success: true,
            message: "Produto deletado com sucesso"
        });

    } catch (error) {

        console.error("Erro ao deletar produto:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao deletar produto"
        });
    }
});


// Rota alternativa para produtos

app.get('/verProdutos', async (req, res) => {

    try {

        const [produtos] = await db.query(
            'SELECT * FROM produtos'
        );

        res.json(produtos);

    } catch (erro) {

        console.log(erro);

        res.status(500).json({
            erro: 'Erro ao buscar produtos'
        });
    }
});


// ==================== CATEGORIAS ====================

app.get('/categorias', async (req, res) => {
    try {

        const [rows] = await db.query(
            'SELECT id_categoria, nome FROM categorias ORDER BY nome'
        );

        res.json(rows);

    } catch (error) {

        console.error("Erro ao buscar categorias:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao buscar categorias"
        });

    }
});


// ==================== CLIENTES ====================

// Listar clientes (somente admin)

app.get('/clientes', autenticarToken, exigirRole(ADMIN_ROLE), async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id_cliente,
                nome,
                email,
                bairro,
                rua,
                telefone,
                N_casa
            FROM clientes
        `);

        res.json(rows);

    } catch (error) {

        console.error("Erro ao buscar clientes:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao buscar clientes"
        });
    }
});


// Buscar cliente (admin ou o próprio cliente)

app.get('/clientes/:id', autenticarToken, async (req, res) => {

    try {

        const { id } = req.params;

        if (req.user.role !== ADMIN_ROLE && String(req.user.id) !== String(id)) {
            return res.status(403).json({
                success: false,
                message: "Sem permissão"
            });
        }

        const [rows] = await db.query(
            `
            SELECT
                id_cliente,
                nome,
                email,
                bairro,
                rua,
                telefone,
                N_casa,
                foto
            FROM clientes
            WHERE id_cliente = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cliente não encontrado"
            });
        }

        res.json(rows[0]);

    } catch (error) {

        console.error("Erro ao buscar cliente:", error);

        res.status(500).json({
            success: false,
            message: "Erro interno do servidor"
        });
    }
});


// ==================== PEDIDOS ====================

// Listar todos os pedidos (somente admin)

app.get('/pedidos', autenticarToken, exigirRole(ADMIN_ROLE), async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                p.*,
                c.nome AS cliente_nome,
                e.nome AS entregador_nome
            FROM pedidos p
            LEFT JOIN clientes c
                ON p.id_cliente = c.id_cliente
            LEFT JOIN entregadores e
                ON p.id_entregador = e.id_entregador
            ORDER BY p.id_pedido DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error("Erro ao buscar pedidos:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao buscar pedidos"
        });
    }
});


// Pedidos por cliente (admin ou o próprio cliente)

app.get('/pedidos/cliente/:id_cliente', autenticarToken, async (req, res) => {

    try {

        const { id_cliente } = req.params;

        if (req.user.role !== ADMIN_ROLE && String(req.user.id) !== String(id_cliente)) {
            return res.status(403).json({
                success: false,
                message: "Sem permissão"
            });
        }

        const [rows] = await db.query(
            `
            SELECT *
            FROM pedidos
            WHERE id_cliente = ?
            ORDER BY data_pedido DESC
            `,
            [id_cliente]
        );

        res.json(rows);

    } catch (error) {

        console.error(
            "Erro ao buscar pedidos do cliente:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erro ao buscar pedidos"
        });
    }
});


// Criar pedido
// - id_cliente vem do token (não do front)
// - o total é recalculado pelos preços do banco
// - pedido e itens são gravados juntos numa transação

app.post('/pedidos', autenticarToken, async (req, res) => {

    const {
        bairro,
        rua,
        numero,
        cep,
        complemento,
        telefone,
        forma_pagamento,
        troco_para,
        itens
    } = req.body;

    if (
        !bairro ||
        !rua ||
        !numero ||
        !forma_pagamento ||
        !Array.isArray(itens) ||
        itens.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Campos obrigatórios faltando"
        });
    }

    const forma = FORMAS_PAGAMENTO[forma_pagamento];

    if (!forma) {
        return res.status(400).json({
            success: false,
            message: "Forma de pagamento inválida"
        });
    }

    const conn = await db.getConnection();

    try {

        await conn.beginTransaction();

        let subtotal = 0;
        const linhas = [];

        for (const item of itens) {

            const qtd = parseInt(item.quantidade, 10);

            if (!item.id_produto || !(qtd > 0)) {
                throw new Error("ITEM_INVALIDO");
            }

            const [[produto]] = await conn.query(
                'SELECT preco FROM produtos WHERE id_produto = ?',
                [item.id_produto]
            );

            if (!produto) {
                throw new Error("ITEM_INVALIDO");
            }

            const adicionais = Array.isArray(item.adicionais)
                ? item.adicionais
                : [];

            const extras = adicionais.reduce(
                (soma, a) => soma + (Number(a.preco) || 0),
                0
            );

            const precoUnitario = Number(produto.preco) + extras;

            subtotal += precoUnitario * qtd;

            linhas.push([
                item.id_produto,
                qtd,
                precoUnitario,
                adicionais.length ? JSON.stringify(adicionais) : null,
                item.observacao || null
            ]);
        }

        const total = Number((subtotal + TAXA_ENTREGA).toFixed(2));

        if (forma_pagamento === 'dinheiro' && !(Number(troco_para) >= total)) {
            throw new Error("TROCO_INVALIDO");
        }

        // Telefone do cliente, caso o front não envie
        const [[cliente]] = await conn.query(
            'SELECT telefone FROM clientes WHERE id_cliente = ?',
            [req.user.id]
        );

        
const [pedido] = await conn.query(
    `INSERT INTO pedidos (
        id_cliente,
        bairro,
        rua,
        numero,
        cep,
        complemento,
        telefone,
        valor,
        forma_pagamento,
        troco_para,
        status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmado')`,
    [
        req.user.id,
        bairro,
        rua,
        numero,
        cep || null,
        complemento || null,
        telefone || (cliente && cliente.telefone) || null,
        total,
        forma,
        forma_pagamento === 'dinheiro' ? troco_para : null
    ]
);


        for (const l of linhas) {
            await conn.query(
                `INSERT INTO itens_pedido
                (id_pedido, id_produto, quantidade, preco_unitario, adicionais, observacao)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [pedido.insertId, ...l]
            );
        }

        await conn.commit();

        res.status(201).json({
            success: true,
            message: "Pedido criado com sucesso",
            id: pedido.insertId,
            valor: total
        });

    } catch (error) {

        await conn.rollback();

        if (error.message === "ITEM_INVALIDO") {
            return res.status(400).json({
                success: false,
                message: "Item inválido no carrinho"
            });
        }

        if (error.message === "TROCO_INVALIDO") {
            return res.status(400).json({
                success: false,
                message: "O troco deve ser maior ou igual ao total do pedido"
            });
        }

        console.error("Erro ao criar pedido:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao criar pedido"
        });

    } finally {

        conn.release();
    }
});


// Atualizar status do pedido (somente admin)

app.put('/pedidos/:id/status', autenticarToken, exigirRole(ADMIN_ROLE), async (req, res) => {

    try {

        const { id } = req.params;

        const { status } = req.body;

        const statusPermitidos = [
            'pendente',
            'confirmado',
            'preparando',
            'saiu_entrega',
            'entregue',
            'cancelado'
        ];

        if (!statusPermitidos.includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Status inválido"
            });
        }

        const [existe] = await db.query(
            'SELECT id_pedido FROM pedidos WHERE id_pedido = ?',
            [id]
        );

        if (existe.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Pedido não encontrado"
            });
        }

        await db.query(
            'UPDATE pedidos SET status = ? WHERE id_pedido = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: "Status do pedido atualizado"
        });

    } catch (error) {

        console.error(
            "Erro ao atualizar status:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erro ao atualizar status"
        });
    }
});


// ======================================================
// ENTREGADORES
// ======================================================


// ==================== CADASTRO ENTREGADOR ====================

app.post('/entregadores/solicitar', async (req, res) => {

    try {

        const {
            nome,
            email,
            CNH,
            senha,
            telefone,
            veiculo,
            placa
        } = req.body;

        if (!nome || !email || !CNH || !senha) {

            return res.status(400).json({
                success: false,
                message: "Nome, email, CNH e senha são obrigatórios"
            });
        }

        const [existeEmail] = await db.query(
            `
            SELECT id_entregador
            FROM entregadores
            WHERE email = ?
            `,
            [email]
        );

        if (existeEmail.length > 0) {

            return res.status(400).json({
                success: false,
                message: "Email já cadastrado"
            });
        }

        const senhaHash = await bcrypt.hash(
            senha,
            10
        );

        const sql = `
            INSERT INTO entregadores
            (
                nome,
                email,
                CNH,
                senha,
                telefone,
                veiculo,
                placa,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente')
        `;

        const [resultado] = await db.query(
            sql,
            [
                nome,
                email,
                CNH,
                senhaHash,
                telefone || null,
                veiculo || null,
                placa || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Solicitação enviada! Aguarde a aprovação do administrador.",
            id: resultado.insertId
        });

    } catch (error) {

        console.error(
            "Erro ao solicitar cadastro:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erro ao solicitar cadastro"
        });
    }
});


// ==================== LOGIN ENTREGADOR ====================

app.post("/entregadores/login", async (req, res) => {

    const {
        email,
        senha
    } = req.body;

    if (!email || !senha) {

        return res.status(400).json({
            success: false,
            mensagem: "Email e senha são obrigatórios"
        });
    }

    try {

        const [rows] = await db.query(
            `
            SELECT *
            FROM entregadores
            WHERE email = ?
            `,
            [email]
        );

        if (rows.length === 0) {

            return res.status(401).json({
                success: false,
                mensagem: "Email não encontrado"
            });
        }

        const entregador = rows[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            entregador.senha
        );

        if (!senhaCorreta) {

            return res.status(401).json({
                success: false,
                mensagem: "Senha incorreta"
            });
        }

        if (entregador.status === 'pendente') {

            return res.status(403).json({
                success: false,
                mensagem: "Seu cadastro está em análise. Aguarde a aprovação do administrador."
            });
        }

        if (entregador.status === 'rejeitado') {

            return res.status(403).json({
                success: false,
                mensagem: "Seu cadastro foi rejeitado. Entre em contato com o suporte."
            });
        }

        const token = jwt.sign(
            {
                id: entregador.id_entregador,
                email: entregador.email,
                role: "entregador"
            },
            api_chave,
            {
                expiresIn: "24h"
            }
        );

        res.json({
            success: true,
            token,
            user: {
                id: entregador.id_entregador,
                nome: entregador.nome,
                email: entregador.email
            }
        });

    } catch (error) {

        console.error(
            "Erro no login do entregador:",
            error
        );

        res.status(500).json({
            success: false,
            mensagem: "Erro interno no servidor"
        });
    }
});


// ======================================================
// ADMIN: LISTAR / APROVAR / REJEITAR ENTREGADORES
// ======================================================

app.get('/entregadores', autenticarToken, exigirRole(ADMIN_ROLE), async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id_entregador,
                nome,
                email,
                CNH,
                telefone,
                veiculo,
                placa,
                status
            FROM entregadores
            ORDER BY id_entregador DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            "ERRO AO BUSCAR ENTREGADORES:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erro ao buscar entregadores",
            erro: error.message
        });
    }
});


app.get('/entregadores/pendentes', autenticarToken, exigirRole(ADMIN_ROLE), async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id_entregador,
                nome,
                email,
                CNH,
                telefone,
                veiculo,
                placa,
                status
            FROM entregadores
            WHERE status = 'pendente'
            ORDER BY id_entregador DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            "ERRO AO BUSCAR ENTREGADORES PENDENTES:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erro ao buscar entregadores pendentes",
            erro: error.message
        });
    }
});


app.put('/entregadores/:id/aprovar', autenticarToken, exigirRole(ADMIN_ROLE), async (req, res) => {

    try {

        const { id } = req.params;

        const [existe] = await db.query(
            `
            SELECT id_entregador
            FROM entregadores
            WHERE id_entregador = ?
            `,
            [id]
        );

        if (existe.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Entregador não encontrado"
            });
        }

        await db.query(
            `
            UPDATE entregadores
            SET status = 'aprovado'
            WHERE id_entregador = ?
            `,
            [id]
        );

        res.json({
            success: true,
            message: "Entregador aprovado com sucesso"
        });

    } catch (error) {

        console.error(
            "Erro ao aprovar entregador:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erro ao aprovar entregador"
        });
    }
});


app.put(
    [
        '/entregadores/:id/rejeitar',
        '/entregadores/:id/recusar'
    ],
    autenticarToken,
    exigirRole(ADMIN_ROLE),
    async (req, res) => {

        try {

            const { id } = req.params;

            const [existe] = await db.query(
                `
                SELECT id_entregador
                FROM entregadores
                WHERE id_entregador = ?
                `,
                [id]
            );

            if (existe.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Entregador não encontrado"
                });
            }

            await db.query(
                `
                UPDATE entregadores
                SET status = 'rejeitado'
                WHERE id_entregador = ?
                `,
                [id]
            );

            res.json({
                success: true,
                message: "Entregador rejeitado"
            });

        } catch (error) {

            console.error(
                "Erro ao rejeitar entregador:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Erro ao rejeitar entregador"
            });
        }
    }
);


// ======================================================
// ÁREA DO ENTREGADOR
// ======================================================

// Pedidos disponíveis para aceitar
app.get('/entregador/pedidos/disponiveis',
    autenticarToken, exigirRole('entregador'), async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT id_pedido, bairro, rua, numero, complemento,
                   valor, forma_pagamento, troco_para, data_pedido
            FROM pedidos
            WHERE id_entregador IS NULL
              AND status IN ('confirmado', 'preparando')
            ORDER BY data_pedido ASC
        `);

        res.json(rows);

    } catch (error) {

        console.error("Erro ao listar disponíveis:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao buscar pedidos"
        });
    }
});


// Pedidos do entregador logado (ativos e histórico)
app.get('/entregador/pedidos/meus',
    autenticarToken, exigirRole('entregador'), async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT p.id_pedido, p.bairro, p.rua, p.numero, p.cep,
                   p.complemento, p.telefone, p.valor, p.forma_pagamento,
                   p.troco_para, p.status, p.data_pedido,
                   c.nome AS cliente_nome
            FROM pedidos p
            LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
            WHERE p.id_entregador = ?
            ORDER BY p.data_pedido DESC
        `, [req.user.id]);

        res.json(rows);

    } catch (error) {

        console.error("Erro ao listar meus pedidos:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao buscar pedidos"
        });
    }
});


// Aceitar pedido (um único UPDATE evita dois entregadores pegarem o mesmo)
app.put('/entregador/pedidos/:id/aceitar',
    autenticarToken, exigirRole('entregador'), async (req, res) => {

    try {

        const [r] = await db.query(`
            UPDATE pedidos
            SET id_entregador = ?
            WHERE id_pedido = ?
              AND id_entregador IS NULL
              AND status IN ('confirmado', 'preparando')
        `, [req.user.id, req.params.id]);

        if (r.affectedRows === 0) {
            return res.status(409).json({
                success: false,
                message: "Este pedido não está mais disponível"
            });
        }

        res.json({
            success: true,
            message: "Pedido aceito"
        });

    } catch (error) {

        console.error("Erro ao aceitar pedido:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao aceitar pedido"
        });
    }
});


 // Atualizar perfil do próprio cliente
app.put('/clientes/:id', autenticarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone, bairro, rua, N_casa } = req.body;

        // O cliente só pode editar a própria conta.
        // O administrador também pode editar clientes.
        if (
            req.user.role !== ADMIN_ROLE &&
            String(req.user.id) !== String(id)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Sem permissão para editar este cliente.'
            });
        }

        if (!nome?.trim() || !email?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Nome e email são obrigatórios.'
            });
        }

        // Verifica se o email já pertence a outro cliente
        const [emailExistente] = await db.query(
            `SELECT id_cliente FROM clientes
             WHERE email = ? AND id_cliente <> ?`,
            [email.trim(), id]
        );

        if (emailExistente.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Este email já está sendo utilizado.'
            });
        }

        const [resultado] = await db.query(
            `UPDATE clientes
             SET nome = ?, email = ?, telefone = ?,
                 bairro = ?, rua = ?, N_casa = ?
             WHERE id_cliente = ?`,
            [
                nome.trim(),
                email.trim(),
                telefone?.trim() || null,
                bairro?.trim() || null,
                rua?.trim() || null,
                N_casa?.trim() || null,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            const [clienteExiste] = await db.query(
                'SELECT id_cliente FROM clientes WHERE id_cliente = ?',
                [id]
            );

            if (clienteExiste.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado.'
                });
            }
        }

        return res.json({
            success: true,
            message: 'Perfil atualizado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Este email já está cadastrado.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erro interno ao atualizar o perfil.'
        });
    }
});


// Atualizar status (só nos pedidos dele e só nas transições permitidas)
app.put('/entregador/pedidos/:id/status',
    autenticarToken, exigirRole('entregador'), async (req, res) => {

    const ORIGENS_VALIDAS = {
        saiu_entrega: ['confirmado', 'preparando'],
        entregue: ['saiu_entrega']
    };

    const { status } = req.body;

    if (!ORIGENS_VALIDAS[status]) {
        return res.status(400).json({
            success: false,
            message: "Status inválido para o entregador"
        });
    }

    try {

        const [r] = await db.query(`
            UPDATE pedidos
            SET status = ?
            WHERE id_pedido = ?
              AND id_entregador = ?
              AND status IN (?)
        `, [status, req.params.id, req.user.id, ORIGENS_VALIDAS[status]]);

        if (r.affectedRows === 0) {
            return res.status(409).json({
                success: false,
                message: "Não foi possível atualizar este pedido"
            });
        }

        res.json({
            success: true,
            message: "Status atualizado"
        });

    } catch (error) {

        console.error("Erro ao atualizar status:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao atualizar status"
        });
    }
});


// ==================== ROTA DE TESTE ====================

require('./entregas')(app, db, autenticarToken);

app.get('/health', (req, res) => {

    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });

});


// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, '0.0.0.0', () => {

    console.log(
        `🚀 Servidor rodando na porta ${PORT}`
    );

    console.log(
        `📍 API: http://localhost:${PORT}`
    );

    console.log(
        `📚 Documentação: http://localhost:${PORT}/api-docs`
    );

    console.log(
        `❤️ Health check: http://localhost:${PORT}/health`
    );

});
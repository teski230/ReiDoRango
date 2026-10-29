
const apenasDigitos = (valor) => String(valor || "").replace(/\D/g, "");

// Bloqueia 15 min depois de 5 tentativas erradas para o mesmo email
const tentativasRecuperacao = new Map();
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

app.post('/recuperar-senha', async (req, res) => {

    const email = String(req.body.email || "").trim().toLowerCase();
    const telefone = apenasDigitos(req.body.telefone);
    const novaSenha = String(req.body.novaSenha || "");

    if (!email || !telefone || !novaSenha) {
        return res.status(400).json({
            success: false,
            message: "Preencha email, telefone e a nova senha."
        });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({
            success: false,
            message: "A nova senha precisa ter pelo menos 6 caracteres."
        });
    }

    const registro = tentativasRecuperacao.get(email);

    if (registro && registro.bloqueadoAte > Date.now()) {
        return res.status(429).json({
            success: false,
            message: "Muitas tentativas. Tente de novo em 15 minutos."
        });
    }

    try {

        const [rows] = await db.query(
            "SELECT id_cliente, telefone FROM clientes WHERE LOWER(email) = ?",
            [email]
        );

        const cliente = rows[0];

        // Mesma mensagem para email ou telefone errado, para não revelar quais emails existem
        if (!cliente || apenasDigitos(cliente.telefone) !== telefone) {

            const bloqueioVencido = registro && registro.bloqueadoAte && registro.bloqueadoAte <= Date.now();
            const falhas = (bloqueioVencido ? 0 : registro?.falhas || 0) + 1;

            tentativasRecuperacao.set(email, {
                falhas,
                bloqueadoAte: falhas >= MAX_TENTATIVAS ? Date.now() + BLOQUEIO_MS : 0
            });

            return res.status(400).json({
                success: false,
                message: "Email ou telefone não conferem com o cadastro."
            });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);

        await db.query(
            "UPDATE clientes SET senha = ? WHERE id_cliente = ?",
            [senhaHash, cliente.id_cliente]
        );

        tentativasRecuperacao.delete(email);

        res.json({
            success: true,
            message: "Senha alterada com sucesso. Faça login com a nova senha."
        });

    } catch (error) {

        console.error("Erro ao recuperar senha:", error);

        res.status(500).json({
            success: false,
            message: "Erro interno no servidor"
        });
    }
});

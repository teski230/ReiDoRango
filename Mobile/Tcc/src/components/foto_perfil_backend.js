

// Trocar foto de perfil do próprio cliente
app.put('/clientes/:id/foto', autenticarToken, upload.single("foto"), async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== ADMIN_ROLE && String(req.user.id) !== String(id)) {
            return res.status(403).json({
                success: false,
                message: "Sem permissão para alterar esta foto."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Nenhuma imagem enviada."
            });
        }

        const foto = `/uploads/${req.file.filename}`;

        const [resultado] = await db.query(
            "UPDATE clientes SET foto = ? WHERE id_cliente = ?",
            [foto, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Cliente não encontrado."
            });
        }

        res.json({
            success: true,
            message: "Foto atualizada.",
            foto
        });

    } catch (error) {
        console.error("Erro ao atualizar foto:", error);

        res.status(500).json({
            success: false,
            message: "Erro ao atualizar a foto."
        });
    }
});

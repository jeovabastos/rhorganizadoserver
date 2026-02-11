// api/index.js
import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Inicializações
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/upload', upload.single('curriculo'), async (req, res) => {
  try {
    const file = req.file;
    const { nome, sobrenome, emailRecrutador } = req.body;

    // 1. Upload para o Supabase
    const { data, error: uploadError } = await supabase.storage
      .from('curriculos')
      .upload(`public/${file.originalname}`, file.buffer, {
        contentType: 'application/pdf',
        upsert: true 
      });

    if (uploadError) throw uploadError;

    // 2. Pegar a URL pública (que você usará no corpo do e-mail ou para baixar)
    const { data: { publicUrl } } = supabase.storage.from('curriculos').getPublicUrl(data.path);

    // 3. Preparar o anexo para o Resend
    // Como o arquivo já está em 'file.buffer' (graças ao Multer), 
    // não precisamos nem baixar do Supabase agora! Usamos o que já temos na memória.
    await resend.emails.send({
      from: 'Seu App <onboarding@resend.dev>', // Ou seu domínio verificado
      to: emailRecrutador || 'destinatario@teste.com',
      subject: `Novo Currículo: ${file.originalname}`,
      html: `
        <p>Olá, o candidato <strong>${nome} ${sobrenome}</strong> enviou um currículo.</p>
        <p>Você também pode acessá-lo aqui: <a href="${publicUrl}">Link Direto</a></p>
      `,
      attachments: [
        {
          filename: file.originalname,
          content: file.buffer, // O Resend aceita o buffer diretamente do Multer
        },
      ],
    });

    return res.status(200).json({ message: 'E-mail enviado e arquivo salvo!', url: publicUrl });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar envio.' });
  }
});

export default app;


// // api/index.js
// import express from 'express';
// import multer from 'multer';
// import { createClient } from '@supabase/supabase-js';

// const app = express();

// // 1. Configuração do Supabase (Variáveis de Ambiente)
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

// // 2. Configuração do Multer
// // Armazenamos em memória para processar o buffer sem precisar de disco rígido
// const storageMulter = multer.memoryStorage();
// const upload = multer({ storage: storageMulter });

// app.use(express.json());

// // Rota de Upload
// app.post('/api/upload', upload.single('curriculo'), async (req, res) => {
//   try {
//     const file = req.file;
//     const { nome, sobrenome } = req.body;

//     if (!file) {
//       return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
//     }

//     // 3. Upload para o Supabase Storage
//     // Usamos o 'originalname' que você definiu no seu front-end
//     const { data, error: uploadError } = await supabase.storage
//       .from('curriculos')
//       .upload(`public/${file.originalname}`, file.buffer, {
//         contentType: 'application/pdf',
//         upsert: true 
//       });

//     if (uploadError) throw uploadError;

//     // 4. Gerar URL pública
//     const { data: { publicUrl } } = supabase.storage
//       .from('curriculos')
//       .getPublicUrl(data.path);

//     // 5. Retorno para o Front-end
//     return res.status(200).json({
//       message: 'Currículo processado com sucesso!',
//       url: publicUrl,
//       filename: file.originalname
//     });

//   } catch (error) {
//     console.error('Erro interno:', error.message);
//     res.status(500).json({ error: 'Falha ao processar o arquivo.' });
//   }
// });

// // Exportação necessária para a Vercel em formato ES6
// export default app;
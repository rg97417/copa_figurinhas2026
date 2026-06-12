import { Resend } from 'resend'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.convocakids.com'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key || key.startsWith('COLOQUE')) throw new Error('RESEND_API_KEY não configurada')
  return new Resend(key)
}

export async function sendDownloadEmail(opts: {
  to: string
  nome: string
  token: string
  hasPdf?: boolean
}) {
  const link = `${BASE_URL}/area/${opts.token}`
  const primeiroNome = opts.nome.split(' ')[0]
  const pdfLine = opts.hasPdf
    ? `<tr><td style="padding:6px 0;color:rgba(255,255,255,0.7);font-size:13px;">✅&nbsp; PDF Guia de Impressão incluído</td></tr>`
    : ''

  await getResend().emails.send({
    from: 'Convoca Kids <contato@convocakids.com>',
    to: opts.to,
    subject: '🎽 Sua figurinha da Copa 2026 está pronta para download!',
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Sua figurinha está pronta!</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1628;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0f1f3d;border-radius:20px;overflow:hidden;border:1px solid rgba(255,213,0,0.15);">

        <!-- TOPO VERDE -->
        <tr>
          <td style="background:linear-gradient(135deg,#00a843,#007a30);padding:36px 32px;text-align:center;">
            <div style="font-size:56px;line-height:1;margin-bottom:12px;">⚽</div>
            <h1 style="margin:0;color:#FFD500;font-size:26px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
              Figurinha Pronta!
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:1px;text-transform:uppercase;">
              Copa do Mundo 2026
            </p>
          </td>
        </tr>

        <!-- CORPO -->
        <tr>
          <td style="padding:36px 32px;">

            <p style="margin:0 0 6px;color:rgba(255,255,255,0.95);font-size:17px;">
              Olá, <strong style="color:#FFD500;">${primeiroNome}</strong>! 🎉
            </p>
            <p style="margin:0 0 28px;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;">
              Seu pagamento foi confirmado. Sua figurinha personalizada da Copa 2026 está pronta — em alta resolução, sem marca d'água, para imprimir ou compartilhar.
            </p>

            <!-- BOTÃO PRINCIPAL -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${link}"
                     style="display:inline-block;background:linear-gradient(135deg,#FFD500,#ff9f00);color:#000;font-weight:900;font-size:16px;text-decoration:none;padding:18px 40px;border-radius:50px;letter-spacing:1.5px;text-transform:uppercase;box-shadow:0 8px 24px rgba(255,213,0,0.3);">
                    ⬇️&nbsp; BAIXAR MINHA FIGURINHA
                  </a>
                </td>
              </tr>
            </table>

            <!-- DESTAQUES -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;color:rgba(255,255,255,0.7);font-size:13px;">✅&nbsp; PNG em alta resolução (1016×1350px)</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:rgba(255,255,255,0.7);font-size:13px;">✅&nbsp; Sem marca d'água</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:rgba(255,255,255,0.7);font-size:13px;">✅&nbsp; Acesso permanente — baixe quando quiser</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:rgba(255,255,255,0.7);font-size:13px;">✅&nbsp; Funciona no celular e computador</td>
                    </tr>
                    ${pdfLine}
                  </table>
                </td>
              </tr>
            </table>

            <!-- LINK TEXTO -->
            <p style="margin:0;color:rgba(255,255,255,0.35);font-size:11px;text-align:center;line-height:1.6;">
              Se o botão não abrir, copie e cole no navegador:<br />
              <a href="${link}" style="color:#FFD500;word-break:break-all;">${link}</a>
            </p>

          </td>
        </tr>

        <!-- RODAPÉ -->
        <tr>
          <td style="background:rgba(0,0,0,0.4);padding:18px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;">
              Figurinha Copa 2026 &bull; Produto digital exclusivo<br />
              Dúvidas? Acesse <a href="${BASE_URL}/area" style="color:rgba(255,213,0,0.5);">sua área de acesso</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://copa-figurinhas2026.vercel.app'

export async function sendDownloadEmail(opts: {
  to: string
  nome: string
  token: string
}) {
  const link = `${BASE_URL}/area/${opts.token}`

  await resend.emails.send({
    from: 'Copa 2026 Figurinha <onboarding@resend.dev>',
    to: opts.to,
    subject: '🎽 Sua figurinha da Copa 2026 está pronta!',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sua figurinha está pronta!</title>
</head>
<body style="margin:0;padding:0;background:#0D1B4B;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B4B;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#0f2255;border-radius:16px;overflow:hidden;border:1px solid rgba(255,213,0,0.2);">

          <tr>
            <td style="background:linear-gradient(135deg,#009B3A,#007030);padding:24px;text-align:center;">
              <div style="font-size:48px;line-height:1;">⚽</div>
              <div style="color:#FFD500;font-size:26px;font-weight:900;letter-spacing:2px;margin-top:8px;text-transform:uppercase;">
                Figurinha Pronta!
              </div>
              <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px;">
                Copa do Mundo 2026
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px;">
              <p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0 0 8px;">
                Olá, <strong style="color:#FFD500;">${opts.nome}</strong>! 🎉
              </p>
              <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 24px;">
                Seu pagamento foi confirmado e sua figurinha personalizada da Copa 2026 está pronta para download!
              </p>

              <div style="text-align:center;margin:24px 0;">
                <a href="${link}"
                   style="display:inline-block;background:linear-gradient(135deg,#FFD500,#FFA500);color:#000;font-weight:900;font-size:16px;text-decoration:none;padding:16px 32px;border-radius:50px;letter-spacing:1px;text-transform:uppercase;">
                  🏆 BAIXAR MINHA FIGURINHA
                </a>
              </div>

              <p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;margin:16px 0 0;line-height:1.6;">
                Ou acesse: <a href="${link}" style="color:#FFD500;">${link}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:rgba(0,0,0,0.3);padding:16px 24px;text-align:center;">
              <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;line-height:1.5;">
                Figurinha Copa 2026 • Produto digital • Sem prazo de expiração
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  })
}

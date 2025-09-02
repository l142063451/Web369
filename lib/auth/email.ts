import { createTransport } from 'nodemailer'

interface SendVerificationRequestParams {
  identifier: string
  url: string
  expires: Date
  provider: any
  token: string
  theme?: any
}

export async function sendVerificationRequest({
  identifier: email,
  url,
  expires,
}: SendVerificationRequestParams) {
  const { host } = new URL(url)
  
  const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const result = await transport.sendMail({
    to: email,
    from: process.env.SMTP_FROM,
    subject: `Sign in to ${host}`,
    text: text({ url, host }),
    html: html({ url, host, email }),
  })

  const failed = result.rejected.concat(result.pending).filter(Boolean)
  if (failed.length) {
    throw new Error(`Email(s) (${failed.join(', ')}) could not be sent`)
  }
}

function html({ url, host, email }: { url: string; host: string; email: string }) {
  const escapedEmail = `${email.replace(/\./g, '&#8203;.')}`
  const escapedHost = `${host.replace(/\./g, '&#8203;.')}`

  return `
<div style="background-color: #f8fafc; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #16a34a; font-size: 24px; font-weight: bold; margin: 0;">Ummid Se Hari</h1>
      <p style="color: #6b7280; margin: 8px 0 0 0;">Smart Village PWA</p>
    </div>
    
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">Sign in to your account</h2>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
      Click the button below to sign in to your account on <strong>${escapedHost}</strong>
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" 
         style="background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 600;">
        Sign in to ${escapedHost}
      </a>
    </div>
    
    <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-top: 24px;">
      If you did not request this email you can safely ignore it. This sign-in link will expire in 24 hours.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Ummid Se Hari - Smart, Green & Transparent Village PWA<br />
      Damday–Chuanala, Gangolihat, Pithoragarh, Uttarakhand
    </p>
  </div>
</div>
`
}

function text({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}\n\nClick here to sign in:\n${url}\n\nIf you did not request this email you can safely ignore it.`
}
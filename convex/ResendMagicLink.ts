// convex/ResendMagicLink.ts
import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
export const ResendMagicLink = Resend({
  id: "resend",
  apiKey: process.env.AUTH_RESEND_KEY,
  async sendVerificationRequest({ identifier: email, provider, url }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL ?? "oraizive <team@oraizive.com>",
      to: [email],
      replyTo: "support@oraizive.com",
      subject: "Sign in to oraizive",
      html: `
<html>
  <body style="font-family: system-ui; background:#f9f9f9; padding:24px; margin: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin: 0 auto;">
      <tr>
        <td style="text-align:center; padding-bottom:12px;">
          <!-- Logo centered -->
          <img
            src="https://oraizive.com/favicon.png"
            alt="oraizive Logo"
            width="50"
            style="display:inline-block;"
          />
        </td>
      </tr>
      <tr>
        <td style="text-align:center;">
          <h1 style="margin-bottom:10px; color:#644a40;">Welcome to oraizive</h1>
          <p style="color:#646464;">Click the button below to sign in and verify your email:</p>
          <p>
            <a href="${url}"
               style="display:inline-block; background:#644a40; color:#ffffff;
                      padding:10px 18px; border-radius:8px;
                      text-decoration:none;">
              Sign in
            </a>
          </p>
          <hr style="margin:24px 0; border:none; border-top:1px solid #d8d8d8;" />
          <p style="font-size:12px; color:#646464; line-height:1.5;">
            By continuing, you agree to our
            <a href="https://oraizive.com/terms-of-service" style="color:#2563eb;">oraizive Terms of Service</a>
            and
            <a href="https://oraizive.com/privacy-policy" style="color:#2563eb;">oraizive Privacy Policy</a>.
          </p>
          <p style="margin-top:8px; font-size:12px; color:#646464;">
            If you didn't request this, you can safely ignore this email.
          </p>
          <p style="margin-top:8px; font-size:10px; color:#646464;">
            Copyright © 2025-${new Date().getFullYear()} oraizive. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});

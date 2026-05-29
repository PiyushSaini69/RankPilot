import nodemailer from 'nodemailer';

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_FROM,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
};

const emailHeader = `
    <!-- Header -->
    <tr>
        <td style="background:linear-gradient(135deg,#3B82F6 0%,#6366F1 100%);padding:36px 48px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px auto;">
                <tr>
                    <td valign="middle" style="padding-right:12px;">
                        <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:12px;text-align:center;line-height:44px;font-size:24px;">&#9889;</div>
                    </td>
                    <td valign="middle">
                        <span style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;font-family:Arial,sans-serif;">RankPilot</span>
                    </td>
                </tr>
            </table>
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;letter-spacing:0.3px;">AI-Powered Marketing Intelligence</p>
        </td>
    </tr>`;

const emailFooter = `
    <!-- Footer -->
    <tr>
        <td style="background:#f9fafb;padding:24px 48px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                &copy; 2025 RankPilot. All rights reserved.
            </p>
        </td>
    </tr>`;

const wrapEmail = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
                    ${emailHeader}
                    <!-- Body -->
                    <tr>
                        <td style="padding:48px 48px 40px;">
                            ${bodyHtml}
                        </td>
                    </tr>
                    ${emailFooter}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const sendPasswordResetEmail = async (toEmail, resetToken) => {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const transporter = createTransporter();

    const body = `
        <h2 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Reset your password &#128272;</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
            We received a request to reset the password for your RankPilot account. Click the button below to create a new password. This link is valid for <strong style="color:#111827;">1 hour</strong>.
        </p>
        <table cellpadding="0" cellspacing="0">
            <tr>
                <td style="background:linear-gradient(135deg,#3B82F6 0%,#6366F1 100%);border-radius:14px;box-shadow:0 4px 16px rgba(99,102,241,0.4);">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">Reset My Password &rarr;</a>
                </td>
            </tr>
        </table>
        <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Or copy and paste this URL into your browser:<br/>
            <a href="${resetUrl}" style="color:#6366F1;word-break:break-all;font-size:12px;">${resetUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
        <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            If you didn't request a password reset, you can safely ignore this email.
        </p>`;

    await transporter.sendMail({
        from: `"RankPilot" <${process.env.EMAIL_FROM}>`,
        to: toEmail,
        subject: 'Reset Your RankPilot Password',
        html: wrapEmail('Reset Your Password', body),
    });
};

export const sendVerificationEmail = async (toEmail, verifyToken) => {
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`;
    const transporter = createTransporter();

    const body = `
        <h2 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Confirm your email &#9989;</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
            Welcome to RankPilot! Please verify your email address to activate your account and start accessing your AI-powered marketing dashboard.
        </p>
        <table cellpadding="0" cellspacing="0">
            <tr>
                <td style="background:linear-gradient(135deg,#3B82F6 0%,#6366F1 100%);border-radius:14px;box-shadow:0 4px 16px rgba(99,102,241,0.4);">
                    <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">Verify My Email &rarr;</a>
                </td>
            </tr>
        </table>
        <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Or copy and paste this URL into your browser:<br/>
            <a href="${verifyUrl}" style="color:#6366F1;word-break:break-all;font-size:12px;">${verifyUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
        <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            If you didn't create a RankPilot account, you can safely ignore this email.
        </p>`;

    await transporter.sendMail({
        from: `"RankPilot" <${process.env.EMAIL_FROM}>`,
        to: toEmail,
        subject: 'Verify Your RankPilot Email Address',
        html: wrapEmail('Verify Your Email', body),
    });
};

export const sendSupportNotificationEmail = async (contactData) => {
    const transporter = createTransporter();
    const { firstName, lastName, email, message, category, priority } = contactData;

    const body = `
        <h2 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.5px;">New Support Inquiry &#128229;</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
            A user has submitted a support ticket through the RankPilot contact form. Here are the details:
        </p>
        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 28px;">
            <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;font-size:14px;font-weight:700;color:#374151;width:120px;">Name</td>
                <td style="padding:10px 12px;border:1px solid #f3f4f6;font-size:14px;color:#111827;">${firstName} ${lastName || ''}</td>
            </tr>
            <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;font-size:14px;font-weight:700;color:#374151;">Email</td>
                <td style="padding:10px 12px;border:1px solid #f3f4f6;font-size:14px;color:#6366F1;font-weight:600;"><a href="mailto:${email}" style="color:#6366F1;text-decoration:none;">${email}</a></td>
            </tr>
            <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;font-size:14px;font-weight:700;color:#374151;">Category</td>
                <td style="padding:10px 12px;border:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;">${category || 'General Inquiry'}</td>
            </tr>
            <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;font-size:14px;font-weight:700;color:#374151;">Priority</td>
                <td style="padding:10px 12px;border:1px solid #f3f4f6;font-size:14px;color:#EF4444;font-weight:700;">${priority || 'Standard'}</td>
            </tr>
            <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;font-size:14px;font-weight:700;color:#374151;vertical-align:top;">Message</td>
                <td style="padding:10px 12px;border:1px solid #f3f4f6;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message}</td>
            </tr>
        </table>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            You are receiving this automated alert because you are configured as the support notification recipient for RankPilot.
        </p>`;

    await transporter.sendMail({
        from: `"RankPilot Help Desk" <${process.env.EMAIL_FROM}>`,
        to: process.env.EMAIL_FROM, 
        subject: `[Support Ticket] Inquiry from ${firstName} ${lastName || ''}`,
        html: wrapEmail('New Support Inquiry', body),
    });
};


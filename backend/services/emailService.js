const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';

  // Detect unconfigured placeholder credentials
  if (!user || !pass || user.includes('your_email') || pass.includes('your_app_password')) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

/**
 * Send 6-Digit OTP Email for Account Verification
 */
const sendOtpEmail = async (toEmail, recipientName, otpCode) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n==================================================`);
    console.log(`🔑 [SECURITY OTP GENERATED]`);
    console.log(`📧 Recipient: ${recipientName} (${toEmail})`);
    console.log(`🔢 6-DIGIT VERIFICATION CODE: [ ${otpCode} ]`);
    console.log(`==================================================\n`);
  }

  if (process.env.NODE_ENV === 'test') {
    return { success: true, simulated: true, otp: otpCode };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('⚠️ SMTP credentials not fully configured in backend/.env. Using Console OTP fallback for local testing.');
      return { success: true, simulated: true, otp: otpCode };
    }

    const senderEmail = process.env.SMTP_USER || process.env.EMAIL_USER;
    const mailOptions = {
      from: `"RKS Mahila Sangha" <${senderEmail}>`,
      to: toEmail,
      subject: `[${otpCode}] Your RKS Mahila Sangha Verification Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0A6C87; margin: 0; font-size: 22px;">Raju Kshatriya Mahila Sangha</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Account Verification & Security</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
            <p style="color: #334155; font-size: 14px; margin-bottom: 16px;">Hello <strong>${recipientName || 'Member'}</strong>,</p>
            <p style="color: #475569; font-size: 13px; margin-bottom: 24px;">Please use the 6-digit verification code below to confirm your email address and activate your account:</p>
            
            <div style="background: linear-gradient(135deg, #0A6C87, #0891b2); color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; border-radius: 10px; margin: 0 auto 24px auto; display: inline-block;">
              ${otpCode}
            </div>

            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 11px;">
            &copy; 2026 Raju Kshatriya Mahila Sangha. All rights reserved.
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ SMTP Verification Email sent successfully to ${toEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email via Nodemailer:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOtpEmail };

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOTPEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: `"CFIS System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'CFIS - Password Reset OTP',
      html: `
        <div style="font-family: 'Manrope', sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f7f9ff; border-radius: 12px;">
          <h2 style="color: #0d631b;">CFIS Password Reset</h2>
          <p>Your OTP code is:</p>
          <div style="font-size: 32px; font-weight: 700; color: #2e7d32; letter-spacing: 8px; text-align: center; padding: 16px; background: #e8f5e9; border-radius: 8px; margin: 16px 0;">
            ${otp}
          </div>
          <p style="color: #707a6c; font-size: 14px;">This code expires in <strong>15 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
};

const sendEmailVerificationOTP = async (email, firstName, otp) => {
  try {
    await transporter.sendMail({
      from: `"CFIS System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'CFIS - Verify Your Email Address',
      html: `
        <div style="font-family: 'Manrope', sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f7f9ff; border-radius: 12px;">
          <h2 style="color: #0d631b;">Welcome to CFIS, ${firstName}!</h2>
          <p>Thanks for signing up. Please verify your email address using the OTP below:</p>
          <div style="font-size: 32px; font-weight: 700; color: #2e7d32; letter-spacing: 8px; text-align: center; padding: 16px; background: #e8f5e9; border-radius: 8px; margin: 16px 0;">
            ${otp}
          </div>
          <p style="color: #707a6c; font-size: 14px;">This code expires in <strong>15 minutes</strong>. If you did not create an account, you can ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Email verification send error:', err.message);
    return false;
  }
};

module.exports = { sendOTPEmail, sendEmailVerificationOTP };

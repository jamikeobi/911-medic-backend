const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email templates
const emailTemplates = {
    // Welcome email for new users
    welcome: (name, role) => ({
        subject: `Welcome to 911Medic, ${name}!`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d6efd;">Welcome to 911Medic!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for joining 911Medic as a ${role}. We're excited to have you on board!</p>
        <p>You can now log in to your dashboard and start using our services.</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Need help?</strong> Contact our support team at support@911medic.com</p>
        </div>
        <hr>
        <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
      </div>
    `,
    }),

    // Password reset email
    passwordReset: (name, resetLink) => ({
        subject: 'Password Reset Request - 911Medic',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d6efd;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>You requested to reset your password. Click the link below to create a new password:</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
      </div>
    `,
    }),

    // Appointment reminder
    appointmentReminder: (patientName, specialistName, date, time, type) => ({
        subject: 'Appointment Reminder - 911Medic',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d6efd;">Appointment Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>This is a reminder for your upcoming consultation:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Specialist:</strong> Dr. ${specialistName}</p>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>Please log in to your dashboard for any changes or cancellations.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
      </div>
    `,
    }),
};

const sendEmail = async (to, subject, html) => {
    try {
        const msg = {
            to,
            from: process.env.EMAIL_FROM,
            subject,
            html,
        };
        await sgMail.send(msg);
        console.log(`Email sent to ${to}`);
        return { success: true };
    } catch (error) {
        console.error('SendGrid Error:', error.response?.body || error.message);
        throw error;
    }
};

module.exports = { sendEmail, emailTemplates };
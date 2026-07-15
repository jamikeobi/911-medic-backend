const nodemailer = require('nodemailer');

// ─── Transporter Setup ───────────────────────────────────────────────────────
// Dev  → Mailtrap live SMTP (real sending infrastructure, check logs at
//         https://mailtrap.io/sending/email_logs)
// Prod → Brevo SMTP relay
// Same code, different env vars. Zero code changes between environments.

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
  } else {
    const provider = process.env.NODE_ENV === 'development' ? 'Mailtrap' : 'GMAIL';
    console.log(`✅ Email transporter ready (${provider})`);
  }
});

// ─── Core Send Function ───────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
  // In development, redirect ALL emails to your own address
  // so Mailtrap's demo domain restriction doesn't block sends
  const recipient = process.env.NODE_ENV === 'development'
    ? process.env.EMAIL_TO
    : to;
  try {
    const info = await transporter.sendMail({
      from: {
        address: process.env.EMAIL_FROM,
        name: process.env.EMAIL_FROM_NAME || '911Medic',
      },
      to: recipient,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to} | messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
};


// ─── Email Templates ──────────────────────────────────────────────────────────
// Nothing below this line changes regardless of environment or provider.

// Patient Registration Welcome Email
const sendPatientWelcomeEmail = async (patient) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Welcome to 911Medic!</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Thank you for registering with 911Medic. Your account has been successfully created.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Email:</strong> ${patient.email}</p>
        <p><strong>Phone:</strong> ${patient.phone}</p>
      </div>
      <p>You can now log in to your patient dashboard to:</p>
      <ul>
        <li>Book consultations with specialists</li>
        <li>Request ambulance services</li>
        <li>View your booking history</li>
        <li>Manage your profile</li>
      </ul>
      <p><a href="https://911medic.com/patient/login" style="background: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(patient.email, 'Welcome to 911Medic', html);
};

// Specialist Registration Email (Pending Approval)
const sendSpecialistRegistrationEmail = async (user, specialist) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Registration Received - Under Review</h2>
      <p>Dear Dr. ${user.fullName},</p>
      <p>Thank you for registering as a specialist with 911Medic.</p>
      <p>Your application has been received and is currently under review by our admin team. You will receive an email once your application is approved.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Application Details:</strong></p>
        <p><strong>Speciality:</strong> ${specialist.speciality}</p>
        <p><strong>License Number:</strong> ${specialist.licenseNumber}</p>
      </div>
      <p><strong>What happens next?</strong></p>
      <ol>
        <li>Admin will review your credentials</li>
        <li>You'll receive approval email with login credentials</li>
        <li>You can then start accepting consultations</li>
      </ol>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(user.email, 'Application Received - 911Medic', html);
};

// Specialist Approval Email
const sendSpecialistApprovalEmail = async (specialist, password) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Congratulations! Application Approved</h2>
      <p>Dear Dr. ${specialist.fullName},</p>
      <p>We are pleased to inform you that your application to join 911Medic has been <strong style="color: green;">APPROVED</strong>.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Your Login Credentials:</h3>
        <p><strong>Email:</strong> ${specialist.email}</p>
        <p><strong>Temporary Password:</strong> <code style="background: #e0e0e0; padding: 5px;">${password}</code></p>
      </div>
      <p><strong style="color: red;">IMPORTANT:</strong> Please change your password immediately after your first login.</p>
      <p><a href="https://911medic.com/specialist/login" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dashboard</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">You can now start accepting patient consultations.</p>
    </div>
  `;
  await sendEmail(specialist.email, 'Application Approved - Welcome to 911Medic', html);
};

// Specialist Rejection Email
const sendSpecialistRejectionEmail = async (specialist, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Application Status Update</h2>
      <p>Dear Dr. ${specialist.fullName},</p>
      <p>Thank you for your interest in joining 911Medic.</p>
      <p>After careful review of your application, we regret to inform you that your application has been <strong style="color: red;">REJECTED</strong>.</p>
      ${reason ? `<div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;"><strong>Reason:</strong> ${reason}</div>` : ''}
      <p>If you have any questions or would like to reapply with additional qualifications, please contact our support team.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(specialist.email, 'Application Status Update', html);
};
// Password Reset Email
const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Reset</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">911Medic Security</p>
      </div>

      <!-- Body -->
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; color: #333;">Hi <strong>${user.fullName}</strong>,</p>
        <p style="color: #555; line-height: 1.6;">
          We received a request to reset the password for your 911Medic account. 
          Click the button below to set a new password.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #dc3545, #c82333); 
                    color: white; 
                    padding: 14px 35px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-size: 16px; 
                    font-weight: bold;
                    display: inline-block;">
            Reset My Password
          </a>
        </div>

        <!-- Expiry Warning -->
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            ⏰ <strong>This link expires in 10 minutes.</strong> If you didn't request this, you can safely ignore this email.
          </p>
        </div>

        <!-- Fallback URL -->
        <p style="color: #888; font-size: 13px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 12px; word-break: break-all; color: #555;">
          ${resetUrl}
        </p>

        <!-- Security Note -->
        <div style="border-top: 1px solid #eee; margin-top: 25px; padding-top: 20px;">
          <p style="color: #888; font-size: 13px; margin: 0;">
            🔒 For your security, this link can only be used once and will expire automatically. 
            If you didn't request a password reset, please contact us immediately at 
            <a href="mailto:support@911medic.com" style="color: #dc3545;">support@911medic.com</a>.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <p style="text-align: center; color: #aaa; font-size: 12px; margin-top: 20px;">
        © 2024 911Medic. All rights reserved.<br>
        This is an automated message, please do not reply.
      </p>

    </div>
  `;

  await sendEmail(user.email, '🔐 Reset Your 911Medic Password', html);
};

// Password Changed Notification Email
const sendPasswordChangedEmail = async (user) => {
  const changedAt = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff;">
      
      <!-- Top accent bar -->
      <div style="height: 4px; background: #0d6efd;"></div>

      <!-- Header -->
      <div style="padding: 40px 40px 0 40px;">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0d6efd; letter-spacing: 1.2px; text-transform: uppercase;">911Medic</p>
        <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
          Your password was changed
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 28px 40px 0 40px;">
        <p style="margin: 0; font-size: 15px; color: #444; line-height: 1.7;">
          Hi ${user.fullName},
        </p>
        <p style="margin: 16px 0 0 0; font-size: 15px; color: #444; line-height: 1.7;">
          This is a confirmation that the password for your 911Medic account 
          (<strong style="color: #1a1a1a;">${user.email}</strong>) was changed.
        </p>

        <!-- Detail card -->
        <div style="margin: 28px 0 0 0; background: #f7f8fa; border-radius: 8px; padding: 20px 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="font-size: 13px; color: #888; padding: 6px 0; width: 40%;">Action</td>
              <td style="font-size: 13px; color: #1a1a1a; font-weight: 500; padding: 6px 0;">Password changed</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #888; padding: 6px 0;">Time</td>
              <td style="font-size: 13px; color: #1a1a1a; font-weight: 500; padding: 6px 0;">${changedAt}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #888; padding: 6px 0;">Account</td>
              <td style="font-size: 13px; color: #1a1a1a; font-weight: 500; padding: 6px 0;">${user.email}</td>
            </tr>
          </table>
        </div>

        <!-- Warning block -->
        <div style="margin: 28px 0 0 0; border: 1px solid #ffd0d0; background: #fff8f8; border-radius: 8px; padding: 20px 24px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #c0392b;">
            Didn't make this change?
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #555; line-height: 1.6;">
            If you didn't change your password, your account may be at risk. 
            Reset your password immediately and contact our support team.
          </p>
          <div style="margin-top: 16px;">
            <a href="https://911medic.com/forgot-password" 
               style="display: inline-block; background: #c0392b; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
              Secure My Account
            </a>
            <a href="mailto:support@911medic.com" 
               style="display: inline-block; margin-left: 10px; font-size: 13px; color: #c0392b; text-decoration: underline; line-height: 38px;">
              Contact Support
            </a>
          </div>
        </div>

        <p style="margin: 28px 0 0 0; font-size: 14px; color: #888; line-height: 1.7;">
          If this was you, no further action is needed. You can continue using your account normally.
        </p>
      </div>

      <!-- Divider -->
      <div style="margin: 40px 40px 0 40px; border-top: 1px solid #ebebeb;"></div>

      <!-- Footer -->
      <div style="padding: 24px 40px 40px 40px;">
        <p style="margin: 0; font-size: 12px; color: #aaa; line-height: 1.6;">
          This is an automated security notification from 911Medic. 
          Please do not reply to this email.<br>
          &copy; ${new Date().getFullYear()} 911Medic. All rights reserved.
        </p>
      </div>

    </div>
  `;

  await sendEmail(user.email, 'Your 911Medic password was changed', html);
};

// Password Reset Success Notification Email
const sendPasswordResetSuccessEmail = async (user) => {
  const resetAt = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff;">

      <!-- Top accent bar -->
      <div style="height: 4px; background: #0d6efd;"></div>

      <!-- Header -->
      <div style="padding: 40px 40px 0 40px;">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0d6efd; letter-spacing: 1.2px; text-transform: uppercase;">911Medic</p>
        <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
          Your password has been reset
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 28px 40px 0 40px;">
        <p style="margin: 0; font-size: 15px; color: #444; line-height: 1.7;">
          Hi ${user.fullName},
        </p>
        <p style="margin: 16px 0 0 0; font-size: 15px; color: #444; line-height: 1.7;">
          The password for your 911Medic account 
          (<strong style="color: #1a1a1a;">${user.email}</strong>) 
          was successfully reset. You can now log in with your new password.
        </p>

        <!-- Detail card -->
        <div style="margin: 28px 0 0 0; background: #f7f8fa; border-radius: 8px; padding: 20px 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="font-size: 13px; color: #888; padding: 6px 0; width: 40%;">Action</td>
              <td style="font-size: 13px; color: #1a1a1a; font-weight: 500; padding: 6px 0;">Password reset</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #888; padding: 6px 0;">Time</td>
              <td style="font-size: 13px; color: #1a1a1a; font-weight: 500; padding: 6px 0;">${resetAt}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #888; padding: 6px 0;">Account</td>
              <td style="font-size: 13px; color: #1a1a1a; font-weight: 500; padding: 6px 0;">${user.email}</td>
            </tr>
          </table>
        </div>

        <!-- Login CTA -->
        <div style="margin: 28px 0 0 0; text-align: left;">
          <a href="https://911medic.com/login"
             style="display: inline-block; background: #0d6efd; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 5px; text-decoration: none;">
            Log In to Your Account
          </a>
        </div>

        <!-- Warning block -->
        <div style="margin: 28px 0 0 0; border: 1px solid #ffd0d0; background: #fff8f8; border-radius: 8px; padding: 20px 24px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #c0392b;">
            Didn't request this reset?
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #555; line-height: 1.6;">
            If you did not request a password reset, someone may have had access 
            to your email. Contact our support team immediately.
          </p>
          <div style="margin-top: 16px;">
            <a href="mailto:support@911medic.com"
               style="display: inline-block; background: #c0392b; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
              Contact Support
            </a>
          </div>
        </div>

        <p style="margin: 28px 0 0 0; font-size: 14px; color: #888; line-height: 1.7;">
          For security, the reset link you used has been permanently invalidated 
          and cannot be used again.
        </p>
      </div>

      <!-- Divider -->
      <div style="margin: 40px 40px 0 40px; border-top: 1px solid #ebebeb;"></div>

      <!-- Footer -->
      <div style="padding: 24px 40px 40px 40px;">
        <p style="margin: 0; font-size: 12px; color: #aaa; line-height: 1.6;">
          This is an automated security notification from 911Medic.
          Please do not reply to this email.<br>
          &copy; ${new Date().getFullYear()} 911Medic. All rights reserved.
        </p>
      </div>

    </div>
  `;

  await sendEmail(user.email, 'Your 911Medic password has been reset', html);
};

// Consultation Booking Confirmation (Patient)
const sendConsultationBookingEmail = async (booking, patient,specialistUser, specialist) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Consultation Booking Confirmed</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your consultation has been successfully booked. Here are the details:</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Specialist:</strong> Dr. ${specialistUser.fullName} (${specialist.speciality})</p>
        <p><strong>Type:</strong> ${booking.consultationType}</p>
        <p><strong>Fee:</strong> ₦${booking.amount?.toLocaleString() || '15,000'}</p>
        <p><strong>Status:</strong> <span style="color: #ffc107;">Awaiting Specialist Confirmation</span></p>
      </div>
      <p>You will receive another email once the specialist confirms your appointment time.</p>
      <p>You can track your booking status in your dashboard.</p>
      <p><a href="https://911medic.com/patient/dashboard" style="background: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(patient.email, 'Consultation Booking Confirmed', html);
};

// Consultation Booking Notification (Specialist)
const sendConsultationRequestEmail = async (booking, patient, specialist) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">New Consultation Request</h2>
      <p>Dear Dr. ${specialist.fullName},</p>
      <p>You have a new consultation request from a patient.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Patient Details:</h3>
        <p><strong>Name:</strong> ${patient.fullName}</p>
        <p><strong>Email:</strong> ${patient.email}</p>
        <p><strong>Phone:</strong> ${patient.phone}</p>
        <p><strong>Location:</strong> ${booking.location}</p>
        <p><strong>Medical Description:</strong> ${booking.description || 'Not provided'}</p>
      </div>
      <p>Please log in to your dashboard to accept or reject this request.</p>
      <p><a href="https://911medic.com/specialist/dashboard" style="background: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(specialist.userId.email, 'New Consultation Request', html);
};

// Appointment Confirmation Email (Patient)
const sendAppointmentConfirmedEmail = async (consultation, patient, specialist) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Appointment Confirmed!</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Great news! Dr. ${specialist.fullName} has confirmed your appointment.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Appointment Details:</h3>
        <p><strong>Date & Time:</strong> ${new Date(consultation.appointmentTime).toLocaleString()}</p>
        <p><strong>Specialist:</strong> Dr. ${specialist.fullName} (${specialist.speciality})</p>
        <p><strong>Type:</strong> ${consultation.consultationType}</p>
      </div>
      <p><strong>Reminder:</strong> Please be on time for your consultation. You can reschedule up to 24 hours in advance.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(patient.email, 'Appointment Confirmed', html);
};

// Emergency Request Email (Admin)
const sendEmergencyRequestEmail = async (emergency, patient) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🚨 URGENT: New Emergency Request</h2>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Name:</strong> ${emergency.fullName}</p>
        <p><strong>Phone:</strong> ${emergency.phone}</p>
        <p><strong>Location:</strong> ${emergency.location}</p>
        <p><strong>Type:</strong> ${emergency.type}</p>
        <p><strong>Description:</strong> ${emergency.description}</p>
        ${patient ? `<p><strong>Patient Email:</strong> ${patient.email}</p>` : ''}
      </div>
      <p>Please log in to the admin dashboard immediately to dispatch an ambulance.</p>
      <p><a href="https://911medic.com/admin/dispatch" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Dispatch Ambulance</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(process.env.EMAIL_TO, 'URGENT: New Ambulance Request', html);
};

// Emergency Dispatched Email (Patient)
const sendAmbulanceDispatchedEmail = async (emergency, patient) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Ambulance Dispatched</h2>
      <p>Dear ${patient.fullName},</p>
      <p>An ambulance has been dispatched to your location.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Location:</strong> ${emergency.location}</p>
        <p><strong>Estimated Arrival:</strong> 10-15 minutes</p>
      </div>
      <p>Please stay where you are. The medical team will contact you shortly.</p>
      <p><strong>Emergency Number:</strong> 911 for immediate assistance</p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(patient.email, 'Ambulance Dispatched - 911Medic', html);
};

// Payment Confirmation Email
const sendPaymentConfirmationEmail = async (payment, patient, consultation) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Payment Confirmed</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your payment has been successfully confirmed.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Amount:</strong> ₦${payment.amount.toLocaleString()}</p>
        <p><strong>Transaction ID:</strong> ${payment.transactionRef || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(payment.paidAt).toLocaleString()}</p>
      </div>
      <p>Your consultation is now confirmed. You can proceed with your appointment.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(patient.email, 'Payment Confirmed - 911Medic', html);
};

// Hospital Booking Confirmation Email
const sendHospitalBookingEmail = async (booking, patient, hospital) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Hospital Booking Confirmed</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your hospital appointment request has been received.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Hospital:</strong> ${hospital.name}</p>
        <p><strong>Location:</strong> ${hospital.location}</p>
        <p><strong>Reason:</strong> ${booking.reason}</p>
        <p><strong>Preferred Date:</strong> ${new Date(booking.preferredDate).toLocaleDateString()}</p>
      </div>
      <p>The hospital will contact you within 24-48 hours to confirm your appointment.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">© 2024 911Medic. All rights reserved.</p>
    </div>
  `;
  await sendEmail(patient.email, 'Hospital Booking Received', html);
};

module.exports = {
  sendEmail,
  sendPatientWelcomeEmail,
  sendSpecialistRegistrationEmail,
  sendSpecialistApprovalEmail,
  sendSpecialistRejectionEmail,
  sendConsultationBookingEmail,
  sendConsultationRequestEmail,
  sendAppointmentConfirmedEmail,
  sendEmergencyRequestEmail,
  sendAmbulanceDispatchedEmail,
  sendPaymentConfirmationEmail,
  sendHospitalBookingEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendPasswordResetSuccessEmail,
};
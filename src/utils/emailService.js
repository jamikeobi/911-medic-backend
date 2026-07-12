const nodemailer = require('nodemailer');

// ─── Transporter Setup ───────────────────────────────────────────────────────
// In development: use Mailtrap's SDK transport (emails caught in Mailtrap inbox,
//   never reach real inboxes, great for testing)
// In production: use Brevo's SMTP relay (real delivery)
// Everything below this block is identical for both environments.

let transporter;

if (process.env.NODE_ENV === 'development') {
  const { MailtrapTransport } = require('mailtrap');

  transporter = nodemailer.createTransport(
    MailtrapTransport({
      token: process.env.MAILTRAP_TOKEN,
    })
  );

  console.log('📧 Email: using Mailtrap (development)');
} else {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // false = STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify Brevo SMTP config on startup — catches bad credentials immediately
  // instead of discovering it when the first real email fails in prod
  transporter.verify((error) => {
    if (error) {
      console.error('❌ Email transporter error:', error.message);
    } else {
      console.log('✅ Email transporter ready (Brevo)');
    }
  });
}

// ─── Core Send Function ───────────────────────────────────────────────────────
// All template functions below call this. If you ever swap providers again,
// this is the only function that needs to change.

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: {
        address: process.env.EMAIL_FROM,
        name: process.env.EMAIL_FROM_NAME || '911Medic',
      },
      to,
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

// Consultation Booking Confirmation (Patient)
const sendConsultationBookingEmail = async (booking, patient, specialist) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">Consultation Booking Confirmed</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your consultation has been successfully booked. Here are the details:</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Specialist:</strong> Dr. ${specialist.fullName} (${specialist.speciality})</p>
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
};
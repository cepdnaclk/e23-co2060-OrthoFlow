# Digitisation and Workflow Automation of Orthodontic Case Records

This project aims to design and implement a secure, modular, and clinically aligned digital system for managing Orthodontic Case Records. Working closely with Dr. HSK Ratnatilake and her team from the Department of Community Dental at the Faculty of Dental Sciences, this system captures and organizes patient information, diagnostic data, clinical media, and treatment progress in a streamlined, digital workflow.

The system supports structured data capture across the full orthodontic lifecycle—from initial assessment and diagnosis, through treatment planning and progress monitoring, to post-treatment retention. Additional features include patient history tracing, integration of digital radiographs into patient folders, and automated messaging (SMS/email) for appointment reminders.

This project bridges Software Engineering and Healthcare Digital Transformation, providing a real-world platform for students to translate complex clinical workflows into well-engineered software solutions.

---

## Features

- **Digital Patient Records:** All clinical data, including history, examinations, and treatment progress, are captured digitally for accuracy and ease of access.  
- **Radiograph Integration:** Digital radiographs are merged into individual patient folders for comprehensive record-keeping.  
- **Patient History Tracking:** Enables longitudinal tracking of patient outcomes and treatment progress.  
- **Automated Messaging:** SMS or message system for notifying patients about upcoming appointments or treatment schedules.  
- **Appointment Email/SMS Reminders:** Sends patient email/SMS reminders and clinician email reminders 24 hours before an appointment, and records patient-facing notifications in the site notification panel.  
- **Secure Role-Based Access:** Ensures sensitive medical data is protected and accessible only to authorized personnel.  
- **Conditional Form Logic:** Supports complex clinical forms with validations and workflow automation.  
- **Timeline-Based Treatment Tracking:** Visualizes the orthodontic treatment lifecycle for clinicians and patients.  

---

## Tech Stack

- **Backend:** Node.js, Express, Prisma  
- **Frontend:** React  
- **Database:** PostgreSQL  

---

## Importance and Relevance

**Healthcare Benefits:**

- Improves diagnostic consistency and clinical decision-making.  
- Enables longitudinal tracking of patient outcomes.  
- Supports clinical audits, research, and quality assurance.  
- Reduces documentation errors and improves continuity of care.  
- Lays groundwork for AI-assisted diagnosis and treatment planning.  

**Software Engineering Benefits:**

- Hands-on experience translating clinical workflows into software requirements.  
- Designing modular, maintainable healthcare information systems.  
- Implementing secure and audit-friendly data models.  
- Media management for images, radiographs, and attachments.  
- Human-centred design in a safety-critical domain.  

---

## PostgreSQL Setup

1. Create a PostgreSQL database in pgAdmin, for example `orthoflow`.
2. In `code/backend`, copy `.env.example` to `.env`.
3. Set `DATABASE_URL` in `.env`, for example:

   ```env
   DATABASE_URL="postgresql://postgres:your-password@localhost:5432/orthoflow?schema=public"
   ```

4. Install backend dependencies and create the PostgreSQL tables:

   ```bash
   npm install
   npm run db:deploy
   npm run db:generate
   ```

For local development while changing the schema, use `npm run db:migrate`. For quick schema sync without migration history, use `npm run db:push`.

---

## Email/SMS Reminder Setup

Backend reminders use the patient `email` and `phone` saved on the patient record. Copy `code/backend/.env.example` to `code/backend/.env`, then configure the real delivery services:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-clinic-email@example.com"
SMTP_PASS="your-email-app-password"
MAIL_FROM="OrthoRecords <your-clinic-email@example.com>"

TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_FROM_NUMBER="+10000000000"
DEFAULT_SMS_COUNTRY_CODE="+94"
```

If SMTP or Twilio is not configured, the reminder job still creates in-app notifications and logs `[EMAIL MOCK]` / `[SMS MOCK]` output to the backend terminal for local demonstrations. Mock output means no real email or SMS was sent.

The backend scans appointments on startup, after a new appointment is scheduled, and then every `REMINDER_SCAN_INTERVAL_MINUTES` (5 minutes by default). Any scheduled appointment within `REMINDER_ADVANCE_HOURS` receives one patient reminder and one clinician reminder.

To test email delivery immediately without waiting for the appointment reminder window:

```bash
npm run test:email -- patient@example.com
```

If no address is passed, the test email is sent to `SMTP_USER`.

---

## Expected Learning Outcomes

By completing this project, students will gain experience in:  

- Translating real clinical workflows into software requirements.  
- Designing modular and maintainable software systems for healthcare.  
- Implementing validation, conditional logic, and audit-friendly features.  
- Applying software engineering principles in a regulated, real-world domain.  
- Understanding how software improves healthcare delivery and diagnosis.  

---

## Broader Impact

This system can be deployed in academic dental clinics and adapted for public healthcare institutions, contributing to digitally enabled, data-driven orthodontic care. It also serves as a foundation for future innovations like analytics-driven outcome evaluation and AI-supported orthodontic diagnosis.

---

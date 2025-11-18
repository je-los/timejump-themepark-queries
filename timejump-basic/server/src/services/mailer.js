let transporterPromise = null;

async function initTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
    EMAIL_FROM,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !EMAIL_FROM) {
    console.warn('[mailer] SMTP host/port/from missing; email sending disabled.');
    return null;
  }

  let nodemailer;
  try {
    ({ default: nodemailer } = await import('nodemailer'));
  } catch (err) {
    console.warn('[mailer] Unable to load nodemailer. Did you run npm install?', err?.message || err);
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: false, // Brevo uses STARTTLS on port 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3' 
    }
  });
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = initTransporter();
  }
  return transporterPromise;
}

function formatTicketLines(items) {
  return items.map((item, index) => {
    const lineTotal = (item.price ?? 0) * (item.qty ?? 1);
    const visitDate = item.meta?.visitDate || item.meta?.visit_date || item.visitDate;
    const parts = [
      `${index + 1}. ${item.qty} × ${item.name}`,
      `$${lineTotal.toFixed(2)}`,
    ];
    if (visitDate) {
      parts.splice(1, 0, `Visit: ${visitDate}`);
    }
    return parts.join(' — ');
  }).join('\n');
}

export async function sendTicketPurchaseEmail({ to, items, total, purchaseDate }) {
  if (!to || !items?.length) return;
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('[mailer] Skipping ticket email because transporter is unavailable.');
    return;
  }

  const orderDate = purchaseDate instanceof Date
    ? purchaseDate.toLocaleString()
    : new Date(purchaseDate || Date.now()).toLocaleString();

  const subject = `Your TimeJump ticket purchase (${items.length} item${items.length === 1 ? '' : 's'})`;
  const textLines = [
    'Thanks for your purchase!',
    '',
    `Order date: ${orderDate}`,
    `Tickets: ${items.length}`,
    '',
    'Summary:',
    formatTicketLines(items),
    '',
    `Ticket subtotal: $${Number(total ?? 0).toFixed(2)}`,
    '',
    'We look forward to seeing you soon at TimeJump Theme Park.',
  ];

  try {
    await transporter.sendMail({
      to,
      from: process.env.EMAIL_FROM,
      subject,
      text: textLines.join('\n'),
    });
  } catch (err) {
    console.error('[mailer] Failed to send ticket purchase email:', err?.message || err);
  }
}

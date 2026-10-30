export type EmailRecipients = string | string[];

interface EmailEnvelope {
  to: EmailRecipients;
  subject: string;
  replyTo?: EmailRecipients;
  cc?: EmailRecipients;
  bcc?: EmailRecipients;
  idempotencyKey?: string;
}

export type SendEmailInput = EmailEnvelope &
  ({ html: string; text?: string } | { html?: string; text: string });

export interface SendEmailResult {
  id: string;
}

ALTER TABLE emails
ADD COLUMN status VARCHAR(20) CHECK (
        status IN ('draft', 'scheduled', 'sent', 'failed')
    ) DEFAULT 'sent',
    ADD COLUMN scheduled_at TIMESTAMP,
    ADD COLUMN sent_at TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_emails_updated_at ON emails(updated_at);
CREATE INDEX idx_emails_deleted_at ON emails(deleted_at);
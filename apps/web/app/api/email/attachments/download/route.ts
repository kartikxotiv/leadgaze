import { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { decrypt } from '@kit/core';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const emailId = searchParams.get('email_id');
    const attachmentName = searchParams.get('attachment_name');
    const attachmentId = searchParams.get('attachment_id');

    if (!emailId || !attachmentName) {
      return new Response('Missing required parameters', { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Fetch the email and its account
    const { data: email, error: emailError } = await (supabase as any)
      .schema('core')
      .from('emails')
      .select('*, email_account:email_accounts(*)')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      return new Response('Email not found', { status: 404 });
    }

    const account = email.email_account;
    if (!account) {
      return new Response('Email account not found', { status: 404 });
    }

    let attachmentBuffer: Buffer | null = null;
    let contentType = 'application/octet-stream';

    if (account.provider === 'google' || account.provider === 'gmail') {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        access_token: account.access_token || undefined,
        refresh_token: account.refresh_token,
        expiry_date: account.expires_at ? new Date(account.expires_at).getTime() : undefined,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      const res = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: email.provider_message_id,
        id: attachmentId as string,
      });

      console.log('[Attachment Download] Gmail API Response Data:', res.data ? Object.keys(res.data) : 'No data');
      if (res.data && res.data.size !== undefined) {
         console.log('[Attachment Download] Size:', res.data.size, 'Data length:', res.data.data?.length);
      }

      if (res.data && res.data.data) {
        attachmentBuffer = Buffer.from(
          res.data.data.replace(/-/g, '+').replace(/_/g, '/'),
          'base64'
        );
      }
    } else if (account.provider === 'imap') {
      const host = account.imap_host || account.smtp_host;
      const username = account.imap_username || account.smtp_username;
      const encryptedPassword = account.imap_password || account.smtp_password;
      
      if (!host || !username || !encryptedPassword) {
        return new Response('IMAP credentials missing', { status: 400 });
      }

      const client = new ImapFlow({
        host,
        port: account.imap_port || (account.imap_secure === false ? 143 : 993),
        secure: account.imap_secure !== false,
        auth: {
          user: username,
          pass: decrypt(encryptedPassword),
        },
        logger: false,
      });

      await client.connect();

      try {
        const mailboxes = await client.list();
        
        for (const mailbox of mailboxes) {
          let lock;
          try {
            lock = await client.getMailboxLock(mailbox.path);
            
            // Try to search by internet_message_id
            let searchCriteria: any = {};
            if (email.internet_message_id) {
               searchCriteria = { header: { 'Message-ID': email.internet_message_id } };
            } else if (email.subject) {
               searchCriteria = { subject: email.subject };
            } else {
               continue;
            }

            const searchResult = await client.search(searchCriteria);
            
            if (searchResult.length > 0) {
              // Usually the last one is the most recent if multiple match
              const msg = await client.fetchOne(searchResult[searchResult.length - 1].toString(), { source: true });
              
              if (msg && msg.source) {
                const parsed = await simpleParser(msg.source);
                const att = parsed.attachments.find(
                  (a) => a.partId === attachmentId || a.filename === attachmentName
                );
                
                if (att) {
                  attachmentBuffer = att.content;
                  contentType = att.contentType || contentType;
                  break;
                }
              }
            }
          } catch (err) {
            console.warn(`[Attachment Download] Failed searching mailbox ${mailbox.path}`, err);
          } finally {
            if (lock) lock.release();
          }

          if (attachmentBuffer) break;
        }
      } finally {
        await client.logout().catch(() => {});
      }
    }

    if (!attachmentBuffer) {
      return new Response('Attachment not found on provider server', { status: 404 });
    }

    return new Response(attachmentBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachmentName)}"`,
      },
    });
  } catch (error: any) {
    console.error('[Attachment Download] Error:', error);
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}

const INVITE_MEMBER_TEMPLATE = ({ inviteLink }: { inviteLink: string }) => {
  return `
    <html>
      <body>
        <p>You have been invited to join a workspace. Click the link below to accept the invitation:</p>
        <a href="${inviteLink}">Accept Invitation</a>
      </body>
    </html>
    `;
};

export default INVITE_MEMBER_TEMPLATE;

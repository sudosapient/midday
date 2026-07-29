import type { InviteTeamMembersPayload } from "@jobs/schema";
import { InviteEmail } from "@midday/email/emails/invite";
import { getI18n } from "@midday/email/locales";
import { render } from "@midday/email/render";
import { nanoid } from "nanoid";
import { Resend } from "resend";

export async function sendTeamInviteEmails({
  ip,
  invites,
  locale,
}: InviteTeamMembersPayload) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { t } = getI18n({ locale });
  const emails = await Promise.all(
    invites.map(async (invite) => ({
      from: "Midday <midday@sudosapient.dev>",
      to: [invite.email],
      subject: t("invite.subject", {
        invitedByName: invite.invitedByName,
        teamName: invite.teamName,
      }),
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: await render(
        InviteEmail({
          invitedByEmail: invite.invitedByEmail,
          invitedByName: invite.invitedByName,
          email: invite.email,
          teamName: invite.teamName,
          ip,
          locale,
        }),
      ),
    })),
  );

  const { error } = await resend.batch.send(emails);
  if (error) {
    throw new Error(`Failed to send team invitation: ${error.message}`);
  }
}

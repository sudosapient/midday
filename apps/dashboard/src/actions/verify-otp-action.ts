"use server";

import { createClient } from "@midday/supabase/server";
import { sanitizeRedirectPath } from "@midday/utils/sanitize-redirect";
import { addSeconds, addYears } from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTRPCClient } from "@/trpc/server";
import { Cookies } from "@/utils/constants";
import { getUrl } from "@/utils/environment";
import { isBlockedNewUser } from "@/utils/new-user-gate";
import { normalizeRedirectPath } from "@/utils/redirect-path";
import { actionClient } from "./safe-action";

export const verifyOtpAction = actionClient
  .schema(
    z.object({
      token: z.string(),
      email: z.string(),
      redirectTo: z.string(),
    }),
  )
  .action(async ({ parsedInput: { email, token, redirectTo } }) => {
    const supabase = await createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (verifyError) {
      throw new Error("Failed to verify one-time password", {
        cause: verifyError,
      });
    }

    // Validate that the session was actually established (similar to OAuth callback)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Failed to establish session after OTP verification", {
        cause: sessionError,
      });
    }

    if (isBlockedNewUser(session.user.created_at)) {
      await supabase.auth.signOut();
      redirect(`${getUrl()}/login?waitlist=1`);
    }

    const cookieStore = await cookies();

    cookieStore.set(Cookies.PreferredSignInProvider, "otp", {
      expires: addYears(new Date(), 1),
    });

    // Force primary database reads for subsequent requests after redirect.
    // This prevents replication lag issues when the user record hasn't
    // replicated to read replicas yet (same as the OAuth callback).
    cookieStore.set(Cookies.ForcePrimary, "true", {
      expires: addSeconds(new Date(), 30),
      httpOnly: false, // Needs to be readable by client-side tRPC
      sameSite: "lax",
    });

    const trpcClient = await getTRPCClient({ forcePrimary: true });
    const user = await trpcClient.user.me.query();

    if (!user?.fullName || !user.teamId) {
      redirect(`${getUrl()}/onboarding`);
    }

    const normalizedRedirectPath = normalizeRedirectPath(redirectTo);
    const safeRedirectPath = sanitizeRedirectPath(normalizedRedirectPath);

    redirect(new URL(safeRedirectPath, getUrl()).toString());
  });

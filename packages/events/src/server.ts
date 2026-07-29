import { OpenPanel, type TrackProperties } from "@openpanel/nextjs";

export const setupAnalytics = async () => {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  const clientSecret = process.env.OPENPANEL_SECRET_KEY;
  const isEnabled =
    process.env.NODE_ENV === "production" &&
    Boolean(
      clientId &&
        clientId !== "local-disabled" &&
        clientSecret &&
        clientSecret !== "local-disabled",
    );

  if (!isEnabled) {
    return {
      track: (_options: { event: string } & TrackProperties) => {},
    };
  }

  const client = new OpenPanel({
    clientId: clientId!,
    clientSecret: clientSecret!,
  });

  return {
    track: (options: { event: string } & TrackProperties) => {
      const { event, ...rest } = options;

      client.track(event, rest).catch(() => {});
    },
  };
};

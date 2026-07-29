import {
  OpenPanelComponent,
  type TrackProperties,
  useOpenPanel,
} from "@openpanel/nextjs";

const isProd = process.env.NODE_ENV === "production";
const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
const isEnabled =
  isProd && Boolean(clientId && clientId !== "local-disabled");

const Provider = () => {
  if (!isEnabled) {
    return null;
  }

  return (
    <OpenPanelComponent
      clientId={clientId!}
      trackAttributes={true}
      trackScreenViews={true}
      trackOutgoingLinks={true}
    />
  );
};

const track = (options: { event: string } & TrackProperties) => {
  const { track: openTrack } = useOpenPanel();

  if (!isEnabled) {
    if (!isProd) {
      console.log("Track", options);
    }
    return;
  }

  const { event, ...rest } = options;

  openTrack(event, rest);
};

export { Provider, track };

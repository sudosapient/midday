export const dynamic = "force-dynamic";

export async function GET() {
  // Weather is an optional enhancement in the chat demo. The hosted Midday
  // service provides geo-aware weather data, but local/self-hosted deployments
  // deliberately avoid sending the visitor's IP to a third-party geo service.
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}

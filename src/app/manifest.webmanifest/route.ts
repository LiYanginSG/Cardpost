export function GET() {
  return Response.json(
    {
      name: "Cardpost",
      short_name: "Cardpost",
      description: "Slow mail. Write a card, it takes real days to arrive.",
      start_url: "/mailbox",
      display: "standalone",
      background_color: "#FCFBF7",
      theme_color: "#1B2A4A",
      icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
    },
    { headers: { "content-type": "application/manifest+json" } },
  );
}

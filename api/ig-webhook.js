export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
      return new Response(challenge || "OK", { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        where: "GET /api/ig-webhook",
        error: error?.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json({ ok: true, received: body });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        where: "POST /api/ig-webhook",
        error: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

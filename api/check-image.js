export async function GET(request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return Response.json({ ok: false, error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get("predictionId");
    if (!predictionId) return Response.json({ ok: false, error: "Missing predictionId" }, { status: 400 });

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ ok: false, error: data }, { status: 500 });

    return Response.json({
      ok: true,
      status: data.status,
      image_url: data.status === "succeeded" ? data.output : null
    });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

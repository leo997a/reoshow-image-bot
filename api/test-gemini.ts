export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { ok: false, error: "Missing GEMINI_API_KEY" },
      { status: 500 }
    );
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Reply with exactly this sentence: Gemini test passed",
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return Response.json(
      { ok: false, status: res.status, error: data },
      { status: 500 }
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "No text returned";

  return Response.json({
    ok: true,
    reply: text,
  });
}

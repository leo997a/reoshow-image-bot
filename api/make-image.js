const VERSION = "black-forest-labs/flux-2-pro:f558a59a8bf126d892ab219846966674f6acc616940c17841aeb242e245952ff";

export async function GET(request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return Response.json({ ok: false, error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const selfieUrl = searchParams.get("selfieUrl");
    if (!selfieUrl) return Response.json({ ok: false, error: "Missing selfieUrl" }, { status: 400 });

    const prompt = `Create a photorealistic close studio sports portrait of the exact same man from the input image. Keep his identity strictly unchanged: exact face shape, skin tone, age cues, hairline, hairstyle, hair color, eyebrows, eye area, nose, lips, jawline, chin, beard/stubble status, and overall male proportions. Change only the setup: neutral grey studio background, black crew-neck shirt, tight centered crop from upper chest to top of head, soft studio lighting, neutral expression, realistic skin texture. Add dark wayfarer-style sunglasses, white wired earbuds, and a clean lower-third TV graphic. Keep the lower-third text exactly as: UCL QUARTERFINALS / FC Barcelona has never beaten Atletico Madrid in UCL over 2 legs. Do not beautify. Do not change age, ethnicity, or facial structure.`;

    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: VERSION,
        input: {
          prompt,
          input_images: [selfieUrl],
          aspect_ratio: "1:1",
          resolution: "1 MP",
          output_format: "jpg"
        }
      })
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ ok: false, error: data }, { status: 500 });

    return Response.json({
      ok: true,
      prediction_id: data.id,
      status: data.status
    });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

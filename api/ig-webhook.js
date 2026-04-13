import { sendInstagramText } from "../lib/instagram";

const CREATE_COMMANDS = new Set(["صورة", "photo", "اصنع صورتك"]);

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
    return Response.json(
      {
        ok: false,
        where: "GET /api/ig-webhook",
        error: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event?.sender?.id;
        const text = event?.message?.text?.trim();
        const attachments = event?.message?.attachments || [];

        if (!senderId) continue;

        if (text && CREATE_COMMANDS.has(text)) {
          await sendInstagramText(
            senderId,
            "أرسل صورة واحدة واضحة لوجهك، أمامية، بإضاءة جيدة، وبدون أشخاص آخرين."
          );
          continue;
        }

        const imageAttachment = attachments.find(
          (a) => a?.type === "image" && a?.payload?.url
        );

        if (imageAttachment) {
          const selfieUrl = imageAttachment.payload.url;

          await sendInstagramText(senderId, "جاري إنشاء صورتك الآن، انتظر قليلًا 👌");

          const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`
            },
            body: JSON.stringify({
              version: "black-forest-labs/flux-2-pro:f558a59a8bf126d892ab219846966674f6acc616940c17841aeb242e245952ff",
              input: {
                prompt: "Create a photorealistic close studio sports portrait of the exact same man from the input image. Keep his identity strictly unchanged: exact face shape, skin tone, age cues, hairline, hairstyle, hair color, eyebrows, eye area, nose, lips, jawline, chin, beard/stubble status, and overall male proportions. Change only the setup: neutral grey studio background, black crew-neck shirt, tight centered crop from upper chest to top of head, soft studio lighting, neutral expression, realistic skin texture. Add dark wayfarer-style sunglasses, white wired earbuds, and a clean lower-third TV graphic. Keep the lower-third text exactly as: UCL QUARTERFINALS / FC Barcelona has never beaten Atletico Madrid in UCL over 2 legs. Do not beautify. Do not change age, ethnicity, or facial structure.",
                input_images: [selfieUrl],
                aspect_ratio: "1:1",
                resolution: "1 MP",
                output_format: "jpg"
              },
              webhook: `${process.env.APP_URL}/api/replicate-webhook?igsid=${encodeURIComponent(senderId)}`,
              webhook_events_filter: ["completed"]
            })
          });

          const replicateData = await replicateRes.json();

          if (!replicateRes.ok) {
            throw new Error(`Replicate create failed: ${JSON.stringify(replicateData)}`);
          }

          continue;
        }
      }
    }

    return Response.json({ ok: true });
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

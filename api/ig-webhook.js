import { sendInstagramText } from "../lib/instagram.js";
import {
  openImageSession,
  hasImageSession,
  clearImageSession,
} from "../lib/session.js";

const SELF_IG_ID = "17841403859875518";

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isImageStartCommand(text) {
  const t = normalizeText(text);
  return t === "__create_image__" || t === "ابدا الصوره" || t === "ابدا الصورة";
}

async function safeSendText(recipientId, text) {
  try {
    await sendInstagramText(recipientId, text);
  } catch (error) {
    console.error("safeSendText failed:", error?.message || error);
  }
}

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
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let body = null;

  try {
    body = await request.json();
    console.log("IG webhook body:", JSON.stringify(body));

    for (const entry of body.entry || []) {
      // تجاهل comments بالكامل في هذا المسار
      for (const change of entry.changes || []) {
        if (change?.field === "comments" || change?.field === "live_comments") {
          console.log("Ignore comment/live_comment in custom image webhook");
        }
      }

      for (const event of entry.messaging || []) {
        try {
          const senderId = event?.sender?.id;
          const text = event?.message?.text?.trim();
          const attachments = event?.message?.attachments || [];
          const isEcho = event?.message?.is_echo;

          if (!senderId || senderId === SELF_IG_ID || isEcho) {
            console.log("Skip self/invalid messaging event", JSON.stringify(event));
            continue;
          }

          if (text && isImageStartCommand(text)) {
            await openImageSession(senderId, 600);
            console.log("Image session opened", { senderId });

            await safeSendText(
              senderId,
              "أرسل الآن صورة واحدة واضحة لوجهك، أمامية وبإضاءة جيدة."
            );
            continue;
          }

          const imageAttachment = attachments.find(
            (a) => a?.type === "image" && a?.payload?.url
          );

          if (imageAttachment) {
            const hasSession = await hasImageSession(senderId);

            if (!hasSession) {
              console.log("Image ignored: no open session", { senderId });
              await safeSendText(
                senderId,
                "لبدء إنشاء الصورة، اضغط أولًا «ابدأ الصورة»."
              );
              continue;
            }

            await clearImageSession(senderId);

            const selfieUrl = imageAttachment.payload.url;
            console.log("Image received in DM", { senderId, selfieUrl });

            const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
              },
              body: JSON.stringify({
                version:
                  "black-forest-labs/flux-2-pro:f558a59a8bf126d892ab219846966674f6acc616940c17841aeb242e245952ff",
                input: {
                  prompt:
                    "Create a photorealistic close studio sports portrait of the exact same man from the input image. Keep his identity strictly unchanged: exact face shape, skin tone, age cues, hairline, hairstyle, hair color, eyebrows, eye area, nose, lips, jawline, chin, beard/stubble status, and overall male proportions. Change only the setup: neutral grey studio background, black crew-neck shirt, tight centered crop from upper chest to top of head, soft studio lighting, neutral expression, realistic skin texture. Add dark wayfarer-style sunglasses, white wired earbuds, and a clean lower-third TV graphic. Keep the lower-third text exactly as: UCL QUARTERFINALS / FC Barcelona has never beaten Atletico Madrid in UCL over 2 legs. Do not beautify. Do not change age, ethnicity, or facial structure.",
                  input_images: [selfieUrl],
                  aspect_ratio: "1:1",
                  resolution: "1 MP",
                  output_format: "jpg",
                },
                webhook: `${process.env.APP_URL}/api/replicate-webhook?igsid=${encodeURIComponent(senderId)}`,
                webhook_events_filter: ["completed"],
              }),
            });

            const replicateData = await replicateRes.json();
            console.log("Replicate create response", replicateData);

            if (!replicateRes.ok) {
              console.error("Replicate create failed", replicateData);
              await safeSendText(senderId, "تعذر بدء إنشاء الصورة الآن. جرّب بعد قليل.");
              continue;
            }

            await safeSendText(senderId, "جاري إنشاء صورتك الآن، انتظر قليلًا 👌");
            continue;
          }

          console.log("No matching DM text or image attachment", {
            senderId,
            text,
            attachmentsCount: attachments.length,
            attachmentTypes: attachments.map((a) => a?.type),
          });
        } catch (eventError) {
          console.error("Messaging event processing failed:", eventError);
          continue;
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/ig-webhook fatal error:", error, body);
    return Response.json({
      ok: true,
      warning: true,
      error: error?.message || "Unknown error",
    });
  }
}

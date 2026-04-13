import { sendInstagramText } from "../lib/instagram.js";

const SELF_IG_ID = "17841403859875518";

const CREATE_COMMANDS = new Set([
  "ابدأ",
  "photo",
  "اصنع صورتك"
]);

function normalizeText(text) {
  return (text || "").trim().toLowerCase();
}

function isCreateCommand(text) {
  return CREATE_COMMANDS.has(normalizeText(text));
}

async function sendInstagramPrivateReply(commentId, text) {
  const res = await fetch(
    `https://graph.facebook.com/v25.0/${commentId}/private_replies`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        message: text,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Meta private reply failed: ${JSON.stringify(data)}`);
  }

  return data;
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
      // 1) مسار التعليقات comments
      for (const change of entry.changes || []) {
        try {
          if (change?.field !== "comments") continue;

          const value = change?.value || {};
          const fromId = value?.from?.id;
          const username = value?.from?.username;
          const commentId = value?.id;
          const commentText = value?.text || "";

          // تجاهل تعليقات حسابك أنت
          if (!fromId || fromId === SELF_IG_ID || username === "reoshow") {
            console.log("Skip self/invalid comment event", { fromId, username, commentText });
            continue;
          }

          if (!isCreateCommand(commentText)) {
            console.log("Ignore non-create comment", { fromId, username, commentText });
            continue;
          }

          console.log("Create command from comment", { fromId, username, commentId, commentText });

          // رد خاص على التعليق
          await sendInstagramPrivateReply(
            commentId,
            "أرسل لنا الآن رسالة خاصة بكلمة: ابدأ، ثم أرسل صورة واحدة واضحة لوجهك."
          );
        } catch (commentError) {
          console.error("Comment processing failed:", commentError);
          continue;
        }
      }

      // 2) مسار الرسائل الخاصة DM
      for (const event of entry.messaging || []) {
        try {
          const senderId = event?.sender?.id;
          const text = event?.message?.text?.trim();
          const attachments = event?.message?.attachments || [];

          // تجاهل رسائلك أنت أو أحداث ناقصة
          if (!senderId || senderId === SELF_IG_ID) {
            console.log("Skip self/invalid messaging event", JSON.stringify(event));
            continue;
          }

          if (text && isCreateCommand(text)) {
            console.log("DM command matched", { senderId, text });

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
            console.log("Image received in DM", { senderId, selfieUrl });

            await sendInstagramText(
              senderId,
              "جاري إنشاء صورتك الآن، انتظر قليلًا 👌"
            );

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
              await sendInstagramText(
                senderId,
                "تعذر بدء إنشاء الصورة الآن. جرّب بعد قليل."
              );
            }

            continue;
          }

          console.log("No matching DM text or image attachment", { senderId, text });
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

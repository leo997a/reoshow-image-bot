import { sendInstagramImage, sendInstagramText } from "../lib/instagram.js";

async function safeSendText(recipientId, text) {
  try {
    await sendInstagramText(recipientId, text);
  } catch (error) {
    console.error("safeSendText failed:", error?.message || error);
  }
}

async function safeSendImage(recipientId, imageUrl) {
  try {
    await sendInstagramImage(recipientId, imageUrl);
  } catch (error) {
    console.error("safeSendImage failed:", error?.message || error);
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get("igsid");

    if (!recipientId) {
      return Response.json({ ok: false, error: "Missing igsid" }, { status: 400 });
    }

    const body = await request.json();
    const status = body?.status;
    const output = body?.output;

    if (status !== "succeeded") {
      await safeSendText(recipientId, "تعذر إنشاء الصورة هذه المرة. جرّب بصورة أوضح للوجه.");
      return Response.json({ ok: true, status });
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      await safeSendText(recipientId, "اكتمل التنفيذ لكن لم أحصل على رابط الصورة النهائية.");
      return Response.json({ ok: false, error: "Missing output URL" }, { status: 500 });
    }

    await safeSendImage(recipientId, imageUrl);

    return Response.json({ ok: true, imageUrl });
  } catch (error) {
    console.error("replicate-webhook fatal error:", error);
    return Response.json({
      ok: true,
      warning: true,
      error: error?.message || "Unknown error",
    });
  }
}

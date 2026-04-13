import { sendInstagramImage, sendInstagramText } from "../lib/instagram.js";

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
      await sendInstagramText(
        recipientId,
        "تعذر إنشاء الصورة هذه المرة. جرّب بصورة أوضح للوجه."
      );
      return Response.json({ ok: true, status });
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      await sendInstagramText(
        recipientId,
        "اكتمل التنفيذ لكن لم أحصل على رابط الصورة النهائية."
      );
      return Response.json(
        { ok: false, error: "Missing output URL" },
        { status: 500 }
      );
    }

    await sendInstagramImage(recipientId, imageUrl);

    return Response.json({ ok: true, imageUrl });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        where: "POST /api/replicate-webhook",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

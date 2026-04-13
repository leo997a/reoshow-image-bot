import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return Response.json(
        { ok: false, error: "Missing requestId" },
        { status: 400 }
      );
    }

    const status = await fal.queue.status("fal-ai/flux-pro/kontext/max/multi", {
      requestId,
      logs: true
    });

    if (status.status !== "COMPLETED") {
      return Response.json({
        ok: true,
        status: status.status,
        logs: status.logs || []
      });
    }

    const result = await fal.queue.result("fal-ai/flux-pro/kontext/max/multi", {
      requestId
    });

    const imageUrl = result?.data?.images?.[0]?.url;

    if (!imageUrl) {
      return Response.json(
        { ok: false, error: "No image URL returned", result },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      status: "COMPLETED",
      image_url: imageUrl
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

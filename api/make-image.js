import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

function toDataUri(buffer, mimeType = "image/jpeg") {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const selfieUrl = searchParams.get("selfieUrl");

    if (!selfieUrl) {
      return Response.json(
        { ok: false, error: "Missing selfieUrl" },
        { status: 400 }
      );
    }

    const templatePath = path.join(process.cwd(), "assets", "messi-template.jpg");
    const templateBuffer = await fs.readFile(templatePath);
    const templateDataUri = toDataUri(templateBuffer, "image/jpeg");

    const prompt = `
You are given exactly 2 images.

IMAGE 1 = TEMPLATE.
IMAGE 2 = IDENTITY.

Use IMAGE 1 only for the setup:
close studio sports-meme portrait, neutral grey background, black shirt,
dark wayfarer sunglasses, white wired earbuds, tight crop, head placement,
lighting style, and the lower-third TV graphic layout.

Use IMAGE 2 only for the identity:
preserve the man's exact face shape, skin tone, age cues, hairstyle,
hairline, hair color, eyebrows, eyes, nose, lips, jawline, chin,
and exact facial-hair status.

Do not copy any identity traits from IMAGE 1.
No face blend.
No template identity leakage.
No Messi-like resemblance.

Keep a neutral expression.
Make it photorealistic.

Keep the lower-third text exactly as shown in IMAGE 1, including:
Top line: "UCL QUARTERFINALS"
Bottom line: "FC Barcelona has never beaten Atletico Madrid in UCL over 2 legs"

Return one final image only.
    `.trim();

    const job = await fal.queue.submit("fal-ai/flux-pro/kontext/max/multi", {
      input: {
        prompt,
        image_urls: [templateDataUri, selfieUrl]
      }
    });

    return Response.json({
      ok: true,
      request_id: job.request_id
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

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function readLocalImageAsBase64(filePath, mimeType = "image/jpeg") {
  const buffer = await fs.readFile(filePath);
  return {
    mimeType,
    data: buffer.toString("base64"),
  };
}

async function fetchImageAsBase64(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch selfie image: ${res.status}`);
  }

  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];

  if (!contentType.startsWith("image/")) {
    throw new Error(`URL did not return an image. Got: ${contentType}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    mimeType: contentType,
    data: buffer.toString("base64"),
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const selfieUrl = searchParams.get("selfieUrl");

    if (!selfieUrl) {
      return Response.json(
        { ok: false, error: "Missing selfieUrl query parameter" },
        { status: 400 }
      );
    }

    const templatePath = path.join(process.cwd(), "assets", "messi-template.jpg");

    const template = await readLocalImageAsBase64(templatePath, "image/jpeg");
    const selfie = await fetchImageAsBase64(selfieUrl);

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

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: template.mimeType,
            data: template.data,
          },
        },
        {
          inlineData: {
            mimeType: selfie.mimeType,
            data: selfie.data,
          },
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);

    if (!imagePart) {
      return Response.json(
        {
          ok: false,
          error: "Gemini returned no image",
          parts,
        },
        { status: 500 }
      );
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

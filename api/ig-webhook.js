export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
        return res.status(200).send(challenge || "OK");
      }

      return res.status(403).send("Forbidden");
    }

    if (req.method === "POST") {
      return res.status(200).json({
        ok: true,
        received: req.body || null
      });
    }

    return res.status(405).send("Method Not Allowed");
  } catch (error) {
    return res.status(500).json({
      ok: false,
      where: "api/ig-webhook.js",
      error: error?.message || String(error),
    });
  }
}

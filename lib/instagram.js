export async function sendInstagramText(recipientId, text) {
  const res = await fetch("https://graph.facebook.com/v23.0/me/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Meta text send failed: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function sendInstagramImage(recipientId, imageUrl) {
  const res = await fetch("https://graph.facebook.com/v23.0/me/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: false,
          },
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Meta image send failed: ${JSON.stringify(data)}`);
  }

  return data;
}

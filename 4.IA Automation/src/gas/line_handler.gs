// src/gas/line_handler.gs

/**
 * Sends a Flex Message to LINE for approval.
 */
function sendLineApproval(rowId, productName, caption, imageUrl, productLink) {
  const url = "https://api.line.me/v2/bot/message/broadcast"; // Or push message to specific ID
  
  const flexMessage = {
    type: "flex",
    altText: `อนุมัติโพสต์: ${productName}`,
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: imageUrl,
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: productName, weight: "bold", size: "xl" },
          { type: "text", text: caption, wrap: true, size: "sm", margin: "md" }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "postback",
              label: "Approve (อนุมัติ)",
              data: `action=approve&rowId=${rowId}`,
              displayText: "อนุมัติโพสต์นี้"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "Reject (ไม่อนุมัติ)",
              data: `action=reject&rowId=${rowId}`,
              displayText: "ไม่อนุมัติโพสต์นี้"
            }
          }
        ]
      }
    }
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + CONFIG.LINE_ACCESS_TOKEN
    },
    contentType: "application/json",
    payload: JSON.stringify({
      messages: [flexMessage]
    })
  };

  UrlFetchApp.fetch(url, options);
}

// ============================================================
// line_handler.gs — ส่ง LINE Flex Message พร้อมปุ่ม Approve/Reject
// ============================================================

function sendLineFlexMessage(productId, productName, caption, mediaUrl, affiliateLink, targetPlatform) {
  const flexMessage = buildFlexMessage(productId, productName, caption, mediaUrl, affiliateLink, targetPlatform);

  const payload = {
    to: CONFIG.LINE_USER_ID,
    messages: [flexMessage]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_TOKEN}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
  if (response.getResponseCode() !== 200) {
    console.error('LINE Flex Error:', response.getContentText());
    throw new Error(`LINE API Error: ${response.getContentText()}`);
  }

  return `msg_${productId}_${Date.now()}`;
}

function buildFlexMessage(productId, productName, caption, mediaUrl, affiliateLink, targetPlatform) {
  const shortCaption = caption.length > 200 ? caption.substring(0, 200) + '...' : caption;
  const platforms = targetPlatform || 'FACEBOOK';

  return {
    type: 'flex',
    altText: `📦 สินค้าใหม่รอ Approve: ${productName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: mediaUrl || 'https://via.placeholder.com/400x300?text=No+Image',
        size: 'full', aspectMode: 'cover'
      },
      header: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '🛍 สินค้าใหม่รอ Approve', size: 'sm', color: '#888888' },
          { type: 'text', text: productName, weight: 'bold', size: 'xl', wrap: true }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: shortCaption, size: 'sm', color: '#555555', wrap: true },
          { type: 'separator' },
          {
            type: 'box', layout: 'horizontal',
            contents: [
              { type: 'text', text: '📲 แพลตฟอร์ม', size: 'xs', color: '#888888', flex: 2 },
              { type: 'text', text: platforms, size: 'xs', color: '#333333', weight: 'bold', flex: 3, wrap: true }
            ]
          },
          {
            type: 'button', style: 'link', height: 'sm',
            action: { type: 'uri', label: '🛒 ดูสินค้า / ลิงก์ตะกร้า', uri: affiliateLink }
          }
        ]
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', color: '#1DB954', flex: 1,
            action: {
              type: 'postback', label: '✅ Approve',
              data: `action=approve&product_id=${productId}`,
              displayText: `Approve: ${productName}`
            }
          },
          {
            type: 'button', style: 'primary', color: '#E53E3E', flex: 1,
            action: {
              type: 'postback', label: '❌ Reject',
              data: `action=reject&product_id=${productId}`,
              displayText: `Reject: ${productName}`
            }
          }
        ]
      }
    }
  };
}

function sendLineText(message) {
  const payload = {
    to: CONFIG.LINE_USER_ID,
    messages: [{ type: 'text', text: message }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_TOKEN}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
  if (response.getResponseCode() !== 200) {
    console.error('LINE Text Error:', response.getContentText());
  }
}

function doPost(e) {
  const jsonData = JSON.parse(e.postData.contents);
  const event = jsonData.events[0];
  const replyToken = event.replyToken;
  const userId = event.source.userId;

  if (event.type === 'message') {
    const text = event.message.text;
    if (text === 'เมนู' || text === 'สั่งขนม') {
      reply(replyToken, [getSnackMenu()]);
    } else if (text === 'ขอไอดี') {
      reply(replyToken, [{ "type": "text", "text": `ID ของคุณคือ:\n${userId}` }]);
    } else {
      reply(replyToken, [{ "type": "text", "text": "พิมพ์ 'เมนู' เพื่อสั่งทองม้วนทองก้อนได้เลยครับ!" }]);
    }
  } else if (event.type === 'postback') {
    const params = parseQueryString(event.postback.data);
    if (params.action === 'order') {
      // ดึงชื่อผู้ใช้ (Optional)
      const profile = getUserProfile(userId);
      const userName = profile ? profile.displayName : 'ลูกค้า';
      
      // ส่งข้อความยืนยัน
      const confirmText = `ขอบคุณคุณ ${userName} ครับ!\n\nได้รับออเดอร์ "${params.item}" ราคา ${params.price} บาท เรียบร้อยแล้ว 📦`;
      reply(replyToken, [{ "type": "text", "text": confirmText }]);
    }
  }
}

function reply(replyToken, messages) {
  UrlFetchApp.fetch(LINE_REPLY_URL, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({ 'replyToken': replyToken, 'messages': messages }),
  });
}

function getUserProfile(userId) {
  try {
    const url = `https://api.line.me/v2/bot/profile/${userId}`;
    const response = UrlFetchApp.fetch(url, {
      'headers': { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN }
    });
    return JSON.parse(response.getContentText());
  } catch (e) { return null; }
}

function parseQueryString(queryString) {
  const params = {};
  queryString.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value);
  });
  return params;
}

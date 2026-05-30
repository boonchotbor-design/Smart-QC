const express = require('express');
const { messagingApi, middleware } = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim(),
  channelSecret: (process.env.LINE_CHANNEL_SECRET || '').trim(),
};

// ดึง URL จาก Environment Variable
const GAS_WEB_APP_URL = (process.env.GAS_WEB_APP_URL || '').trim();

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const app = express();

app.get('/', (req, res) => res.send('LINE Bot DUID Query System is alive! v6.5.4'));

// Webhook สำหรับรับข้อความจาก LINE (Selective Response Mode)
app.post('/webhook', middleware(config), (req, res) => {
  if (!req.body.events || !Array.isArray(req.body.events)) {
    return res.status(200).send('OK');
  }

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Webhook Error:', err);
      res.status(500).end();
    });
});

// ... (notify endpoint remains the same) ...

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text.trim();
  if (userMessage.length < 5) return null; // ข้อความสั้นเกินไป ไม่น่าใช่ DUID

  try {
    const response = await axios.get(`${GAS_WEB_APP_URL}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 25000 });
    let replyText = response.data;

    // เงื่อนไขสำคัญ: ถ้า GAS ตอบกลับมาว่าไม่พบข้อมูล (มีเครื่องหมาย ❌) 
    // เราจะไม่ตอบกลับอะไรเลย เพื่อให้บอทเงียบในกลุ่มตามที่ผู้ใช้ต้องการ
    if (!replyText || (typeof replyText === 'string' && replyText.includes('❌'))) {
      console.log(`DUID Search: No match found for "${userMessage}". Staying silent.`);
      return null;
    }

    // ถ้าพบข้อมูล (ไม่มี ❌) ให้ส่งคำตอบกลับไป
    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: replyText }]
    });

  } catch (err) {
    console.error('Query Error:', err.message);
    return null; // เกิด Error ก็เงียบไว้
  }
}

module.exports = app;

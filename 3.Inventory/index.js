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

app.get('/', (req, res) => res.send('LINE Bot DUID Query System is alive! v6.5.3'));

// Webhook สำหรับรับข้อความจาก LINE (DUID Query)
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

// Endpoint สำหรับรับแจ้งเตือนเมื่อมีการบันทึกข้อมูล (Save Notification)
app.post('/notify', express.json(), (req, res) => {
  const { header, items } = req.body;
  if (!header) return res.status(400).send('Missing header');

  const messageText = `✅ บันทึกสำเร็จ (V.6.5.3)\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `🛠 งาน: ${header.type}\n` +
                      `🆔 DUID: ${header.duid}\n` +
                      `📦 รายการสินค้า: ${items ? items.length : 0} รายการ\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `📍 คลัง: ${header.ownerWarehouse || "-"}\n` +
                      `👷 ผู้รับ: ${header.ownerReceiver || "-"}`;
  
  const destId = process.env.LINE_DESTINATION_ID || 'Cb4baf5e474773f54f2b6538e4cd4d9ac';

  client.pushMessage({
    to: destId,
    messages: [{ type: 'text', text: messageText }]
  })
    .then(() => res.send('OK'))
    .catch((err) => {
      console.error('Push Error:', err);
      res.status(500).send(err.toString());
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text.trim();
  if (userMessage.length < 5) return null; // ข้ามคำทักทายสั้นๆ

  try {
    // 🚀 ส่งไปขอข้อความแบบจัดรูปแบบแล้ว (format=text) จาก Google Script โดยตรง
    // สิ่งนี้จะทำให้ Logic การจัดรูปแบบทั้งหมดถูกควบคุมโดย Google Script ที่เราเพิ่งแก้ไป
    const response = await axios.get(`${GAS_WEB_APP_URL}?duid=${encodeURIComponent(userMessage)}&format=text`);
    const replyText = response.data; // ดึงข้อความดิบที่ GAS จัดรูปแบบมาให้แล้ว

    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: replyText }]
    });
  } catch (err) {
    console.error('Query Error:', err);
    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: '⚠️ (V.6.5.3) เกิดข้อผิดพลาดในการเชื่อมต่อ Google Script' }]
    });
  }
}

module.exports = app;

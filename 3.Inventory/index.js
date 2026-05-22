const express = require('express');
const { messagingApi, middleware } = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim(),
  channelSecret: (process.env.LINE_CHANNEL_SECRET || '').trim(),
};

// ใช้ค่าจาก Environment Variable หรือถ้าไม่มีให้ใช้ค่าเริ่มต้น
const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwoTnwaExeObR_54tVajXxz7j2rAsQlylWN3rbaGfTXxf9-HZ8oAMs4_gKOhrFx7b6b/exec';

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const app = express();

app.get('/', (req, res) => res.send('LINE Bot DUID Query System is alive! v6.4.9'));

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

  const messageText = `✅ บันทึกสำเร็จ (V.6.4.9)\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `👤 ลูกค้า: ${header.customer}\n` +
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

  try {
    // ส่ง DUID ไปถาม Google Script
    const response = await axios.get(`${GAS_WEB_APP_URL}?duid=${encodeURIComponent(userMessage)}`);
    const data = response.data;

    let replyText = '';
    if (data.success && data.items && data.items.length > 0) {
      const h = data.header;
      replyText = `📊 ข้อมูล DUID: ${userMessage}\n` +
                  `━━━━━━━━━━━━━━━\n` +
                  `📍 Region: ${h.region}\n` +
                  `🏢 คลัง: ${h.ownerWarehouse || "-"}\n` +
                  `👷 ผู้รับ: ${h.ownerReceiver || "-"}\n` +
                  `━━━━━━━━━━━━━━━\n` +
                  `📦 รายการสินค้า (${data.items.length} รายการ):\n`;

      data.items.forEach((item, index) => {
        replyText += `🔹 ${index + 1}: ${item.model}\n   (SN: ${item.sn || '-'}, Qty: ${item.qty})\n`;
      });
      replyText += `━━━━━━━━━━━━━━━\n🔍 ค้นหาเมื่อ: ${new Date().toLocaleTimeString('th-TH')}`;
    } else {
      // ถ้าไม่ใช่รูปแบบ DUID หรือหาไม่เจอ
      // ถ้าผู้ใช้พิมพ์ "สวัสดี" หรืออื่นๆ ให้ตอบกลับปกติ
      if (userMessage.length < 5) {
        replyText = "สวัสดีครับ! ส่ง DUID มาให้ผมเพื่อเช็คสต็อกได้เลยนะครับ 📦";
      } else {
        replyText = `❌ ไม่พบข้อมูลสำหรับ DUID: "${userMessage}"\nกรุณาตรวจสอบความถูกต้องอีกครั้งครับ`;
      }
    }

    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: replyText }]
    });
  } catch (err) {
    console.error('Query Error:', err);
    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' }]
    });
  }
}

module.exports = app;

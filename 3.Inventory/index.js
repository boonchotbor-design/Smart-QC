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

app.get('/', (req, res) => res.send('Inventory Smart System Bridge is alive! v6.6.1'));

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

// Webhook สำหรับรับข้อความจาก Telegram
app.post('/telegram-webhook', express.json(), async (req, res) => {
  const { message } = req.body;
  if (!message || !message.text || !message.chat) return res.status(200).send('OK');

  const chatId = message.chat.id;
  const userMessage = message.text.trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const gasUrl = process.env.GAS_WEB_APP_URL || GAS_WEB_APP_URL;

  console.log(`Telegram Request: ChatID=${chatId}, Msg=${userMessage}`);

  if (userMessage.toLowerCase() === '/start') {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: "👋 ยินดีต้อนรับสู่ Inventory Smart Bot (V.6.6.1)\n\nกรุณาส่ง DUID ที่ต้องการค้นหาข้อมูลได้เลยครับ"
      });
    } catch (e) { console.error('Failed to send /start reply:', e.message); }
    return res.status(200).send('OK');
  }

  if (userMessage.length < 5 && !userMessage.startsWith('/')) return res.status(200).send('OK');

  try {
    const response = await axios.get(`${gasUrl}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 20000 });
    let replyText = response.data;

    if (typeof replyText === 'string' && replyText.includes('❌')) {
      console.log(`Telegram DUID Search: No match found for "${userMessage}". Staying silent.`);
      return res.status(200).send('OK');
    }

    if (!replyText) return res.status(200).send('OK');

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: replyText
    });
  } catch (err) { console.error('Telegram Processing Error:', err.message); }
  res.status(200).send('OK');
});

// Endpoint สำหรับรับแจ้งเตือนเมื่อมีการบันทึกข้อมูล (Save Notification)
app.post('/notify', express.json(), async (req, res) => {
  const { header, items } = req.body;
  if (!header) return res.status(400).send('Missing header');

  const dateStr = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let messageText = `📦 รายงาน Inventory (V.6.6.1)\n` +
                    `━━━━━━━━━━━━━━━\n` +
                    `👤 ลูกค้า: ${header.customer || "-"}\n` +
                    `🛠 งาน: ${header.type || "-"}\n` +
                    `📍 Region: ${header.region || "-"}\n` +
                    `🆔 DUID: ${header.duid || "-"}\n` +
                    `🏢 คลัง: ${header.ownerWarehouse || "-"}\n` +
                    `👷 ผู้รับ: ${header.ownerReceiver || "-"}\n` +
                    `📍 Loc Warehouse: ${header.locationWarehouse || "-"}\n` +
                    `📍 Loc Receiver: ${header.locationReceiver || "-"}\n` +
                    `━━━━━━━━━━━━━━━\n` +
                    `📦 รายการสินค้า (${items ? items.length : 0} รายการ):\n`;

  if (items && items.length > 0) {
    items.forEach((item, index) => {
      messageText += `🔹 รายการที่ ${index + 1}:\n` +
                     `• Type: ${item.type || "-"}\n` +
                     `• Pick up Date: ${dateStr}\n` +
                     `• Bill No: ${header.billNo || "-"}\n` +
                     `• Model: ${item.model || "-"}\n` +
                     `• Item Code: ${item.code || "-"}\n` +
                     `• Item Description: ${item.desc || "-"}\n` +
                     `• Sum of Req.Qty: ${item.qty || "0"}\n` +
                     `• Serial: ${item.sn || "NA"}\n`;
      if (index < items.length - 1) messageText += `----------- \n`;
    });
  }

  messageText += `━━━━━━━━━━━━━━━\n` +
                 `✅ บันทึกสำเร็จ!`;

  // 1. ส่งไป LINE
  const lineDestId = process.env.LINE_DESTINATION_ID || 'Cb4baf5e474773f54f2b6538e4cd4d9ac';
  if (config.channelAccessToken) {
    client.pushMessage({
      to: lineDestId,
      messages: [{ type: 'text', text: messageText }]
    }).catch(err => console.error('LINE Push Error:', err.message));
  }

  // 2. ส่งไป Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramDestId = process.env.TELEGRAM_DESTINATION_ID || '7378939928';

  if (botToken && telegramDestId) {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: telegramDestId,
        text: messageText
      });
      console.log('Telegram Notification Sent');
    } catch (err) { console.error('Telegram Push Error:', err.message); }
  }

  res.send('OK');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userMessage = event.message.text.trim();
  if (userMessage.length < 5) return null;

  try {
    const response = await axios.get(`${GAS_WEB_APP_URL}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 25000 });
    let replyText = response.data;

    if (!replyText || (typeof replyText === 'string' && replyText.includes('❌'))) {
      console.log(`LINE DUID Search: No match found for "${userMessage}". Staying silent.`);
      return null;
    }

    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: replyText }]
    });
  } catch (err) {
    console.error('Query Error:', err.message);
    return null;
  }
}

module.exports = app;

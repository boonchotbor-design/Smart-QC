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

// Webhook สำหรับรับข้อความจาก Telegram
app.post('/telegram-webhook', express.json(), async (req, res) => {
  const { message } = req.body;
  if (!message || !message.text || !message.chat) return res.status(200).send('OK');

  const chatId = message.chat.id;
  const userMessage = message.text.trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const gasUrl = process.env.GAS_WEB_APP_URL || GAS_WEB_APP_URL; // ใช้จาก env หรือตัวแปร global

  console.log(`Telegram Request: ChatID=${chatId}, Msg=${userMessage}`);

  // จัดการคำสั่งพื้นฐาน
  if (userMessage.toLowerCase() === '/start') {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: "👋 ยินดีต้อนรับสู่ AI Inventory Bot (V.6.5.4)\n\nกรุณาส่ง DUID ที่ต้องการค้นหาข้อมูลได้เลยครับ"
      });
    } catch (e) {
      console.error('Failed to send /start reply:', e.message);
    }
    return res.status(200).send('OK');
  }

  if (userMessage.length < 5 && !userMessage.startsWith('/')) {
    return res.status(200).send('OK');
  }

  try {
    if (!gasUrl) throw new Error('GAS_WEB_APP_URL is not defined');

    console.log(`Querying GAS for DUID: ${userMessage}`);
    const response = await axios.get(`${gasUrl}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 20000 });
    let replyText = response.data;

    if (typeof replyText === 'string' && replyText.includes('<!DOCTYPE html>')) {
      replyText = '❌ (V.6.5.4) Google Script ยังไม่ถูกตั้งค่าเป็น "Anyone" หรือเกิด Runtime Error\nกรุณาตรวจสอบการตั้งค่า Deploy ใน Google Script ครับ';
    }

    if (!replyText) replyText = "❌ (V.6.5.4) ไม่พบข้อมูลตอบกลับจากระบบ";

    console.log(`Sending reply to Telegram (Length: ${replyText.length})`);
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: replyText
    });
  } catch (err) {
    console.error('Telegram Processing Error:', err.message);
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: "⚠️ (V.6.5.4) เกิดข้อผิดพลาด:\n" + (err.message || 'Unknown error')
      });
    } catch (innerErr) {
      console.error('Failed to send error message:', innerErr.message);
    }
  }
  res.status(200).send('OK');
});

// Endpoint สำหรับรับแจ้งเตือนเมื่อมีการบันทึกข้อมูล (Save Notification)
app.post('/notify', express.json(), async (req, res) => {
  const { header, items } = req.body;
  if (!header) return res.status(400).send('Missing header');

  const messageText = `✅ บันทึกสำเร็จ (V.6.5.4)\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `🛠 งาน: ${header.type}\n` +
                      `🆔 DUID: ${header.duid}\n` +
                      `📦 รายการสินค้า: ${items ? items.length : 0} รายการ\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `📍 คลัง: ${header.ownerWarehouse || "-"}\n` +
                      `👷 ผู้รับ: ${header.ownerReceiver || "-"}`;
  
  // 1. ส่งไป LINE
  const lineDestId = process.env.LINE_DESTINATION_ID || 'Cb4baf5e474773f54f2b6538e4cd4d9ac';
  client.pushMessage({
    to: lineDestId,
    messages: [{ type: 'text', text: messageText }]
  }).catch(err => console.error('LINE Push Error:', err.message));

  // 2. ส่งไป Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramDestId = process.env.TELEGRAM_DESTINATION_ID || '7378939928'; // ใช้ ID จากรูปภาพที่ส่งมาล่าสุด

  if (botToken && telegramDestId) {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: telegramDestId,
        text: messageText
      });
      console.log('Telegram Notification Sent');
    } catch (err) {
      console.error('Telegram Push Error:', err.message);
    }
  }

  res.send('OK');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text.trim();
  if (userMessage.length < 5) return null; 

  let replyText = "";
  try {
    const response = await axios.get(`${GAS_WEB_APP_URL}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 25000 });
    replyText = response.data;

    // ตรวจสอบว่า GAS ส่ง HTML กลับมาหรือไม่ (แสดงว่ามี Error ที่ฝั่ง GAS)
    if (typeof replyText === 'string' && replyText.includes('<!DOCTYPE html>')) {
      console.error('GAS returned HTML instead of text. Likely a runtime error.');
      replyText = '❌ (V.6.5.4) Google Script เกิดข้อผิดพลาดภายใน (Runtime Error)';
    }

    // จำกัดความยาวไม่ให้เกิน 5000 ตัวอักษรตามกฎของ LINE
    if (typeof replyText === 'string' && replyText.length > 5000) {
      replyText = replyText.substring(0, 4900) + "\n\n... (ข้อมูลยาวเกินไป ถูกตัดออก)";
    }

    if (!replyText) replyText = "❌ (V.6.5.4) ไม่พบข้อมูลตอบกลับจากระบบ";

    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: replyText }]
    });
  } catch (err) {
    console.error('Query Error:', err.message);
    // พยายามตอบกลับด้วยข้อความ Error สั้นๆ
    try {
      return await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '⚠️ (V.6.5.4) เกิดข้อผิดพลาดในการเชื่อมต่อ Google Script\n' + (err.message || '') }]
      });
    } catch (innerErr) {
      console.error('Failed to send error message:', innerErr.message);
    }
  }
}

module.exports = app;

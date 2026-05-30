const express = require('express');
const { messagingApi, middleware } = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim(),
  channelSecret: (process.env.LINE_CHANNEL_SECRET || '').trim(),
};

const GAS_WEB_APP_URL = (process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwoTnwaExeObR_54tVajXxz7j2rAsQlyIWN3rbaGfTXxf9-HZ8oAMs4_gKOhrFx7b6b/exec').trim();

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const app = express();

app.get('/', (req, res) => {
  const diagnostic = {
    status: 'Alive',
    version: 'v6.6.3',
    env: {
      hasGasUrl: !!process.env.GAS_WEB_APP_URL,
      hasLineToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      hasTelegramToken: !!process.env.TELEGRAM_BOT_TOKEN,
      hasTelegramDest: !!process.env.TELEGRAM_DESTINATION_ID
    }
  };
  res.json(diagnostic);
});

// ฟังก์ชันกลางสำหรับส่งแจ้งเตือน (Telegram & LINE)
async function sendNotification(header, items) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramDestId = process.env.TELEGRAM_DESTINATION_ID || '7378939928';
    const lineDestId = process.env.LINE_DESTINATION_ID || 'Cb4baf5e474773f54f2b6538e4cd4d9ac';
    const dateStr = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Bangkok' });
    
    let messageText = `📦 รายงาน Inventory (V.6.6.3)\n` +
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
    if (config.channelAccessToken) {
      await client.pushMessage({
        to: lineDestId,
        messages: [{ type: 'text', text: messageText }]
      }).catch(err => console.error('LINE Push Error:', err.message));
    }

    // 2. ส่งไป Telegram
    if (botToken && telegramDestId) {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: telegramDestId,
        text: messageText
      }).catch(err => console.error('Telegram Push Error:', err.message));
    }
    return true;
  } catch (err) {
    console.error('sendNotification Error:', err.message);
    return false;
  }
}

app.post('/webhook', (req, res, next) => {
  if (!config.channelAccessToken || !config.channelSecret) return res.status(200).send('LINE not configured');
  next();
}, middleware(config), (req, res) => {
  if (!req.body.events || !Array.isArray(req.body.events)) return res.status(200).send('OK');
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result)).catch((err) => { console.error('Webhook Error:', err.message); res.status(500).end(); });
});

app.post('/telegram-webhook', express.json(), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.chat) return res.status(200).send('OK');

    const chatId = message.chat.id;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const gasUrl = process.env.GAS_WEB_APP_URL || GAS_WEB_APP_URL;

    if (!botToken) return res.status(200).send('OK');

    // 1. จัดการรูปภาพ (OCR) - รองรับทั้งแบบ Photo และ Document (File)
    const photo = message.photo ? message.photo[message.photo.length - 1] : (message.document && message.document.mime_type.startsWith('image/') ? message.document : null);
    
    if (photo) {
      console.log(`Telegram OCR: Received image from chat ${chatId}`);
      try {
        const fileId = photo.file_id;
        
        // ส่งข้อความตอบรับทันทีเพื่อป้องกัน Timeout
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: "🔍 กำลังดาวน์โหลดและประมวลผลรูปภาพด้วย AI OCR (V.6.6.3)..." }).catch(e => console.error('Initial ACK Error:', e.message));
        
        // รับ File Path จาก Telegram
        const fileRes = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const filePath = fileRes.data.result.file_path;
        const imageUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        
        // ดาวน์โหลดรูปภาพ
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imgRes.data, 'binary').toString('base64');
        
        const ocrRes = await axios.post(gasUrl, { action: "ocr", base64: base64 });
        const ocrData = ocrRes.data;
        
        if (ocrRes.data.success && ocrData.data.items.length > 0) {
          const { header, items } = ocrData.data;
          
          // บันทึกลง Spreadsheet โดยอัตโนมัติ
          const saveRes = await axios.post(gasUrl, { action: "save", header: header, items: items });
          
          if (saveRes.data.success) {
            await sendNotification(header, items);
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              chat_id: chatId,
              text: `✅ ตรวจพบข้อมูลและบันทึกเรียบร้อย!\n\n🆔 DUID: ${header.duid}\n📄 Bill: ${header.billNo}\n📍 Region: ${header.region}\n📦 รายการ: ${items.length} รายการ`
            });
          } else {
            throw new Error(saveRes.data.message || "Save failed");
          }
        } else {
          // แจ้งเตือนพร้อมส่งข้อความที่อ่านได้กลับไปเพื่อ Debug
          let rawText = (ocrData.data && ocrData.data.text) ? ocrData.data.text : "ไม่พบข้อความ";
          await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: `❌ ไม่สามารถแยกข้อมูลสินค้าได้\n\n🔍 ข้อความที่ AI อ่านได้ (บางส่วน):\n${rawText.substring(0, 500)}...\n\n💡 คำแนะนำ: ตรวจสอบว่ารูปถ่ายชัดเจน และมี DUID/เลขที่บิล อยู่ในบรรทัดที่ AI อ่านได้`
          });
        }
      } catch (err) {
        console.error('OCR Process Error:', err.message);
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: `❌ เกิดข้อผิดพลาด: ${err.message}` });
      }
      return res.status(200).send('OK');
    }

    if (message.text) {
      const userMessage = message.text.trim();
      if (userMessage.toLowerCase() === '/start') {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: "👋 ยินดีต้อนรับสู่ Inventory Smart Bot (V.6.6.3)\n\n📸 ส่งรูปใบ Picking List เพื่อบันทึกข้อมูลอัตโนมัติ\n🔍 หรือส่ง DUID ที่ต้องการค้นหาข้อมูลได้เลยครับ" });
        return res.status(200).send('OK');
      }
      
      if (userMessage.length < 5 && !userMessage.startsWith('/')) {
         await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: "❓ ข้อความสั้นเกินไปครับ (กรุณาส่ง DUID 5 ตัวขึ้นไป)" });
         return res.status(200).send('OK');
      }
      const response = await axios.get(`${gasUrl}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 20000 });
      let replyText = response.data;
      if (!replyText || (typeof replyText === 'string' && replyText.includes('<!DOCTYPE html>'))) return res.status(200).send('OK');
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: replyText });
    }
  } catch (err) { console.error('Telegram Webhook Error:', err.message); }
  res.status(200).send('OK');
});

app.post('/notify', express.json(), async (req, res) => {
  const { header, items } = req.body;
  if (!header) return res.status(400).send('Missing header');
  const success = await sendNotification(header, items);
  res.send(success ? 'OK' : 'Error');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;
  const userMessage = event.message.text.trim();
  if (userMessage.length < 5) return null;
  try {
    const response = await axios.get(`${GAS_WEB_APP_URL}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 25000 });
    let replyText = response.data;
    if (!replyText || (typeof replyText === 'string' && replyText.includes('❌'))) return null;
    return await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: replyText }] });
  } catch (err) { console.error('Query Error:', err.message); return null; }
}

module.exports = app;

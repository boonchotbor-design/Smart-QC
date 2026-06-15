const express = require('express');
const { messagingApi, middleware } = require('@line/bot-sdk');
const axios = require('axios');

// สนับสนุนการมีหลาย LINE Bot
const LINE_CONFIGS = [
  {
    token: (process.env.LINE_CHANNEL_ACCESS_TOKEN || 'eZe15XyurA2eFNBEjeMJ1PNG3lEiujNpzJ01GGarnoq7GFaYDqBttYZk0BHHh7KE5ZOaQdNJUdmhoCc+UoXxqmT1CdHZ7KHUWr7XACo1VY4ezEZpWVHuzufGydzTBOWnVgEgcksIJQDFeQrL3dvkUQdB04t89/1O/w1cDnyilFU=').trim(),
    secret: (process.env.LINE_CHANNEL_SECRET || '9e671fd5239927772a16dbf00b7f7060').trim(),
    destId: (process.env.LINE_DESTINATION_ID || 'Cb4baf5e474773f54f2b6538e4cd4d9ac').trim()
  },
  {
    token: 'VOVhBbD6EG9VwKFo0V1s/wAclekysxBkWrudqSrkp5kFd/8tdrWyi1der1Eui54whdk/E0XWQxF9amI05MWgRq2/Nu628A/1O4yZJB/6warrshDOj2MtnhnM59yZh7b66qbEb/Qsx5XY3OzgXnkNZgdB04t89/1O/w1cDnyilFU=',
    secret: 'd7b4fe008fd6c1f75fed2a5d1ef30fb4',
    destId: (process.env.LINE_DESTINATION_ID || 'Cb4baf5e474773f54f2b6538e4cd4d9ac').trim()
  },
  {
    token: '+rX1Vp8W/wacBl/JTAqkRMDfx7oj/wvTV66GSpASORlUoTL2LHlAoNKIlQDXAX8cLYFHufC5EOPIBWElgRYXjC9qNUNbSjpq9JZ9rInybwWVSVSs9jYObP2EqRTgreI/30kjvTz8U2rnFvAYxX8mGwdB04t89/1O/w1cDnyilFU=',
    secret: '336ea8463c7b4c4d2145faebf9b1a6c2',
    destId: (process.env.LINE_DESTINATION_ID || 'Cb4baf5e474773f54f2b6538e4cd4d9ac').trim()
  }
];

const config = {
  channelAccessToken: LINE_CONFIGS[0].token,
  channelSecret: LINE_CONFIGS[0].secret
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const GAS_WEB_APP_URL = (process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwoTnwaExeObR_54tVajXxz7j2rAsQlyIWN3rbaGfTXxf9-HZ8oAMs4_gKOhrFx7b6b/exec').trim();
const TELEGRAM_BOT_TOKEN_FALLBACK = '8621299992:AAEsgz7NGNZR0gqP7vHlQ3EbeLcxsGySe7Y';

const app = express();

app.get('/', (req, res) => {
  const diagnostic = {
    status: 'Alive',
    version: 'v6.7.9',
    env: {
      hasGasUrl: !!process.env.GAS_WEB_APP_URL,
      lineBotsCount: LINE_CONFIGS.length,
      hasTelegramTokenEnv: !!process.env.TELEGRAM_BOT_TOKEN,
      telegramTokenUsed: (process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN_FALLBACK).substring(0, 15) + '...',
      hasTelegramDest: !!process.env.TELEGRAM_DESTINATION_ID
    }
  };
  res.json(diagnostic);
});

// Helper ฟังก์ชันสำหรับสร้างรูปแบบข้อความแจ้งเตือนตามที่ผู้ใช้งานกำหนด
function formatNotificationMessage(header, items) {
  let msg = `📊 ข้อมูล DUID: ${header.duid || "-"}\n` +
            `━━━━━━━━━━━━━━━\n` +
            `👤 ลูกค้า: ${header.customer || "-"}\n` +
            `🛠 งาน: ${header.type || "-"}\n` +
            `📄 bill No : ${header.billNo || "-"}\n` +
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
      msg += `🔹 ${index + 1}: ${item.model || "-"}\n` +
             `   (SN: ${item.sn || "NA"}, Qty: ${item.qty || "0"})\n`;
    });
  }
  msg += `━━━━━━━━━━━━━━━\n` +
         `✅ บันทึกสำเร็จ (V.6.7.9)!`;
  return msg;
}

// ฟังก์ชันกลางสำหรับส่งแจ้งเตือน (Telegram & LINE)
async function sendNotification(header, items) {
  let errors = [];
  let lineSuccess = false;
  let telegramSuccess = false;
  
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN_FALLBACK;
    const telegramDestId = process.env.TELEGRAM_DESTINATION_ID || '7378939928';
    
    console.log(`Notification Triggered: DUID=${header.duid}, Region=${header.region}, TokenUsed=${botToken.substring(0, 10)}...`);

    const messageText = formatNotificationMessage(header, items);

    // 1. ส่งไป LINE (ทุกตัวที่ตั้งค่าไว้)
    for (const lineBot of LINE_CONFIGS) {
      if (lineBot.token && lineBot.destId) {
        try {
          const client = new messagingApi.MessagingApiClient({ channelAccessToken: lineBot.token });
          await client.pushMessage({
            to: lineBot.destId,
            messages: [{ type: 'text', text: messageText }]
          });
          console.log(`LINE Push Success: ${lineBot.token.substring(0, 10)}...`);
          lineSuccess = true;
        } catch (err) {
          console.error(`LINE Push Error (${lineBot.token.substring(0, 10)}...):`, err.message);
          errors.push('LINE:' + err.message);
        }
      }
    }

    // 2. ส่งไป Telegram
    if (botToken && telegramDestId) {
      try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: telegramDestId,
          text: messageText
        });
        console.log(`Telegram Push Success`);
        telegramSuccess = true;
      } catch (err) { 
        console.error('Telegram Push Error:', err.message); 
        console.error('Bot Token Used:', botToken.substring(0, 15) + '...');
        errors.push('Telegram:' + err.message); 
      }
    }
    
    // โยน Error เฉพาะกรณีที่ล้มเหลวทั้งหมด (ไม่มีช่องทางไหนส่งสำเร็จเลย)
    if (!lineSuccess && !telegramSuccess && errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    return true;
  } catch (err) {
    console.error('sendNotification Fatal Error:', err.message);
    throw err;
  }
}

// Wrapper สำหรับ Middleware ของ LINE เพื่อป้องกัน Crash กรณีไม่มี Secret
const lineMiddleware = (req, res, next) => {
  if (!config.channelSecret) return next();
  try {
    return middleware(config)(req, res, next);
  } catch (e) {
    console.error('LINE Middleware Init Error:', e.message);
    return next();
  }
};

app.post('/webhook', (req, res, next) => {
  if (!config.channelAccessToken || !config.channelSecret) return res.status(200).send('LINE not configured');
  next();
}, lineMiddleware, (req, res) => {
  if (!req.body.events || !Array.isArray(req.body.events)) return res.status(200).send('OK');
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result)).catch((err) => { console.error('Webhook Error:', err.message); res.status(500).end(); });
});

app.post('/telegram-webhook', express.json({ limit: '50mb' }), async (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN_FALLBACK;
  let currentChatId = null;

  try {
    const { message } = req.body;
    if (!message || !message.chat) return res.status(200).send('OK');

    currentChatId = message.chat.id;
    const gasUrl = (process.env.GAS_WEB_APP_URL || GAS_WEB_APP_URL).trim();

    if (!botToken) return res.status(200).send('OK');

    // 1. จัดการรูปภาพ (OCR)
    const photo = message.photo ? message.photo[message.photo.length - 1] : (message.document && message.document.mime_type.startsWith('image/') ? message.document : null);
    
    if (photo) {
      console.log(`Telegram OCR: Received image from chat ${currentChatId}`);
      try {
        const fileId = photo.file_id;
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: "🔍 กำลังประมวลผลรูปภาพขนาดใหญ่ด้วย AI (V.6.6.7)..." }).catch(e => {});
        
        const fileRes = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const filePath = fileRes.data.result.file_path;
        const imageUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imgRes.data, 'binary').toString('base64');
        
        const ocrRes = await axios.post(gasUrl, { action: "ocr", base64: base64 }, { timeout: 60000 });
        if (ocrRes.data.success && ocrRes.data.data.items.length > 0) {
          const { header, items } = ocrRes.data.data;
          const saveRes = await axios.post(gasUrl, { action: "save", header: header, items: items }, { timeout: 60000 });
          
          if (saveRes.data.success) {
            // อัปโหลดรูปภาพต้นฉบับไปยัง Google Drive ตามโครงสร้าง Region > DUID
            const uploadRes = await axios.post(gasUrl, { action: "upload", header: header, base64: base64, index: 1 }, { timeout: 60000 }).catch(e => console.error('Auto-upload fail:', e.message));
            const folderUrl = (uploadRes && uploadRes.data && uploadRes.data.folderUrl) ? uploadRes.data.folderUrl : null;

            await sendNotification(header, items).catch(e => console.error('Notify fail:', e.message));
            
            let detailMsg = formatNotificationMessage(header, items);
            if (folderUrl) detailMsg += `\n📂 เปิดโฟลเดอร์: ${folderUrl}`;

            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: detailMsg });
          } else {
            throw new Error(saveRes.data.message || "Save failed");
          }
        } else {
          let rawText = (ocrRes.data.data && ocrRes.data.data.text) ? ocrRes.data.data.text : "ไม่พบข้อความ";
          await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: `❌ แยกข้อมูลไม่ได้\n\n🔍 AI อ่านได้:\n${rawText.substring(0, 300)}...` });
        }
      } catch (err) {
        console.error('OCR Process Error:', err.message);
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: `❌ ข้อผิดพลาด: ${err.message}` });
      }
      return res.status(200).send('OK');
    }

    if (message.text) {
      const userMessage = message.text.trim();
      if (userMessage.toLowerCase() === '/start') {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: "👋 ยินดีต้อนรับสู่ Inventory Smart Bot (V.6.7.9)\n\n📸 ส่งรูปใบ Picking List เพื่อบันทึกข้อมูลอัตโนมัติ\n🔍 หรือส่ง DUID ที่ต้องการค้นหาข้อมูลได้เลยครับ" });
        return res.status(200).send('OK');
      }
      
      if (userMessage.length < 5 && !userMessage.startsWith('/')) {
         await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: "❓ ข้อความสั้นเกินไปครับ" });
         return res.status(200).send('OK');
      }
      
      const response = await axios.get(`${gasUrl}?duid=${encodeURIComponent(userMessage)}&format=text`, { timeout: 20000 });
      if (response.data && typeof response.data === 'string' && !response.data.includes('<!DOCTYPE html>')) {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: response.data });
      }
    }
  } catch (err) { 
    console.error('Telegram Webhook Error:', err.message);
    if (botToken && currentChatId) {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: currentChatId, text: `❌ ระบบขัดข้อง: ${err.message}` }).catch(e => {});
    }
  }
  res.status(200).send('OK');
});

app.post('/notify', express.json(), async (req, res) => {
  try {
    const { header, items } = req.body;
    if (!header) return res.status(400).send('Missing header');
    await sendNotification(header, items);
    res.send('OK');
  } catch (err) {
    res.status(500).send(err.message);
  }
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

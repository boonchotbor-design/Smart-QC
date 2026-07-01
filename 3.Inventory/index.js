const express = require('express');
const { messagingApi, validateSignature } = require('@line/bot-sdk');
const axios = require('axios');

// ─────────────────────────────────────────────
// Bot Configs (#1-#5)  destination ทุกตัวใช้ U110afe8872d7f73074e56c457df28598
// ─────────────────────────────────────────────
const LINE_CONFIGS = [
  {
    name:   'TLN-Inventory#1',
    token:  (process.env.LINE_CHANNEL_ACCESS_TOKEN || 'eZe15XyurA2eFNBEjeMJ1PNG3lEiujNpzJ01GGarnoq7GFaYDqBttYZk0BHHh7KE5ZOaQdNJUdmhoCc+UoXxqmT1CdHZ7KHUWr7XACo1VY4ezEZpWVHuzufGydzTBOWnVgEgcksIJQDFeQrL3dvkUQdB04t89/1O/w1cDnyilFU=').trim(),
    secret: (process.env.LINE_CHANNEL_SECRET || '9e671fd5239927772a16dbf00b7f7060').trim(),
    destId: 'U110afe8872d7f73074e56c457df28598'
  },
  {
    name:   'TLN-Inventory#2',
    token:  'VOVhBbD6EG9VwKFo0V1s/wAclekysxBkWrudqSrkp5kFd/8tdrWyi1der1Eui54whdk/E0XWQxF9amI05MWgRq2/Nu628A/1O4yZJB/6warrshDOj2MtnhnM59yZh7b66qbEb/Qsx5XY3OzgXnkNZgdB04t89/1O/w1cDnyilFU=',
    secret: 'd7b4fe008fd6c1f75fed2a5d1ef30fb4',
    destId: 'U110afe8872d7f73074e56c457df28598'
  },
  {
    name:   'TLN-Inventory#3',
    token:  '+rX1Vp8W/wacBl/JTAqkRMDfx7oj/wvTV66GSpASORlUoTL2LHlAoNKIlQDXAX8cLYFHufC5EOPIBWElgRYXjC9qNUNbSjpq9JZ9rInybwWVSVSs9jYObP2EqRTgreI/30kjvTz8U2rnFvAYxX8mGwdB04t89/1O/w1cDnyilFU=',
    secret: '336ea8463c7b4c4d2145faebf9b1a6c2',
    destId: 'U110afe8872d7f73074e56c457df28598'
  },
  {
    name:   'TLN-Inventory#4',
    token:  'PLTC9GGkhVetPnJpG6Uq7tqRjZ6YZkBhsZkEsJGhuuElOW/+UCfLsZwT6tAZx9PeO70O8YORfw80wSw+i2AiyDBgvTtp90ljP1zbQ7EJk3J8mSEkKGdGpM5rO0SAvwcL2GmxxgNsQojv6ILXSI7kFQdB04t89/1O/w1cDnyilFU=',
    secret: 'dc9465ad716b7c312283d06649ec3ba1',
    destId: 'U110afe8872d7f73074e56c457df28598'
  },
  {
    name:   'TLN-Inventory#5',
    token:  'UXu38/91MpirgVo6cMnUR7Rnqo79WOi7R4GqeIMj2O8jMzO5U1Ws64UmFySOFh6lCbTNzpgUCq43OTw04h3T73uImFd5A2RYt7eyj6Fz1J85MUsTsy2CYTfD/lfRPIWB60jyTWryPTgXOpztiLNaYwdB04t89/1O/w1cDnyilFU=',
    secret: '5fa55926cffd99f317c9d8daf2f84a03',
    destId: 'U110afe8872d7f73074e56c457df28598'
  }
];

const GAS_WEB_APP_URL      = (process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwoTnwaExeObR_54tVajXxz7j2rAsQlyIWN3rbaGfTXxf9-HZ8oAMs4_gKOhrFx7b6b/exec').trim();
const TELEGRAM_BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN   || '8621299992:AAHlzLEpwO0IAbAAChytKnb4fT6Yys10OL8';
const TELEGRAM_DESTINATION = process.env.TELEGRAM_DESTINATION_ID || '-5188878406';

const app = express();

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'Alive', version: 'V.7.0.1',
    bots: LINE_CONFIGS.map(b => b.name),
    gasUrl: GAS_WEB_APP_URL.substring(0, 60) + '...'
  });
});

// ─────────────────────────────────────────────
// Format Notification Message
// ─────────────────────────────────────────────
function formatNotificationMessage(header, items) {
  let msg =
    `📦 TLN-Inventory V.7.1.0\n` +
    `━━━━━━━━━━━━━━━\n` +
    `✅ บันทึกข้อมูลใหม่\n` +
    `👤 โดย: ${header.userName || header.savedBy || '-'}\n` +
    `📊 DUID: ${header.duid || '-'}\n` +
    `👤 ลูกค้า: ${header.customer || '-'}\n` +
    `🛠 งาน: ${header.type || '-'}\n` +
    `📄 Bill No: ${header.billNo || '-'}\n` +
    `📍 Region: ${header.region || '-'}\n` +
    `🏢 คลัง: ${header.ownerWarehouse || '-'}\n` +
    `👷 ผู้รับ: ${header.ownerReceiver || '-'}\n` +
    `📍 Loc Warehouse: ${header.locationWarehouse || '-'}\n` +
    `📍 Loc Receiver: ${header.locationReceiver || '-'}\n` +
    `━━━━━━━━━━━━━━━\n`;

  if (items && items.length > 0) {
    items.forEach((item, idx) => {
      msg += `🔹 ${idx + 1}: ${item.model || '-'}\n   (SN: ${item.sn || 'NA'}, Qty: ${item.qty || 0})\n`;
    });
    msg += `━━━━━━━━━━━━━━━\n`;
  }
  
  msg += `🕐 บันทึกเมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;
  return msg;
}

// ─────────────────────────────────────────────
// Send Notification — LINE ทุก bot + Telegram
// ─────────────────────────────────────────────
async function sendNotification(header, items) {
  const messageText = formatNotificationMessage(header, items);
  let lineSuccess = false, telegramSuccess = false, errors = [];

  for (const bot of LINE_CONFIGS) {
    if (!bot.token || !bot.destId) continue;
    try {
      const client = new messagingApi.MessagingApiClient({ channelAccessToken: bot.token });
      await client.pushMessage({ to: bot.destId, messages: [{ type: 'text', text: messageText }] });
      console.log(`LINE Push OK: ${bot.name} → ${bot.destId}`);
      lineSuccess = true;
    } catch (err) {
      console.error(`LINE Push Error (${bot.name}):`, err.message);
      errors.push(`${bot.name}:${err.message}`);
    }
  }

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_DESTINATION, text: messageText
    });
    telegramSuccess = true;
    console.log('Telegram Push OK');
  } catch (err) {
    console.error('Telegram Push Error:', err.message);
    errors.push('Telegram:' + err.message);
  }

  if (!lineSuccess && !telegramSuccess && errors.length > 0) throw new Error(errors.join(', '));
  return true;
}

// ─────────────────────────────────────────────
// Search DUID from GAS
// ─────────────────────────────────────────────
async function searchDuidFromGAS(duid) {
  try {
    const url = `${GAS_WEB_APP_URL}?duid=${encodeURIComponent(duid)}&format=text`;
    const res = await axios.get(url, { timeout: 25000, maxRedirects: 5 });
    if (res.data && typeof res.data === 'string' && !res.data.includes('<!DOCTYPE')) {
      return res.data;
    }
    return null;
  } catch (err) {
    console.error('searchDuid error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// LINE Webhook
// ─────────────────────────────────────────────
const lineJsonParser = express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
});

const multiLineMiddleware = (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  if (!signature) return next();
  const rawBody = req.rawBody || JSON.stringify(req.body);

  let matchedBot = null;
  for (const bot of LINE_CONFIGS) {
    try {
      if (bot.secret && validateSignature(rawBody, bot.secret, signature)) {
        matchedBot = bot;
        break;
      }
    } catch (e) {}
  }

  if (!matchedBot) {
    console.warn('LINE Signature mismatch — returning 200 anyway');
    return res.status(200).json({ status: 'ok' });
  }
  req.matchedBot = matchedBot;
  next();
};

app.post('/webhook', lineJsonParser, multiLineMiddleware, async (req, res) => {
  res.status(200).json({ status: 'ok' }); // ตอบ 200 ทันที

  if (!req.body || !Array.isArray(req.body.events)) return;

  const bot = req.matchedBot || LINE_CONFIGS[0];
  const replyClient = new messagingApi.MessagingApiClient({ channelAccessToken: bot.token });

  for (const event of req.body.events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue;

    const text  = event.message.text.trim();
    const upper = text.toUpperCase();
    let replyText = '';

    if (upper === '/ID' || upper === 'GET ID') {
      replyText =
        `ℹ️ LINE Info:\n🤖 Bot: ${bot.name}\n` +
        `🔹 Type: ${event.source.type}\n` +
        `🔹 User ID: ${event.source.userId || '-'}\n` +
        `🔹 Group ID: ${event.source.groupId || '-'}`;
    } else if (upper.startsWith('DUID:') || upper.startsWith('ค้นหา:') || upper.startsWith('SEARCH:')) {
      const duid = text.split(':').slice(1).join(':').trim();
      replyText  = duid
        ? (await searchDuidFromGAS(duid) || `❌ ไม่พบข้อมูล DUID: ${duid}`)
        : '❌ กรุณาระบุ DUID\nเช่น DUID: Ph26_CapEx_Mod';
    } else if (['สถานะ','STATUS','HELP','/START'].includes(upper)) {
      replyText =
        `📦 ${bot.name} V.7.0.1\n━━━━━━━━━━━━━━━\n` +
        `🔍 ค้นหา DUID:\nพิมพ์: DUID: [รหัส]\nเช่น: DUID: Ph26_CapEx_Mod\n\n` +
        `📋 คำสั่ง:\n• DUID: [รหัส] — ค้นหาข้อมูล\n• สถานะ — เมนูนี้\n• /id — Group/User ID`;
    } else if (text.length >= 5) {
      const result = await searchDuidFromGAS(text);
      replyText = (result && !result.includes('<!DOCTYPE'))
        ? result
        : `📦 ${bot.name}\n━━━━━━━━━━━━━━━\nพิมพ์ DUID: [รหัส] เพื่อค้นหา\nหรือพิมพ์ "สถานะ" เพื่อดูเมนู`;
    }

    if (!replyText) continue;
    if (replyText.length > 4900) replyText = replyText.substring(0, 4900) + '\n...(ข้อมูลถูกตัด)';

    try {
      await replyClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: replyText }]
      });
    } catch (err) {
      console.error(`Reply Error (${bot.name}):`, err.message);
    }
  }
});

// ─────────────────────────────────────────────
// Telegram Webhook
// ─────────────────────────────────────────────
app.post('/telegram-webhook', express.json({ limit: '50mb' }), async (req, res) => {
  let currentChatId = null;
  try {
    const { message } = req.body;
    if (!message || !message.chat) return res.status(200).send('OK');
    currentChatId = message.chat.id;

    const photo = message.photo
      ? message.photo[message.photo.length - 1]
      : (message.document?.mime_type?.startsWith('image/') ? message.document : null);

    if (photo) {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        { chat_id: currentChatId, text: '🔍 กำลังประมวลผลรูปภาพ...' }).catch(() => {});
      const fileRes  = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`);
      const filePath = fileRes.data.result.file_path;
      const imgRes   = await axios.get(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`, { responseType: 'arraybuffer' });
      const base64   = Buffer.from(imgRes.data, 'binary').toString('base64');
      const ocrRes   = await axios.post(GAS_WEB_APP_URL, { action: 'ocr', base64 }, { timeout: 60000 });

      if (ocrRes.data.success && ocrRes.data.data?.items?.length > 0) {
        const { header, items } = ocrRes.data.data;
        const saveRes = await axios.post(GAS_WEB_APP_URL, { action: 'save', header, items }, { timeout: 60000 });
        if (saveRes.data.success) {
          const uploadRes = await axios.post(GAS_WEB_APP_URL, { action: 'upload', header, base64, index: 1 }, { timeout: 60000 }).catch(() => null);
          const folderUrl = uploadRes?.data?.folderUrl || null;
          await sendNotification(header, items).catch(() => {});
          let msg = formatNotificationMessage(header, items);
          if (folderUrl) msg += `\n📂 ${folderUrl}`;
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: currentChatId, text: msg });
        } else {
          throw new Error(saveRes.data.message || 'Save failed');
        }
      } else {
        const rawText = ocrRes.data.data?.text || 'ไม่พบข้อความ';
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          { chat_id: currentChatId, text: `❌ แยกข้อมูลไม่ได้\n🔍 อ่านได้:\n${rawText.substring(0, 300)}` });
      }
      return res.status(200).send('OK');
    }

    if (message.text) {
      const txt = message.text.trim();
      if (txt.toLowerCase() === '/start') {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          { chat_id: currentChatId, text: '👋 TLN-Inventory V.7.0.1\n📸 ส่งรูปใบ Picking List หรือพิมพ์ DUID เพื่อค้นหา' });
        return res.status(200).send('OK');
      }
      if (txt.toLowerCase() === '/id' || txt.toLowerCase() === 'get id') {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          { chat_id: currentChatId, text: `ℹ️ Chat ID: ${currentChatId}\nType: ${message.chat.type}` });
        return res.status(200).send('OK');
      }
      if (txt.length >= 3) {
        const result = await searchDuidFromGAS(txt);
        if (result && !result.includes('<!DOCTYPE')) {
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: currentChatId, text: result });
        }
      }
    }
  } catch (err) {
    console.error('Telegram Webhook Error:', err.message);
    if (currentChatId) {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        { chat_id: currentChatId, text: `❌ ระบบขัดข้อง: ${err.message}` }).catch(() => {});
    }
  }
  res.status(200).send('OK');
});

// ─────────────────────────────────────────────
// /notify — รับจาก GAS แล้ว push ทุกช่องทาง
// ─────────────────────────────────────────────
app.post('/notify', express.json(), async (req, res) => {
  try {
    const { header, items } = req.body;
    if (!header) return res.status(400).send('Missing header');
    await sendNotification(header, items);
    res.send('OK');
  } catch (err) {
    console.error('/notify error:', err.message);
    res.status(500).send(err.message);
  }
});

module.exports = app;

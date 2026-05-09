/**
 * 🚀 Telegram Inventory Bot (AIS & TRUE) - Ver 2.6 (STABLE)
 * ระบบปุ่มกดทีละขั้นตอน (Step-by-Step) + บันทึก Google Sheets
 */

const TELEGRAM_BOT_TOKEN = '8585490322:AAHdjJHtn0tT84T-QEg5NLUUWymEkhBrtHk';
const SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';

// 🚩 สำคัญ: นำ URL ที่ได้หลังกด Deploy (ต้องจบด้วย /exec) มาวางที่นี่
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyRkdlnT68mhIU9-iZyZYfHzBRz9gQbUIrPJFSkSibSWhqjyCEq_gccUEIrSqpnNT0Q/exec';

const ITEM_LISTS = {
  "ANTENNA": ["AMB4519R9v06", "AMB4520R9v06", "MBMF-65-18DDE-IN(R)-TH", "ADU4521R0v06"],
  "AAU": ["AAU5726e", "AAU5768", "AAU5636m", "AAU5614"],
  "RRU": ["RRU5258", "RRU3962", "RRU5505", "RRU5508"],
  "BBU": ["BBU5900", "BBU5900A", "UMPTg2", "UPEUg"],
  "BOARD": ["UBBPg1", "UBBPg2", "UBBPg5", "UBBPg3"],
  "DCDU/DPU": ["EPS100D", "DCDU12B", "DCDU16D", "OPM30"]
};

/**
 * ทดสอบความพร้อม (เปิด URL นี้ใน Chrome)
 */
function doGet(e) { 
  return ContentService.createTextOutput("✅ Bot Ver 2.6 is Ready and Publicly Accessible!"); 
}

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    if (contents.callback_query) { 
      handleCallback(contents.callback_query); 
      return ContentService.createTextOutput("ok"); 
    }
    
    const message = contents.message || contents.edited_message;
    if (!message || !message.text) return ContentService.createTextOutput("ok");

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text.trim();

    // เช็คคำสั่ง /start
    if (text.toLowerCase().indexOf('/start') === 0) {
      CacheService.getScriptCache().remove("user_" + userId);
      const keyboard = { inline_keyboard: [[{ text: "AIS", callback_data: "SET_CUST:AIS" }, { text: "TRUE", callback_data: "SET_CUST:TRUE" }]] };
      sendKeyboard(chatId, "📦 *ยินดีต้อนรับสู่ระบบ Ver 2.6*\n\n*ขั้นตอนที่ 1:* เลือกโครงการ / ลูกค้า", keyboard);
    } else {
      handleStepInput(chatId, userId, text);
    }
  } catch (err) { console.error(err); }
  return ContentService.createTextOutput("ok");
}

function handleCallback(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const cache = CacheService.getScriptCache();

  if (data.indexOf("SET_CUST:") === 0) {
    const cust = data.split(":")[1];
    cache.put("user_" + userId, JSON.stringify({ customer: cust, step: "TYPE" }), 600);
    const keyboard = { inline_keyboard: [[{ text: "📥 IN", callback_data: "SET_TYPE:IN" }, { text: "📤 OUT", callback_data: "SET_TYPE:OUT" }], [{ text: "🛠 DISMANTLE", callback_data: "SET_TYPE:DISMANTLE" }, { text: "🔄 RETURN", callback_data: "SET_TYPE:RETURN" }]] };
    editMessage(chatId, messageId, "👤 ลูกค้า: *" + cust + "*\n\n🔄 *ขั้นตอนที่ 2:* เลือกประเภทงาน", keyboard);
  } 
  else if (data.indexOf("SET_TYPE:") === 0) {
    const type = data.split(":")[1];
    let session = JSON.parse(cache.get("user_" + userId));
    session.type = type; session.step = "DUID";
    cache.put("user_" + userId, JSON.stringify(session), 600);
    editMessage(chatId, messageId, "👤 ลูกค้า: *" + session.customer + "*\n🔄 ประเภท: *" + type + "*\n\n🆔 *ขั้นตอนที่ 3:* พิมพ์หมายเลข *DUID*");
  } 
  else if (data.indexOf("SET_CAT:") === 0) {
    const cat = data.split(":")[1];
    let session = JSON.parse(cache.get("user_" + userId));
    session.category = cat; cache.put("user_" + userId, JSON.stringify(session), 600);
    let buttons = [];
    ITEM_LISTS[cat].forEach((item, index) => {
      if (index % 2 === 0) buttons.push([{ text: item, callback_data: "SET_ITEM:" + item }]);
      else buttons[buttons.length-1].push({ text: item, callback_data: "SET_ITEM:" + item });
    });
    editMessage(chatId, messageId, "📂 กลุ่ม: *" + cat + "*\n\n📦 *ขั้นตอนที่ 6:* เลือกอุปกรณ์", { inline_keyboard: buttons });
  } 
  else if (data.indexOf("SET_ITEM:") === 0) {
    const item = data.split(":")[1];
    let session = JSON.parse(cache.get("user_" + userId));
    session.item = item; session.step = "SERIAL";
    cache.put("user_" + userId, JSON.stringify(session), 600);
    editMessage(chatId, messageId, "📦 อุปกรณ์: *" + item + "*\n\n🔢 *ขั้นตอนที่ 7:* พิมพ์ *Serial Number*");
  } 
  else if (data === "CONFIRM_SAVE") {
    const session = JSON.parse(cache.get("user_" + userId));
    if (saveToSheet(session)) editMessage(chatId, messageId, "✅ *บันทึกสำเร็จ!*\nข้อมูลถูกบันทึกเรียบร้อย");
    cache.remove("user_" + userId);
  } 
  else if (data === "CANCEL_SAVE") { editMessage(chatId, messageId, "❌ ยกเลิกรายการแล้ว"); cache.remove("user_" + userId); }
}

function handleStepInput(chatId, userId, text) {
  const cache = CacheService.getScriptCache();
  let sessionStr = cache.get("user_" + userId);
  if (!sessionStr) return;
  let session = JSON.parse(sessionStr);

  if (session.step === "DUID") {
    session.duid = text; session.step = "PROJ";
    cache.put("user_" + userId, JSON.stringify(session), 600);
    sendMessage(chatId, "🆔 DUID: `" + text + "`\n\n📁 *ขั้นตอนที่ 4:* พิมพ์ *Project Code*");
  } 
  else if (session.step === "PROJ") {
    session.project = text; session.step = "SITE";
    cache.put("user_" + userId, JSON.stringify(session), 600);
    sendMessage(chatId, "📁 Project: `" + text + "`\n\n📍 *ขั้นตอนที่ 5:* พิมพ์ *Site Code*");
  } 
  else if (session.step === "SITE") {
    session.site = text; session.step = "CAT";
    cache.put("user_" + userId, JSON.stringify(session), 600);
    const keyboard = { inline_keyboard: [[{ text: "ANTENNA", callback_data: "SET_CAT:ANTENNA" }, { text: "AAU", callback_data: "SET_CAT:AAU" }], [{ text: "RRU", callback_data: "SET_CAT:RRU" }, { text: "BBU", callback_data: "SET_CAT:BBU" }], [{ text: "BOARD", callback_data: "SET_CAT:BOARD" }, { text: "DCDU/DPU", callback_data: "SET_CAT:DCDU/DPU" }]] };
    sendMessage(chatId, "📍 Site: `" + text + "`\n\n📂 *ขั้นตอนที่ 6:* เลือกกลุ่มอุปกรณ์", keyboard);
  } 
  else if (session.step === "SERIAL") {
    session.serial = text; session.step = "QTY";
    cache.put("user_" + userId, JSON.stringify(session), 600);
    sendMessage(chatId, "🔢 Serial: `" + text + "`\n\n🔢 *ขั้นตอนสุดท้าย:* พิมพ์ *จำนวน (Qty)*");
  } 
  else if (session.step === "QTY") {
    session.qty = text; session.step = "CONFIRM";
    cache.put("user_" + userId, JSON.stringify(session), 600);
    const summary = "📝 *ตรวจสอบข้อมูล*\n\n" +
                    "🏢 ลูกค้า: " + session.customer + "\n" +
                    "🔄 ประเภท: " + session.type + "\n" +
                    "🆔 DUID: " + session.duid + "\n" +
                    "📁 Project: " + session.project + "\n" +
                    "📍 Site Code: " + session.site + "\n" +
                    "📦 อุปกรณ์: " + session.item + "\n" +
                    "🔢 Serial: " + session.serial + "\n" +
                    "🔢 จำนวน: " + session.qty;
    const keyboard = { inline_keyboard: [[{ text: "✅ ยืนยันบันทึก", callback_data: "CONFIRM_SAVE" }, { text: "❌ ยกเลิก", callback_data: "CANCEL_SAVE" }]] };
    sendKeyboard(chatId, summary, keyboard);
  }
}

function saveToSheet(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = data.customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    const lastRow = sheet.getLastRow();
    const nextNo = lastRow > 0 ? (Number(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
    const dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    sheet.appendRow([nextNo, data.project, "", data.site, "", data.duid, data.type, "", dateStr, "", data.item, "", data.qty, data.serial]);
    return true;
  } catch (e) { return false; }
}

function sendMessage(chatId, text) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }) }); }
function sendKeyboard(chatId, text, keyboard) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, text: text, reply_markup: keyboard, parse_mode: "Markdown" }) }); }
function editMessage(chatId, messageId, text, keyboard) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/editMessageText", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text, reply_markup: keyboard || {inline_keyboard:[]}, parse_mode: "Markdown" }) }); }
function setWebhook() { 
  Logger.log(UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + WEB_APP_URL).getContentText()); 
}

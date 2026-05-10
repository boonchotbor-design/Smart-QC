/**
 * 🚀 Inventory All-in-One System (Web App + Telegram + OCR)
 * 1. Web App: สำหรับบันทึกใบงานที่มีหลายรายการ (Multiple Items) ในครั้งเดียว
 * 2. Telegram Bot: สำหรับบันทึกด่วนผ่านการพิมพ์หรือสแกน OCR
 * 3. Google Form: สำหรับการบันทึกแบบมาตรฐาน
 */

const TELEGRAM_BOT_TOKEN = '8585490322:AAHdjJHtn0tT84T-QEg5NLUUWymEkhBrtHk';
const SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby8YHANDSWzyzeE8P336rdEtNMdiXl4Evq9b0OfAqtje83FpSkC2r7wtUBZxMfvbdIa/exec';

// ---------------------------------------------------------
// 1. ระบบจัดการ WEB APP (Master-Detail Interface)
// ---------------------------------------------------------

/**
 * ฟังก์ชันหลักในการเปิดหน้าเว็บ (Web App)
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('app')
      .evaluate()
      .setTitle('Inventory Multi-Record')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * ฟังก์ชันบันทึกข้อมูลแบบหลายรายการจาก Web App
 */
function saveMultiData(header, items) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = header.customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "Error: Sheet not found";

  const dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

  items.forEach(item => {
    const lastRow = sheet.getLastRow();
    const nextNo = lastRow > 0 ? (parseInt(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
    
    // บันทึกแยกแถว: No(A), Project(B), Phase(C), Site(D), WON(E), DUID(F), IN/OUT(G), Type(H), Date(I), Bill(J), Item(K), Desc(L), Qty(M), Serial(N)
    sheet.appendRow([
      nextNo, header.project, "", header.site, "", header.duid, 
      header.type, "", dateStr, header.billNo, item.code, "", item.qty, item.sn
    ]);
  });
  
  return "Success";
}

// ---------------------------------------------------------
// 2. ระบบจัดการ TELEGRAM & OCR (เดิม)
// ---------------------------------------------------------

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.callback_query) { handleCallback(data.callback_query); return ContentService.createTextOutput("ok"); }
    const msg = data.message;
    if (!msg) return ContentService.createTextOutput("ok");
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (msg.photo) {
      handlePhotoMessage(chatId, userId, msg.photo);
    } else if (msg.text) {
      const text = msg.text.trim();
      if (text === "/start") sendMessage(chatId, "👋 ยินดีต้อนรับ! ส่งข้อมูลรูปแบบ `ลูกค้า ประเภท DUID Project Site Item SN Qty` หรือส่งรูปภาพเพื่อ OCR");
      else handleTextMessage(chatId, userId, text);
    }
  } catch (err) { Logger.log(err.toString()); }
  return ContentService.createTextOutput("ok");
}

function handleTextMessage(chatId, userId, text) {
  const p = text.split(/\s+/).filter(x => x.length > 0);
  if (p.length < 8) { sendMessage(chatId, "❌ ข้อมูลไม่ครบ 8 รายการ"); return; }
  const data = { customer: p[0].toUpperCase(), type: p[1].toUpperCase(), duid: p[2], project: p[3], site: p[4], itemCode: p[5], serial: p[6], qty: p[7] };
  askConfirmation(chatId, userId, data);
}

function handlePhotoMessage(chatId, userId, photoArray) {
  sendMessage(chatId, "🔍 กำลังประมวลผล OCR...");
  try {
    const fileId = photoArray[photoArray.length - 1].file_id;
    const blob = UrlFetchApp.fetch(getTelegramFileUrl(fileId)).getBlob();
    const ocrFile = Drive.Files.create({ name: "temp", mimeType: "image/jpeg" }, blob, { ocr: true, ocrLanguage: 'th' });
    const text = DocumentApp.openById(ocrFile.id).getBody().getText();
    Drive.Files.remove(ocrFile.id);
    const data = parseOcrText(text);
    if (data) askConfirmation(chatId, userId, data);
    else sendMessage(chatId, "❌ ไม่สามารถระบุข้อมูลจากรูปภาพได้");
  } catch (e) { sendMessage(chatId, "⚠️ OCR Error"); }
}

function parseOcrText(text) {
  let data = {
    customer: text.includes("AIS") ? "AIS" : (text.includes("TRUE") ? "TRUE" : ""),
    type: text.includes("IN") ? "IN" : (text.includes("OUT") ? "OUT" : ""),
    duid: (text.match(/[A-Z0-9]{8,12}/) || [""])[0],
    project: "", site: "", itemCode: "", serial: "", qty: "1"
  };
  return (data.customer && data.type) ? data : null;
}

function askConfirmation(chatId, userId, data) {
  CacheService.getScriptCache().put("pending_" + userId, JSON.stringify(data), 600);
  const summary = `🏢: ${data.customer}\n🔄: ${data.type}\n🆔: ${data.duid}\n📁: ${data.project}\n📍: ${data.site}\n📦: ${data.itemCode}\n🔢: ${data.serial}\n🔢: ${data.qty}`;
  sendKeyboard(chatId, "📝 *ยืนยันข้อมูล:*\n" + summary, { inline_keyboard: [[{ text: "✅ ยืนยัน", callback_data: "CONFIRM" }, { text: "❌ ยกเลิก", callback_data: "CANCEL" }]] });
}

function handleCallback(query) {
  const userId = query.from.id;
  if (query.data === "CONFIRM") {
    const data = JSON.parse(CacheService.getScriptCache().get("pending_" + userId) || "{}");
    if (saveToSheet(data)) editMessage(query.message.chat.id, query.message.message_id, "✅ บันทึกสำเร็จ!");
  } else { editMessage(query.message.chat.id, query.message.message_id, "❌ ยกเลิกแล้ว"); }
}

// ---------------------------------------------------------
// 3. ระบบบันทึกข้อมูลลง SPREADSHEET (Shared Logic)
// ---------------------------------------------------------

function saveToSheet(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(data.customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE");
    if (!sheet) return false;
    const lastRow = sheet.getLastRow();
    const nextNo = lastRow > 0 ? (parseInt(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
    const date = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    sheet.appendRow([nextNo, data.project, "", data.site, "", data.duid, data.type, "", date, "", data.itemCode, "", data.qty, data.serial]);
    return true;
  } catch (e) { return false; }
}

// ---------------------------------------------------------
// 4. ระบบจัดการ GOOGLE FORM (เดิม)
// ---------------------------------------------------------

function setupInventoryForm() {
  const form = FormApp.create('Inventory Recording Form (AIS/TRUE)')
      .setDescription('ฟอร์มบันทึกข้อมูลเข้า-ออกคลังสินค้า')
      .setConfirmationMessage('บันทึกข้อมูลเรียบร้อยแล้ว!')
      .setAllowResponseEdits(false);

  form.addMultipleChoiceItem().setTitle('ลูกค้า (Customer)').setChoiceValues(['AIS', 'TRUE']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('ประเภทงาน (Type)').setChoiceValues(['IN', 'OUT', 'DISMANTLE', 'RETURN']).setRequired(true);
  form.addTextItem().setTitle('DUID').setRequired(true);
  form.addTextItem().setTitle('Project Code').setRequired(true);
  form.addTextItem().setTitle('Site Code').setRequired(true);
  form.addListItem().setTitle('กลุ่มอุปกรณ์ (Category)').setChoiceValues(['ANTENNA', 'AAU', 'RRU', 'BBU', 'BOARD', 'DCDU/DPU']).setRequired(true);
  form.addTextItem().setTitle('รุ่นอุปกรณ์ (Item Model)').setRequired(true);
  form.addTextItem().setTitle('Serial Number').setRequired(true);
  form.addTextItem().setTitle('จำนวน (Qty)').setRequired(true);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, SPREADSHEET_ID);
  
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if (t.getHandlerFunction() === 'processFormSubmission') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('processFormSubmission').forForm(form).onFormSubmit().create();

  Logger.log('✅ สร้างฟอร์มสำเร็จ! ลิงก์: ' + form.getPublishedUrl());
}

function processFormSubmission(e) {
  const r = e.response.getItemResponses();
  const data = { 
    customer: r[0].getResponse().toUpperCase(), 
    type: r[1].getResponse().toUpperCase(), 
    duid: r[2].getResponse(), 
    project: r[3].getResponse(), 
    site: r[4].getResponse(), 
    // r[5] คือ Category
    itemCode: r[6].getResponse(), 
    serial: r[7].getResponse(), 
    qty: r[8].getResponse() 
  };
  saveToSheet(data);
}

// ---------------------------------------------------------
// 5. HELPER FUNCTIONS
// ---------------------------------------------------------

function setWebhook() {
  const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + WEB_APP_URL);
  Logger.log("Webhook: " + res.getContentText());
}

function getTelegramFileUrl(id) {
  const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + id);
  return "https://api.telegram.org/file/bot" + TELEGRAM_BOT_TOKEN + "/" + JSON.parse(res.getContentText()).result.file_path;
}

function sendMessage(id, txt) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: id, text: txt, parse_mode: "Markdown" }) }); }
function sendKeyboard(id, txt, kbd) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: id, text: txt, reply_markup: kbd, parse_mode: "Markdown" }) }); }
function editMessage(id, mid, txt) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/editMessageText", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: id, message_id: mid, text: txt, parse_mode: "Markdown" }) }); }

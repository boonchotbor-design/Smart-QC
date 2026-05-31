// ==========================================
// PUNGPUNG HOMEMADE - SCRIPT VERSION 14.5 (UNIFIED & FIXED)
// ==========================================

// 1. CONFIGURATION
const CHANNEL_ACCESS_TOKEN = '54a/5Ien10WbFs5V5ec9lOzXA4dzh4eoUhgMRwtQS74+uhdJDruSMeKf/31QJecHiNrI1boDA9VRgl/Bnivd1PRDp+OakmDu3Zu7FsegrTcgcX4wT39g0lXC27Norxn26ny/2sSmFl3ul/YjisLa5gdB04t89/1O/w1cDnyilFU=';
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const SPREADSHEET_ID = '1-D-YNXQwAoIAgpTxUGvgY-6caRtuMgarZ68wwA6jmnA'; 
const SHEET_NAME = 'Dashboad'; 

const ADMIN_IDS = [
  'U96f88e090a0c1638abc60111c353a04b',
  'Ub573aa4294c3783c0a1dd1900487f463'
]; 

// 2. MAIN HANDLER
function doPost(e) {
  var replyToken, userId;
  try {
    if (!e || !e.postData) return;
    var contents = e.postData.contents;
    var jsonData = JSON.parse(contents);
    var event = jsonData.events[0];
    if (!event) return;

    replyToken = event.replyToken;
    userId = event.source.userId;
    var isAdmin = ADMIN_IDS.indexOf(userId) !== -1;
    var shopStatus = PropertiesService.getScriptProperties().getProperty('SHOP_STATUS') || 'OPEN';

    if (event.type === 'message' && event.message.type === 'text') {
      var text = event.message.text.trim();
      
      if (text === 'เมนู' || text === 'สั่งของ') {
        reply(replyToken, [getMainMenu(shopStatus, isAdmin)]);
      } else if (text === 'เมนูขนม' || text === 'สั่งขนม') {
        reply(replyToken, [getSnackMenu()]);
      } else if (text === 'เมนูน้ำ' || text === 'สั่งน้ำ') {
        reply(replyToken, [getDrinkMenu()]);
      } else if (checkPending(userId)) {
        updateNote(userId, text);
        reply(replyToken, [{ "type": "text", "text": "📝 บันทึกที่อยู่เรียบร้อยครับ:\n\"" + text + "\"\n\nเช็ครายการได้ที่ปุ่ม '🛒 ดูตะกร้า' หรือกด 'ยืนยันสั่งซื้อ' ครับ" }]);
      } else {
        reply(replyToken, [getMainMenu(shopStatus, isAdmin)]);
      }
    } 
    
    else if (event.type === 'postback') {
      var params = parseParams(event.postback.data);
      
      if (params.action === 'show_snack_menu') {
        reply(replyToken, [getSnackMenu()]);
      } else if (params.action === 'show_drink_menu') {
        reply(replyToken, [getDrinkMenu()]);
      } else if (params.action === 'order') {
        if (shopStatus === 'CLOSED' && !isAdmin) {
          reply(replyToken, [{ "type": "text", "text": "ขออภัยครับ ร้านปิดรับออเดอร์แล้ว 🙏" }]);
          return;
        }
        var profile = getUserProfile(userId);
        var name = (profile && profile.displayName) ? profile.displayName : 'ลูกค้า';
        if (recordOrder(name, userId, params.item, params.price)) {
          reply(replyToken, [{
            "type": "text",
            "text": "✅ เพิ่ม \"" + params.item + "\" เรียบร้อย!\n\n" + getUserOrderSummary(userId),
            "quickReply": { "items": [
              { "type": "action", "action": { "type": "postback", "label": "✅ ยืนยันการสั่งซื้อ", "data": "action=finish" } },
              { "type": "action", "action": { "type": "postback", "label": "📝 ระบุที่อยู่", "data": "action=ask_address" } },
              { "type": "action", "action": { "type": "postback", "label": "🛒 ดูตะกร้า/ลบ", "data": "action=view_cart" } }
            ]}
          }]);
        }
      } else if (params.action === 'ask_address') {
        reply(replyToken, [{ "type": "text", "text": "🏠 กรุณาพิมพ์ 'บ้านเลขที่ / ชื่อหมู่บ้าน / เบอร์โทร' ส่งมาได้เลยครับ" }]);
      } else if (params.action === 'view_cart') {
        var cart = getCartMenu(userId);
        if (!cart) reply(replyToken, [{ "type": "text", "text": "ตะกร้าของคุณว่างเปล่าครับ" }]);
        else reply(replyToken, [cart]);
      } else if (params.action === 'del_item') {
        var statusMsg = deleteSpecificOrder(params.row);
        var cart = getCartMenu(userId);
        var snackMenu = getSnackMenu();
        
        var messages = [];
        if (!cart) {
          messages.push({ "type": "text", "text": "🗑️ " + statusMsg + "\nตอนนี้ตะกร้าของคุณว่างเปล่าแล้วครับ" });
        } else {
          messages.push({ "type": "text", "text": "🗑️ " + statusMsg + "\nนี่คือรายการปัจจุบันของคุณครับ:" });
          messages.push(cart);
        }
        messages.push(snackMenu); // แสดงเมนูให้เลือกต่อทันที
        
        reply(replyToken, messages);
      } else if (params.action === 'finish') {
        var sum = getUserOrderSummary(userId);
        if (sum.indexOf("ยังไม่มีรายการ") !== -1) reply(replyToken, [{ "type": "text", "text": "ตะกร้าว่างเปล่าครับ" }]);
        else {
          confirmOrder(userId);
          reply(replyToken, [{ "type": "text", "text": "🏁 ยืนยันการสั่งซื้อเรียบร้อย!\n\n" + sum + "\n\nขอบคุณที่อุดหนุนครับ 🙏✨" }]);
        }
      } else if (params.action === 'set_shop') {
        if (!isAdmin) return;
        PropertiesService.getScriptProperties().setProperty('SHOP_STATUS', params.status);
        var msg = (params.status === 'OPEN') ? "✅ เปิดรับออเดอร์แล้วครับ!" : "🚫 ปิดร้านและสรุปยอดแอดมิน:\n\n" + getAllOrderSummary();
        reply(replyToken, [{ "type": "text", "text": msg }]);
      }
      
      // ADMIN DAILY MENU ACTIONS
      else if (params.action === 'manage_daily_menu') {
        if (!isAdmin) return;
        reply(replyToken, [getAdminMenuPicker()]);
      } else if (params.action === 'toggle_menu') {
        if (!isAdmin) return;
        var dailyMenuStr = PropertiesService.getScriptProperties().getProperty('DAILY_MENU');
        var dailyMenu = dailyMenuStr ? JSON.parse(dailyMenuStr) : [];
        var idx = dailyMenu.indexOf(params.item);
        if (idx === -1) dailyMenu.push(params.item);
        else dailyMenu.splice(idx, 1);
        PropertiesService.getScriptProperties().setProperty('DAILY_MENU', JSON.stringify(dailyMenu));
        reply(replyToken, [getAdminMenuPicker()]);
      } else if (params.action === 'reset_daily_menu') {
        if (!isAdmin) return;
        PropertiesService.getScriptProperties().deleteProperty('DAILY_MENU');
        reply(replyToken, [{ "type": "text", "text": "🔄 รีเซ็ตเมนู (เปิดขายทุกอย่าง) เรียบร้อยครับ" }]);
      }
    }
  } catch (err) {
    if (replyToken) reply(replyToken, [{ "type": "text", "text": "⚠️ ระบบพบปัญหา: " + err.message }]);
  }
}

// 3. UI MENUS (Flex Message)
function getMainMenu(status, isAdmin) {
  var contents = [];
  if (status === 'OPEN' || isAdmin) {
    contents.push({ "type": "button", "style": "primary", "color": "#4CAF50", "action": { "type": "postback", "label": "🍰 เมนูขนม", "data": "action=show_snack_menu" } });
    contents.push({ "type": "button", "style": "primary", "color": "#2E7D32", "margin": "sm", "action": { "type": "postback", "label": "🥤 เมนูน้ำ", "data": "action=show_drink_menu" } });
  } else {
    contents.push({ "type": "text", "text": "🚫 ขณะนี้ปิดรับออเดอร์แล้ว", "weight": "bold", "color": "#FF0000", "align": "center", "margin": "md" });
  }
  contents.push({ "type": "button", "style": "secondary", "margin": "sm", "action": { "type": "postback", "label": "🛒 ดูตะกร้า/แก้ไข", "data": "action=view_cart" } });
  contents.push({ "type": "button", "style": "secondary", "margin": "sm", "action": { "type": "postback", "label": "📝 ระบุที่อยู่/หมายเหตุ", "data": "action=ask_address" } });
  contents.push({ "type": "button", "style": "primary", "color": "#FF9800", "margin": "sm", "action": { "type": "postback", "label": "✅ ยืนยันสั่งซื้อ (จบรายการ)", "data": "action=finish" } });
  
  if (isAdmin) {
    contents.push({ "type": "separator", "margin": "lg" });
    contents.push({ "type": "text", "text": "แผงควบคุมแอดมิน", "size": "xs", "color": "#aaaaaa", "align": "center", "margin": "sm" });
    contents.push({ "type": "button", "height": "sm", "style": "secondary", "color": "#eeeeee", "margin": "sm", "action": { "type": "postback", "label": "⚙️ ตั้งค่าเมนูประจำวัน", "data": "action=manage_daily_menu" } });
    contents.push({ "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "sm", "contents": [
      { "type": "button", "height": "sm", "style": "secondary", "action": { "type": "postback", "label": "🔒 ปิดร้าน", "data": "action=set_shop&status=CLOSED" } },
      { "type": "button", "height": "sm", "style": "secondary", "action": { "type": "postback", "label": "🔓 เปิดร้าน", "data": "action=set_shop&status=OPEN" } }
    ]});
  }
  return { "type": "flex", "altText": "เมนูหลัก PUNG PUNG", "contents": { "type": "bubble", "header": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🏠 PUNG PUNG HOMEMADE", "weight": "bold", "color": "#ffffff" }], "backgroundColor": "#FF6B6B" }, "body": { "type": "box", "layout": "vertical", "spacing": "none", "contents": contents }, "footer": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "สถานะ: " + (status === 'OPEN' ? '🟢 เปิดรับ' : '🔴 ปิดรับ'), "size": "xs", "align": "center" }] } } };
}

function getSnackMenu() {
  var b0 = createBubble("🍰 เค้ก & บราวนี่", "#FFB74D", [
    { n: "เค็กช็อคโกแลตหน้านิ่ม", p: 30, l: "เค็กช็อคหน้านิ่ม" },
    { n: "เค็กหน้านิ่มชาไทย", p: 30, l: "เค็กหน้านิ่มชาไทย" },
    { n: "บราวนี่ช็อคโกแล็ตนูเทล่า", p: 30, l: "บราวนี่ช็อคนูเทล่า" },
    { n: "บราวนี่ชาเขียวนูเทล่า", p: 30, l: "บราวนี่ชาเขียวนูเทล่า" }
  ]);
  var b_new = createBubble("🍪 ขนมทานเล่น", "#A1887F", [
    { n: "ปังกรอบ", p: 40, l: "ปังกรอบ" },
    { n: "ทองม้วน", p: 30, l: "ทองม้วน" },
    { n: "วุ้นเป็ดมะพร้าว", p: 30, l: "วุ้นเป็ดมะพร้าว" }
  ]);
  var b1 = createBubble("🥥 กะทิ & 🌶️ พริกเผา", "#D4A373", [
    { n: "ทองก้อนกะทิ-อัลมอนด์", p: 60, l: "กะทิ+อัลมอนด์" },
    { n: "ทองก้อนกะทิ-เม็ดมะม่วง", p: 60, l: "กะทิ+เม็ดมะม่วง" },
    { n: "ทองก้อนกะทิ-ไก่หยอง", p: 60, l: "กะทิ+ไก่หยอง" },
    { n: "ทองก้อนพริกเผา-อัลมอนด์", p: 60, l: "พริกเผา+อัลมอนด์" },
    { n: "ทองก้อนพริกเผา-เม็ดมะม่วง", p: 60, l: "พริกเผา+เม็ดมะม่วง" }
  ]);
  var b2 = createBubble("🍫 รสโกโก้", "#4E342E", [
    { n: "ทองก้อนโกโก้-อัลมอนด์", p: 70, l: "โกโก้+อัลมอนด์" },
    { n: "ทองก้อนโกโก้-เม็ดมะม่วง", p: 70, l: "โกโก้+เม็ดมะม่วง" },
    { n: "ทองก้อนโกโก้-ไก่หยอง", p: 70, l: "โกโก้+ไก่หยอง" },
    { n: "ทองก้อนโกโก้-ดาร์กช็อค", p: 75, l: "🌟 ไส้ดาร์กช็อคฯ", h: true }
  ]);
  var b3 = createBubble("🍵 ชาเขียว & 🌟 พิเศษ", "#2E7D32", [
    { n: "ทองก้อนชาเขียว-อัลมอนด์", p: 70, l: "ชาเขียว+อัลมอนด์" },
    { n: "ทองก้อนชาเขียว-ไก่หยอง", p: 70, l: "ชาเขียว+ไก่หยอง" },
    { n: "ทองก้อนชาเขียว-ไวท์ช็อค", p: 75, l: "🌟 ชาเขียวไวท์ช็อคฯ", h: true },
    { n: "ทองก้อนพริกเผา-ไก่หยองพิเศษ", p: 75, l: "🌟 พริกเผาไก่หยอง", h: true }
  ]);
  return { "type": "flex", "altText": "เมนูสั่งขนม", "contents": { "type": "carousel", "contents": [b0, b_new, b1, b2, b3] } };
}

function getDrinkMenu() {
  var b1 = createBubble("🥤 เมนูน้ำปั่น", "#4FC3F7", [
    { n: "แตงโมปั่น", p: 40, l: "🍉 แตงโมปั่น" },
    { n: "น้ำมะพร้าวปั่น", p: 40, l: "🥥 มะพร้าวปั่น" }
  ]);
  return { "type": "flex", "altText": "เมนูสั่งน้ำ", "contents": { "type": "carousel", "contents": [b1] } };
}

function createBubble(title, color, items) {
  var dailyMenuStr = PropertiesService.getScriptProperties().getProperty('DAILY_MENU');
  var dailyMenu = dailyMenuStr ? JSON.parse(dailyMenuStr) : null;

  var btns = items.map(function(it) {
    var isAvailable = !dailyMenu || dailyMenu.indexOf(it.n) !== -1 || dailyMenu.indexOf(it.l) !== -1;
    if (isAvailable) {
      var b = { "type": "button", "height": "sm", "style": it.h ? "primary" : "secondary", "action": { "type": "postback", "label": it.l + " (" + it.p + ".-)", "data": "action=order&item=" + encodeURIComponent(it.n) + "&price=" + it.p } };
      if (it.h) b.color = "#FFD700";
      return b;
    } else {
      return { "type": "button", "height": "sm", "style": "secondary", "color": "#dddddd", "action": { "type": "postback", "label": it.l + " (❌ หมด)", "data": "action=none" } };
    }
  });
  return { "type": "bubble", "header": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": title, "weight": "bold", "color": "#ffffff" }], "backgroundColor": color }, "body": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": btns } };
}

function getAdminMenuPicker() {
  var dailyMenuStr = PropertiesService.getScriptProperties().getProperty('DAILY_MENU');
  var dailyMenu = dailyMenuStr ? JSON.parse(dailyMenuStr) : [];
  var allItems = [
    "เค็กช็อคโกแลตหน้านิ่ม", "เค็กหน้านิ่มชาไทย", "บราวนี่ช็อคโกแล็ตนูเทล่า", "บราวนี่ชาเขียวนูเทล่า",
    "ปังกรอบ", "ทองม้วน", "วุ้นเป็ดมะพร้าว", "แตงโมปั่น", "น้ำมะพร้าวปั่น",
    "ทองก้อนกะทิ-อัลมอนด์", "ทองก้อนกะทิ-เม็ดมะม่วง", "ทองก้อนกะทิ-ไก่หยอง", "ทองก้อนพริกเผา-อัลมอนด์", "ทองก้อนพริกเผา-เม็ดมะม่วง",
    "ทองก้อนโกโก้-อัลมอนด์", "ทองก้อนโกโก้-เม็ดมะม่วง", "ทองก้อนโกโก้-ไก่หยอง", "ทองก้อนโกโก้-ดาร์กช็อค",
    "ทองก้อนชาเขียว-อัลมอนด์", "ทองก้อนชาเขียว-ไก่หยอง", "ทองก้อนชาเขียว-ไวท์ช็อค", "ทองก้อนพริกเผา-ไก่หยองพิเศษ"
  ];
  var rows = allItems.map(function(name) {
    var isOn = dailyMenu.length === 0 || dailyMenu.indexOf(name) !== -1;
    return { "type": "box", "layout": "horizontal", "contents": [
      { "type": "text", "text": name, "size": "xs", "flex": 3, "gravity": "center" },
      { "type": "button", "height": "sm", "flex": 1, "style": isOn ? "primary" : "secondary", "color": isOn ? "#4CAF50" : "#aaaaaa", "action": { "type": "postback", "label": isOn ? "ขาย" : "หมด", "data": "action=toggle_menu&item=" + encodeURIComponent(name) } }
    ]};
  });
  var chunks = [];
  for (var i = 0; i < rows.length; i += 10) chunks.push(rows.slice(i, i + 10));
  var bubbles = chunks.map(function(chunk) {
    return { "type": "bubble", "header": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "⚙️ จัดการรายการขาย", "weight": "bold", "color": "#ffffff" }], "backgroundColor": "#555555" }, "body": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": chunk }, "footer": { "type": "box", "layout": "vertical", "contents": [{ "type": "button", "style": "link", "action": { "type": "postback", "label": "🔄 รีเซ็ต (ขายทุกอย่าง)", "data": "action=reset_daily_menu" } }] } };
  });
  return { "type": "flex", "altText": "จัดการเมนู", "contents": { "type": "carousel", "contents": bubbles } };
}

function getCartMenu(userId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var rows = [], total = 0, currentNote = "";
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === userId && data[i][5] === "Pending") {
      rows.push({ "type": "box", "layout": "horizontal", "contents": [ { "type": "text", "text": data[i][3], "size": "sm", "flex": 3, "gravity": "center" }, { "type": "button", "style": "link", "color": "#FF0000", "height": "sm", "flex": 1, "action": { "type": "postback", "label": "🗑️", "data": "action=del_item&row=" + (i + 1) } } ] });
      total += parseFloat(data[i][4]);
      if (data[i][6]) currentNote = data[i][6];
    }
  }
  if (rows.length === 0) return null;
  return { "type": "flex", "altText": "ตะกร้าสินค้า", "contents": { "type": "bubble", "header": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🛒 รายการที่คุณเลือกไว้", "weight": "bold" }], "backgroundColor": "#eeeeee" }, "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": rows }, "footer": { "type": "box", "layout": "vertical", "contents": [ { "type": "text", "text": "ที่อยู่: " + (currentNote || "(ยังไม่ได้ระบุ)"), "size": "xs", "color": "#888888", "wrap": true }, { "type": "button", "style": "link", "height": "sm", "action": { "type": "postback", "label": "📝 แก้ไขที่อยู่", "data": "action=ask_address" } }, { "type": "text", "text": "รวม: " + total + " บาท", "weight": "bold", "align": "center", "margin": "sm" }, { "type": "button", "style": "primary", "color": "#4CAF50", "margin": "sm", "action": { "type": "postback", "label": "✅ ยืนยันการสั่งซื้อ", "data": "action=finish" } } ] } } };
}

// 4. BACKEND FUNCTIONS
function recordOrder(name, userId, item, price) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    sheet.appendRow([new Date(), name, userId, item, price, "Pending", ""]);
    return true;
  } catch(e) { return false; }
}

function updateNote(userId, noteText) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === userId && data[i][5] === "Pending") {
      sheet.getRange(i + 1, 7).setValue(noteText);
    }
  }
}

function checkPending(userId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === userId && data[i][5] === "Pending") return true;
  }
  return false;
}

function confirmOrder(userId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === userId && data[i][5] === "Pending") {
      sheet.getRange(i + 1, 6).setValue("Confirmed");
    }
  }
}

function deleteSpecificOrder(row) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    sheet.deleteRow(parseInt(row));
    return "🗑️ ลบรายการเรียบร้อยครับ";
  } catch(e) { return "ลบไม่สำเร็จ"; }
}

function getUserOrderSummary(userId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var total = 0, text = "", note = "";
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === userId && data[i][5] === "Pending") {
      text += "- " + data[i][3] + "\n";
      total += parseFloat(data[i][4]);
      if (data[i][6]) note = data[i][6];
    }
  }
  if (text === "") return "ยังไม่มีรายการ";
  var res = "📋 รายการของคุณ:\n" + text + "💰 ยอดรวม: " + total + " บาท";
  if (note) res += "\n🏠 ที่อยู่: " + note;
  return res;
}

function getAllOrderSummary() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var total = 0, summary = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][5] === "Confirmed") {
      summary[data[i][3]] = (summary[data[i][3]] || 0) + 1;
      total += parseFloat(data[i][4]);
    }
  }
  var res = "📊 สรุปออเดอร์ที่ยืนยันแล้ว:\n";
  for (var k in summary) res += "▪️ " + k + ": " + summary[k] + " ชุด\n";
  return res + "\n💵 ยอดเงินรวมทั้งหมด: " + total + " บาท";
}

function reply(replyToken, messages) {
  UrlFetchApp.fetch(LINE_REPLY_URL, { 'headers': { 'Content-Type': 'application/json; charset=UTF-8', 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN }, 'method': 'post', 'payload': JSON.stringify({ 'replyToken': replyToken, 'messages': messages }) });
}

function getUserProfile(userId) {
  try {
    var res = UrlFetchApp.fetch("https://api.line.me/v2/bot/profile/" + userId, { 'headers': { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN } });
    return JSON.parse(res.getContentText());
  } catch (e) { return null; }
}

function parseParams(str) {
  var params = {};
  if (!str) return params;
  str.split('&').forEach(function(p) { var pair = p.split('='); if (pair.length === 2) params[pair[0]] = decodeURIComponent(pair[1]); });
  return params;
}

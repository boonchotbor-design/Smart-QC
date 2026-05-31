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

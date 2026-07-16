/**
 * 🔐 Spreadsheet Login Guard — V.7.2.0
 * ===========================================
 * นำโค้ดนี้ไปใส่ใน Google Apps Script ของ Spreadsheet:
 *   Extensions → Apps Script → วางโค้ดทั้งหมดนี้ → Save
 *   → Run initAdmin() ครั้งแรกเพื่อตั้ง Admin Password
 *   → ลบบรรทัด initAdmin() ออก แล้ว Save อีกครั้ง
 *
 * วิธีการทำงาน:
 *   - เปิด Spreadsheet → แสดง Login Dialog ขอ Email + Password
 *   - Admin ใช้ Menu 🔐 ระบบ Login → ⚙️ ตั้งค่า Password เพื่อตั้ง Password ให้ User แต่ละคน
 */

// ─── CONFIG ───────────────────────────────────────────────────────
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwoTnwaExeObR_54tVajXxz7j2rAsQlyIWN3rbaGfTXxf9-HZ8oAMs4_gKOhrFx7b6b/exec';

var ALLOWED_EMAILS = [
  'boonchot.boriwut@technow.co.th',  // 👑 Admin
  'khathahat.sitthihong@technow.co.th',
  'surapong.tachatieamjun@technow.co.th',
  'boonchot.bor@gmail.com',
  'payon010833@gmail.com',
  'manakiat.m@gmail.com',
  'auttaseth.klomthaisong@gmail.com',
  'wachirasaovaro919@gmail.com',
  'a.adisak.ch@gmail.com',
  'bom.paragon@gmail.com',
  'noomchaloemrit@gmail.com',
  'nattawoot.suwan@technow.co.th',
  'supot.hoonyong@technow.co.th'
];

var ADMIN_EMAIL = 'boonchot.boriwut@technow.co.th';

// ─── onOpen TRIGGER ───────────────────────────────────────────────
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🔐 ระบบ Login')
    .addItem('🔑 เข้าสู่ระบบ', 'showLoginDialog')
    .addItem('🔒 ออกจากระบบ', 'lockSheets')
    .addItem('👤 ตรวจสอบผู้ใช้', 'checkCurrentUser')
    .addSeparator()
    .addItem('⚙️ ตั้งค่า Password (Admin)', 'adminSetPassword')
    .addToUi();

  // แสดง Dialog อัตโนมัติ
  showLoginDialog();
}

// ─── SHOW LOGIN DIALOG ────────────────────────────────────────────
function showLoginDialog() {
  var html = HtmlService.createHtmlOutput(getLoginHtml())
    .setWidth(380).setHeight(480);
  SpreadsheetApp.getUi().showModalDialog(html, '🔐 กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล');
}

// ─── VERIFY LOGIN (เรียกจาก HTML Dialog) ─────────────────────────
function verifyLogin(email, password) {
  if (!email || !password) return { ok: false, msg: 'กรุณากรอกข้อมูลให้ครบ' };

  email = email.toLowerCase().trim();

  // ตรวจสอบ whitelist
  var allowed = ALLOWED_EMAILS.map(function(e){ return e.toLowerCase(); });
  if (allowed.indexOf(email) === -1) {
    return { ok: false, msg: '❌ Email นี้ไม่มีสิทธิ์เข้าใช้งาน' };
  }

  // ดึง hash จาก PropertiesService
  var props = PropertiesService.getScriptProperties();
  var key   = 'pw_' + email.replace(/[@.]/g, '_');
  var storedHash = props.getProperty(key);

  if (!storedHash) {
    return {
      ok: false,
      msg: '⚠️ Email นี้ยังไม่ได้ตั้ง Password\n\nให้ Admin ตั้งค่าผ่าน Menu:\n⚙️ ตั้งค่า Password (Admin)'
    };
  }

  // เปรียบเทียบ hash
  var inputHash = hashSHA256(password);
  if (inputHash !== storedHash) {
    return { ok: false, msg: '❌ Password ไม่ถูกต้อง' };
  }

  // ✅ Login สำเร็จ — บันทึก session 1 ชั่วโมง
  var cache = CacheService.getUserCache();
  cache.put('sheet_logged_in_email', email, 3600);
  cache.put('sheet_logged_in_time', new Date().toLocaleString('th-TH'), 3600);

  return { ok: true, msg: '✅ เข้าสู่ระบบสำเร็จ!' };
}

// ─── INIT ADMIN (run ครั้งเดียวตอนตั้งค่าระบบ) ──────────────────
// ⚠️ หลัง Run แล้ว ให้ลบ function นี้ออกและ Save อีกครั้ง เพื่อความปลอดภัย
function initAdmin() {
  var adminPw   = 'Zqwedcxzas@1234';            // ← จะถูกลบหลัง run
  var adminMail = 'boonchot.boriwut@technow.co.th';
  var hash      = hashSHA256(adminPw);
  var key       = 'pw_' + adminMail.replace(/[@.]/g, '_');
  PropertiesService.getScriptProperties().setProperty(key, hash);
  SpreadsheetApp.getUi().alert(
    '✅ ตั้ง Admin Password สำเร็จ!\n\n' +
    'Email: ' + adminMail + '\n\n' +
    '⚠️ กรุณาลบ function initAdmin() ออกจาก Code แล้ว Save อีกครั้ง!'
  );
}

// ─── ADMIN: ตั้ง Password ให้ User อื่น ──────────────────────────
function adminSetPassword() {
  // ตรวจสอบว่า Admin login แล้ว
  var cache       = CacheService.getUserCache();
  var loggedEmail = cache.get('sheet_logged_in_email');
  if (loggedEmail !== ADMIN_EMAIL) {
    SpreadsheetApp.getUi().alert('❌ เฉพาะ Admin เท่านั้นที่ใช้ฟังก์ชันนี้ได้\nกรุณา Login ด้วย Admin Email ก่อน');
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('Admin: ตั้ง Password', 'กรอก Email ของ User:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var email = r1.getResponseText().trim().toLowerCase();

  var r2 = ui.prompt('Admin: ตั้ง Password', 'กรอก Password ใหม่ (min 6 ตัว):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var pw = r2.getResponseText();

  if (!pw || pw.length < 6) { ui.alert('❌ Password ต้องมีอย่างน้อย 6 ตัวอักษร'); return; }

  var hash = hashSHA256(pw);
  var key  = 'pw_' + email.replace(/[@.]/g, '_');
  PropertiesService.getScriptProperties().setProperty(key, hash);
  ui.alert('✅ ตั้ง Password สำเร็จ!\nEmail: ' + email);
}


// ─── CHECK CURRENT USER ───────────────────────────────────────────
function checkCurrentUser() {
  var cache = CacheService.getUserCache();
  var email = cache.get('sheet_logged_in_email');
  var time  = cache.get('sheet_logged_in_time');
  var ui = SpreadsheetApp.getUi();
  if (email) {
    ui.alert('👤 ผู้ใช้ปัจจุบัน\n\nEmail: ' + email + '\nLogin เมื่อ: ' + time);
  } else {
    var r = ui.alert('⚠️ ยังไม่ได้เข้าสู่ระบบ', 'ต้องการ Login ตอนนี้?', ui.ButtonSet.YES_NO);
    if (r === ui.Button.YES) showLoginDialog();
  }
}

// ─── LOCK / LOGOUT ────────────────────────────────────────────────
function lockSheets() {
  CacheService.getUserCache().removeAll(['sheet_logged_in_email','sheet_logged_in_time']);
  SpreadsheetApp.getUi().alert('🔒 ออกจากระบบแล้ว');
}

// ─── SHA-256 (GAS built-in) ───────────────────────────────────────
function hashSHA256(input) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function(b){ var h=(b<0?b+256:b).toString(16); return h.length===1?'0'+h:h; }).join('');
}

// ─── LOGIN HTML TEMPLATE ──────────────────────────────────────────
function getLoginHtml() {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">' +
    '<style>' +
    '* { box-sizing:border-box; font-family:"Sarabun",sans-serif; margin:0; padding:0; }' +
    'body { background:linear-gradient(135deg,#0d6efd11,#f0f2f8); padding:20px; }' +
    '.logo { font-size:40px; text-align:center; margin-bottom:6px; }' +
    '.title { font-size:18px; font-weight:700; text-align:center; color:#1a1a2e; margin-bottom:2px; }' +
    '.sub { font-size:12px; color:#666; text-align:center; margin-bottom:18px; }' +
    'label { font-size:12px; font-weight:700; color:#444; display:block; margin-top:12px; margin-bottom:4px; }' +
    'select, input { width:100%; padding:11px 14px; font-size:14px; border:2px solid #e0e0e0; border-radius:10px; background:#f8f9ff; font-family:"Sarabun",sans-serif; outline:none; transition:border-color 0.2s; }' +
    'select:focus, input:focus { border-color:#0d6efd; }' +
    '.pw-wrap { position:relative; }' +
    '.pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:16px; user-select:none; }' +
    '.btn { width:100%; padding:12px; margin-top:16px; background:linear-gradient(135deg,#0d6efd,#0043a8); color:white; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; font-family:"Sarabun",sans-serif; }' +
    '.btn:hover { opacity:0.9; }' +
    '.btn:disabled { opacity:0.5; cursor:not-allowed; }' +
    '.alert { padding:9px 12px; border-radius:9px; font-size:13px; font-weight:600; margin-top:12px; text-align:center; display:none; white-space:pre-line; }' +
    '.alert.err { background:#fff0f0; color:#c0392b; display:block; }' +
    '.alert.ok  { background:#f0fff4; color:#1a7f40; display:block; }' +
    '.footer { font-size:10px; color:#aaa; text-align:center; margin-top:14px; }' +
    '</style></head><body>' +
    '<div class="logo">📦</div>' +
    '<div class="title">Smart Inventory</div>' +
    '<div class="sub">กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล</div>' +
    '<label>📧 Email *</label>' +
    '<select id="email"><option value="">— เลือก Email —</option>' +
    '<option value="khathahat.sitthihong@technow.co.th">khathahat.sitthihong@technow.co.th</option>' +
    '<option value="surapong.tachatieamjun@technow.co.th">surapong.tachatieamjun@technow.co.th</option>' +
    '<option value="boonchot.bor@gmail.com">boonchot.bor@gmail.com</option>' +
    '<option value="payon010833@gmail.com">payon010833@gmail.com</option>' +
    '<option value="manakiat.m@gmail.com">manakiat.m@gmail.com</option>' +
    '<option value="auttaseth.klomthaisong@gmail.com">auttaseth.klomthaisong@gmail.com</option>' +
    '<option value="wachirasaovaro919@gmail.com">wachirasaovaro919@gmail.com</option>' +
    '<option value="a.adisak.ch@gmail.com">a.adisak.ch@gmail.com</option>' +
    '<option value="bom.paragon@gmail.com">bom.paragon@gmail.com</option>' +
    '<option value="noomchaloemrit@gmail.com">noomchaloemrit@gmail.com</option>' +
    '<option value="nattawoot.suwan@technow.co.th">nattawoot.suwan@technow.co.th</option>' +
    '<option value="supot.hoonyong@technow.co.th">supot.hoonyong@technow.co.th</option>' +
    '</select>' +
    '<label>🔒 Password *</label>' +
    '<div class="pw-wrap"><input type="password" id="pw" placeholder="กรอก Password ของคุณ" onkeydown="if(event.key===\'Enter\') doLogin()">' +
    '<span class="pw-toggle" onclick="togglePw()">👁️</span></div>' +
    '<div id="alrt" class="alert"></div>' +
    '<button class="btn" id="btnLogin" onclick="doLogin()">🔑 เข้าสู่ระบบ</button>' +
    '<div class="footer">🔒 Smart Inventory V.7.2.0 | Password เดียวกับ Web App</div>' +
    '<script>' +
    'function togglePw(){var i=document.getElementById("pw");i.type=i.type==="password"?"text":"password";}' +
    'function showAlert(msg,type){var e=document.getElementById("alrt");e.className="alert "+type;e.innerText=msg;}' +
    'function doLogin(){' +
    '  var email=document.getElementById("email").value;' +
    '  var pw=document.getElementById("pw").value;' +
    '  var btn=document.getElementById("btnLogin");' +
    '  document.getElementById("alrt").className="alert";' +
    '  if(!email){showAlert("⚠️ กรุณาเลือก Email","err");return;}' +
    '  if(!pw){showAlert("⚠️ กรุณากรอก Password","err");return;}' +
    '  btn.disabled=true;btn.innerText="⏳ กำลังตรวจสอบ...";' +
    '  google.script.run' +
    '    .withSuccessHandler(function(res){' +
    '      btn.disabled=false;btn.innerText="🔑 เข้าสู่ระบบ";' +
    '      if(res.ok){showAlert(res.msg,"ok");setTimeout(function(){google.script.host.close();},1200);}' +
    '      else{showAlert(res.msg,"err");document.getElementById("pw").value="";}' +
    '    })' +
    '    .withFailureHandler(function(err){btn.disabled=false;btn.innerText="🔑 เข้าสู่ระบบ";showAlert("❌ Error: "+err.message,"err");})' +
    '    .verifyLogin(email,pw);' +
    '}' +
    '</script></body></html>';
}

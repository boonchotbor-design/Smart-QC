/**
 * =========================================================================
 * 🚀 AI SMART QC BOT - V.148 (PREMIUM STABLE)
 * =========================================================================
 * ⚠️ วิธีติดตั้ง: 
 * 1. ลบโค้ดเก่าใน Apps Script ออกให้หมดทุกไฟล์ (Ctrl+A -> Delete)
 * 2. คัดลอกโค้ดนี้ไปวางในไฟล์ชื่อ Code.gs เพียงไฟล์เดียว
 * 3. กด Save และ Deploy New Version
 * =========================================================================
 */

const QC_CONFIG = {
  "SHE": {
    "EHS Overview": ["Safety equipment", "Personal Protective Equipment (PPE)", "Site safety signs"]
  },
  "Before": {
    "Before On Tower Sector A": ["Tower view before installation Sector A"],
    "Before On Tower Sector B": ["Tower view before installation Sector B"],
    "Before On Tower Sector C": ["Tower view before installation Sector C"],
    "Before On Tower Sector D": ["Tower view before installation Sector D"],
    "Before On Ground": ["Ground area before installation"],
    "Before On Ground C1": ["Ground area C1 before installation"],
    "Before On Ground C2": ["Ground area C2 before installation"]
  },
  "Panorama": {
    "0° Panorama": ["Panoramic view at 0 degrees"],
    "30° Panorama": ["Panoramic view at 30 degrees"],
    "60° Panorama": ["Panoramic view at 60 degrees"],
    "90° Panorama": ["Panoramic view at 90 degrees"],
    "120° Panorama": ["Panoramic view at 120 degrees"],
    "150° Panorama": ["Panoramic view at 150 degrees"],
    "180° Panorama": ["Panoramic view at 180 degrees"],
    "210° Panorama": ["Panoramic view at 210 degrees"],
    "240° Panorama": ["Panoramic view at 240 degrees"],
    "270° Panorama": ["Panoramic view at 270 degrees"],
    "300° Panorama": ["Panoramic view at 300 degrees"],
    "330° Panorama": ["Panoramic view at 330 degrees"]
  },
  "Quality Check": {
    "Sector A": {
      "ระบุ Sector ที่ติดตั้ง": "Confirming Sector A installation",
      "ระบุคลื่นความถี่ที่ทำการติดตั้ง": "Frequency identification",
      "Tower Outdoor View": "General view of the tower",
      "Antenna/AAU position": "Correct positioning of Antenna/AAU",
      "Antenna Model": "Readable antenna model label",
      "M Tilt": "Mechanical tilt setting check",
      "Azimuth with Compass": "Compass showing azimuth direction",
      "Zoom Compass of Azimuth Sector A": "Close-up of compass reading",
      "Jumper/ RET under Antenna/AAU photo include Filter/Combiner/Triplexer": "Cable and peripheral connections",
      "Clamp Antenna / AAU Top/Bottom": "Clamping status top and bottom",
      "RRU#1 Overview Photo": "Overview of first RRU",
      "RRU#1 Serial": "Serial number of RRU#1",
      "Ground cable connect under RRU#1": "Grounding check for RRU#1",
      "Jumper/RET/Label/Color mark under RRU#1": "Labeling and color marking RRU#1",
      "RRU#1/AAU Socket Wire strip length is 18mm with scale": "Wire strip length measurement with ruler (18mm)",
      "RRU#1/AAU Socket Left Side view": "Left socket view",
      "RRU#1/AAU Socket Right Side view": "Right socket view",
      "Open RRU#1 cover with plug in CPRI and socket DC RRU#1 Sector A": "Internal connections of RRU#1",
      "RRU#2 Overview Photo": "Overview of second RRU",
      "RRU#2 Serial": "Serial number of RRU#2",
      "Ground cable connect under RRU#2": "Grounding check for RRU#2",
      "Jumper/RET/Label/Color mark under RRU#2": "Labeling and color marking RRU#2",
      "RRU#2/AAU Socket Wire strip length is 18mm with scale": "Wire strip length measurement with ruler (18mm) RRU#2",
      "RRU#2/AAU Socket Left Side view": "Left socket view RRU#2",
      "RRU#2/AAU Socket Right Side view": "Right socket view RRU#2",
      "Open RRU#2 cover with plug in CPRI and socket DC RRU#2 Sector A": "Internal connections of RRU#2",
      "Stainless cable tie at jumper with pipe": "Cable tie application",
      "DCDU socket of RRU Sector A#1, After wire strip at DCDU": "DCDU connection check",
      "OCB": "Over-current breaker check",
      "Mounting": "Mounting stability",
      "Ground bar": "Ground bar connection",
      "Notch CPRI Cable": "CPRI cable routing",
      "(if any) Filter": "Filter installation (if applicable)",
      "(if any) Pipe": "Pipe installation (if applicable)",
      "(if any) Diplexer / Combiner / Splitter": "Peripheral components"
    },
    "Sector B": {
      "ระบุ Sector ที่ติดตั้ง": "Confirming Sector B installation",
      "ระบุคลื่นความถี่ที่ทำการติดตั้ง": "Frequency identification",
      "Tower Outdoor View": "General view of the tower",
      "Antenna/AAU position": "Correct positioning",
      "Antenna Model": "Antenna model label",
      "M Tilt": "Mechanical tilt check",
      "Azimuth with Compass": "Compass azimuth",
      "Zoom Compass of Azimuth Sector A": "Zoomed compass reading",
      "Jumper/ RET under Antenna/AAU photo include Filter/Combiner/Triplexer": "Jumper and peripheral connections",
      "Clamp Antenna / AAU Top/Bottom": "Clamping status",
      "RRU#1 Overview Photo": "RRU#1 Overview",
      "RRU#1 Serial": "RRU#1 Serial number",
      "Ground cable connect under RRU#1": "RRU#1 Grounding",
      "Jumper/RET/Label/Color mark under RRU#1": "RRU#1 Labeling",
      "RRU#1/AAU Socket Wire strip length is 18mm with scale": "Wire strip 18mm RRU#1",
      "RRU#1/AAU Socket Left Side view": "Left socket RRU#1",
      "RRU#1/AAU Socket Right Side view": "Right socket RRU#1",
      "Open RRU#1 cover with plug in CPRI and socket DC RRU#1 Sector A": "Internal RRU#1",
      "RRU#2 Overview Photo": "RRU#2 Overview",
      "RRU#2 Serial": "RRU#2 Serial number",
      "Ground cable connect under RRU#2": "RRU#2 Grounding",
      "Jumper/RET/Label/Color mark under RRU#2": "RRU#2 Labeling",
      "RRU#2/AAU Socket Wire strip length is 18mm with scale": "Wire strip 18mm RRU#2",
      "RRU#2/AAU Socket Left Side view": "Left socket RRU#2",
      "RRU#2/AAU Socket Right Side view": "Right socket RRU#2",
      "Open RRU#2 cover with plug in CPRI and socket DC RRU#2 Sector A": "Internal RRU#2",
      "Stainless cable tie at jumper with pipe": "Cable ties",
      "DCDU socket of RRU Sector A#1, After wire strip at DCDU": "DCDU socket",
      "OCB": "OCB",
      "Mounting": "Mounting",
      "Ground bar": "Ground bar",
      "Notch CPRI Cable": "CPRI Cable",
      "(if any) Filter": "Filter",
      "(if any) Pipe": "Pipe",
      "(if any) Diplexer / Combiner / Splitter": "Diplexer/Combiner/Splitter"
    },
    "Sector C": {
      "ระบุ Sector ที่ติดตั้ง": "Confirming Sector C installation",
      "ระบุคลื่นความถี่ที่ทำการติดตั้ง": "Frequency identification",
      "Tower Outdoor View": "Tower View",
      "Antenna/AAU position": "Antenna Position",
      "Antenna Model": "Antenna Model Label",
      "M Tilt": "Tilt check",
      "Azimuth with Compass": "Azimuth compass",
      "Zoom Compass of Azimuth Sector A": "Zoomed Azimuth",
      "Jumper/ RET under Antenna/AAU photo include Filter/Combiner/Triplexer": "Cable connections",
      "Clamp Antenna / AAU Top/Bottom": "Clamping",
      "RRU#1 Overview Photo": "RRU#1 Overview",
      "RRU#1 Serial": "RRU#1 Serial",
      "Ground cable connect under RRU#1": "RRU#1 Grounding",
      "Jumper/RET/Label/Color mark under RRU#1": "RRU#1 Labeling",
      "RRU#1/AAU Socket Wire strip length is 18mm with scale": "Wire strip 18mm RRU#1",
      "RRU#1/AAU Socket Left Side view": "Left socket RRU#1",
      "RRU#1/AAU Socket Right Side view": "Right socket RRU#1",
      "Open RRU#1 cover with plug in CPRI and socket DC RRU#1 Sector A": "Internal RRU#1",
      "RRU#2 Overview Photo": "RRU#2 Overview",
      "RRU#2 Serial": "RRU#2 Serial",
      "Ground cable connect under RRU#2": "RRU#2 Grounding",
      "Jumper/RET/Label/Color mark under RRU#2": "RRU#2 Labeling",
      "RRU#2/AAU Socket Wire strip length is 18mm with scale": "Wire strip 18mm RRU#2",
      "RRU#2/AAU Socket Left Side view": "Left socket RRU#2",
      "RRU#2/AAU Socket Right Side view": "Right socket RRU#2",
      "Open RRU#2 cover with plug in CPRI and socket DC RRU#2 Sector A": "Internal RRU#2",
      "Stainless cable tie at jumper with pipe": "Cable ties",
      "DCDU socket of RRU Sector A#1, After wire strip at DCDU": "DCDU socket",
      "OCB": "OCB",
      "Mounting": "Mounting",
      "Ground bar": "Ground bar",
      "Notch CPRI Cable": "CPRI Cable",
      "(if any) Filter": "Filter",
      "(if any) Pipe": "Pipe",
      "(if any) Diplexer / Combiner / Splitter": "Diplexer/Combiner/Splitter"
    },
    "Sector D": {
      "ระบุ Sector ที่ติดตั้ง": "Confirming Sector D installation",
      "ระบุคลื่นความถี่ที่ทำการติดตั้ง": "Frequency identification",
      "Tower Outdoor View": "Tower View",
      "Antenna/AAU position": "Antenna Position",
      "Antenna Model": "Antenna Model Label",
      "M Tilt": "Tilt check",
      "Azimuth with Compass": "Azimuth compass",
      "Zoom Compass of Azimuth Sector A": "Zoomed Azimuth",
      "Jumper/ RET under Antenna/AAU photo include Filter/Combiner/Triplexer": "Cable connections",
      "Clamp Antenna / AAU Top/Bottom": "Clamping",
      "RRU#1 Overview Photo": "RRU#1 Overview",
      "RRU#1 Serial": "RRU#1 Serial",
      "Ground cable connect under RRU#1": "RRU#1 Grounding",
      "Jumper/RET/Label/Color mark under RRU#1": "RRU#1 Labeling",
      "RRU#1/AAU Socket Wire strip length is 18mm with scale": "Wire strip 18mm RRU#1",
      "RRU#1/AAU Socket Left Side view": "Left socket RRU#1",
      "RRU#1/AAU Socket Right Side view": "Right socket RRU#1",
      "Open RRU#1 cover with plug in CPRI and socket DC RRU#1 Sector A": "Internal RRU#1",
      "RRU#2 Overview Photo": "RRU#2 Overview",
      "RRU#2 Serial": "RRU#2 Serial",
      "Ground cable connect under RRU#2": "RRU#2 Grounding",
      "Jumper/RET/Label/Color mark under RRU#2": "RRU#2 Labeling",
      "RRU#2/AAU Socket Wire strip length is 18mm with scale": "Wire strip 18mm RRU#2",
      "RRU#2/AAU Socket Left Side view": "Left socket RRU#2",
      "RRU#2/AAU Socket Right Side view": "Right socket RRU#2",
      "Open RRU#2 cover with plug in CPRI and socket DC RRU#2 Sector A": "Internal RRU#2",
      "Stainless cable tie at jumper with pipe": "Cable ties",
      "DCDU socket of RRU Sector A#1, After wire strip at DCDU": "DCDU socket",
      "OCB": "OCB",
      "Mounting": "Mounting",
      "Ground bar": "Ground bar",
      "Notch CPRI Cable": "CPRI Cable",
      "(if any) Filter": "Filter",
      "(if any) Pipe": "Pipe",
      "(if any) Diplexer / Combiner / Splitter": "Diplexer/Combiner/Splitter"
    },
    "On Ground": {
      "Site Overview": "General view of the entire site",
      "Tower/Pole 1": "View of tower or pole 1",
      "Tower/Pole 2": "View of tower or pole 2",
      "Tower/Pole 3": "View of tower or pole 3",
      "Master Bar Ground#1": "Master grounding bar 1",
      "Master Bar Ground#2": "Master grounding bar 2",
      "Kilowat Hour Meter": "Electricity meter photo"
    },
    "On Ground C1": {
      "Main Breaker of AC MDB#1.1": "Main AC breaker 1.1",
      "Main Breaker of AC MDB#1.2": "Main AC breaker 1.2",
      "POE/POR Open Rack": "Open rack overview",
      "All Cabinet Overview": "All cabinets overview",
      "Rectifier View Photo": "Rectifier overview",
      "BUSBAR : Breaker DC-RRU": "Busbar and DC breakers",
      "Bayface of BBU": "BBU front view",
      "Ground Cable of BBU": "BBU grounding cable",
      "Ground Cable of BBU to Ground Bar in Cabinet": "BBU grounding connection",
      "DCDU : DC-RRU": "DCDU overview",
      "Ground Cable of DCDU": "DCDU grounding cable",
      "Ground Cable of DCDU to Ground Bar in Cabinet": "DCDU grounding connection",
      "Serial of BBU": "BBU Serial number",
      "Zoom Left Side of BBU with Redmark สำหรับการดที่ทำการติดตั้ง": "BBU left zoom with install mark",
      "Zoom Right Side of BBU with Redmark สำหรับการดที่ทำการติดตั้ง": "BBU right zoom with install mark",
      "Serial Card install #1": "Card 1 Serial",
      "Serial Card install #2": "Card 2 Serial",
      "Serial UPEU": "UPEU Serial",
      "Copper Socket DC-BBU@DCDU with scale Socket 1": "DC socket 1 measurement",
      "Copper Socket DC-BBU@DCDU with scale Socket 2": "DC socket 2 measurement",
      "Copper Socket DC-BBU@DCDU with scale Socket 3": "DC socket 3 measurement",
      "Copper Socket DC-BBU@DCDU with scale Socket 4": "DC socket 4 measurement",
      "Display Current Load": "Load display reading",
      "Bar Ground in Cabinet": "Cabinet grounding bar",
      "Alarm Krone": "Krone alarm block",
      "POE Intlet": "POE inlet connection",
      "POE Outlet": "POE outlet connection",
      "ROOM Intlet": "Room inlet",
      "ROOM Outlet": "Room outlet",
      "Position Loop CPRI with J-hanger at outdoor POE": "CPRI loop with J-hanger",
      "Wiring CPRI with Feeder (Vertical)": "CPRI and feeder wiring",
      "Grounding kit position showing installation After insulation/water proofing tape to see that the kit are connect to shield ground.": "Grounding kit installation details",
      "Feeder Overview": "Feeder cables overview",
      "Notch CPRI Cable": "CPRI cable routing",
      "GPS Antenna Installation": "GPS antenna",
      "GPS Surge Installation": "GPS surge protection",
      "GPS Wiring Cable": "GPS wiring",
      "GPS check photo, screenshot GPS status from OMC": "GPS status screenshot",
      "Label in door": "Inside door label",
      "Label Outdoor": "Outdoor label",
      "Site Cleaness": "Overall site cleanliness"
    },
    "On Ground C2": {
       "Main Breaker of AC MDB#1.1": "Main AC breaker 1.1",
      "Main Breaker of AC MDB#1.2": "Main AC breaker 1.2",
      "POE/POR Open Rack": "Open rack overview",
      "All Cabinet Overview": "All cabinets overview",
      "Rectifier View Photo": "Rectifier overview",
      "BUSBAR : Breaker DC-RRU": "Busbar and DC breakers",
      "Bayface of BBU": "BBU front view",
      "Ground Cable of BBU": "BBU grounding cable",
      "Ground Cable of BBU to Ground Bar in Cabinet": "BBU grounding connection",
      "DCDU : DC-RRU": "DCDU overview",
      "Ground Cable of DCDU": "DCDU grounding cable",
      "Ground Cable of DCDU to Ground Bar in Cabinet": "DCDU grounding connection",
      "Serial of BBU": "BBU Serial number",
      "Zoom Left Side of BBU with Redmark สำหรับการดที่ทำการติดตั้ง": "BBU left zoom with install mark",
      "Zoom Right Side of BBU with Redmark สำหรับการดที่ทำการติดตั้ง": "BBU right zoom with install mark",
      "Serial Card install #1": "Card 1 Serial",
      "Serial Card install #2": "Card 2 Serial",
      "Serial UPEU": "UPEU Serial",
      "Copper Socket DC-BBU@DCDU with scale Socket 1": "DC socket 1 measurement",
      "Copper Socket DC-BBU@DCDU with scale Socket 2": "DC socket 2 measurement",
      "Copper Socket DC-BBU@DCDU with scale Socket 3": "DC socket 3 measurement",
      "Copper Socket DC-BBU@DCDU with scale Socket 4": "DC socket 4 measurement",
      "Display Current Load": "Load display reading",
      "Bar Ground in Cabinet": "Cabinet grounding bar",
      "Alarm Krone": "Krone alarm block",
      "POE Intlet": "POE inlet connection",
      "POE Outlet": "POE outlet connection",
      "ROOM Intlet": "Room inlet",
      "ROOM Outlet": "Room outlet",
      "Position Loop CPRI with J-hanger at outdoor POE": "CPRI loop with J-hanger",
      "Wiring CPRI with Feeder (Vertical)": "CPRI and feeder wiring",
      "Grounding kit position showing installation After insulation/water proofing tape to see that the kit are connect to shield ground.": "Grounding kit installation details",
      "Feeder Overview": "Feeder cables overview",
      "Notch CPRI Cable": "CPRI cable routing",
      "GPS Antenna Installation": "GPS antenna",
      "GPS Surge Installation": "GPS surge protection",
      "GPS Wiring Cable": "GPS wiring",
      "GPS check photo, screenshot GPS status from OMC": "GPS status screenshot",
      "Label in door": "Inside door label",
      "Label Outdoor": "Outdoor label",
      "Site Cleaness": "Overall site cleanliness"
    }
  },
  "Equipment Checklist": {
    "Photo of all equipment will be install on site": ["All Install Equipment"],
    "Photo of all equipment will be dismantle on site": ["All Dismantle Equipment"]
  }
};

// =========================================================================
// === 🧠 AI SMART QC ENGINE - V.148 (PREMIUM STABLE) ===
// =========================================================================

const VERSION = "V.148 (PREMIUM STABLE)"; 

const AUTHORIZED_USERS = [
  "adisak.chanmao@teloneer.com",
  "boonchot.boriwut@teloneer.com",
  "apichart.kampuang@teloneer.com",
  "payon.sapphat@teloneer.com",
  "nattawoot.suwan@teloneer.com",
  "palagon.prommueangma@teloneer.com",
  "nammon.manakiat@teloneer.com",
  "auttaseth.klomthaisong@teloneer.com",
  "supot.hoonyong@teloneer.com",
  "khathahat.sitthihong@teloneer.com",
  "thossapol.chaloemrit@teloneer.com",
  "sathitphorn.intapankaew@teloneer.com"
];

const ADMIN_PASSWORD = "QC-ADMIN-2026";
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA";
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7";
const SPREADSHEET_ID = "1xp3EuRIWthalZhIWfToiJaihs4uYKARLEWXxVykmi9c".trim(); 
const SHEET_NAME = "Sheet1";

/**
 * ดึง Spreadsheet แบบกันพัง (Safe Open)
 */
function getSpreadsheet() {
  const candidates = [
    "1xp3EuRIWthalZhIWfToiJaihs4uYKARLEWXxVykmi9c", 
    "1xp3EuRlWthalZhlWfToiJaihs4uYKARLEWXxVykmj9c"
  ];
  
  let lastError = "";
  for (let id of candidates) {
    try {
      const ss = SpreadsheetApp.openById(id.trim());
      if (ss) return ss;
    } catch (e) { lastError = e.toString(); }
  }
  
  try {
    const files = DriveApp.getFilesByName("Control Panel");
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) return SpreadsheetApp.open(file);
    }
  } catch (e) {}
  
  throw new Error("❌ ไม่พบไฟล์ Spreadsheet 'Control Panel'");
}

function getSheetSmart(ss, name) {
  if (!ss) return null;
  const sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  const lowerName = String(name || "").toLowerCase();
  const found = ss.getSheets().find(s => s.getName().toLowerCase() === lowerName);
  return found || ss.getSheets()[0];
}

const TEMPLATES = {
  "HAE_MBB": "1f6v_5CNJyeaYk4ButvO7eXGqm47pnNQ_mjen8fOlVzI",
  "HAT_SSR": "1h2KQVYj9VS4mrbsNi2DC55OtGTzFSO1teqvJVwF5BEY",
  "DEFAULT": "1Pxdkd0Nxn-HzObefgkzcNFlCTDHrrVkj"
};

const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"; 
const TELEGRAM_TARGET_ID = "YOUR_TELEGRAM_TARGET_ID";
const GROQ_KEYS = ["YOUR_GROQ_KEY_1", "YOUR_GROQ_KEY_2", "YOUR_GROQ_KEY_3", "YOUR_GROQ_KEY_4"];
const GROQ_AI_URL = "https://api.groq.com/openai/v1/chat/completions";

function doGet(e) {
  let params = e?.parameter || {};
  const action = String(params.action || "").toLowerCase();
  console.log(`[${VERSION}] GET Action: ${action}`);
  try {
    if (action === "getdata") return jsonResponse(getDashboardData(params.site || "All Sites"));
    if (action === "checkpassword") {
      const email = String(params.email || "").toLowerCase();
      const pwd = String(params.password || "");
      const isAuthorized = AUTHORIZED_USERS.some(u => u.toLowerCase() === email);
      if (pwd === ADMIN_PASSWORD && (isAuthorized || !email)) {
        return jsonResponse({success:true});
      } else {
        return jsonResponse({error: isAuthorized ? "รหัสไม่ถูกต้อง" : "Email นี้ไม่มีสิทธิ์เข้าถึงระบบ"});
      }
    }
    if (action === "listfolders") return jsonResponse({ folders: listSubFolders(params.root || FOLDER_ID) });
    if (action === "listfiles") return jsonResponse(listFilesInFolder(params.folderId));
    if (action === "processfolder") return jsonResponse(processFolderById(params.folderId, params.templateId));
    if (action === "generatepat") return jsonResponse(generatePAT(params.folderId, params.siteName));
    if (action === "createsitefolder") return jsonResponse(createSiteFolder(params.project, params.type, params.site));
    if (action === "listtemplates") return jsonResponse(listTemplates(params.type, params.project));
    return jsonResponse({ status: "READY", version: VERSION });
  } catch (err) { return jsonResponse({ error: err.toString() }); }
}

function createSiteFolder(project, type, site) {
  try {
    const root = DriveApp.getFolderById(FOLDER_ID);
    const folderName = `${project}_${type}_${site}`;
    const folder = root.createFolder(folderName);
    return { id: folder.getId(), name: folder.getName(), url: folder.getUrl() };
  } catch (e) { return { error: e.toString() }; }
}

function listTemplates(type, project) {
  try {
    const key = `${project}_${type}`;
    const id = TEMPLATES[key] || TEMPLATES.DEFAULT;
    const file = DriveApp.getFileById(id);
    return [{ id: id, name: file.getName(), key: key }];
  } catch (e) { return [{ id: TEMPLATES.DEFAULT, name: "Default Template", key: "DEFAULT" }]; }
}

function doPost(e) {
  console.log(`[${VERSION}] doPost execution started`);
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput("⚠️ No Data");
  }

  try {
    const contents = JSON.parse(e.postData.contents);
    
    if (contents.action === "uploadfile") {
      return jsonResponse(uploadFile(contents.folderId, contents.fileName, contents.mimeType, contents.base64Data));
    }

    if (contents.callback_query) {
      const dataStr = String(contents.callback_query.data || "");
      if (!dataStr) return ContentService.createTextOutput("Empty Data");

      const msg = contents.callback_query.message;
      const adminName = contents.callback_query.from.first_name || "Admin";
      
      console.log(`[${VERSION}] TG Callback: ${dataStr}`);
      const parts = dataStr.split("|");
      if (parts.length < 2) return ContentService.createTextOutput("Invalid Data Format");

      const action = parts[0]; 
      const fileId = parts[1];
      
      if (action === "app") {
        handleManualApprove(fileId, msg.chat.id, msg.message_id, adminName);
      } else if (action === "rej") {
        handleManualReject(fileId, msg.chat.id, msg.message_id, adminName);
      }
      return ContentService.createTextOutput("OK");
    }
  } catch (err) {
    console.error(`[${VERSION}] doPost Error: ` + err.toString());
  }
  return ContentService.createTextOutput("OK");
}

function uploadFile(folderId, fileName, mimeType, base64Data) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = folder.createFile(blob);
    return { success: true, id: file.getId(), name: file.getName(), url: file.getUrl() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function handleManualApprove(fileId, chatId, msgId, adminName) {
  console.log(`[${VERSION}] ManualApprove: ${fileId}`);
  try {
    if (!fileId || String(fileId) === "undefined") throw new Error("Invalid ID");
    
    const file = DriveApp.getFileById(fileId);
    const ss = getSpreadsheet();
    const sheet = getSheetSmart(ss, SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][6] || "") === fileId) {
        sheet.getRange(i + 1, 4).setValue("PASS (MANUAL)");
        sheet.getRange(i + 1, 5).setValue(`Approved by ${adminName}`);
        
        const siteName = String(data[i][7] || "Unknown Site");
        const fullCat = String(data[i][2] || "MANUAL_QC");
        const siteFolder = getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), siteName);
        
        let pathArr = fullCat.split(" > ");
        const destFolder = getOrCreateNestedFolder(siteFolder, pathArr);
        
        file.moveTo(destFolder);
        file.setDescription(`MANUAL_PASS: ${adminName} | ${file.getDescription() || ""}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      const folderName = file.getParents().hasNext() ? file.getParents().next().getName() : "Unknown Site";
      sheet.appendRow([new Date(), file.getName(), "MANUAL_QC", "PASS (MANUAL)", `Approved by ${adminName}`, file.getUrl(), fileId, folderName, "unknown", "MANUAL_QC", "MANUAL_QC", "MANUAL_QC"]);
      const destPass = getOrCreateSubFolder(getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), folderName), "MANUAL_QC");
      file.moveTo(destPass);
    }

    callTGRaw("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: `✅ APPROVED BY ${String(adminName).toUpperCase()}`, parse_mode: "Markdown" });
  } catch (e) { console.error(`[${VERSION}] Error: ${e}`); }
}

function handleManualReject(fileId, chatId, msgId, adminName) {
  try {
    callTGRaw("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: `❌ REJECTED BY ${String(adminName).toUpperCase()}`, parse_mode: "Markdown" });
  } catch (e) {}
}

function generatePAT(folderId, siteName) {
  console.log(`[${VERSION}] Generating PAT: ${siteName}`);
  try {
    const ssDb = getSpreadsheet();
    const sheet = ssDb.getSheetByName(SHEET_NAME); 
    const siteFolder = DriveApp.getFolderById(folderId);
    
    const fileIds = [];
    const scan = (fld) => {
      const it = fld.getFiles(); while (it.hasNext()) fileIds.push(it.next().getId());
      const subs = fld.getFolders(); while (subs.hasNext()) { const s = subs.next(); if (s.getName() !== "TEMPATE") scan(s); }
    };
    scan(siteFolder);
    const idSet = new Set(fileIds);

    const data = sheet.getDataRange().getValues();
    const filtered = data.filter(row => {
      const fid = String(row[6] || "").trim();
      const status = String(row[3] || "").toUpperCase();
      return idSet.has(fid) && status.includes("PASS");
    });

    if (filtered.length === 0) return { success: false, error: "ไม่พบรูปภาพ PASS" };

    let tid = TEMPLATES.DEFAULT;
    const sn = String(siteName).toUpperCase();
    if (sn.includes("HAE")) tid = TEMPLATES.HAE_MBB;
    else if (sn.includes("HAT")) tid = TEMPLATES.HAT_SSR;
    
    const dest = getOrCreateSubFolder(siteFolder, "TEMPATE");
    const newSS = SpreadsheetApp.openById(DriveApp.getFileById(tid).makeCopy(`PAT_REPORT_${siteName}`, dest).getId());
    newSS.getSheets().forEach(s => { fillPlaceholder(s, "Site name :", siteName); fillPlaceholder(s, "Site code :", siteName); });

    const grouped = filtered.reduce((acc, row) => {
      const cat = String(row[2] || "Uncategorized").trim();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ id: row[6], type: String(row[8] || "").toLowerCase() });
      return acc;
    }, {});

    Object.keys(grouped).forEach(cat => {
      let targetSheet = findTargetSheetSmart(newSS, cat) || findSheetByContent(newSS, cat);
      if (!targetSheet) return;
      const locs = findImageLocations(targetSheet);
      grouped[cat].forEach(p => {
        const type = p.type === "before" ? "before" : (p.type === "after" ? "after" : null);
        let targetLoc = type ? locs.find(l => l.type === type && !l.used) : locs.find(l => !l.used);
        if (targetLoc) {
          try {
            insertImageInBox(targetSheet, DriveApp.getFileById(p.id).getBlob(), targetLoc.col, targetLoc.row, targetLoc.width, targetLoc.height);
            targetLoc.used = true;
          } catch(e) {}
        }
      });
    });
    return { success: true, url: newSS.getUrl() };
  } catch (e) { return { error: e.toString() }; }
}

function findTargetSheetSmart(ss, cat) {
  const clean = String(cat).toUpperCase().replace(/\s/g, "");
  return ss.getSheets().find(s => {
    const sn = s.getName().toUpperCase().replace(/\s/g, "");
    return sn === clean || sn.includes(clean) || clean.includes(sn);
  });
}

function findSheetByContent(ss, txt) {
  for (let s of ss.getSheets()) {
    const data = s.getRange(1, 1, 30, 10).getValues();
    for (let r=0; r<data.length; r++) for (let c=0; c<data[r].length; c++) if (String(data[r][c]).toUpperCase().includes(String(txt).toUpperCase())) return s;
  }
  return null;
}

function findImageLocations(sheet) {
  const data = sheet.getDataRange().getValues();
  const locs = [];
  const regex = /(Before|After)(\s*:)?/i;
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const match = String(data[r][c]).match(regex);
      if (match) locs.push({ col: c + 1, row: Math.max(1, r - 14), width: 8, height: 16, type: match[1].toLowerCase(), used: false });
    }
  }
  if (locs.length === 0) { for (let i = 0; i < 6; i++) locs.push({ col: 2, row: 5 + (i * 18), width: 10, height: 17, type: "none", used: false }); }
  return locs;
}

function insertImageInBox(sheet, blob, col, row, w, h) {
  const img = sheet.insertImage(blob, col, Math.max(1, row));
  let pw = 0; for (let i = 0; i < w; i++) pw += sheet.getColumnWidth(col + i);
  let ph = 0; for (let i = 0; i < h; i++) ph += sheet.getRowHeight(Math.max(1, row + i));
  const ratio = Math.min((pw || 400) / img.getWidth(), (ph || 300) / img.getHeight());
  img.setWidth(img.getWidth() * ratio).setHeight(img.getHeight() * ratio);
}

function fillPlaceholder(s, t, v) {
  const data = s.getRange(1, 1, 10, 20).getValues();
  for (let r = 0; r < data.length; r++) for (let c = 0; c < data[r].length; c++) if (String(data[r][c]).includes(t)) s.getRange(r + 1, c + 2).setValue(v);
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function getOrCreateSubFolder(p, n) { const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); }
function listSubFolders(id) { const subs = DriveApp.getFolderById(id).getFolders(); const res = []; while (subs.hasNext()) { const f = subs.next(); res.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), date: f.getLastUpdated().toISOString() }); } return res.sort((a, b) => new Date(b.date) - new Date(a.date)); }

function listFilesInFolder(id) { 
  try {
    const folder = DriveApp.getFolderById(id);
    const files = folder.getFiles(); 
    const res = []; 
    while (files.hasNext()) { 
      const f = files.next(); 
      if (!(f.getDescription() || "").includes("PAT_CHECKED")) res.push({ id: f.getId(), name: f.getName(), size: (f.getSize() / 1024).toFixed(0) + " KB" }); 
    } 
    return { folderName: folder.getName(), files: res }; 
  } catch (e) { return { error: e.toString() }; }
}

function callTGRaw(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }

function processFolderById(folderId, templateId) {
  const lock = LockService.getScriptLock();
  try {
    const hasLock = lock.tryLock(10000); 
    if (!hasLock) return { error: "⚠️ System Busy" };
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const toProcess = [];
    const BATCH_LIMIT = 20; 
    let totalUnprocessed = 0;
    const allFiles = [];
    while (files.hasNext()) {
      const f = files.next();
      if (!(f.getDescription() || "").includes("PAT_CHECKED")) { totalUnprocessed++; allFiles.push(f); }
    }
    if (allFiles.length === 0) return { success: true, message: "ตรวจครบแล้ว" };
    for (let i = 0; i < Math.min(allFiles.length, BATCH_LIMIT); i++) toProcess.push(allFiles[i]);
    
    const result = processFileList(toProcess, folder.getName(), null);
    
    if (totalUnprocessed <= BATCH_LIMIT) {
      let txt = `📊 สรุป (${folder.getName()})\n✅ ผ่าน: ${result.pass}\n❌ ไม่ผ่าน: ${result.fail}`; 
      result.details.forEach((it, i) => { if (it.status !== "PASS") txt += `\n${i + 1}.📄 ${it.name}`; });
      callTGRaw("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: txt });
    }
    return { success: true, ...result, hasMore: totalUnprocessed > BATCH_LIMIT };
  } catch (e) { return { error: e.toString() }; } finally { try { lock.releaseLock(); } catch(e) {} }
}

function processFileList(files, siteName, checklist) {
  const ss = getSpreadsheet();
  const sheet = getSheetSmart(ss, SHEET_NAME);
  let pass = 0, fail = 0;
  const results = [];
  
  for (let f of files) {
    if (!f || typeof f.getBlob !== 'function') continue;
    try {
      const ai = analyzeAI(f, checklist);
      if (!ai || ai.status === "ERROR") {
        results.push({ name: f.getName(), status: "ERROR" });
        fail++;
        continue;
      }
      
      const status = String(ai.status || "FAIL").toUpperCase();
      let imageType = String(ai.imageType || "unknown").toLowerCase();
      
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference || "Unknown", status, ai.reason || "", f.getUrl(), f.getId(), siteName, imageType, ai.majorCategory || "", ai.subCategory || "", ai.detail || ""]);
      
      try {
        const rootArchive = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
        const siteFolder = getOrCreateSubFolder(rootArchive, siteName);
        
        let path = (status === "PASS") ? 
          [String(ai.majorCategory || "Uncategorized"), String(ai.subCategory || "General"), String(ai.detail || "Misc")] : 
          ["FAIL", String(ai.majorCategory || "Uncategorized"), String(ai.subCategory || "General"), String(ai.detail || "Misc")];
          
        f.moveTo(getOrCreateNestedFolder(siteFolder, path));
        f.setDescription(`PAT_CHECKED: ${status} | TYPE: ${imageType}`);
      } catch (e) {}
      
      results.push({ name: f.getName(), status: status, reason: ai.reason, category: ai.sheetReference });
      if (status === "PASS") pass++; 
      else { 
        fail++; 
        const blob = DriveApp.getFileById(f.getId()).getBlob(); 
        const kb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + f.getId() }, { text: "❌ ไมือนุมัติ", callback_data: "rej|" + f.getId() }]] }; 
        callTGRaw("sendPhoto", { chat_id: TELEGRAM_TARGET_ID, photo: blob, caption: `🚨 พบงานไม่ผ่าน: ${f.getName()}\n📌 หมวด: ${ai.sheetReference}\n❌ สาเหตุ: ${ai.reason}`, reply_markup: JSON.stringify(kb) });
      }
    } catch (e) { fail++; }
  }
  return { total: files.length, pass: pass, fail: fail, details: results };
}

function getOrCreateNestedFolder(root, pathArr) {
  let current = root;
  if (!pathArr || !Array.isArray(pathArr)) return root;
  for (let folderName of pathArr) {
    let name = String(folderName || "General").trim();
    if (!name || name === "undefined") name = "General";
    current = getOrCreateSubFolder(current, name);
  }
  return current;
}

function analyzeAI(file, customChecklist) {
  if (!file || typeof file.getBlob !== 'function') return { status: "ERROR", reason: "Invalid File" };
  const blob = file.getBlob();
  const b64 = Utilities.base64Encode(blob.getBytes());
  const mimeType = blob.getContentType();
  
  let detailedChecklist = customChecklist;
  if (!detailedChecklist && typeof QC_CONFIG !== 'undefined') {
    detailedChecklist = "Available Hierarchy:\n";
    for (let major in QC_CONFIG) {
      detailedChecklist += `- ${major}:\n`;
      for (let sub in QC_CONFIG[major]) {
        detailedChecklist += `  * ${sub}\n`;
      }
    }
  }

  const promptText = `Analyze site photo for AIS standard. You MUST identify Major Category, Sub Category, and Detail.
  Return JSON ONLY.
  Format: {"majorCategory":"String","subCategory":"String","detail":"String","status":"PASS"|"FAIL","reason":"Thai","imageType":"before"|"after"}
  Hierarchy Checklist: 
  ${detailedChecklist}`;

  const payload = { 
    "model": "llama-3.2-90b-vision-preview", 
    "messages": [{ "role": "user", "content": [{ "type": "text", "text": promptText }, { "type": "image_url", "image_url": { "url": `data:${mimeType};base64,${b64}` } }] }], 
    "response_format": { "type": "json_object" } 
  };
  
  for (let key of GROQ_KEYS) {
    try {
      const res = UrlFetchApp.fetch(GROQ_AI_URL, { method: "post", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, payload: JSON.stringify(payload), muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        let rawContent = JSON.parse(res.getContentText()).choices[0].message.content;
        let aiResult = JSON.parse(rawContent.replace(/```json/g, "").replace(/```/g, "").trim());
        const finalResult = {
          majorCategory: String(aiResult.majorCategory || "Uncategorized"),
          subCategory: String(aiResult.subCategory || "General"),
          detail: String(aiResult.detail || "Misc"),
          status: String(aiResult.status || "FAIL").toUpperCase(),
          reason: String(aiResult.reason || "Unknown"),
          imageType: String(aiResult.imageType || "unknown")
        };
        finalResult.sheetReference = `${finalResult.majorCategory} > ${finalResult.subCategory} > ${finalResult.detail}`;
        return finalResult;
      }
    } catch (e) {}
  }
  return { status: "ERROR", reason: "AI connection failed" };
}

function getDashboardData(siteFilter) {
  try {
    const ss = getSpreadsheet();
    const sheet = getSheetSmart(ss, SHEET_NAME);
    const dataRows = sheet.getDataRange().getValues().slice(1);
    const filtered = (siteFilter && siteFilter !== "All Sites") ? dataRows.filter(row => String(row[1]).includes(siteFilter) || String(row[7]).includes(siteFilter)) : dataRows;
    const statusMap = {};
    filtered.forEach(row => { const s = String(row[3] || "").toUpperCase(); const c = s.includes("PASS") ? "PASS" : (s.includes("FAIL") ? "FAIL" : "PENDING"); statusMap[c] = (statusMap[c] || 0) + 1; });
    return { metrics: { workOrders: filtered.length, rate: filtered.length > 0 ? Math.round((statusMap["PASS"] || 0) / filtered.length * 100) : 0 }, statusBreakdown: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] })) };
  } catch(e) { return { metrics: {workOrders:0, rate:0}, statusBreakdown: [] }; }
}

function runManualTest() {
  console.log(`[${VERSION}] Starting manual test from Editor...`);
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    if (!files.hasNext()) { console.warn("❌ Folder Empty"); return; }
    const f = files.next();
    console.log(`[${VERSION}] Testing file: ${f.getName()}`);
    const result = processFileList([f], "TEST_V148", null);
    console.log(`[${VERSION}] Result: ${result.details[0].status}`);
    console.log(`[${VERSION}] Path: ${result.details[0].category}`);
  } catch (e) { console.error(`[${VERSION}] Test Error: ${e}`); }
}

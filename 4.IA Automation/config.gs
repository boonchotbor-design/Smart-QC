// ============================================================
// config.gs — เวอร์ชั่นกู้คืนระบบ (Resilient Config)
// ============================================================

const CONFIG = {

  // --- Google Sheets ---
  SHEET_ID: '15tjRtRJRx7owdZf6yEwRUiOIQWUnCkt0vd7BHjWR2i4',
  SHEET_NAME: 'Control',

  // --- Gemini API ---
  GEMINI_API_KEY: 'AIzaSyCibcQ7gT9UUOSe4YYuoe_U4rsABq1vylg',
  GEMINI_MODEL: 'gemini-1.5-flash', 

  // --- LINE Messaging API ---
  LINE_CHANNEL_TOKEN: 'cC0z46ratf7ZSpafNeuR98pWB9oAnwjv8v61FJ9IAMhcvHF/WJiG2DkyAvoV31O4XW0deze++MdQMGp07S9Z6u/kDJnuLr16BXQorPu+m/OTk6IjRjLVcEo1c4Whf9htV7U/qNs9gU+2UjgB7GVJ+AdB04t89/1O/w1cDnyilFU=',
  LINE_USER_ID: 'Uad523a446c5b2bbfc78253901275d387',

  // --- Facebook Graph API ---
  FB_PAGE_ID: '102412824529229',
  // สำคัญ: ดึงรหัสผ่าน Page Token จากระบบหลังบ้านของ Google โดยตรง
  FB_PAGE_TOKEN: PropertiesService.getScriptProperties().getProperty('FB_PAGE_TOKEN'),
  FB_API_VERSION: 'v21.0',

  // --- คอลัมน์ใน Google Sheets ---
  COL: {
    PRODUCT_ID:      1,
    PRODUCT_NAME:    2,
    KEY_FEATURES:    3,
    MEDIA_URL:       4,
    MEDIA_TYPE:      5,
    AFFILIATE_LINK:  6,
    TARGET_PLATFORM: 7,
    SCHEDULED_DATE:  8,
    EXTRA_NOTES:     9,
    AI_CAPTION:      10,
    AI_GENERATED_AT: 11,
    STATUS:          12,
    LINE_MSG_ID:     13,
    FB_POST_ID:      14,
    POSTED_AT:       16,
    ERROR_LOG:       17
  },

  STATUS: {
    PENDING:        'PENDING',
    AI_DONE:        'AI_DONE',
    PENDING_REVIEW: 'PENDING_REVIEW',
    APPROVED:       'APPROVED',
    REJECTED:       'REJECTED',
    POSTED:         'POSTED',
    ERROR:          'ERROR'
  }
};

function getSheet() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
}

function logError(row, message) {
  const sheet = getSheet();
  sheet.getRange(row, CONFIG.COL.STATUS).setValue(CONFIG.STATUS.ERROR);
  sheet.getRange(row, CONFIG.COL.ERROR_LOG).setValue(message);
  console.error(`Row ${row}: ${message}`);
}

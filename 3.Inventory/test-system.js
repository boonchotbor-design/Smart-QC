/**
 * 🧪 Test System V.6.8.1
 * สคริปต์สำหรับทดสอบระบบแจ้งเตือนและการค้นหา (LINE & Telegram)
 * วิธีใช้งาน:
 * 1. ติดตั้ง axios: npm install axios
 * 2. แก้ไข VERCEL_URL ให้เป็น URL ของคุณ
 * 3. รันคำสั่ง: node test-system.js
 */

const axios = require('axios');

// 🚩 แก้ไขเป็น URL จริงของคุณ
const VERCEL_URL = 'https://project-ju28a.vercel.app'; 

const mockData = {
  header: {
    customer: "AIS",
    type: "IN",
    region: "ER",
    duid: "TEST-DUID-12345",
    billNo: "BILL-TEST-001",
    ownerWarehouse: "HW_Prapat",
    ownerReceiver: "TLN_Adirak",
    locationWarehouse: "Warehouse-A",
    locationReceiver: "Receiver-B"
  },
  items: [
    { type: "AISG", model: "AISG 3m", code: "4070193", desc: "AISG Cable 3m", qty: 2, sn: "SN-999-001" },
    { type: "BBU", model: "BBU5900", code: "5050505", desc: "Baseband Unit", qty: 1, sn: "SN-999-002" }
  ]
};

async function runTests() {
  console.log("🚀 กำลังเริ่มการทดสอบระบบ V.6.6.5...\n");

  // 1. ทดสอบแจ้งเตือน (LINE & Telegram Notify)
  console.log("1️⃣  ทดสอบแจ้งเตือนการบันทึกข้อมูล (/notify)...");
  try {
    const res = await axios.post(`${VERCEL_URL}/notify`, mockData);
    console.log(`   ✅ ผลลัพธ์: ${res.data} (ตรวจสอบในกลุ่ม LINE/Telegram)\n`);
  } catch (err) {
    console.error(`   ❌ ผิดพลาด: ${err.message}\n`);
  }

  // 2. ทดสอบค้นหา DUID ผ่าน Telegram Webhook
  console.log("2️⃣  ทดสอบบอท Telegram: ค้นหา DUID...");
  const duidSearchPayload = {
    message: {
      chat: { id: -5188878406 }, // Mock ID
      text: "SHSSM_2025 Coverage Expansion Ph1_New Site_Remote-BBU_ER"
    }
  };
  try {
    const res = await axios.post(`${VERCEL_URL}/telegram-webhook`, duidSearchPayload);
    console.log(`   ✅ ผลลัพธ์: ${res.data} (ตรวจสอบบอท Telegram ว่าส่งข้อมูลกลับมาหรือไม่)\n`);
  } catch (err) {
    console.error(`   ❌ ผิดพลาด: ${err.message}\n`);
  }

  // 3. ทดสอบการส่งรูปภาพ (Mock OCR Request)
  console.log("3️⃣  ทดสอบบอท Telegram: จำลองการส่งรูปภาพ (OCR)...");
  const photoPayload = {
    message: {
      chat: { id: -5188878406 },
      photo: [{ file_id: "mock_file_id" }] 
    }
  };
  console.log("   ℹ️  การทดสอบนี้จะล้มเหลวถ้า file_id ไม่จริง แต่เป็นการเช็คว่า Endpoint พร้อมทำงาน");
  try {
    const res = await axios.post(`${VERCEL_URL}/telegram-webhook`, photoPayload);
    console.log(`   ✅ ผลลัพธ์: ${res.data}\n`);
  } catch (err) {
    console.log(`   ℹ️  ผลลัพธ์ (คาดไว้แล้ว): ${err.message}\n`);
  }

  console.log("🏁 จบการทดสอบ");
}

runTests();

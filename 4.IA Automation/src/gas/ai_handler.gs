// src/gas/ai_handler.gs

/**
 * Generates a selling caption using Gemini API.
 */
function generateCaption(productName, features, price) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const prompt = `เขียนแคปชันขายของสำหรับ ${productName} 
จุดเด่น: ${features}
ราคา: ${price} บาท
ให้น่าดึงดูดสำหรับลูกค้าบน Facebook และ TikTok 
ใส่ Hashtag ที่เหมาะสม และใส่อีโมจิให้น่ารักๆ 
ไม่ต้องมีคำนำหน้า (เช่น "นี่คือแคปชันของคุณ") ให้เริ่มที่แคปชันเลย`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    return result.candidates[0].content.parts[0].text;
  } catch (e) {
    Logger.log("Error generating caption: " + e.message);
    return null;
  }
}

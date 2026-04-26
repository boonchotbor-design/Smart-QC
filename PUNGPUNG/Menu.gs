function getSnackMenu() {
  return {
    "type": "flex",
    "altText": "เมนูสั่งขนมทองม้วนทองก้อน",
    "contents": {
      "type": "carousel",
      "contents": [
        // กะทิ & พริกเผา
        createMenuBubble("🥥 รสกะทิ & 🌶️ พริกเผา", "#D4A373", [
          { name: "กะทิ-อัลมอนด์", price: 60, label: "กะทิ + อัลมอนด์" },
          { name: "กะทิ-เม็ดมะม่วง", price: 60, label: "กะทิ + เม็ดมะม่วง" },
          { name: "กะทิ-ไก่หยอง", price: 60, label: "กะทิ + ไก่หยอง" },
          { name: "พริกเผา-อัลมอนด์", price: 60, label: "พริกเผา + อัลมอนด์" },
          { name: "พริกเผา-เม็ดมะม่วง", price: 60, label: "พริกเผา + เม็ดมะม่วง" }
        ]),
        // โกโก้
        createMenuBubble("🍫 รสโกโก้", "#4E342E", [
          { name: "โกโก้-อัลมอนด์", price: 70, label: "โกโก้ + อัลมอนด์" },
          { name: "โกโก้-เม็ดมะม่วง", price: 70, label: "โกโก้ + เม็ดมะม่วง" },
          { name: "โกโก้-ไก่หยอง", price: 70, label: "โกโก้ + ไก่หยอง" },
          { name: "โกโก้-ดาร์กช็อค", price: 75, label: "พิเศษ: ไส้ดาร์กช็อคฯ", highlight: true }
        ]),
        // ชาเขียว & พิเศษ
        createMenuBubble("🍵 ชาเขียว & 🌟 พิเศษ", "#2E7D32", [
          { name: "ชาเขียว-อัลมอนด์", price: 70, label: "ชาเขียว + อัลมอนด์" },
          { name: "ชาเขียว-ไก่หยอง", price: 70, label: "ชาเขียว + ไก่หยอง" },
          { name: "ชาเขียว-ไวท์ช็อค", price: 75, label: "พิเศษ: ไวท์ช็อคฯ", highlight: true },
          { name: "พริกเผา-ไก่หยองพิเศษ", price: 75, label: "พิเศษ: พริกเผาไก่หยอง", highlight: true }
        ])
      ]
    }
  };
}

function createMenuBubble(title, color, items) {
  const contents = [
    { "type": "text", "text": title, "weight": "bold", "size": "lg", "color": "#ffffff" }
  ];
  
  const bodyItems = items.map(item => ({
    "type": "button",
    "height": "sm",
    "style": item.highlight ? "primary" : "secondary",
    "color": item.highlight ? "#FFD700" : null,
    "action": {
      "type": "postback",
      "label": `${item.label} (${item.price}.-)`,
      "data": `action=order&item=${item.name}&price=${item.price}`,
      "displayText": `สั่ง ${item.label}`
    }
  }));

  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "contents": contents, "backgroundColor": color },
    "body": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": bodyItems }
  };
}

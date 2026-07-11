/**
 * 🧪 Test LINE Bot Push — ใช้ Token ปัจจุบันจาก index.js
 * ทดสอบส่ง Push Message แต่ละ Bot ตรงๆ ไปที่กลุ่ม
 */
const { messagingApi } = require('@line/bot-sdk');

// ใช้ Config เดียวกับ index.js เสมอ
const LINE_CONFIGS = [
  {
    name:   'TLN-Inventory#1',
    token:  'eZe15XyurA2eFNBEjeMJ1PNG3lEiujNpzJ01GGarnoq7GFaYDqBttYZk0BHHh7KE5ZOaQdNJUdmhoCc+UoXxqmT1CdHZ7KHUWr7XACo1VY4ezEZpWVHuzufGydzTBOWnVgEgcksIJQDFeQrL3dvkUQdB04t89/1O/w1cDnyilFU=',
    secret: '9e671fd5239927772a16dbf00b7f7060',
    destId: 'Cb4baf5e474773f54f2b6538e4cd4d9ac'  // Group ID
  },
  {
    name:   'TLN-Inventory#2',
    token:  'KZDP3VqXvVOanS6Pn+qbYV80s74EabuZNFUkcpp1PAo1bAKfeqgGvSOY82n4jorohdk/E0XWQxF9amI05MWgRq2/Nu628A/1O4yZJB/6waqBdEZ0K5dHyKmf2q8hdf905HgAPNfA4yF4Ijn+9ydfGwdB04t89/1O/w1cDnyilFU=',
    secret: 'd7b4fe008fd6c1f75fed2a5d1ef30fb4',
    destId: 'Cb4baf5e474773f54f2b6538e4cd4d9ac'  // Group ID
  },
  {
    name:   'TLN-Inventory#3',
    token:  '+rX1Vp8W/wacBl/JTAqkRMDfx7oj/wvTV66GSpASORlUoTL2LHlAoNKIlQDXAX8cLYFHufC5EOPIBWElgRYXjC9qNUNbSjpq9JZ9rInybwWVSVSs9jYObP2EqRTgreI/30kjvTz8U2rnFvAYxX8mGwdB04t89/1O/w1cDnyilFU=',
    secret: '336ea8463c7b4c4d2145faebf9b1a6c2',
    destId: 'Cb4baf5e474773f54f2b6538e4cd4d9ac'  // Group ID
  },
  {
    name:   'TLN-Inventory#4',
    token:  'PLTC9GGkhVetPnJpG6Uq7tqRjZ6YZkBhsZkEsJGhuuElOW/+UCfLsZwT6tAZx9PeO70O8YORfw80wSw+i2AiyDBgvTtp90ljP1zbQ7EJk3J8mSEkKGdGpM5rO0SAvwcL2GmxxgNsQojv6ILXSI7kFQdB04t89/1O/w1cDnyilFU=',
    secret: 'dc9465ad716b7c312283d06649ec3ba1',
    destId: 'Cb4baf5e474773f54f2b6538e4cd4d9ac'  // Group ID
  },
  {
    name:   'TLN-Inventory#5',
    token:  'UXu38/91MpirgVo6cMnUR7Rnqo79WOi7R4GqeIMj2O8jMzO5U1Ws64UmFySOFh6lCbTNzpgUCq43OTw04h3T73uImFd5A2RYt7eyj6Fz1J85MUsTsy2CYTfD/lfRPIWB60jyTWryPTgXOpztiLNaYwdB04t89/1O/w1cDnyilFU=',
    secret: '5fa55926cffd99f317c9d8daf2f84a03',
    destId: 'Cb4baf5e474773f54f2b6538e4cd4d9ac'  // Group ID
  }
];

async function testAllBots() {
  console.log('🧪 ทดสอบส่ง Push Message จากแต่ละ Bot ตรงๆ\n');
  
  for (const bot of LINE_CONFIGS) {
    try {
      const client = new messagingApi.MessagingApiClient({ channelAccessToken: bot.token.trim() });
      await client.pushMessage({
        to: bot.destId,
        messages: [{ type: 'text', text: `🤖 ${bot.name} — Test Push OK ✅ (${new Date().toLocaleTimeString('th-TH')})` }]
      });
      console.log(`✅ ${bot.name}: Push สำเร็จ!`);
    } catch (err) {
      // ดึง error detail เพิ่มเติม
      const detail = err.statusCode ? `HTTP ${err.statusCode}` : err.message;
      console.error(`❌ ${bot.name}: FAIL — ${detail}`);
      if (err.originalError?.response?.data) {
        console.error(`   └ Detail: ${JSON.stringify(err.originalError.response.data)}`);
      }
    }
  }
  
  console.log('\n🏁 เสร็จ — เช็คกลุ่ม LINE ว่าบอทตัวไหนส่งมาได้บ้าง');
}

testAllBots();

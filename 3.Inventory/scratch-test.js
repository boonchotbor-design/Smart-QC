const axios = require('axios');

const LOCAL_URL = 'http://localhost:3000'; 

const mockData = {
  header: {
    customer: "TRUE",
    type: "OUT",
    region: "ER",
    duid: "RYG0654_Flash_RAN_EAS R3",
    billNo: "KTH22606120029",
    ownerWarehouse: "HW Delivery",
    ownerReceiver: "LN_Wachira SAOWARO",
    locationWarehouse: "HW Delivery",
    locationReceiver: "LN ER"
  },
  items: [
    { type: "AAU", model: "AAU5885", code: "02315NDH", desc: "AAU5885md 2300A 64T64R+2600A", qty: 1, sn: "2102315NDH1053100253" }
  ]
};

async function runTests() {
  console.log("🚀 Running notification test for TRUE customer...");
  try {
    const res = await axios.post(`${LOCAL_URL}/notify`, mockData);
    console.log(`✅ Server responded: ${res.data}`);
  } catch (err) {
    console.error(`❌ Error occurred:`, err.response ? err.response.data : err.message);
  }
}

runTests();

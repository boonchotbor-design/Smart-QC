// ===== CONFIGURATION =====
// IMPORTANT: Replace this with your Google Apps Script Web App URL after deploying
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec"; 

let currentSite = null;
let isProcessing = false;

// ===== WIZARD STATE =====
let wizardData = {
    project: '',
    type: '',
    site: '',
    folderId: '',
    folderUrl: '',
    passCount: 0,
    failCount: 0,
    patUrl: ''
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log("[QC-AUTO] Initializing Dashboard...");
    try {
        // Add Enter key listeners for auth fields
        ['admin-email', 'admin-password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') checkAuth(); });
        });
        ['reset-email'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') requestOTP(); });
        });
        ['otp-code', 'new-password', 'confirm-password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') resetPassword(); });
        });

        // Check if already authenticated (simple session storage)
        if (sessionStorage.getItem('qc_auth') === 'true') {
            const overlay = document.getElementById('auth-overlay');
            if (overlay) overlay.classList.remove('active');
            refreshData();
        } else {
            const overlay = document.getElementById('auth-overlay');
            if (overlay) overlay.classList.add('active');
        }
    } catch (e) {
        console.error("[QC-AUTO] Init Error:", e);
    }
});

// ===== AUTHENTICATION =====
function showAuthMode(mode) {
    document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('forgot-form').style.display = mode === 'forgot' ? 'block' : 'none';
    document.getElementById('otp-form').style.display = mode === 'otp' ? 'block' : 'none';
    
    // Clear errors
    document.getElementById('auth-error').textContent = '';
    document.getElementById('reset-error').textContent = '';
    document.getElementById('otp-error').textContent = '';
}

async function checkAuth() {
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('auth-error');
    
    if (!email || !password) {
        errorEl.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        const data = await response.json();
        
        if (data.success) {
            sessionStorage.setItem('qc_auth', 'true');
            sessionStorage.setItem('qc_user', data.email);
            document.getElementById('auth-overlay').classList.remove('active');
            document.getElementById('user-email').textContent = data.email;
            refreshData();
        } else {
            errorEl.textContent = data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        }
    } catch (err) {
        errorEl.textContent = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
    }
}

async function requestOTP() {
    const email = document.getElementById('reset-email').value.trim();
    const infoEl = document.getElementById('reset-info');
    const errorEl = document.getElementById('reset-error');
    const btn = document.getElementById('btn-request-otp');

    if (!email) {
        errorEl.textContent = "กรุณากรอกอีเมล";
        return;
    }

    btn.disabled = true;
    btn.textContent = "⏳ กำลังส่ง OTP...";
    errorEl.textContent = "";

    try {
        const response = await fetch(`${SCRIPT_URL}?action=requestotp&email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success) {
            sessionStorage.setItem('reset_email', email);
            infoEl.textContent = data.message;
            setTimeout(() => { showAuthMode('otp'); }, 1500);
        } else {
            errorEl.textContent = data.error;
            btn.disabled = false;
            btn.textContent = "ขอรหัส OTP";
        }
    } catch (err) {
        errorEl.textContent = "เกิดข้อผิดพลาดในการขอ OTP";
        btn.disabled = false;
        btn.textContent = "ขอรหัส OTP";
    }
}

async function resetPassword() {
    const email = sessionStorage.getItem('reset_email');
    const otp = document.getElementById('otp-code').value.trim();
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    const errorEl = document.getElementById('otp-error');

    if (!otp || !newPass || !confirmPass) {
        errorEl.textContent = "กรุณากรอกข้อมูลให้ครบทุกช่อง";
        return;
    }

    if (newPass !== confirmPass) {
        errorEl.textContent = "รหัสผ่านไม่ตรงกัน";
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=resetpassword&email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}&newPassword=${encodeURIComponent(newPass)}`);
        const data = await response.json();
        
        if (data.success) {
            sessionStorage.setItem('qc_auth', 'true');
            sessionStorage.setItem('qc_user', email);
            document.getElementById('auth-overlay').classList.remove('active');
            document.getElementById('user-email').textContent = email;
            openModal("เปลี่ยนรหัสผ่านสำเร็จ", "คุณได้เปลี่ยนรหัสผ่านและเข้าสู่ระบบเรียบร้อยแล้ว");
            refreshData();
        } else {
            errorEl.textContent = data.error;
        }
    } catch (err) {
        errorEl.textContent = "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน";
    }
}

// ===== VIEW NAVIGATION =====
function showView(viewId) {
    console.log("[QC-AUTO] Showing view:", viewId);
    
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Show target view
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.add('active');
    } else {
        console.error("[QC-AUTO] View not found:", viewId);
    }
    
    // Update nav links
    document.querySelectorAll('nav a').forEach(a => {
        const onclickAttr = a.getAttribute('onclick') || "";
        if (onclickAttr.includes(`'${viewId}'`)) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });

    if (viewId === 'qc-wizard') {
        showStep(1);
    }
}

// ===== WIZARD LOGIC =====
function showStep(step) {
    document.querySelectorAll('.wizard-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`wizard-step-${step}`).classList.add('active');

    document.querySelectorAll('.w-step').forEach((s, idx) => {
        const sNum = idx + 1;
        s.classList.remove('active', 'completed');
        if (sNum === step) s.classList.add('active');
        else if (sNum < step) s.classList.add('completed');
    });
}

async function wizardCreateFolder() {
    const project = document.getElementById('w-project').value;
    const type = document.getElementById('w-type').value;
    const site = document.getElementById('w-sitename').value.trim();

    if (!site) {
        openModal("กรุณากรอกข้อมูล", "โปรดระบุชื่อ Site ก่อนดำเนินการต่อ");
        return;
    }

    wizardData.project = project;
    wizardData.type = type;
    wizardData.site = site;

    try {
        const btn = event.target;
        btn.disabled = true;
        btn.textContent = "⏳ กำลังสร้างโฟลเดอร์...";

        const res = await fetch(`${SCRIPT_URL}?action=createsitefolder&project=${project}&type=${type}&site=${encodeURIComponent(site)}`);
        const data = await res.json();

        if (data.id) {
            wizardData.folderId = data.id;
            wizardData.folderUrl = data.url;

            document.getElementById('w-folder-name-display').textContent = data.name;
            document.getElementById('w-drive-link').href = data.url;

            showStep(2);
        } else {
            throw new Error(data.error || "ไม่สามารถสร้างโฟลเดอร์ได้");
        }
    } catch (err) {
        openModal("เกิดข้อผิดพลาด", err.message);
    } finally {
        event.target.disabled = false;
        event.target.textContent = "ถัดไป: สร้างโฟลเดอร์ →";
    }
}

async function wizardCheckUpload() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=listfiles&folderId=${wizardData.folderId}`);
        const data = await res.json();

        const count = (data.files && data.files.length) || 0;
        document.getElementById('w-file-count').textContent = count;

        if (count === 0) {
            openModal("ไม่พบไฟล์", "ยังไม่พบรูปภาพในโฟลเดอร์ กรุณาอัปโหลดรูปภาพก่อนดำเนินการต่อ");
        } else {
            showStep(3);
        }
    } catch (err) {
        openModal("เกิดข้อผิดพลาด", "ไม่สามารถตรวจสอบไฟล์ได้: " + err.message);
    }
}

async function wizardStartScan() {
    if (isProcessing) return;
    
    isProcessing = true;
    const btn = document.getElementById('btn-w-start-scan');
    btn.disabled = true;
    
    const logContainer = document.getElementById('w-scan-logs');
    const progressBar = document.getElementById('w-progress-bar');
    const info = document.getElementById('w-scan-info');
    
    logContainer.innerHTML = '<div class="log-entry info">🚀 เริ่มการประมวลผล AI...</div>';
    progressBar.style.width = '5%';
    
    wizardData.passCount = 0;
    wizardData.failCount = 0;

    try {
        let hasMore = true;
        let totalProcessed = 0;
        
        while (hasMore) {
            info.textContent = `กำลังตรวจด้วย AI... (ประมวลผลแล้ว ${totalProcessed} รูป)`;
            const res = await fetch(`${SCRIPT_URL}?action=processfolder&folderId=${wizardData.folderId}`);
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            // Log and count
            data.details.forEach(det => {
                const time = new Date().toLocaleTimeString();
                const entry = document.createElement('div');
                entry.className = `log-entry ${det.status.toLowerCase()}`;
                entry.innerHTML = `
                    <div class="log-header">
                        <span class="status-tag">${det.status}</span>
                        <span class="log-time">${time}</span>
                    </div>
                    <div class="log-msg"><b>${det.name}</b><br>${det.reason}</div>
                `;
                logContainer.prepend(entry);
                
                if (det.status === "PASS") wizardData.passCount++;
                else wizardData.failCount++;
            });
            
            totalProcessed += data.processedInBatch || data.total;
            hasMore = data.hasMore;
            progressBar.style.width = hasMore ? '50%' : '100%';
        }
        
        info.textContent = `ตรวจเสร็จสิ้น! รวมทั้งสิ้น ${totalProcessed} รูป`;
        
        // Trigger final summary to Telegram
        try {
            await fetch(`${SCRIPT_URL}?action=sendfinalsummary&folderId=${wizardData.folderId}&pass=${wizardData.passCount}&fail=${wizardData.failCount}`);
        } catch (e) { console.error("Summary error:", e); }

        btn.style.display = 'none';
        document.getElementById('btn-w-to-step-4').style.display = 'inline-block';
        
        document.getElementById('w-res-pass').textContent = wizardData.passCount;
        document.getElementById('w-res-fail').textContent = wizardData.failCount;

    } catch (err) {
        info.textContent = "เกิดข้อผิดพลาด";
        const entry = document.createElement('div');
        entry.className = 'log-entry fail';
        entry.textContent = `❌ Error: ${err.message}`;
        logContainer.prepend(entry);
    } finally {
        isProcessing = false;
        btn.disabled = false;
    }
}

async function wizardGenPAT() {
    const btn = document.getElementById('btn-w-gen-pat');
    btn.disabled = true;
    btn.textContent = "⏳ กำลังสร้างรายงาน...";
    
    try {
        const res = await fetch(`${SCRIPT_URL}?action=generatepat&folderId=${wizardData.folderId}&siteName=${encodeURIComponent(wizardData.site)}`);
        const data = await res.json();
        
        if (data.success) {
            wizardData.patUrl = data.url;
            document.getElementById('w-pat-link').href = data.url;
            document.getElementById('w-pat-link-container').style.display = 'block';
            openModal("สร้างรายงานสำเร็จ", "รายงาน PAT ถูกสร้างเรียบร้อยแล้ว");
        } else {
            openModal("เกิดข้อผิดพลาด", data.error || "ไม่สามารถสร้างรายงานได้");
        }
    } catch (err) {
        openModal("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
        btn.disabled = false;
        btn.textContent = "📄 ออกรายงาน PAT";
    }
}

async function wizardCleanup(shouldDelete) {
    if (shouldDelete) {
        const confirm = window.confirm("คุณต้องการลบโฟลเดอร์นี้และรูปภาพทั้งหมดใช่หรือไม่? (การดำเนินการนี้ไม่สามารถย้อนกลับได้)");
        if (!confirm) return;

        try {
            openModal("กำลังลบข้อมูล", "ระบบกำลังลบโฟลเดอร์ชั่วคราว...");
            const res = await fetch(`${SCRIPT_URL}?action=deletefolder&folderId=${wizardData.folderId}`);
            const data = await res.json();
            
            if (data.success) {
                openModal("เสร็จสิ้น", "ลบข้อมูลและเสร็จสิ้นการทำงานเรียบร้อย");
                showView('overview');
                refreshData();
            } else {
                throw new Error(data.error || "ลบไม่สำเร็จ");
            }
        } catch (err) {
            openModal("ลบไม่สำเร็จ", err.message);
        }
    } else {
        openModal("เสร็จสิ้น", "บันทึกข้อมูลและเสร็จสิ้นการทำงานเรียบร้อย");
        showView('overview');
        refreshData();
    }
}

// ===== DATA FETCHING =====
async function refreshData() {
    await Promise.all([
        fetchStats(),
        fetchFolders()
    ]);
}

async function fetchStats() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getdata`);
        const data = await res.json();
        
        if (data.metrics) {
            document.getElementById('stat-total').textContent = data.metrics.workOrders;
            document.getElementById('stat-rate').textContent = data.metrics.rate + "%";
            
            const pass = data.statusBreakdown.find(s => s.name === "PASS")?.value || 0;
            const fail = data.statusBreakdown.find(s => s.name === "FAIL")?.value || 0;
            
            document.getElementById('stat-pass').textContent = pass;
            document.getElementById('stat-fail').textContent = fail;
            
            renderLegend(data.statusBreakdown);
        }
    } catch (err) {
        console.error("Fetch Stats Error:", err);
    }
}

function renderLegend(breakdown) {
    const container = document.getElementById('status-legend');
    container.innerHTML = '';
    breakdown.forEach(item => {
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `
            <span class="dot" style="background:${item.name === 'PASS' ? '#00ff88' : '#ff3d5a'}"></span>
            <span class="label">${item.name}: ${item.value}</span>
        `;
        container.appendChild(div);
    });
}

async function fetchFolders() {
    const listEl = document.getElementById('folder-list');
    try {
        const res = await fetch(`${SCRIPT_URL}?action=listfolders`);
        const data = await res.json();
        
        if (data.folders) {
            listEl.innerHTML = '';
            data.folders.forEach(folder => {
                const item = document.createElement('div');
                item.className = 'folder-item';
                item.onclick = () => selectSite(folder);
                item.innerHTML = `
                    <div class="fi-icon">📁</div>
                    <div class="fi-info">
                        <span class="fi-name">${folder.name}</span>
                        <span class="fi-date">อัปเดตเมื่อ: ${new Date(folder.date).toLocaleString('th-TH')}</span>
                    </div>
                    <div class="fi-arrow">→</div>
                `;
                listEl.appendChild(item);
            });
        }
    } catch (err) {
        listEl.innerHTML = '<div class="error">ไม่สามารถโหลดโฟลเดอร์ได้</div>';
    }
}

// ===== SITE PROCESSING =====
async function selectSite(folder) {
    currentSite = folder;
    document.getElementById('current-site-name').textContent = folder.name;
    document.getElementById('current-site-id').textContent = folder.id;
    document.getElementById('btn-start-process').disabled = false;
    document.getElementById('btn-gen-report').disabled = true;
    
    showView('process');
    fetchFiles(folder.id);
}

async function fetchFiles(folderId) {
    const body = document.getElementById('file-list-body');
    body.innerHTML = '<tr><td colspan="4" class="empty">กำลังโหลดไฟล์...</td></tr>';
    
    try {
        const res = await fetch(`${SCRIPT_URL}?action=listfiles&folderId=${folderId}`);
        const data = await res.json();
        
        if (data.files && data.files.length > 0) {
            body.innerHTML = '';
            data.files.forEach(file => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${file.name}</td>
                    <td>${file.size}</td>
                    <td><span class="badge">รอดำเนินการ</span></td>
                    <td>
                        <a href="#" class="action-link" onclick="recheckSingleFile('${file.id}')">🔄 Recheck</a>
                        <span class="divider">|</span>
                        <a href="https://drive.google.com/open?id=${file.id}" target="_blank" class="action-link">👁️ ดูรูป</a>
                    </td>
                `;
                body.appendChild(tr);
            });
        } else {
            body.innerHTML = '<tr><td colspan="4" class="empty">ไม่พบไฟล์ใหม่ที่รอดำเนินการ (ไฟล์อาจถูกตรวจแล้ว)</td></tr>';
        }
    } catch (err) {
        body.innerHTML = '<tr><td colspan="4" class="empty text-red">โหลดไฟล์ไม่สำเร็จ</td></tr>';
    }
}

async function recheckSingleFile(fileId) {
    if (isProcessing) return;
    
    const template = document.getElementById('template-select').value;
    const logContainer = document.getElementById('process-logs');
    
    const entry = document.createElement('div');
    entry.className = 'log-entry info';
    entry.textContent = `🔄 กำลัง Recheck ไฟล์ ID: ${fileId}...`;
    logContainer.prepend(entry);
    
    try {
        const res = await fetch(`${SCRIPT_URL}?action=recheck&fileId=${fileId}&templateId=${template}&siteName=${encodeURIComponent(currentSite.name)}`);
        const data = await res.json();
        
        if (data.success && data.detail) {
            const det = data.detail;
            const resEntry = document.createElement('div');
            resEntry.className = `log-entry ${det.status.toLowerCase()}`;
            resEntry.textContent = `[RECHECK] ${det.status}: ${det.reason}`;
            logContainer.prepend(resEntry);
            
            openModal("Recheck สำเร็จ", `ไฟล์: ${det.name}<br>ผลลัพธ์: <b>${det.status}</b><br>เหตุผล: ${det.reason}`);
            fetchFiles(currentSite.id); // Refresh list
        } else {
            throw new Error(data.error || "Recheck failed");
        }
    } catch (err) {
        const errEntry = document.createElement('div');
        errEntry.className = 'log-entry fail';
        errEntry.textContent = `❌ Error Recheck: ${err.message}`;
        logContainer.prepend(errEntry);
    }
}

async function startProcessing() {
    if (!currentSite || isProcessing) return;
    
    isProcessing = true;
    document.getElementById('btn-start-process').disabled = true;
    const template = document.getElementById('template-select').value;
    const logContainer = document.getElementById('process-logs');
    const progressBar = document.getElementById('progress-bar');
    const info = document.getElementById('process-info');
    
    logContainer.innerHTML = '<div class="log-entry">🚀 เริ่มการประมวลผล AI...</div>';
    progressBar.style.width = '10%';
    
    try {
        // We might need to process in batches if there are many files
        let hasMore = true;
        let totalProcessed = 0;
        
        while (hasMore) {
            info.textContent = `กำลังส่ง AI ตรวจสอบ... (ประมวลผลแล้ว ${totalProcessed} รูป)`;
            const res = await fetch(`${SCRIPT_URL}?action=processfolder&folderId=${currentSite.id}&templateId=${template}`);
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            // Log results
            data.details.forEach(det => {
                const entry = document.createElement('div');
                entry.className = `log-entry ${det.status.toLowerCase()}`;
                entry.textContent = `[${det.status}] ${det.name} - ${det.reason}`;
                logContainer.prepend(entry);
            });
            
            totalProcessed += data.processedInBatch || data.total;
            hasMore = data.hasMore;
            
            if (hasMore) {
                progressBar.style.width = '50%';
            } else {
                progressBar.style.width = '100%';
                info.textContent = `ประมวลผลเสร็จสิ้น! รวมทั้งสิ้น ${totalProcessed} รูป`;
                document.getElementById('btn-gen-report').disabled = false;
                addLog(`เสร็จสิ้น: ${currentSite.name} (${totalProcessed} รูป)`);
            }
        }
        
    } catch (err) {
        info.textContent = "เกิดข้อผิดพลาดในการประมวลผล";
        const entry = document.createElement('div');
        entry.className = 'log-entry fail';
        entry.textContent = `❌ Error: ${err.message}`;
        logContainer.prepend(entry);
    } finally {
        isProcessing = false;
        document.getElementById('btn-start-process').disabled = false;
        fetchFiles(currentSite.id);
    }
}

async function generateReport() {
    const btn = document.getElementById('btn-gen-report');
    btn.disabled = true;
    btn.textContent = "⏳ กำลังสร้างรายงาน...";
    
    try {
        const res = await fetch(`${SCRIPT_URL}?action=generatepat&folderId=${currentSite.id}&siteName=${encodeURIComponent(currentSite.name)}`);
        const data = await res.json();
        
        if (data.success) {
            openModal("สร้างรายงานสำเร็จ", `รายงาน PAT สำหรับ ${currentSite.name} ถูกสร้างเรียบร้อยแล้ว<br><br><a href="${data.url}" target="_blank" class="btn-primary" style="display:inline-block;text-decoration:none;">เปิด Google Sheets</a>`);
        } else {
            openModal("เกิดข้อผิดพลาด", data.error || "ไม่สามารถสร้างรายงานได้");
        }
    } catch (err) {
        openModal("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
        btn.disabled = false;
        btn.textContent = "📄 ออกรายงาน (PAT)";
    }
}

// ===== UTILS =====
function addLog(msg) {
    const list = document.getElementById('log-list');
    if (list.querySelector('.empty')) list.innerHTML = '';
    
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `
        <span class="log-time">${new Date().toLocaleTimeString()}</span>
        <span class="log-msg">${msg}</span>
    `;
    list.prepend(div);
}

function openModal(title, body) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwETPvuSOBd5d1KEjGleigvQ1fReUiqmlvYbfQmuPPLLeZ5xT5H7fhXSa35H5B3BKiU/exec";
const CONFIG = {
    lily: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1764720513&single=true&output=csv" },
    nopal: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1421544875&single=true&output=csv" }
};

let currentUser = 'lily';
let memoryCache = { lily: [], nopal: [] };

const BUDGET_CONFIG = [
    { id: 'kos', name: 'Uang Kos', limit: 550000, keywords: ['kos', 'kost', 'sewa'] },
    { id: 'arisan', name: 'Arisan Keluarga', limit: 200000, keywords: ['arisan', 'keluarga'] },
    { id: 'gigi', name: 'Dokter Gigi', limit: 500000, keywords: ['gigi', 'kontrol', 'behel', 'dokter'] },
    { id: 'makan', name: 'Budget Makan', limit: 500000, keywords: ['makan', 'jajan', 'minum', 'food'] },
    { id: 'grab', name: 'Grab', limit: 444000, keywords: ['grab', 'gojek', 'maxim', 'transport', 'ojol', 'motor', 'mobil'] },
    { id: 'makeup', name: 'Makeup', limit: 200000, keywords: ['makeup', 'skincare', 'kosmetik', 'dandan', 'lipstik'] },
    { id: 'listrik', name: 'Listrik', limit: 150000, keywords: ['listrik', 'token', 'pln'] }
];

// Custom fetch untuk memutus koneksi jika proses lebih dari 10 detik
async function fetchWithTimeout(url, options = {}) {
    const timeout = 10000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

function parseRow(row) {
    return row.split(',').map(v => v.replace(/"/g, '').trim());
}

const showToast = (msg) => {
    const t = document.getElementById('toast');
    t.innerText = msg; 
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
};

async function preloadAllData() {
    try {
        const [resL, resN] = await Promise.all([
            fetchWithTimeout(CONFIG.lily.url), 
            fetchWithTimeout(CONFIG.nopal.url)
        ]);
        const [textL, textN] = await Promise.all([resL.text(), resN.text()]);
        memoryCache.lily = textL.split(/\r?\n/).filter(r => r.trim()).slice(1).reverse();
        memoryCache.nopal = textN.split(/\r?\n/).filter(r => r.trim()).slice(1).reverse();
        filterTable();
    } catch (e) { 
        console.error("Gagal menarik data:", e); 
    }
}

async function sendData() {
    const nom = document.getElementById('in-nom').value;
    const kat = document.getElementById('in-kat').value;
    if (kat === "Semua") return showToast("Harap pilih kategori.");
    if (!nom) return showToast("Harap isi nominal.");

    const btn = document.getElementById('btn-send');
    btn.disabled = true; // Kunci tombol untuk mencegah klik ganda
    document.getElementById('loading-overlay').classList.remove('hidden');
    
    const data = { 
        user: currentUser === 'lily' ? 'Lily' : 'Nopal', 
        kat, nom, 
        ket: document.getElementById('in-ket').value.trim() || "-", 
        customDate: new Date().toISOString().split('T')[0] 
    };

    try {
        await fetchWithTimeout(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        
        document.getElementById('in-nom').value = "";
        document.getElementById('in-ket').value = "";
        document.getElementById('in-kat').value = "Semua";
        showToast("Data berhasil disimpan.");
        
        // HAPUS AWAIT. Biarkan penarikan data berjalan di latar belakang (Background Fetching)
        preloadAllData(); 
    } catch (e) { 
        showToast(e.name === 'AbortError' ? "Koneksi lambat, coba lagi." : "Gagal menyimpan data."); 
    } finally { 
        // Layar loading akan langsung tertutup setelah proses kirim POST selesai
        document.getElementById('loading-overlay').classList.add('hidden'); 
        btn.disabled = false; // Buka kembali kunci tombol
    }
}

function filterTable() {
    const filter = document.getElementById('in-kat').value;
    const data = memoryCache[currentUser];
    const filtered = (filter === 'Semua') ? data : data.filter(r => parseRow(r)[6] === filter);
    renderTable(filtered);
}

function renderTable(rows) {
    const tbody = document.getElementById('transaction-table');
    const fragment = document.createDocumentFragment();
    
    if (rows.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada data transaksi.</td></tr>";
    } else {
        rows.forEach(r => {
            const c = parseRow(r);
            const [tgl, kat, nomRaw, ket] = [c[5], c[6], c[7], c[8]];
            if (!tgl || !kat) return;
            
            const n = parseInt(nomRaw.replace(/[^0-9]/g, '')) || 0;
            const isIn = kat.toLowerCase().includes("masuk");
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${tgl.substring(0,5)}</td>
                <td class="${isIn ? 'row-in' : 'row-out'}">${isIn ? 'Masuk' : 'Keluar'}</td>
                <td>Rp ${n.toLocaleString('id-ID')}</td>
                <td>${ket}</td>
            `;
            fragment.appendChild(tr);
        });
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }
    
    let tIn = 0, tOut = 0;
    memoryCache[currentUser].forEach(r => {
        const c = parseRow(r);
        const n = parseInt(c[7]?.replace(/[^0-9]/g, '')) || 0;
        if (c[6]?.toLowerCase().includes("masuk")) tIn += n; else tOut += n;
    });
    
    document.getElementById('total-masuk').innerText = `Rp ${tIn.toLocaleString('id-ID')}`;
    document.getElementById('total-keluar').innerText = `Rp ${tOut.toLocaleString('id-ID')}`;
    document.getElementById('sisa-saldo').innerText = `Rp ${(tIn - tOut).toLocaleString('id-ID')}`;
    
    calculateBudget();
}

function calculateBudget() {
    let totals = {};
    let totalBudgetLimit = 0;
    let totalSpentThisMonth = 0;

    BUDGET_CONFIG.forEach(b => {
        totals[b.id] = 0;
        totalBudgetLimit += b.limit;
    });

    const data = memoryCache[currentUser];
    const now = new Date();
    
    const curYear = now.getFullYear().toString();
    const m1 = String(now.getMonth() + 1).padStart(2, '0');
    const m2 = String(now.getMonth() + 1);
    
    const idnMonths = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
    const engMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    const curMonthIdn = idnMonths[now.getMonth()];
    const curMonthEng = engMonths[now.getMonth()];
    const possibleNumberFormats = [`/${m1}/${curYear}`, `/${m2}/${curYear}`, `${curYear}-${m1}-`];

    data.forEach(r => {
        const c = parseRow(r);
        const [tgl, kat, nomRaw, ket] = [c[5] || '', c[6] || '', c[7] || '', (c[8] || '').toLowerCase()];
        const tglLower = tgl.toLowerCase();
        
        const isNumberFormat = possibleNumberFormats.some(format => tgl.includes(format));
        const isTextFormat = (tglLower.includes(curMonthIdn) || tglLower.includes(curMonthEng)) && tglLower.includes(curYear);
        
        if ((!isNumberFormat && !isTextFormat) || kat.toLowerCase().includes("masuk")) return;

        const n = parseInt(nomRaw.replace(/[^0-9]/g, '')) || 0;
        totalSpentThisMonth += n;
        
        for (let b of BUDGET_CONFIG) {
            if (b.keywords.some(k => ket.includes(k))) {
                totals[b.id] += n;
                break;
            }
        }
    });

    renderBudgetTable(totals);
    updateSmartInsight(totalSpentThisMonth, totalBudgetLimit);
}

function updateSmartInsight(spent, limit) {
    const insightEl = document.getElementById('spending-insight');
    if (!insightEl) return;

    if (spent === 0) {
        insightEl.innerText = "Belum ada pengeluaran bulan ini.";
        return;
    }

    const percentUsed = (spent / limit) * 100;
    
    if (percentUsed >= 80) {
        insightEl.innerText = "Pengeluaran mendekati batas. Harap berhemat.";
    } else if (percentUsed >= 50) {
        insightEl.innerText = "Setengah budget telah digunakan.";
    } else {
        insightEl.innerText = "Pengeluaran masih dalam batas aman.";
    }
}

function renderBudgetTable(totals) {
    const tbody = document.getElementById('budget-table-body');
    if (!tbody) return;
    
    const fragment = document.createDocumentFragment();
    
    BUDGET_CONFIG.forEach(b => {
        const bayar = totals[b.id];
        let statusImg = "";
        
        if (bayar > b.limit) {
            statusImg = "mad.png"; // Melebihi budget
        } else if (bayar > 0) {
            statusImg = "happy.png"; // Masih aman
        } else {
            // Belum ada pengeluaran, gunakan ikon aktif
            statusImg = currentUser === 'lily' ? 'icon.png' : 'icon2.png'; 
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b.name}</td>
            <td>${(b.limit / 1000)}k</td>
            <td>${(bayar / 1000)}k</td>
            <td><img src="${statusImg}" class="status-icon" alt="Status"></td>
        `;
        fragment.appendChild(tr);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

function toggleUser() {
    currentUser = (currentUser === 'lily') ? 'nopal' : 'lily';
    document.body.setAttribute('data-theme', currentUser);
    document.getElementById('in-kat').value = "Semua";
    
    const isLily = (currentUser === 'lily');
    const activeIconSrc = isLily ? 'icon.png' : 'icon2.png';
    const targetIconSrc = isLily ? 'icon2.png' : 'icon.png';
    
    document.getElementById('mascot-icon').src = activeIconSrc;
    document.getElementById('loading-icon').src = activeIconSrc; 
    document.getElementById('floating-sticker').src = targetIconSrc;
    document.getElementById('active-user-title').innerHTML = isLily ? 'Finance Lily' : 'Finance Nopal';
    
    filterTable(); 
}

window.onload = () => { 
    preloadAllData(); 
    document.getElementById('days-count').innerText = Math.ceil(Math.abs(new Date() - new Date("2025-09-09")) / 86400000);
    setInterval(preloadAllData, 30000);
};
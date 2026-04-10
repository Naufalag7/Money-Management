const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwETPvuSOBd5d1KEjGleigvQ1fReUiqmlvYbfQmuPPLLeZ5xT5H7fhXSa35H5B3BKiU/exec";
const CONFIG = {
    lily: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1764720513&single=true&output=csv" },
    nopal: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1421544875&single=true&output=csv" }
};

let currentUser = 'lily';
let memoryCache = { lily: [], nopal: [] };

const showToast = (msg) => {
    const t = document.getElementById('toast');
    t.innerText = msg; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
};

// Auto-refresh logic
async function preloadAllData() {
    try {
        const [resL, resN] = await Promise.all([fetch(CONFIG.lily.url), fetch(CONFIG.nopal.url)]);
        const [textL, textN] = await Promise.all([resL.text(), resN.text()]);
        memoryCache.lily = textL.split(/\r?\n/).filter(r => r.trim()).slice(1).reverse();
        memoryCache.nopal = textN.split(/\r?\n/).filter(r => r.trim()).slice(1).reverse();
        filterTable();
    } catch (e) { console.error("Sync error", e); }
}

async function sendData() {
    const nom = document.getElementById('in-nom').value;
    const kat = document.getElementById('in-kat').value;
    if (kat === "Semua") return showToast("Pilih kategori transaksi! 💸");
    if (!nom) return showToast("Nominal kosong! 💰");

    document.getElementById('loading-overlay').classList.remove('hidden');
    
    // Keterangan diatur menjadi string kosong jika tidak diisi
    const data = { 
        user: currentUser === 'lily' ? 'Lily' : 'Nopal', 
        kat, nom, 
        ket: document.getElementById('in-ket').value.trim() || "", 
        customDate: document.getElementById('in-date').value 
    };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        document.getElementById('in-nom').value = "";
        document.getElementById('in-ket').value = "";
        document.getElementById('in-kat').value = "Semua";
        showToast("Transaksi Disimpan! ✅");
        await preloadAllData(); // Refresh all data immediately
    } catch (e) { showToast("Gagal menyimpan!"); } 
    finally { document.getElementById('loading-overlay').classList.add('hidden'); }
}

function filterTable() {
    const filter = document.getElementById('in-kat').value;
    const data = memoryCache[currentUser];
    const filtered = (filter === 'Semua') ? data : data.filter(r => r.split(',')[6].replace(/"/g,'') === filter);
    renderTable(filtered);
}

function renderTable(rows) {
    let html = "";
    rows.forEach(r => {
        const c = r.split(',').map(v => v.replace(/"/g, '').trim());
        const [tgl, kat, nomRaw, ket] = [c[5], c[6], c[7], c[8]];
        if (!tgl || !kat) return;
        const n = parseInt(nomRaw.replace(/[^0-9]/g, '')) || 0;
        const isIn = kat.toLowerCase().includes("masuk");
        html += `<tr><td>${tgl.substring(0,5)}</td><td style="color:${isIn?'#4CAF50':'#F44336'};font-weight:700">${isIn?'IN':'OUT'}</td><td>${n.toLocaleString('id-ID')}</td><td>${ket}</td></tr>`;
    });
    document.getElementById('transaction-table').innerHTML = html || "<tr><td>Belum ada data</td></tr>";
    
    let tIn = 0, tOut = 0;
    memoryCache[currentUser].forEach(r => {
        const c = r.split(',').map(v => v.replace(/"/g, '').trim());
        const n = parseInt(c[7]?.replace(/[^0-9]/g, '')) || 0;
        if (c[6]?.toLowerCase().includes("masuk")) tIn += n; else tOut += n;
    });
    document.getElementById('total-masuk').innerText = tIn.toLocaleString('id-ID');
    document.getElementById('total-keluar').innerText = tOut.toLocaleString('id-ID');
    document.getElementById('sisa-saldo').innerText = (tIn - tOut).toLocaleString('id-ID');
}

function switchUser(u, e) {
    currentUser = u;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.body.setAttribute('data-theme', u);
    document.getElementById('in-kat').value = "Semua";
    filterTable(); 
}

window.onload = () => { 
    preloadAllData(); 
    document.getElementById('in-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('days-count').innerText = Math.ceil(Math.abs(new Date() - new Date("2025-09-09")) / 86400000);
    
    // Auto-refresh data every 30 seconds
    setInterval(preloadAllData, 30000);
};
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwETPvuSOBd5d1KEjGleigvQ1fReUiqmlvYbfQmuPPLLeZ5xT5H7fhXSa35H5B3BKiU/exec";
const CONFIG = {
    lily: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1764720513&single=true&output=csv" },
    nopal: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1421544875&single=true&output=csv" }
};

let currentUser = 'lily';
let memoryCache = { lily: [], nopal: [] };

const showToast = (msg) => {
    const t = document.getElementById('toast');
    t.innerText = msg; 
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
};

async function preloadAllData() {
    try {
        const [resL, resN] = await Promise.all([fetch(CONFIG.lily.url), fetch(CONFIG.nopal.url)]);
        const [textL, textN] = await Promise.all([resL.text(), resN.text()]);
        memoryCache.lily = textL.split(/\r?\n/).filter(r => r.trim()).slice(1).reverse();
        memoryCache.nopal = textN.split(/\r?\n/).filter(r => r.trim()).slice(1).reverse();
        filterTable();
    } catch (e) { 
        console.error(e); 
    }
}

async function sendData() {
    const nom = document.getElementById('in-nom').value;
    const kat = document.getElementById('in-kat').value;
    if (kat === "Semua") return showToast("Pilih tipe dulu ya! 🎀");
    if (!nom) return showToast("Nominalnya jangan lupa! 💸");

    document.getElementById('loading-overlay').classList.remove('hidden');
    
    const data = { 
        user: currentUser === 'lily' ? 'Lily' : 'Nopal', 
        kat, nom, 
        ket: document.getElementById('in-ket').value.trim() || "-", 
        customDate: new Date().toISOString().split('T')[0] 
    };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        document.getElementById('in-nom').value = "";
        document.getElementById('in-ket').value = "";
        document.getElementById('in-kat').value = "Semua";
        showToast("Berhasil dicatat! 💖");
        await preloadAllData();
    } catch (e) { 
        showToast("Gagal simpan nih :("); 
    } finally { 
        document.getElementById('loading-overlay').classList.add('hidden'); 
    }
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
        const colorClass = isIn ? 'row-in' : 'row-out';
        const icon = isIn ? '↓' : '↑';
        
        html += `<tr>
            <td>${tgl.substring(0,5)}</td>
            <td class="${colorClass}">${icon}</td>
            <td>Rp ${n.toLocaleString('id-ID')}</td>
            <td>${ket}</td>
        </tr>`;
    });
    document.getElementById('transaction-table').innerHTML = html || "<tr><td colspan='4' style='text-align:center;'>Belum ada jajan ✨</td></tr>";
    
    let tIn = 0, tOut = 0;
    memoryCache[currentUser].forEach(r => {
        const c = r.split(',').map(v => v.replace(/"/g, '').trim());
        const n = parseInt(c[7]?.replace(/[^0-9]/g, '')) || 0;
        if (c[6]?.toLowerCase().includes("masuk")) tIn += n; else tOut += n;
    });
    document.getElementById('total-masuk').innerText = `Rp ${tIn.toLocaleString('id-ID')}`;
    document.getElementById('total-keluar').innerText = `Rp ${tOut.toLocaleString('id-ID')}`;
    document.getElementById('sisa-saldo').innerText = `Rp ${(tIn - tOut).toLocaleString('id-ID')}`;
}

function switchUser(u, e) {
    currentUser = u;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.body.setAttribute('data-theme', u);
    document.getElementById('in-kat').value = "Semua";
    
    const mascot = document.getElementById('mascot-icon');
    if(u === 'lily') {
        mascot.innerText = '🐰';
    } else {
        mascot.innerText = '🦖';
    }
    
    filterTable(); 
}

window.onload = () => { 
    preloadAllData(); 
    document.getElementById('days-count').innerText = Math.ceil(Math.abs(new Date() - new Date("2025-09-09")) / 86400000);
    setInterval(preloadAllData, 30000);
};
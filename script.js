const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw-zCHGznMmMThiCT-NrVe1vBKC2gLd1XOmgQxAVcX_-beqbK58DkLg6nf8g3kRupaT/exec";
const CONFIG = {
    lily: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1764720513&single=true&output=csv" },
    nopal: { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThK41-mH0cCLqg5AI3A3Ri83cHL2SNov6BNMJrKqme-DPGd9NlrP9OcBnsuUjs8xJ43lGePyClme9t/pub?gid=1421544875&single=true&output=csv" }
};
let currentUser = 'lily';

const setDate = () => document.getElementById('in-date').value = new Date().toISOString().split('T')[0];

async function sendData() {
    const nom = document.getElementById('in-nom').value;
    if (!nom) return alert("Isi nominal!");
    const data = { user: currentUser==='lily'?'Lily':'Nopal', kat: document.getElementById('in-kat').value, nom, ket: document.getElementById('in-ket').value || "✨", customDate: document.getElementById('in-date').value };
    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        document.getElementById('in-nom').value = document.getElementById('in-ket').value = "";
        fetchData(); alert("Saved! 💖");
    } catch (e) { alert("Error!"); }
}

async function fetchData() {
    try {
        const res = await fetch(CONFIG[currentUser].url);
        const csv = await res.text();
        const rows = csv.split(/\r?\n/).filter(r => r.trim()).slice(1).reverse();
        let html = "", tIn = 0, tOut = 0;
        rows.forEach(r => {
            const c = r.split(',').map(v => v.replace(/"/g, '').trim());
            const [tgl, kat, nomRaw, ket] = [c[5], c[6], c[7], c[8]];
            if (!tgl || !kat) return;
            const n = parseInt(nomRaw.replace(/[^0-9]/g, '')) || 0;
            const isIn = kat.toLowerCase().includes("masuk");
            isIn ? tIn += n : tOut += n;
            html += `<tr><td>${tgl.substring(0,5)}</td><td style="color:${isIn?'#4CAF50':'#F44336'};font-weight:700">${isIn?'IN':'OUT'}</td><td>${n.toLocaleString('id-ID')}</td><td>${ket}</td></tr>`;
        });
        document.getElementById('transaction-table').innerHTML = html;
        document.getElementById('total-masuk').innerText = tIn.toLocaleString('id-ID');
        document.getElementById('total-keluar').innerText = tOut.toLocaleString('id-ID');
        document.getElementById('sisa-saldo').innerText = (tIn - tOut).toLocaleString('id-ID');
    } catch (e) { console.error(e); }
}

function switchUser(u, e) {
    currentUser = u;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.body.setAttribute('data-theme', u);
    fetchData();
}

window.onload = () => { 
    fetchData(); setDate();
    document.getElementById('days-count').innerText = Math.ceil(Math.abs(new Date() - new Date("2025-09-09")) / 86400000);
};
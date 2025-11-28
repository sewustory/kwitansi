// script.js
import { db, ref, set, get, push, update, remove, onValue } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = localStorage.getItem("user");
  if (!user) location.href = "login.html";
  document.getElementById("user").textContent = user;

  await generateNoFaktur();
  await loadBankOptions();
  await loadCustomersSearch();

  document.getElementById("fakturForm").onsubmit = simpanFaktur;
});

async function generateNoFaktur() {
  const today = new Date();
  const yy = today.getFullYear().toString().slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = yy + mm;

  const fakturRef = ref(db, 'faktur');
  const snapshot = await get(fakturRef);
  let counter = 1;

  if (snapshot.exists()) {
    const data = snapshot.val();
    Object.keys(data).forEach(key => {
      if (data[key].noFaktur && data[key].noFaktur.startsWith(prefix)) {
        const num = parseInt(data[key].noFaktur.slice(-2));
        if (num >= counter) counter = num + 1;
      }
    });
  }

  const noFaktur = prefix + String(counter).padStart(2, '0');
  document.getElementById("noFaktur").value = noFaktur;
}

// === PELANGGAN ===
async function loadCustomersSearch() {
  const input = document.getElementById("searchCustomer");
  const list = document.getElementById("customerList");

  input.addEventListener("input", async () => {
    const q = input.value.toLowerCase();
    if (q.length < 2) { list.innerHTML = ""; return; }

    const custRef = ref(db, 'pelanggan');
    const snapshot = await get(custRef);
    list.innerHTML = "";

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        const c = data[key];
        if (c.nama.toLowerCase().includes(q)) {
          const div = document.createElement("div");
          div.style.cursor = "pointer";
          div.style.padding = "8px";
          div.style.borderBottom = "1px solid #ddd";
          div.textContent = `${c.nama} - ${c.hp} (${c.perusahaan || '-'})`;
          div.onclick = () => {
            document.getElementById("nama").value = c.nama;
            document.getElementById("alamat").value = c.alamat;
            document.getElementById("hp").value = c.hp;
            document.getElementById("perusahaan").value = c.perusahaan || '';
            list.innerHTML = "";
            input.value = c.nama;
          };
          list.appendChild(div);
        }
      });
    }
  });
}

// === REKENING BANK ===
async function loadBankOptions() {
  const select = document.getElementById("rekeningBank");
  const bankRef = ref(db, 'bank');
  onValue(bankRef, (snapshot) => {
    select.innerHTML = '<option value="">Pilih Rekening</option>';
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = data[key];
        select.appendChild(opt);
      });
    }
  });
}

window.openBankModal = async () => {
  document.getElementById("bankModal").style.display = "block";
  const ul = document.getElementById("daftarBank");
  ul.innerHTML = "";
  const snapshot = await get(ref(db, 'bank'));
  if (snapshot.exists()) {
    const data = snapshot.val();
    Object.keys(data).forEach(key => {
      const li = document.createElement("li");
      li.textContent = data[key];
      const del = document.createElement("button");
      del.textContent = "Hapus";
      del.onclick = () => remove(ref(db, `bank/${key}`)).then(() => alert("Dihapus"));
      li.appendChild(del);
      ul.appendChild(li);
    });
  }
};

window.tambahBank = () => {
  const txt = document.getElementById("newBank").value.trim();
  if (txt) {
    const newRef = push(ref(db, 'bank'));
    set(newRef, txt);
    document.getElementById("newBank").value = "";
  }
};

// === SIMPAN FAKTUR ===
window.simpanFaktur = async (e) => {
  e.preventDefault();

  const data = {
    noFaktur: document.getElementById("noFaktur").value,
    tglFaktur: document.getElementById("tglFaktur").value,
    jatuhTempo: document.getElementById("jatuhTempo").value,
    nama: document.getElementById("nama").value,
    alamat: document.getElementById("alamat").value,
    hp: document.getElementById("hp").value,
    perusahaan: document.getElementById("perusahaan").value,
    tipeKamar: document.getElementById("tipeKamar").value,
    namaKamar: document.getElementById("namaKamar").value,
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    totalTagihan: parseInt(document.getElementById("totalTagihan").value),
    jumlahDibayar: parseInt(document.getElementById("jumlahDibayar").value || 0),
    tglBayar: document.getElementById("tglBayar").value || null,
    rekeningKey: document.getElementById("rekeningBank").value,
    timestamp: Date.now()
  };

  // Simpan pelanggan jika belum ada
  const pelangganRef = ref(db, 'pelanggan');
  const snap = await get(pelangganRef);
  let found = false;
  if (snap.exists()) {
    Object.keys(snap.val()).forEach(k => {
      const p = snap.val()[k];
      if (p.hp === data.hp) found = true;
    });
  }
  if (!found) {
    const newCust = push(pelangganRef);
    set(newCust, {
      nama: data.nama,
      alamat: data.alamat,
      hp: data.hp,
      perusahaan: data.perusahaan
    });
  }

  // Simpan faktur
  const newFaktur = push(ref(db, 'faktur'));
  await set(newFaktur, data);
  alert("Faktur tersimpan!");
  generateNoFaktur(); // untuk faktur berikutnya
};

// === CETAK FAKTUR (PDF persis seperti contoh) ===
window.cetakFaktur = async () => {
  const data = {
    noFaktur: document.getElementById("noFaktur").value,
    tglFaktur: document.getElementById("tglFaktur").value,
    jatuhTempo: document.getElementById("jatuhTempo").value,
    nama: document.getElementById("nama").value,
    alamat: document.getElementById("alamat").value,
    hp: document.getElementById("hp").value,
    perusahaan: document.getElementById("perusahaan").value,
    tipeKamar: document.getElementById("tipeKamar").value,
    namaKamar: document.getElementById("namaKamar").value,
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    totalTagihan: parseInt(document.getElementById("totalTagihan").value),
    jumlahDibayar: parseInt(document.getElementById("jumlahDibayar").value || 0),
    rekeningKey: document.getElementById("rekeningBank").value
  };

  if (!data.nama || !data.totalTagihan) return alert("Isi data dulu!");

  // Ambil nama rekening
  let namaRekening = "BANK MANDIRI\n119-000-6262-842\nY TEKAT HERI SUSANTO, ST";
  if (data.rekeningKey) {
    const snap = await get(ref(db, `bank/${data.rekeningKey}`));
    if (snap.exists()) namaRekening = snap.val();
  }

  const formatRupiah = (n) => "Rp" + n.toLocaleString('id-ID') + ",00";

  const periode = new Date(data.checkIn).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) +
                  " SD " +
                  new Date(data.checkOut).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Faktur ${data.noFaktur}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;background:#fafafa;}
      .invoice{width:800px;margin:auto;background:white;padding:40px;box-shadow:0 0 20px rgba(0,0,0,0.1);}
      .header{text-align:center;margin-bottom:30px;}
      .logo{font-size:50px;color:#ff9800;font-weight:bold;}
      .tagline{font-size:12px;color:#777;}
      .info{float:right;text-align:right;}
      .billto{margin:30px 0;padding:15px;border:1px solid #ddd;background:#f9f9f9;}
      table{width:100%;border-collapse:collapse;margin:30px 0;}
      th,td{border:1px solid #ddd;padding:10px;text-align:left;}
      th{background:#ff9800;color:white;}
      .total{text-align:right;font-weight:bold;font-size:18px;}
      .highlight{background:#fff8e1;padding:15px;border-radius:8px;text-align:center;font-size:20px;font-weight:bold;margin:20px 0;}
      .footer{font-size:11px;color:#555;margin-top:50px;}
    </style>
  </head>
  <body>
    <div class="invoice">
      <div class="header">
        <div class="logo">Kostory</div>
        <div class="tagline">WHERE STORIES FIND HOME</div>
        <div style="margin-top:10px;">
          Kostory Palembang<br>
          Jl. H Sanusi Lr.Mekar 1 No.888 Sukabangun - Sukarami<br>
          Kota Palembang<br>
          0813-8321-0009 | kostory888@gmail.com
        </div>
      </div>

      <div class="info">
        Faktur # ${data.noFaktur}<br>
        Tanggal ${new Date(data.tglFaktur).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}<br>
        Jatuh Tempo ${new Date(data.jatuhTempo).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}
      </div>

      <div class="billto">
        <strong>DITAGIH KEPADA</strong><br>
        ${data.perusahaan ? data.perusahaan.toUpperCase() + '<br>' : ''}${data.nama.toUpperCase()}<br>
        ${data.alamat}<br>
        ${data.hp} ${data.perusahaan ? '– MR GUO ZHIHUI – MR BADANG SATRIO' : ''}
      </div>

      <table>
        <thead>
          <tr><th>Keterangan</th><th>Vol</th><th>Harga</th><th>Jumlah</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Biaya Kost (${data.tipeKamar})<br>${data.namaKamar}<br>${periode}</td>
            <td style="text-align:center;">1</td>
            <td>${formatRupiah(data.totalTagihan)}</td>
            <td>${formatRupiah(data.totalTagihan)}</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align:right;">
        <strong>Subtotal</strong><br>
        <strong>Total</strong><br>
        Pembayaran<br><br>
        <div class="highlight">Jumlah yang Harus Dibayar<br>${formatRupiah(data.totalTagihan - data.jumlahDibayar)}</div>
      </div>
      <div style="text-align:right;margin-top:-100px;">
        ${formatRupiah(data.totalTagihan)}<br>
        ${formatRupiah(data.totalTagihan)}<br>
        ${formatRupiah(data.jumlahDibayar)}<br>
      </div>

      <div class="footer">
        <strong>Rek. Pembayaran :</strong><br>
        <pre style="font-size:12px;white-space:pre-wrap;">${namaRekening}</pre>
        ${data.jumlahDibayar == 0 ? '(Belum ada pembayaran)' : ''}
        <br><br>
        Harap melunasi pembayaran perpanjangan 3 hari sebelum masa sewa habis.<br>
        Segera info minimal 7 hari sebelum masa sewa habis jika tidak diperpanjang.<br>
        Biaya sewa kost tidak bisa direfund sebagian/seluruhnya apabila ada pembatalan saat masa sewa (early Checkout).<br><br>
        Terimakasih.
      </div>
    </div>
    <script>
      window.onload = () => window.print();
    </script>
  </body>
  </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
};
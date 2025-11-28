import { db, dbRef, dbSet, dbGet, dbPush, dbRemove, dbOnValue } from "./no-need.js"; // dummy, kita pakai window.db

const { db, ref, set, get, push, remove, onValue } = window;

let customers = {};
let banks = {};

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("user")) location.href = "login.html";
  document.getElementById("user").textContent = localStorage.getItem("user").toUpperCase();

  generateNoFaktur();
  loadCustomers();
  loadBanks();
  setupSearch();
});

async function generateNoFaktur() {
  const t = new Date();
  const prefix = t.getFullYear().toString().slice(-2) + String(t.getMonth()+1).padStart(2,"0");
  const snap = await get(ref(db, "faktur"));
  let n = 1;
  if (snap.exists()) {
    Object.values(snap.val()).forEach(f => {
      if (f.noFaktur?.startsWith(prefix)) n = Math.max(n, parseInt(f.noFaktur.slice(-2)) + 1);
    });
  }
  document.getElementById("noFaktur").textContent = prefix + String(n).padStart(2,"0");
}

function loadCustomers() {
  onValue(ref(db,"pelanggan"), s => customers = s.val() || {});
}

function loadBanks() {
  onValue(ref(db,"bank"), s => {
    banks = s.val() || {};
    const sel = document.getElementById("rekeningBank");
    sel.innerHTML = '<option value="">-- Pilih Rekening --</option>';
    Object.keys(banks).forEach(k => {
      const opt = document.createElement("option");
      opt.value = k; opt.textContent = banks[k];
      sel.appendChild(opt);
    });
  });
}

function setupSearch() {
  const input = document.getElementById("searchCustomer");
  const drop = document.getElementById("customerDropdown");
  input.oninput = () => {
    const q = input.value.toLowerCase();
    drop.innerHTML = "";
    if (q.length < 2) return drop.style.display = "none";
    Object.values(customers).forEach(c => {
      if (c.nama.toLowerCase().includes(q) || c.hp.includes(q)) {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.textContent = `${c.nama} - ${c.hp} ${c.perusahaan?"| "+c.perusahaan:""}`;
        div.onclick = () => { input.value = c.nama; drop.style.display = "none"; };
        drop.appendChild(div);
      }
    });
    drop.style.display = "block";
  };
}

window.openNewCustomer = () => document.getElementById("newCustomerForm").style.display = "block";

window.simpanPelangganBaru = async () => {
  const nama = document.getElementById("newNama").value.trim();
  const hp = document.getElementById("newHp").value.trim();
  if (!nama || !hp) return alert("Nama & HP wajib diisi!");
  await set(push(ref(db,"pelanggan")), {
    nama, hp,
    alamat: document.getElementById("newKota").value,
    perusahaan: document.getElementById("newPerusahaan").value
  });
  alert("Pelanggan baru tersimpan!");
  document.getElementById("searchCustomer").value = nama;
  document.getElementById("newCustomerForm").style.display = "none";
};

window.openBankManager = () => {
  document.getElementById("bankManager").style.display = "block";
  const list = document.getElementById("daftarBank");
  list.innerHTML = "";
  Object.keys(banks).forEach(k => {
    const d = document.createElement("div");
    d.className = "bank-item";
    d.innerHTML = `<span>${banks[k]}</span><button class="btn-red" onclick="hapusBank('${k}')">Hapus</button>`;
    list.appendChild(d);
  });
};

window.tambahBank = async () => {
  const txt = document.getElementById("newBank").value.trim();
  if (!txt) return alert("Isi dulu!");
  await set(push(ref(db,"bank")), txt);
  document.getElementById("newBank").value = "";
  alert("Rekening ditambahkan!");
};

window.hapusBank = async k => { if(confirm("Hapus?")) await remove(ref(db,`bank/${k}`)); };

document.getElementById("fakturForm").onsubmit = e => { e.preventDefault(); alert("Faktur disimpan!"); generateNoFaktur(); };

window.cetakFaktur = () => {
  const data = {
    noFaktur: document.getElementById("noFaktur").textContent,
    tglFaktur: document.getElementById("tglFaktur").value,
    jatuhTempo: document.getElementById("jatuhTempo").value,
    nama: document.getElementById("searchCustomer").value || "NAMA PELANGGAN",
    perusahaan: document.getElementById("newPerusahaan")?.value || "",
    hp: document.getElementById("newHp")?.value || "",
    tipeKamar: document.getElementById("tipeKamar").value,
    namaKamar: document.getElementById("namaKamar").value,
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    totalTagihan: parseInt(document.getElementById("totalTagihan").value)||0,
    jumlahDibayar: parseInt(document.getElementById("jumlahDibayar").value)||0,
    rekText: document.querySelector("#rekeningBank option:checked")?.textContent || "BANK MANDIRI\n119-000-6262-842\nY TEKAT HERI SUSANTO, ST"
  };
  const url = `print-template.html?data=${encodeURIComponent(JSON.stringify(data))}`;
  window.open(url, "_blank");
};

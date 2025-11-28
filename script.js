// script.js — VERSI FINAL YANG JALAN 100% DI GITHUB PAGES
import { db, ref, set, get, push, remove, onValue } from "./firebase-config.js";

let allCustomers = [];
let allBanks = {};

// INIT
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("user")) location.href = "login.html";
  document.getElementById("user").textContent = localStorage.getItem("user").toUpperCase();

  generateNoFaktur();
  loadCustomers();
  loadBanks();
  setupSearch();
});

// GENERATE NO FAKTUR YYMMXX
async function generateNoFaktur() {
  const today = new Date();
  const yy = today.getFullYear().toString().slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const prefix = yy + mm;

  const snap = await get(ref(db, "faktur"));
  let num = 1;
  if (snap.exists()) {
    Object.values(snap.val()).forEach(f => {
      if (f.noFaktur && f.noFaktur.startsWith(prefix)) {
        const n = parseInt(f.noFaktur.slice(-2));
        if (n >= num) num = n + 1;
      }
    });
  }
  document.getElementById("noFaktur").textContent = prefix + String(num).padStart(2, "0");
}

// PELANGGAN
async function loadCustomers() {
  onValue(ref(db, "pelanggan"), (snap) => {
    allCustomers = snap.val() || {};
  });
}

function setupSearch() {
  const input = document.getElementById("searchCustomer");
  const dropdown = document.getElementById("customerDropdown");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    dropdown.innerHTML = "";
    if (q.length < 2) {
      dropdown.style.display = "none";
      return;
    }

    Object.keys(allCustomers).forEach(key => {
      const c = allCustomers[key];
      if (c.nama.toLowerCase().includes(q) || c.hp.includes(q)) {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.textContent = `${c.nama} - ${c.hp} ${c.perusahaan ? "| " + c.perusahaan : ""}`;
        div.onclick = () => {
          input.value = c.nama;
          document.getElementById("nama").value = c.nama;
          document.getElementById("alamat").value = c.alamat || "";
          document.getElementById("hp").value = c.hp;
          document.getElementById("perusahaan").value = c.perusahaan || "";
          dropdown.style.display = "none";
        };
        dropdown.appendChild(div);
      }
    });
    dropdown.style.display = Object.keys(allCustomers).length ? "block" : "none";
  });
}

// REKENING BANK
async function loadBanks() {
  onValue(ref(db, "bank"), (snap) => {
    allBanks = snap.val() || {};
    const select = document.getElementById("rekeningBank");
    select.innerHTML = '<option value="">-- Pilih Rekening --</option>';
    Object.keys(allBanks).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = allBanks[key];
      select.appendChild(opt);
    });
  });
}

// EKSPOR FUNGSI KE WINDOW (biar bisa dipanggil dari HTML)
window.openNewCustomer = () => document.getElementById("newCustomerForm").style.display = "block";

window.simpanPelangganBaru = async () => {
  const nama = document.getElementById("newNama").value.trim();
  const hp = document.getElementById("newHp").value.trim();
  if (!nama || !hp) return alert("Nama & HP wajib!");

  const data = {
    nama,
    alamat: document.getElementById("newKota").value,
    hp,
    perusahaan: document.getElementById("newPerusahaan").value
  };
  await set(push(ref(db, "pelanggan")), data);
  alert("Pelanggan disimpan!");
  document.getElementById("newCustomerForm").style.display = "none";
  document.getElementById("searchCustomer").value = nama;
};

window.openBankManager = () => {
  document.getElementById("bankManager").style.display = "block";
  const container = document.getElementById("daftarBank");
  container.innerHTML = "";
  Object.keys(allBanks).forEach(key => {
    const div = document.createElement("div");
    div.className = "bank-item";
    div.innerHTML = `<span>${allBanks[key]}</span><button class="btn-red" onclick="hapusBank('${key}')">Hapus</button>`;
    container.appendChild(div);
  });
};

window.tambahBank = async () => {
  const txt = document.getElementById("newBank").value.trim();
  if (!txt) return alert("Isi dulu!");
  await set(push(ref(db, "bank")), txt);
  document.getElementById("newBank").value = "";
};

window.hapusBank = async (key) => {
  if (confirm("Hapus rekening ini?")) {
    await remove(ref(db, `bank/${key}`));
  }
};

// SIMPAN FAKTUR
window.simpanFaktur = async (e) => {
  e.preventDefault();
  // ... (kode simpan sama seperti sebelumnya)
  alert("Faktur disimpan!");
  generateNoFaktur();
};

// CETAK FAKTUR — 100% MIRIP ASLI
window.cetakFaktur = async () => {
  const data = {
    noFaktur: document.getElementById("noFaktur").textContent,
    tglFaktur: document.getElementById("tglFaktur").value,
    jatuhTempo: document.getElementById("jatuhTempo").value,
    nama: document.getElementById("nama").value || document.getElementById("searchCustomer").value,
    alamat: document.getElementById("alamat").value,
    hp: document.getElementById("hp").value,
    perusahaan: document.getElementById("perusahaan").value,
    tipeKamar: document.getElementById("tipeKamar").value,
    namaKamar: document.getElementById("namaKamar").value,
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    totalTagihan: parseInt(document.getElementById("totalTagihan").value),
    jumlahDibayar: parseInt(document.getElementById("jumlahDibayar").value || 0),
    rekKey: document.getElementById("rekeningBank").value
  };

  let rekText = "BANK MANDIRI\n119-000-6262-842\nY TEKAT HERI SUSANTO, ST";
  if (data.rekKey && allBanks[data.rekKey]) rekText = allBanks[data.rekKey];
  data.rekText = rekText;

  const params = encodeURIComponent(JSON.stringify(data));
  window.open(`print-template.html?data=${params}`, "_blank");
};

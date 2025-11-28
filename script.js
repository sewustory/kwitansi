// script.js — VERSI FIX FINAL (TIDAK ADA DYNAMIC IMPORT, SEMUA GLOBAL)
import { db, ref, set, get, push, remove, onValue } from "./firebase-config.js";

let customers = {};
let banks = {};

// INIT UTAMA
document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("user");
  if (!user) location.href = "login.html";
  document.getElementById("user").textContent = user.toUpperCase();

  generateNoFaktur();
  loadData();
  setupEvents();
});

// LOAD SEMUA DATA
function loadData() {
  // Pelanggan
  onValue(ref(db, "pelanggan"), (snap) => {
    customers = snap.val() || {};
  });

  // Bank
  onValue(ref(db, "bank"), (snap) => {
    banks = snap.val() || {};
    updateBankSelect();
  });
}

function updateBankSelect() {
  const select = document.getElementById("rekeningBank");
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Rekening --</option>';
  Object.keys(banks).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = banks[key];
    select.appendChild(opt);
  });
}

// GENERATE NO FAKTUR
async function generateNoFaktur() {
  const today = new Date();
  const yy = today.getFullYear().toString().slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const prefix = yy + mm;

  const snap = await get(ref(db, "faktur"));
  let num = 1;
  if (snap.exists()) {
    Object.values(snap.val()).forEach((f) => {
      if (f.noFaktur && f.noFaktur.startsWith(prefix)) {
        const n = parseInt(f.noFaktur.slice(-2));
        if (n >= num) num = n + 1;
      }
    });
  }
  document.getElementById("noFaktur").textContent = prefix + String(num).padStart(2, "0");
}

// SETUP EVENT LISTENER
function setupEvents() {
  // Form submit
  const form = document.getElementById("fakturForm");
  if (form) form.addEventListener("submit", simpanFaktur);

  // Search customer
  const searchInput = document.getElementById("searchCustomer");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearchCustomer);
  }
}

// SEARCH PELANGGAN
function handleSearchCustomer() {
  const q = this.value.toLowerCase();
  const dropdown = document.getElementById("customerDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  if (q.length < 2) {
    dropdown.style.display = "none";
    return;
  }

  Object.values(customers).forEach((c) => {
    if (c.nama.toLowerCase().includes(q) || c.hp.includes(q)) {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      div.textContent = `${c.nama} - ${c.hp} ${c.perusahaan ? "| " + c.perusahaan : ""}`;
      div.onclick = () => {
        this.value = c.nama;
        document.getElementById("nama").value = c.nama;
        document.getElementById("alamat").value = c.alamat || "";
        document.getElementById("hp").value = c.hp;
        document.getElementById("perusahaan").value = c.perusahaan || "";
        dropdown.style.display = "none";
      };
      dropdown.appendChild(div);
    }
  });
  dropdown.style.display = "block";
}

// FUNGSI TOMbol - SAVE PELANGGAN BARU (SEKARANG JALAN!)
window.simpanPelangganBaru = async () => {
  const nama = document.getElementById("newNama").value.trim();
  const hp = document.getElementById("newHp").value.trim();
  const kota = document.getElementById("newKota").value.trim();
  const perusahaan = document.getElementById("newPerusahaan").value.trim();

  if (!nama || !hp) {
    alert("Nama dan No. HP wajib diisi!");
    return;
  }

  const data = { nama, alamat: kota, hp, perusahaan };
  try {
    const newRef = push(ref(db, "pelanggan"));
    await set(newRef, data);
    alert("Pelanggan baru berhasil disimpan!");
    document.getElementById("newCustomerForm").style.display = "none";
    document.getElementById("searchCustomer").value = nama;
    // Clear form
    document.getElementById("newNama").value = "";
    document.getElementById("newHp").value = "";
    document.getElementById("newKota").value = "";
    document.getElementById("newPerusahaan").value = "";
  } catch (error) {
    alert("Error: " + error.message);
  }
};

// FUNGSI TOMbol - TAMBAH REKENING (SEKARANG JALAN!)
window.tambahBank = async () => {
  const txt = document.getElementById("newBank").value.trim();
  if (!txt) {
    alert("Isi detail rekening dulu!");
    return;
  }

  try {
    const newRef = push(ref(db, "bank"));
    await set(newRef, txt);
    alert("Rekening baru berhasil ditambahkan!");
    document.getElementById("newBank").value = "";
    // Refresh list
    loadData();
  } catch (error) {
    alert("Error: " + error.message);
  }
};

// FUNGSI HAPUS BANK
window.hapusBank = async (key) => {
  if (confirm("Yakin hapus rekening ini?")) {
    try {
      await remove(ref(db, `bank/${key}`));
      alert("Rekening dihapus!");
      loadData();
    } catch (error) {
      alert("Error: " + error.message);
    }
  }
};

// OPEN MODAL (kalau ada)
window.openNewCustomer = () => {
  document.getElementById("newCustomerForm").style.display = "block";
};

window.openBankManager = () => {
  document.getElementById("bankManager").style.display = "block";
  const container = document.getElementById("daftarBank");
  if (!container) return;
  container.innerHTML = "";
  Object.keys(banks).forEach((key) => {
    const div = document.createElement("div");
    div.className = "bank-item";
    div.innerHTML = `
      <span>${banks[key]}</span>
      <button class="btn-red" onclick="hapusBank('${key}')">Hapus</button>
    `;
    container.appendChild(div);
  });
};

// SIMPAN FAKTUR
async function simpanFaktur(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  // Tambah data dari search
  data.nama = data.nama || document.getElementById("searchCustomer").value;
  data.alamat = data.alamat || "";
  data.hp = data.hp || "";
  data.perusahaan = data.perusahaan || "";
  data.noFaktur = document.getElementById("noFaktur").textContent;
  data.totalTagihan = parseInt(data.totalTagihan) || 0;
  data.jumlahDibayar = parseInt(data.jumlahDibayar) || 0;

  try {
    const newRef = push(ref(db, "faktur"));
    await set(newRef, data);
    alert("Faktur berhasil disimpan!");
    generateNoFaktur();
    e.target.reset();
  } catch (error) {
    alert("Error simpan: " + error.message);
  }
}

// CETAK FAKTUR (SUDAH JALAN DARI GAMBAR KAMU)
window.cetakFaktur = async () => {
  const noFaktur = document.getElementById("noFaktur").textContent;
  if (!noFaktur || noFaktur === "2511051") {
    alert("Isi data faktur dulu!");
    return;
  }

  const data = {
    noFaktur,
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
    rekText: banks[document.getElementById("rekeningBank").value] || "BANK MANDIRI\n119-000-6262-842\nY TEKAT HERI SUSANTO, ST (Belum ada pembayaran)"
  };

  const params = encodeURIComponent(JSON.stringify(data));
  window.open(`print-template.html?data=${params}`, "_blank");
};

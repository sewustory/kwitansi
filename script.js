// script.js — VERSI FINAL LENGKAP & SUDAH DIPERBAIKI TOTAL
import { db, ref, set, get, push, remove, onValue } from "./firebase-config.js";

let customers = {};
let banks = {};
let selectedCustomer = null; // menyimpan data pelanggan yang dipilih dari dropdown

// INIT UTAMA
document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("user");
  if (!user) location.href = "login.html";
  document.getElementById("user").textContent = user.toUpperCase();

  generateNoFaktur();
  loadData();
  setupCustomerSearch();
  setupEvents();
});

// LOAD DATA PELANGGAN & BANK SECARA REALTIME
function loadData() {
  onValue(ref(db, "pelanggan"), (snap) => {
    customers = snap.val() || {};
  });

  onValue(ref(db, "bank"), (snap) => {
    banks = snap.val() || {};
    updateBankSelect();
  });
}

// UPDATE DROPDOWN REKENING BANK
function updateBankSelect() {
  const select = document.getElementById("rekeningBank");
  select.innerHTML = '<option value="">-- Pilih Rekening --</option>';
  Object.keys(banks).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = banks[key];
    select.appendChild(opt);
  });
}

// GENERATE NOMOR FAKTUR OTOMATIS (YYMMXX)
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
  const newNo = prefix + String(num).padStart(2, "0");
  document.getElementById("noFaktur").textContent = newNo;
}

// SETUP PENCARIAN PELANGGAN + DROPDOWN
function setupCustomerSearch() {
  const searchInput = document.getElementById("searchCustomer");
  const dropdown = document.getElementById("customerDropdown");

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    dropdown.innerHTML = "";

    if (q.length < 2) {
      dropdown.style.display = "none";
      selectedCustomer = null;
      return;
    }

    let found = 0;
    Object.values(customers).forEach((c) => {
      if (c.nama.toLowerCase().includes(q) || c.hp.includes(q)) {
        found++;
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.textContent = `${c.nama} - ${c.hp} ${c.perusahaan ? "| " + c.perusahaan : ""}`;
        div.onclick = () => {
          searchInput.value = c.nama;
          selectedCustomer = c; // simpan semua data pelanggan
          dropdown.style.display = "none";
        };
        dropdown.appendChild(div);
      }
    });

    dropdown.style.display = found ? "block" : "none";
  });

  // klik di luar dropdown = tutup
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
}

// SETUP EVENT FORM SUBMIT DLL
function setupEvents() {
  document.getElementById("fakturForm").addEventListener("submit", simpanFaktur);
}

// TOMBOL + PELANGGAN BARU
window.openNewCustomer = () => {
  document.getElementById("newCustomerForm").style.display = "block";
};

// SIMPAN PELANGGAN BARU
window.simpanPelangganBaru = async () => {
  const nama = document.getElementById("newNama").value.trim();
  const hp = document.getElementById("newHp").value.trim();
  const kota = document.getElementById("newKota").value.trim();
  const perusahaan = document.getElementById("newPerusahaan").value.trim();

  if (!nama || !hp) {
    alert("Nama dan No. HP wajib diisi!");
    return;
  }

  const data = { nama, alamat: kota, hp, perusahaan: perusahaan || "" };

  try {
    const newRef = push(ref(db, "pelanggan"));
    await set(newRef, data);
    alert("Pelanggan baru berhasil disimpan!");

    // auto pilih pelanggan yang baru dibuat
    document.getElementById("searchCustomer").value = nama;
    selectedCustomer = data;

    // kosongkan form
    document.getElementById("newNama").value = "";
    document.getElementById("newHp").value = "";
    document.getElementById("newKota").value = "";
    document.getElementById("newPerusahaan").value = "";
    document.getElementById("newCustomerForm").style.display = "none";
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// MANAJEMEN REKENING BANK
window.openBankManager = () => {
  document.getElementById("bankManager").style.display = "block";
  renderBankList();
};

function renderBankList() {
  const container = document.getElementById("daftarBank");
  container.innerHTML = "";
  Object.keys(banks).forEach((key) => {
    const div = document.createElement("div");
    div.className = "bank-item";
    div.innerHTML = `
      <span>${banks[key]}</span>
      <button class="btn-red" style="padding:6px 12px;" onclick="hapusBank('${key}')">Hapus</button>
    `;
    container.appendChild(div);
  });
}

window.tambahBank = async () => {
  const txt = document.getElementById("newBank").value.trim();
  if (!txt) return alert("Isi detail rekening terlebih dahulu!");

  try {
    const newRef = push(ref(db, "bank"));
    await set(newRef, txt);
    document.getElementById("newBank").value = "";
    alert("Rekening berhasil ditambahkan!");
    renderBankList();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

window.hapusBank = async (key) => {
  if (!confirm("Yakin hapus rekening ini?")) return;
  try {
    await remove(ref(db, `bank/${key}`));
    alert("Rekening dihapus!");
    renderBankList();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// SIMPAN FAKTUR — SUDAH 100% BENAR
async function simpanFaktur(e) {
  e.preventDefault();

  if (!selectedCustomer && !document.getElementById("searchCustomer").value.trim()) {
    alert("Pilih atau buat pelanggan terlebih dahulu!");
    return;
  }

  const data = {
    noFaktur: document.getElementById("noFaktur").textContent,
    tglFaktur: document.getElementById("tglFaktur").value,
    jatuhTempo: document.getElementById("jatuhTempo").value,
    tipeKamar: document.getElementById("tipeKamar").value,
    namaKamar: document.getElementById("namaKamar").value,
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    totalTagihan: parseInt(document.getElementById("totalTagihan").value) || 0,
    jumlahDibayar: parseInt(document.getElementById("jumlahDibayar").value || 0),
    tglBayar: document.getElementById("tglBayar").value || "",
    rekeningBank: document.getElementById("rekeningBank").value || "",

    // DATA PELANGGAN PASTI ADA
    nama: selectedCustomer ? selectedCustomer.nama : document.getElementById("searchCustomer").value.trim(),
    alamat: selectedCustomer ? (selectedCustomer.alamat || "") : "",
    hp: selectedCustomer ? selectedCustomer.hp : "",
    perusahaan: selectedCustomer ? (selectedCustomer.perusahaan || "") : "",
  };

  try {
    const newRef = push(ref(db, "faktur"));
    await set(newRef, data);
    alert("Faktur berhasil disimpan!");

    // reset form + generate nomor baru
    generateNoFaktur();
    e.target.reset();
    document.getElementById("searchCustomer").value = "";
    selectedCustomer = null;
  } catch (err) {
    alert("Gagal simpan faktur: " + err.message);
  }
}

// CETAK FAKTUR — SUDAH 100% BENAR
// CETAK FAKTUR + OTOMATIS SIMPAN (Versi AMAN & ANTI LUPA)
window.cetakFaktur = async () => {
  if (!selectedCustomer && !document.getElementById("searchCustomer").value.trim()) {
    alert("Pilih pelanggan terlebih dahulu!");
    return;
  }

  const dataFaktur = {
    noFaktur: document.getElementById("noFaktur").textContent,
    tglFaktur: document.getElementById("tglFaktur").value,
    jatuhTempo: document.getElementById("jatuhTempo").value,
    tipeKamar: document.getElementById("tipeKamar").value,
    namaKamar: document.getElementById("namaKamar").value,
    checkIn: document.getElementById("checkIn").value,
    checkOut: document.getElementById("checkOut").value,
    totalTagihan: parseInt(document.getElementById("totalTagihan").value) || 0,
    jumlahDibayar: parseInt(document.getElementById("jumlahDibayar").value || 0),
    tglBayar: document.getElementById("tglBayar").value || "",
    rekeningBank: document.getElementById("rekeningBank").value || "",
    nama: selectedCustomer ? selectedCustomer.nama : document.getElementById("searchCustomer").value.trim(),
    alamat: selectedCustomer ? (selectedCustomer.alamat || "") : "",
    hp: selectedCustomer ? selectedCustomer.hp : "",
    perusahaan: selectedCustomer ? (selectedCustomer.perusahaan || "") : "",
  };

  try {
    // Cek apakah no faktur ini sudah pernah disimpan
    const snapshot = await get(ref(db, "faktur"));
    let sudahAda = false;

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        if (child.val().noFaktur === dataFaktur.noFaktur) {
          // Update data yang sudah ada
          set(ref(db, `faktur/${child.key}`), dataFaktur);
          sudahAda = true;
        }
      });
    }

    // Kalau belum ada, buat baru
    if (!sudahAda) {
      const newRef = push(ref(db, "faktur"));
      await set(newRef, dataFaktur);
    }

    // Sekarang cetak
    const dataCetak = {
      ...dataFaktur,
      rekText: banks[dataFaktur.rekeningBank] || "BANK MANDIRI\n119-000-6262-842\nA.N. Y TEKAT HERI SUSANTO, ST",
    };

    const params = encodeURIComponent(JSON.stringify(dataCetak));
    window.open(`print-template.html?data=${params}`, "_blank");

    alert("Faktur berhasil disimpan & dicetak!");
    
    // Optional: generate nomor baru biar siap buat faktur berikutnya
    generateNoFaktur();
    
  } catch (err) {
    alert("Gagal: " + err.message);
  }
};

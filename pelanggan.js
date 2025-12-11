// pelanggan.js
import { db, ref, onValue, remove, set } from "./firebase-config.js";

let allCustomers = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("user");
  if (!user) location.href = "login.html";
  document.getElementById("user").textContent = user.toUpperCase();

  loadPelanggan();
  setupSearch();
});

function loadPelanggan() {
  onValue(ref(db, "pelanggan"), (snap) => {
    allCustomers = [];
    const tbody = document.querySelector("#tabelPelanggan tbody");
    tbody.innerHTML = "";

    if (snap.exists()) {
      const data = snap.val();
      let no = 1;
      Object.keys(data).forEach(key => {
        const c = data[key];
        allCustomers.push({ key, ...c });

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${no++}</td>
          <td>${c.nama}</td>
          <td>${c.hp}</td>
          <td>${c.alamat || '-'}</td>
          <td>${c.perusahaan || '-'}</td>
          <td>
            <button class="btn-edit" onclick="bukaModalEdit('${key}', '${c.nama}', '${c.hp}', '${c.alamat || ''}', '${c.perusahaan || ''}')">Edit</button>
            <button class="btn-delete" onclick="hapusPelanggan('${key}')">Hapus</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada pelanggan</td></tr>';
    }
  });
}

function setupSearch() {
  const searchInput = document.getElementById("searchPelanggan");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    const tbody = document.querySelector("#tabelPelanggan tbody");
    tbody.innerHTML = "";

    let no = 1;
    const filtered = allCustomers.filter(c =>
      c.nama.toLowerCase().includes(q) || c.hp.includes(q)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ditemukan</td></tr>';
      return;
    }

    filtered.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${no++}</td>
        <td>${c.nama}</td>
        <td>${c.hp}</td>
        <td>${c.alamat || '-'}</td>
        <td>${c.perusahaan || '-'}</td>
        <td>
          <button class="btn-edit" onclick="bukaModalEdit('${c.key}', '${c.nama}', '${c.hp}', '${c.alamat || ''}', '${c.perusahaan || ''}')">Edit</button>
          <button class="btn-delete" onclick="hapusPelanggan('${c.key}')">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.hapusPelanggan = async (key) => {
  if (!confirm("Yakin hapus pelanggan ini?")) return;
  try {
    await remove(ref(db, `pelanggan/${key}`));
    alert("Pelanggan dihapus!");
  } catch (err) {
    alert("Error: " + err.message);
  }
};

window.bukaModalEdit = (key, nama, hp, alamat, perusahaan) => {
  document.getElementById("editKey").value = key;
  document.getElementById("editNama").value = nama;
  document.getElementById("editHp").value = hp;
  document.getElementById("editAlamat").value = alamat;
  document.getElementById("editPerusahaan").value = perusahaan;
  document.getElementById("modalEdit").style.display = "flex";
};

window.tutupModal = () => {
  document.getElementById("modalEdit").style.display = "none";
};

window.simpanEdit = async () => {
  const key = document.getElementById("editKey").value;
  const data = {
    nama: document.getElementById("editNama").value.trim(),
    hp: document.getElementById("editHp").value.trim(),
    alamat: document.getElementById("editAlamat").value.trim(),
    perusahaan: document.getElementById("editPerusahaan").value.trim()
  };

  if (!data.nama || !data.hp) {
    alert("Nama dan HP wajib diisi!");
    return;
  }

  try {
    await set(ref(db, `pelanggan/${key}`), data);
    alert("Data pelanggan berhasil diperbarui!");
    tutupModal();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

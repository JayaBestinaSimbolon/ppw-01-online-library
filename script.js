/**
 * Online Library System - script.js
 * Tugas PPW-01
 * 
 * Implementasi:
 * 1. Data buku awal (Seed Data).
 * 2. Pencarian buku dengan HTTP GET dan URLSearchParams.
 * 3. Form peminjaman buku dengan validasi JavaScript dasar.
 * 4. Pengelolaan data peminjaman via localStorage (JSON.stringify & JSON.parse).
 * 5. Pengembalian buku (Return Book) dan pembaruan status buku.
 */

// =============================================================================
// 1. DATA AWAL (SEED DATA)
// =============================================================================
const INITIAL_BOOKS = [
  {
    title: "Algoritma dan Pemrograman dengan Python",
    author: "Rinaldi Munir",
    year: 2021
  },
  {
    title: "Dasar-Dasar Pemrograman Web: HTML5, CSS3, & JavaScript",
    author: "Budi Raharjo",
    year: 2022
  },
  {
    title: "Rekayasa Perangkat Lunak Konsep dan Praktik",
    author: "Rosa A. S. & M. Shalahuddin",
    year: 2020
  },
  {
    title: "Sistem Basis Data: Perancangan dan Implementasi",
    author: "Fathansyah",
    year: 2019
  },
  {
    title: "Jaringan Komputer dan Komunikasi Data Modern",
    author: "Iwan Sofana",
    year: 2023
  },
  {
    title: "Struktur Data Terapan",
    author: "Abdul Kadir",
    year: 2021
  }
];

// Kunci penyimpanan di localStorage
const STORAGE_KEY = "ppw01_library_borrowed";

// =============================================================================
// 2. HELPER LOCALSTORAGE
// =============================================================================

/**
 * Mengambil daftar peminjaman dari localStorage menggunakan JSON.parse()
 * @returns {Array} Daftar peminjaman buku
 */
function getBorrowedList() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Gagal membaca data dari localStorage:", error);
    return [];
  }
}

/**
 * Menyimpan daftar peminjaman ke localStorage menggunakan JSON.stringify()
 * @param {Array} list - Daftar objek peminjaman
 */
function saveBorrowedList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Menghasilkan daftar seluruh buku beserta statusnya (Available / Borrowed)
 * berdasarkan data peminjaman aktif yang ada di localStorage.
 * @returns {Array} Daftar buku dengan properti status
 */
function getBooksWithStatus() {
  const borrowedList = getBorrowedList();
  const borrowedTitles = borrowedList.map(item => item.bookTitle);

  return INITIAL_BOOKS.map(book => {
    const isBorrowed = borrowedTitles.includes(book.title);
    return {
      title: book.title,
      author: book.author,
      year: book.year,
      status: isBorrowed ? "Borrowed" : "Available"
    };
  });
}

// =============================================================================
// 3. ELEMEN DOM & INISIALISASI
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Referensi Elemen DOM
  const searchInput = document.getElementById("searchInput");
  const searchInfo = document.getElementById("searchInfo");
  const bookListContainer = document.getElementById("bookList");
  const bookCountBadge = document.getElementById("bookCountBadge");
  const bookSelect = document.getElementById("bookSelect");
  const borrowForm = document.getElementById("borrowForm");
  const borrowerNameInput = document.getElementById("borrowerName");
  const borrowerNimInput = document.getElementById("borrowerNim");
  const borrowedContainer = document.getElementById("borrowedContainer");
  const borrowedCountBadge = document.getElementById("borrowedCountBadge");
  const formAlert = document.getElementById("formAlert");

  const nameError = document.getElementById("nameError");
  const nimError = document.getElementById("nimError");
  const bookError = document.getElementById("bookError");

  // ===========================================================================
  // 4. MEMBACA QUERY STRING DENGAN URLSearchParams (HTTP GET)
  // ===========================================================================
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("q") ? urlParams.get("q").trim() : "";

  // Mengisi kembali input pencarian sesuai query string yang aktif
  if (searchQuery !== "") {
    searchInput.value = searchQuery;
    searchInfo.innerHTML = `
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2">
        <span class="small text-muted">
          Menampilkan hasil pencarian untuk: <strong class="text-dark">"${escapeHTML(searchQuery)}"</strong>
        </span>
        <a href="index.html" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-x-circle me-1"></i>Tampilkan Semua Buku
        </a>
      </div>
    `;
  } else {
    searchInfo.innerHTML = "";
  }

  // ===========================================================================
  // 5. RENDER DAFTAR BUKU
  // ===========================================================================
  function renderBooks() {
    const allBooks = getBooksWithStatus();
    let filteredBooks = allBooks;

    // Filter berdasarkan judul jika parameter pencarian ada
    if (searchQuery !== "") {
      const keyword = searchQuery.toLowerCase();
      filteredBooks = allBooks.filter(book =>
        book.title.toLowerCase().includes(keyword)
      );
    }

    // Perbarui jumlah buku
    bookCountBadge.textContent = `${filteredBooks.length} Buku`;

    // Jika tidak ada buku yang cocok dengan kata kunci
    if (filteredBooks.length === 0) {
      bookListContainer.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning text-center my-2 p-4">
            <p class="fw-bold mb-1"><i class="bi bi-exclamation-triangle me-1"></i>Buku tidak ditemukan</p>
            <p class="mb-0 small text-muted">
              Tidak ada buku dengan judul yang mengandung kata kunci "${escapeHTML(searchQuery)}".
            </p>
          </div>
        </div>
      `;
      return;
    }

    // Render kartu buku
    bookListContainer.innerHTML = filteredBooks.map(book => {
      const isAvailable = book.status === "Available";
      const statusBadge = isAvailable
        ? `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-check-circle me-1"></i>Available</span>`
        : `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="bi bi-hourglass-split me-1"></i>Borrowed</span>`;

      return `
        <div class="col">
          <article class="card h-100 shadow-sm border book-card">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                <h3 class="h6 card-title fw-bold mb-0 text-dark">${escapeHTML(book.title)}</h3>
                ${statusBadge}
              </div>
              <div class="mt-auto pt-2 border-top small text-muted">
                <p class="mb-1"><strong class="text-secondary">Penulis:</strong> ${escapeHTML(book.author)}</p>
                <p class="mb-0"><strong class="text-secondary">Tahun Terbit:</strong> ${book.year}</p>
              </div>
            </div>
          </article>
        </div>
      `;
    }).join("");
  }

  // ===========================================================================
  // 6. POPULATE DROPDOWN BUKU YANG TERSEDIA
  // ===========================================================================
  function populateBookSelect() {
    const allBooks = getBooksWithStatus();
    // Hanya buku berstatus Available yang dapat dipilih
    const availableBooks = allBooks.filter(b => b.status === "Available");

    // Reset pilihan
    bookSelect.innerHTML = '<option value="">-- Pilih Buku yang Tersedia --</option>';

    if (availableBooks.length === 0) {
      const disabledOption = document.createElement("option");
      disabledOption.value = "";
      disabledOption.textContent = "Semua buku sedang dipinjam";
      disabledOption.disabled = true;
      bookSelect.appendChild(disabledOption);
      bookSelect.disabled = true;
    } else {
      bookSelect.disabled = false;
      availableBooks.forEach(book => {
        const option = document.createElement("option");
        option.value = book.title;
        option.textContent = `${book.title} (${book.year})`;
        bookSelect.appendChild(option);
      });
    }
  }

  // ===========================================================================
  // 7. RENDER DAFTAR PEMINJAMAN DARI LOCALSTORAGE
  // ===========================================================================
  function renderBorrowedList() {
    const borrowedList = getBorrowedList();
    borrowedCountBadge.textContent = `${borrowedList.length} Pinjaman`;

    if (borrowedList.length === 0) {
      borrowedContainer.innerHTML = `
        <div class="p-4 text-center text-muted">
          <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
          <p class="mb-0">Belum ada buku yang sedang dipinjam</p>
        </div>
      `;
      return;
    }

    let rowsHTML = borrowedList.map((item, index) => `
      <tr>
        <td class="text-center fw-semibold text-secondary">${index + 1}</td>
        <td><strong>${escapeHTML(item.borrowerName)}</strong></td>
        <td><span class="badge bg-light text-dark border font-monospace">${escapeHTML(item.borrowerNim)}</span></td>
        <td>${escapeHTML(item.bookTitle)}</td>
        <td class="text-center">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger btn-return d-inline-flex align-items-center gap-1" 
            data-index="${index}"
            data-title="${escapeHTML(item.bookTitle)}"
          >
            <i class="bi bi-arrow-counterclockwise"></i> Return Book
          </button>
        </td>
      </tr>
    `).join("");

    borrowedContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover table-striped align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th style="width: 50px;" class="text-center">No</th>
              <th>Nama Peminjam</th>
              <th>NIM</th>
              <th>Judul Buku</th>
              <th style="width: 150px;" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;

    // Pasang event listener untuk semua tombol "Return Book"
    const returnButtons = borrowedContainer.querySelectorAll(".btn-return");
    returnButtons.forEach(btn => {
      btn.addEventListener("click", handleReturnBook);
    });
  }

  // ===========================================================================
  // 8. HANDLER PENGEMBALIAN BUKU (RETURN BOOK)
  // ===========================================================================
  function handleReturnBook(event) {
    const target = event.currentTarget;
    const indexToRemove = parseInt(target.getAttribute("data-index"), 10);
    const bookTitle = target.getAttribute("data-title");

    let borrowedList = getBorrowedList();

    if (indexToRemove >= 0 && indexToRemove < borrowedList.length) {
      // Hapus data peminjaman dari array
      borrowedList.splice(indexToRemove, 1);
      // Simpan kembali ke localStorage
      saveBorrowedList(borrowedList);

      // Perbarui tampilan
      renderBooks();
      populateBookSelect();
      renderBorrowedList();

      showFormAlert(`Buku "${bookTitle}" berhasil dikembalikan. Status buku kembali menjadi Available.`, "success");
    }
  }

  // ===========================================================================
  // 9. VALIDASI DAN SUBMIT FORM PEMINJAMAN
  // ===========================================================================
  borrowForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Reset pesan error sebelumnya
    clearErrors();

    const nameValue = borrowerNameInput.value.trim();
    const nimValue = borrowerNimInput.value.trim();
    const selectedBookTitle = bookSelect.value;

    let isValid = true;

    // Validasi Nama Peminjam
    if (nameValue === "") {
      showError(borrowerNameInput, nameError, "Nama peminjam wajib diisi.");
      isValid = false;
    }

    // Validasi NIM
    if (nimValue === "") {
      showError(borrowerNimInput, nimError, "NIM wajib diisi.");
      isValid = false;
    }

    // Validasi Pilihan Buku
    if (!selectedBookTitle) {
      showError(bookSelect, bookError, "Silakan pilih judul buku yang ingin dipinjam.");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    // Cek apakah buku yang dipilih masih berstatus Available
    const currentBooks = getBooksWithStatus();
    const targetBook = currentBooks.find(b => b.title === selectedBookTitle);

    if (!targetBook || targetBook.status === "Borrowed") {
      showFormAlert("Buku ini sedang dipinjam dan tidak dapat dipinjam kembali.", "danger");
      populateBookSelect();
      return;
    }

    // Buat data peminjaman baru
    const newBorrowing = {
      borrowerName: nameValue,
      borrowerNim: nimValue,
      bookTitle: selectedBookTitle,
      borrowedAt: new Date().toISOString()
    };

    // Simpan ke localStorage
    const borrowedList = getBorrowedList();
    borrowedList.push(newBorrowing);
    saveBorrowedList(borrowedList);

    // Tampilkan pesan berhasil
    showFormAlert(`Peminjaman buku "${selectedBookTitle}" atas nama ${nameValue} (${nimValue}) berhasil!`, "success");

    // Reset formulir
    borrowForm.reset();

    // Perbarui seluruh tampilan komponen
    renderBooks();
    populateBookSelect();
    renderBorrowedList();
  });

  // ===========================================================================
  // 10. FUNGSI UTILITAS BANTUAN
  // ===========================================================================
  function showError(inputElement, errorElement, message) {
    inputElement.classList.add("is-invalid");
    errorElement.textContent = message;
  }

  function clearErrors() {
    borrowerNameInput.classList.remove("is-invalid");
    borrowerNimInput.classList.remove("is-invalid");
    bookSelect.classList.remove("is-invalid");
    nameError.textContent = "";
    nimError.textContent = "";
    bookError.textContent = "";
  }

  function showFormAlert(message, type) {
    formAlert.className = `alert alert-${type} shadow-sm`;
    formAlert.textContent = message;
    formAlert.style.display = "block";

    // Sembunyikan alert otomatis setelah 5 detik
    setTimeout(() => {
      formAlert.style.display = "none";
    }, 5000);
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ===========================================================================
  // 11. INITIAL RENDERING SAAT HALAMAN DIBUKA
  // ===========================================================================
  renderBooks();
  populateBookSelect();
  renderBorrowedList();
});

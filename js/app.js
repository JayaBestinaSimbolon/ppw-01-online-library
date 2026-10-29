/**
 * Perpustakaan Digital IT Del - app.js
 * Praktikum Pemrograman dan Pengujian Web (PPW) Week 4
 *
 * Mengelola Dynamic Client-Side Rendering (CSR), 4 UI States,
 * Event Listeners, Pencarian & Filter Real-Time, Modal Detail Buku Tunggal,
 * Formulir Validasi, Notifikasi Toast, dan Pengelolaan State Antarmuka.
 */

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================================
  // STATE APLIKASI
  // =========================================================================
  const state = {
    profile: null,
    rawBooks: [],          // Data mentah dari books.json
    computedBooks: [],     // Data buku dengan ketersediaan stok dinamis
    loans: [],             // Riwayat peminjaman dari localStorage
    activeFilter: {
      keyword: "",
      category: "Semua Kategori",
      availability: "all"  // 'all', 'available', 'unavailable'
    },
    selectedBookForModal: null
  };

  // =========================================================================
  // ELEMEN DOM
  // =========================================================================
  const dom = {
    // Navbar & Badge
    navLoanBadge: document.getElementById("navLoanBadge"),
    historyCountBadge: document.getElementById("historyCountBadge"),
    
    // Hero & Profile
    heroTitle: document.getElementById("heroTitle"),
    heroTagline: document.getElementById("heroTagline"),
    heroDescription: document.getElementById("heroDescription"),
    libraryHours: document.getElementById("libraryHours"),
    
    // Search & Filter
    searchInput: document.getElementById("searchInput"),
    categoryFilter: document.getElementById("categoryFilter"),
    availabilityFilter: document.getElementById("availabilityFilter"),
    resetFilterBtn: document.getElementById("resetFilterBtn"),

    // Catalog States Container
    catalogContainer: document.getElementById("catalogContainer"),
    catalogLoadingState: document.getElementById("catalogLoadingState"),
    catalogErrorState: document.getElementById("catalogErrorState"),
    catalogEmptyState: document.getElementById("catalogEmptyState"),
    errorMessageText: document.getElementById("errorMessageText"),
    retryLoadBtn: document.getElementById("retryLoadBtn"),
    booksGrid: document.getElementById("booksGrid"),
    catalogResultCount: document.getElementById("catalogResultCount"),

    // Modal Detail Buku Tunggal
    bookDetailModalEl: document.getElementById("bookDetailModal"),
    modalBookTitle: document.getElementById("modalBookTitle"),
    modalBookCover: document.getElementById("modalBookCover"),
    modalBookAuthor: document.getElementById("modalBookAuthor"),
    modalBookYear: document.getElementById("modalBookYear"),
    modalBookCategory: document.getElementById("modalBookCategory"),
    modalBookStockBadge: document.getElementById("modalBookStockBadge"),
    modalBookDescription: document.getElementById("modalBookDescription"),
    modalBorrowBtn: document.getElementById("modalBorrowBtn"),

    // Form Peminjaman
    borrowForm: document.getElementById("borrowForm"),
    inputBorrowerName: document.getElementById("borrowerName"),
    inputBorrowerNim: document.getElementById("borrowerNim"),
    selectBorrowBook: document.getElementById("selectBorrowBook"),
    inputBorrowDate: document.getElementById("borrowDate"),
    nameError: document.getElementById("nameError"),
    nimError: document.getElementById("nimError"),
    bookError: document.getElementById("bookError"),
    dateError: document.getElementById("dateError"),

    // Riwayat Peminjaman
    historyContainer: document.getElementById("historyContainer"),
    historyEmptyState: document.getElementById("historyEmptyState"),
    historyTableWrapper: document.getElementById("historyTableWrapper"),
    historyTableBody: document.getElementById("historyTableBody"),

    // Toast Notifikasi
    appToastEl: document.getElementById("appToast"),
    toastTitle: document.getElementById("toastTitle"),
    toastMessage: document.getElementById("toastMessage"),
    toastIcon: document.getElementById("toastIcon")
  };

  // Inisialisasi Bootstrap Modal & Toast Instances
  const bookDetailModal = dom.bookDetailModalEl ? new bootstrap.Modal(dom.bookDetailModalEl) : null;
  const appToast = dom.appToastEl ? new bootstrap.Toast(dom.appToastEl, { delay: 4000 }) : null;

  // =========================================================================
  // HELPER KEAMANAN & FORMATTER
  // =========================================================================
  
  /**
   * Mencegah XSS dengan mengonversi teks mentah menjadi entitas HTML aman
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Format tanggal lokal Indonesia (contoh: 29 Oktober 2026)
   * @param {string} dateString
   * @returns {string}
   */
  function formatDateIndo(dateString) {
    if (!dateString) return "-";
    try {
      const options = { year: "numeric", month: "long", day: "numeric" };
      return new Date(dateString).toLocaleDateString("id-ID", options);
    } catch {
      return dateString;
    }
  }

  /**
   * Menampilkan Toast notifikasi Bootstrap
   * @param {string} title - Judul notifikasi
   * @param {string} message - Pesan notifikasi
   * @param {'success'|'danger'|'warning'|'info'} type - Jenis notifikasi
   */
  function showToast(title, message, type = "success") {
    if (!appToast) return;
    
    dom.toastTitle.textContent = title;
    dom.toastMessage.textContent = message;

    dom.appToastEl.className = "toast align-items-center border-0";
    if (type === "success") {
      dom.appToastEl.classList.add("text-bg-success");
      dom.toastIcon.className = "bi bi-check-circle-fill me-2 fs-5";
    } else if (type === "danger") {
      dom.appToastEl.classList.add("text-bg-danger");
      dom.toastIcon.className = "bi bi-exclamation-triangle-fill me-2 fs-5";
    } else if (type === "warning") {
      dom.appToastEl.classList.add("text-bg-warning");
      dom.toastIcon.className = "bi bi-exclamation-circle-fill me-2 fs-5";
    } else {
      dom.appToastEl.classList.add("text-bg-primary");
      dom.toastIcon.className = "bi bi-info-circle-fill me-2 fs-5";
    }

    appToast.show();
  }

  // =========================================================================
  // 4 UI STATES PENGELOLAAN KATALOG
  // =========================================================================

  /**
   * Menampilkan UI State: Loading
   */
  function showLoadingState() {
    dom.catalogLoadingState.classList.remove("d-none");
    dom.catalogErrorState.classList.add("d-none");
    dom.catalogEmptyState.classList.add("d-none");
    dom.booksGrid.classList.add("d-none");
    dom.catalogResultCount.textContent = "Memuat data...";
  }

  /**
   * Menampilkan UI State: Success (menampilkan kartu buku)
   */
  function showSuccessState() {
    dom.catalogLoadingState.classList.add("d-none");
    dom.catalogErrorState.classList.add("d-none");
    dom.catalogEmptyState.classList.add("d-none");
    dom.booksGrid.classList.remove("d-none");
  }

  /**
   * Menampilkan UI State: Empty (buku tidak ditemukan setelah filter/search)
   */
  function showEmptyState() {
    dom.catalogLoadingState.classList.add("d-none");
    dom.catalogErrorState.classList.add("d-none");
    dom.catalogEmptyState.classList.remove("d-none");
    dom.booksGrid.classList.add("d-none");
    dom.catalogResultCount.textContent = "0 Buku ditemukan";
  }

  /**
   * Menampilkan UI State: Error (kegagalan fetch / network / json)
   * @param {string} message
   */
  function showErrorState(message) {
    dom.catalogLoadingState.classList.add("d-none");
    dom.catalogErrorState.classList.remove("d-none");
    dom.catalogEmptyState.classList.add("d-none");
    dom.booksGrid.classList.add("d-none");
    dom.errorMessageText.textContent = message || "Terjadi kesalahan saat memuat katalog buku.";
    dom.catalogResultCount.textContent = "Gagal memuat";
  }

  // =========================================================================
  // DATA INITIALIZATION & SYNC
  // =========================================================================

  /**
   * Memuat semua data awal (Profil, Buku, dan Riwayat Peminjaman)
   */
  async function initAppData() {
    showLoadingState();

    // 1. Muat Riwayat Peminjaman dari localStorage
    state.loans = ApiService.getLoans();
    renderLoansHistory();
    updateBadges();

    // 2. Set default tanggal hari ini pada form peminjaman
    const today = new Date().toISOString().split("T")[0];
    if (dom.inputBorrowDate) {
      dom.inputBorrowDate.value = today;
      dom.inputBorrowDate.min = today;
    }

    try {
      // 3. Muat profil perpustakaan
      try {
        const profile = await ApiService.fetchProfile();
        state.profile = profile;
        renderProfileInfo(profile);
      } catch (profErr) {
        console.warn("[App] Profil gagal dimuat, menggunakan profil default:", profErr);
      }

      // 4. Muat katalog buku
      const books = await ApiService.fetchBooks();
      state.rawBooks = books;
      recomputeStockAndRender();
    } catch (err) {
      console.error("[App] Gagal memuat data buku:", err);
      showErrorState(err.message);
    }
  }

  /**
   * Menampilkan informasi profil perpustakaan pada DOM
   * @param {Object} profile
   */
  function renderProfileInfo(profile) {
    if (!profile) return;
    if (dom.heroTitle && profile.institusi) {
      dom.heroTitle.textContent = `${profile.namaPerpustakaan || "Perpustakaan Digital"}`;
    }
    if (dom.heroTagline && profile.tagline) {
      dom.heroTagline.textContent = profile.tagline;
    }
    if (dom.heroDescription && profile.deskripsi) {
      dom.heroDescription.textContent = profile.deskripsi;
    }
    if (dom.libraryHours && profile.jamOperasional) {
      dom.libraryHours.textContent = profile.jamOperasional;
    }

    // Isi filter kategori jika profil menyediakannya
    if (dom.categoryFilter && profile.kategoriTersedia && profile.kategoriTersedia.length > 0) {
      dom.categoryFilter.innerHTML = "";
      profile.kategoriTersedia.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        dom.categoryFilter.appendChild(opt);
      });
    }
  }

  /**
   * Menghitung ulang ketersediaan stok lokal dan me-render ulang katalog & form
   */
  function recomputeStockAndRender() {
    state.computedBooks = ApiService.computeBooksAvailability(state.rawBooks, state.loans);
    renderCatalog();
    populateBorrowSelect();
  }

  // =========================================================================
  // RENDERING KATALOG BUKU (DYNAMIC CSR)
  // =========================================================================

  /**
   * Memfilter buku berdasarkan keyword pencarian, kategori, dan ketersediaan
   * @returns {Array}
   */
  function getFilteredBooks() {
    const { keyword, category, availability } = state.activeFilter;
    const cleanKeyword = keyword.trim().toLowerCase();

    return state.computedBooks.filter(book => {
      // Filter Keyword (judul atau penulis)
      const matchesKeyword = !cleanKeyword || 
        book.judul.toLowerCase().includes(cleanKeyword) ||
        book.penulis.toLowerCase().includes(cleanKeyword);

      // Filter Kategori
      const matchesCategory = !category || 
        category === "Semua Kategori" || 
        book.kategori.toLowerCase() === category.toLowerCase();

      // Filter Ketersediaan
      let matchesAvailability = true;
      if (availability === "available") {
        matchesAvailability = book.isAvailable;
      } else if (availability === "unavailable") {
        matchesAvailability = !book.isAvailable;
      }

      return matchesKeyword && matchesCategory && matchesAvailability;
    });
  }

  /**
   * Render kartu buku ke grid katalog
   */
  function renderCatalog() {
    const filtered = getFilteredBooks();

    if (filtered.length === 0) {
      showEmptyState();
      return;
    }

    showSuccessState();
    dom.catalogResultCount.textContent = `${filtered.length} Buku ditemukan`;
    dom.booksGrid.innerHTML = "";

    filtered.forEach(book => {
      const col = document.createElement("div");
      col.className = "col";

      const availabilityBadge = book.isAvailable
        ? `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Tersedia (${book.stokTersedia})</span>`
        : `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">Stok Habis</span>`;

      const borrowButton = book.isAvailable
        ? `<button type="button" class="btn btn-sm btn-primary fw-semibold btn-pinjam-buku" data-book-id="${escapeHtml(book.id)}">
             <i class="bi bi-box-arrow-in-down-right me-1"></i> Pinjam
           </button>`
        : `<button type="button" class="btn btn-sm btn-secondary fw-semibold" disabled>
             <i class="bi bi-x-circle me-1"></i> Habis
           </button>`;

      col.innerHTML = `
        <article class="card h-100 shadow-sm book-card" data-id="${escapeHtml(book.id)}">
          <div class="book-cover-wrapper">
            <span class="badge ${book.isAvailable ? 'bg-success' : 'bg-danger'} book-stock-badge">
              ${book.isAvailable ? 'Sisa: ' + book.stokTersedia : 'Habis'}
            </span>
            <img 
              src="${escapeHtml(book.gambar || 'assets/images/buku-1.svg')}" 
              alt="Sampul ${escapeHtml(book.judul)}" 
              class="book-cover-img"
              loading="lazy"
              onerror="this.onerror=null; this.src='assets/images/buku-1.svg';"
            >
          </div>
          <div class="card-body p-3 d-flex flex-column">
            <div class="mb-2">
              <span class="badge bg-secondary-subtle text-secondary badge-category">
                ${escapeHtml(book.kategori)}
              </span>
            </div>
            <h3 class="card-title h6 fw-bold text-dark text-truncate-2 mb-1" title="${escapeHtml(book.judul)}">
              ${escapeHtml(book.judul)}
            </h3>
            <p class="card-subtitle small text-muted mb-2">
              <i class="bi bi-person-fill text-secondary me-1"></i>${escapeHtml(book.penulis)}
            </p>
            <div class="small text-muted mb-3 d-flex justify-content-between align-items-center">
              <span><i class="bi bi-calendar3 me-1"></i>${escapeHtml(book.tahun)}</span>
              ${availabilityBadge}
            </div>
            <div class="mt-auto pt-2 border-top d-flex gap-2 justify-content-end">
              <button type="button" class="btn btn-sm btn-outline-secondary fw-semibold btn-detail-buku" data-book-id="${escapeHtml(book.id)}">
                <i class="bi bi-info-circle me-1"></i> Detail
              </button>
              ${borrowButton}
            </div>
          </div>
        </article>
      `;

      dom.booksGrid.appendChild(col);
    });

    // Pasang event listener untuk tombol-tombol dinamis
    attachBookItemListeners();
  }

  /**
   * Menghubungkan klik pada tombol Detail dan Pinjam di setiap kartu buku
   */
  function attachBookItemListeners() {
    // Tombol Detail Buku
    const detailBtns = dom.booksGrid.querySelectorAll(".btn-detail-buku");
    detailBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const bookId = btn.getAttribute("data-book-id");
        openBookDetailModal(bookId);
      });
    });

    // Tombol Pinjam Buku
    const pinjamBtns = dom.booksGrid.querySelectorAll(".btn-pinjam-buku");
    pinjamBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const bookId = btn.getAttribute("data-book-id");
        selectBookAndFocusBorrowForm(bookId);
      });
    });
  }

  // =========================================================================
  // MODAL DETAIL BUKU TUNGGAL
  // =========================================================================

  /**
   * Membuka modal Bootstrap tunggal dengan informasi buku terpilih
   * @param {string} bookId
   */
  function openBookDetailModal(bookId) {
    const book = state.computedBooks.find(b => b.id === bookId);
    if (!book || !bookDetailModal) return;

    state.selectedBookForModal = book;

    // Masukkan data ke modal dengan aman
    dom.modalBookTitle.textContent = book.judul;
    dom.modalBookAuthor.textContent = book.penulis;
    dom.modalBookYear.textContent = book.tahun;
    dom.modalBookCategory.textContent = book.kategori;
    dom.modalBookDescription.textContent = book.deskripsi || "Tidak ada deskripsi rinci untuk buku ini.";
    dom.modalBookCover.src = book.gambar || "assets/images/buku-1.svg";
    dom.modalBookCover.alt = `Sampul ${book.judul}`;

    if (book.isAvailable) {
      dom.modalBookStockBadge.className = "badge bg-success";
      dom.modalBookStockBadge.textContent = `Tersedia (${book.stokTersedia} eks)`;
      dom.modalBorrowBtn.classList.remove("d-none");
    } else {
      dom.modalBookStockBadge.className = "badge bg-danger";
      dom.modalBookStockBadge.textContent = "Stok Habis / Sedang Dipinjam";
      dom.modalBorrowBtn.classList.add("d-none");
    }

    bookDetailModal.show();
  }

  // Event handler tombol pinjam di dalam modal
  if (dom.modalBorrowBtn) {
    dom.modalBorrowBtn.addEventListener("click", () => {
      if (state.selectedBookForModal) {
        if (bookDetailModal) bookDetailModal.hide();
        selectBookAndFocusBorrowForm(state.selectedBookForModal.id);
      }
    });
  }

  /**
   * Memilih buku di select form peminjaman dan mengarahkan tampilan ke formulir
   * @param {string} bookId
   */
  function selectBookAndFocusBorrowForm(bookId) {
    if (dom.selectBorrowBook) {
      dom.selectBorrowBook.value = bookId;
      dom.bookError.textContent = "";
      dom.selectBorrowBook.classList.remove("is-invalid");
    }

    // Scroll halus ke formulir peminjaman
    const formSection = document.getElementById("peminjaman-section");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Fokus ke nama peminjam
    setTimeout(() => {
      if (dom.inputBorrowerName) {
        dom.inputBorrowerName.focus();
      }
    }, 450);
  }

  // =========================================================================
  // FORMULIR PEMINJAMAN & VALIDASI
  // =========================================================================

  /**
   * Mengisi pilihan dropdown buku pada formulir (hanya yang tersedia)
   */
  function populateBorrowSelect() {
    if (!dom.selectBorrowBook) return;

    const currentSelectedValue = dom.selectBorrowBook.value;
    dom.selectBorrowBook.innerHTML = '<option value="">-- Pilih Buku yang Tersedia --</option>';

    const availableBooks = state.computedBooks.filter(b => b.isAvailable);

    if (availableBooks.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.disabled = true;
      opt.textContent = "Semua koleksi buku sedang habis dipinjam";
      dom.selectBorrowBook.appendChild(opt);
      return;
    }

    availableBooks.forEach(book => {
      const option = document.createElement("option");
      option.value = book.id;
      option.textContent = `${book.judul} (Tersedia: ${book.stokTersedia})`;
      dom.selectBorrowBook.appendChild(option);
    });

    // Pertahankan pilihan sebelumnya jika masih ada dan tersedia
    if (currentSelectedValue && availableBooks.some(b => b.id === currentSelectedValue)) {
      dom.selectBorrowBook.value = currentSelectedValue;
    }
  }

  /**
   * Validasi data input formulir peminjaman
   * @returns {boolean}
   */
  function validateBorrowForm() {
    let isValid = true;

    // 1. Validasi Nama
    const nameVal = dom.inputBorrowerName.value.trim();
    if (!nameVal) {
      dom.inputBorrowerName.classList.add("is-invalid");
      dom.nameError.textContent = "Nama peminjam wajib diisi.";
      isValid = false;
    } else if (nameVal.length < 3) {
      dom.inputBorrowerName.classList.add("is-invalid");
      dom.nameError.textContent = "Nama peminjam minimal 3 karakter.";
      isValid = false;
    } else {
      dom.inputBorrowerName.classList.remove("is-invalid");
      dom.nameError.textContent = "";
    }

    // 2. Validasi NIM (7-12 digit angka)
    const nimVal = dom.inputBorrowerNim.value.trim();
    if (!nimVal) {
      dom.inputBorrowerNim.classList.add("is-invalid");
      dom.nimError.textContent = "NIM mahasiswa wajib diisi.";
      isValid = false;
    } else if (!/^[0-9]{7,12}$/.test(nimVal)) {
      dom.inputBorrowerNim.classList.add("is-invalid");
      dom.nimError.textContent = "NIM harus berupa 7 sampai 12 digit angka.";
      isValid = false;
    } else {
      dom.inputBorrowerNim.classList.remove("is-invalid");
      dom.nimError.textContent = "";
    }

    // 3. Validasi Buku
    const bookVal = dom.selectBorrowBook.value;
    if (!bookVal) {
      dom.selectBorrowBook.classList.add("is-invalid");
      dom.bookError.textContent = "Silakan pilih buku yang ingin dipinjam.";
      isValid = false;
    } else {
      // Periksa apakah buku masih tersedia
      const targetBook = state.computedBooks.find(b => b.id === bookVal);
      if (!targetBook || !targetBook.isAvailable) {
        dom.selectBorrowBook.classList.add("is-invalid");
        dom.bookError.textContent = "Buku ini baru saja habis dipinjam.";
        isValid = false;
      } else {
        dom.selectBorrowBook.classList.remove("is-invalid");
        dom.bookError.textContent = "";
      }
    }

    // 4. Validasi Tanggal
    const dateVal = dom.inputBorrowDate.value;
    if (!dateVal) {
      dom.inputBorrowDate.classList.add("is-invalid");
      dom.dateError.textContent = "Tanggal peminjaman wajib diisi.";
      isValid = false;
    } else {
      dom.inputBorrowDate.classList.remove("is-invalid");
      dom.dateError.textContent = "";
    }

    return isValid;
  }

  // Event handler submit formulir peminjaman
  if (dom.borrowForm) {
    dom.borrowForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!validateBorrowForm()) {
        showToast("Validasi Gagal", "Mohon periksa kembali input formulir Anda.", "danger");
        return;
      }

      const bookId = dom.selectBorrowBook.value;
      const targetBook = state.computedBooks.find(b => b.id === bookId);

      try {
        const newLoan = ApiService.saveLoan({
          nama: dom.inputBorrowerName.value.trim(),
          nim: dom.inputBorrowerNim.value.trim(),
          bookId: targetBook.id,
          bookTitle: targetBook.judul,
          tanggalPinjam: dom.inputBorrowDate.value
        });

        // Update state lokal
        state.loans.unshift(newLoan);

        // Reset form
        dom.borrowForm.reset();
        dom.inputBorrowDate.value = new Date().toISOString().split("T")[0];

        // Hapus styling validasi
        [dom.inputBorrowerName, dom.inputBorrowerNim, dom.selectBorrowBook, dom.inputBorrowDate].forEach(el => {
          el.classList.remove("is-invalid");
        });

        // Hitung ulang stok dan update tampilan
        recomputeStockAndRender();
        renderLoansHistory();
        updateBadges();

        showToast(
          "Peminjaman Berhasil!",
          `Buku "${targetBook.judul}" berhasil dipinjam oleh ${newLoan.nama}. Catatan tersimpan di localStorage.`,
          "success"
        );
      } catch (err) {
        console.error("[App] Gagal menyimpan peminjaman:", err);
        showToast("Gagal Meminjam", err.message, "danger");
      }
    });

    // Real-time input clearing validation errors
    [dom.inputBorrowerName, dom.inputBorrowerNim, dom.selectBorrowBook, dom.inputBorrowDate].forEach(el => {
      if (el) {
        el.addEventListener("input", () => {
          el.classList.remove("is-invalid");
        });
        el.addEventListener("change", () => {
          el.classList.remove("is-invalid");
        });
      }
    });
  }

  // =========================================================================
  // RIWAYAT PEMINJAMAN & PENGEMBALIAN BUKU
  // =========================================================================

  /**
   * Render tabel riwayat peminjaman dari state.loans
   */
  function renderLoansHistory() {
    if (!dom.historyTableBody) return;

    if (state.loans.length === 0) {
      dom.historyEmptyState.classList.remove("d-none");
      dom.historyTableWrapper.classList.add("d-none");
      return;
    }

    dom.historyEmptyState.classList.add("d-none");
    dom.historyTableWrapper.classList.remove("d-none");
    dom.historyTableBody.innerHTML = "";

    state.loans.forEach((loan, idx) => {
      const tr = document.createElement("tr");

      const isDipinjam = loan.status === "Dipinjam";
      const statusBadge = isDipinjam
        ? `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-hourglass-split me-1"></i>Dipinjam</span>`
        : `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-all me-1"></i>Dikembalikan</span>`;

      const actionBtn = isDipinjam
        ? `<button type="button" class="btn btn-sm btn-outline-success fw-semibold btn-kembalikan" data-loan-id="${escapeHtml(loan.id)}">
             <i class="bi bi-arrow-counterclockwise me-1"></i> Kembalikan
           </button>`
        : `<span class="text-muted small"><i class="bi bi-check2"></i> Selesai</span>`;

      tr.innerHTML = `
        <td class="text-muted small">${idx + 1}</td>
        <td>
          <span class="badge bg-light text-secondary border font-monospace small">${escapeHtml(loan.id)}</span>
        </td>
        <td>
          <strong class="d-block text-dark">${escapeHtml(loan.bookTitle)}</strong>
          <small class="text-muted">ID Buku: ${escapeHtml(loan.bookId)}</small>
        </td>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(loan.nama)}</div>
          <small class="text-muted">NIM: ${escapeHtml(loan.nim)}</small>
        </td>
        <td class="small text-nowrap">${formatDateIndo(loan.tanggalPinjam)}</td>
        <td>${statusBadge}</td>
        <td class="text-end text-nowrap">${actionBtn}</td>
      `;

      dom.historyTableBody.appendChild(tr);
    });

    // Pasang listener pada tombol "Kembalikan"
    attachReturnLoanListeners();
  }

  /**
   * Listener untuk pengembalian buku
   */
  function attachReturnLoanListeners() {
    const returnBtns = dom.historyTableBody.querySelectorAll(".btn-kembalikan");
    returnBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const loanId = btn.getAttribute("data-loan-id");
        try {
          ApiService.returnLoan(loanId);

          // Update status di memori
          const target = state.loans.find(l => l.id === loanId);
          if (target) {
            target.status = "Dikembalikan";
          }

          // Render ulang
          recomputeStockAndRender();
          renderLoansHistory();
          updateBadges();

          showToast(
            "Buku Dikembalikan",
            `Buku "${target ? target.bookTitle : ''}" telah berhasil dikembalikan ke perpustakaan.`,
            "info"
          );
        } catch (err) {
          showToast("Gagal Mengembalikan", err.message, "danger");
        }
      });
    });
  }

  /**
   * Perbarui badge peminjaman di Navbar dan Header Riwayat
   */
  function updateBadges() {
    const activeLoans = state.loans.filter(l => l.status === "Dipinjam");
    const activeCount = activeLoans.length;

    if (dom.navLoanBadge) {
      dom.navLoanBadge.textContent = activeCount;
      dom.navLoanBadge.classList.toggle("bg-danger", activeCount > 0);
      dom.navLoanBadge.classList.toggle("bg-secondary", activeCount === 0);
    }

    if (dom.historyCountBadge) {
      dom.historyCountBadge.textContent = `${activeCount} Aktif (${state.loans.length} Total)`;
    }
  }

  // =========================================================================
  // EVENT LISTENERS PENCARIAN & FILTER REAL-TIME
  // =========================================================================

  // Input Pencarian Real-Time (Debounce sederhana)
  let searchTimeout = null;
  if (dom.searchInput) {
    dom.searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.activeFilter.keyword = e.target.value;
        renderCatalog();
      }, 200);
    });
  }

  // Filter Kategori
  if (dom.categoryFilter) {
    dom.categoryFilter.addEventListener("change", (e) => {
      state.activeFilter.category = e.target.value;
      renderCatalog();
    });
  }

  // Filter Ketersediaan
  if (dom.availabilityFilter) {
    dom.availabilityFilter.addEventListener("change", (e) => {
      state.activeFilter.availability = e.target.value;
      renderCatalog();
    });
  }

  // Reset Filter Button
  if (dom.resetFilterBtn) {
    dom.resetFilterBtn.addEventListener("click", () => {
      state.activeFilter.keyword = "";
      state.activeFilter.category = "Semua Kategori";
      state.activeFilter.availability = "all";

      if (dom.searchInput) dom.searchInput.value = "";
      if (dom.categoryFilter) dom.categoryFilter.value = "Semua Kategori";
      if (dom.availabilityFilter) dom.availabilityFilter.value = "all";

      renderCatalog();
    });
  }

  // Tombol Coba Lagi pada Error State
  if (dom.retryLoadBtn) {
    dom.retryLoadBtn.addEventListener("click", () => {
      initAppData();
    });
  }

  // =========================================================================
  // MULAI APLIKASI
  // =========================================================================
  initAppData();
});

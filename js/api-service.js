/**
 * Perpustakaan Digital IT Del - api-service.js
 * Praktikum Pemrograman dan Pengujian Web (PPW) Week 4
 *
 * Lapisan Data Access & Service (Data Provider)
 * Menangani Fetch API, validasi response HTTP, parsing JSON,
 * penanganan error jaringan, dan operasi penyimpanan lokal (localStorage).
 */

const ApiService = (() => {
  // Lokasi data JSON
  const BOOKS_ENDPOINT = "data/books.json";
  const PROFILE_ENDPOINT = "data/profile.json";

  // Kunci penyimpanan localStorage
  const LOANS_STORAGE_KEY = "itdel_library_loans_week4";

  /**
   * Mengambil data profil perpustakaan dari profile.json
   * @returns {Promise<Object>}
   */
  async function fetchProfile() {
    try {
      const response = await fetch(PROFILE_ENDPOINT, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Gagal memuat profil perpustakaan (HTTP ${response.status}: ${response.statusText})`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("[ApiService] Error saat mengambil profil:", error);
      throw error;
    }
  }

  /**
   * Mengambil data katalog buku dari books.json
   * @returns {Promise<Array>}
   */
  async function fetchBooks() {
    try {
      const response = await fetch(BOOKS_ENDPOINT, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Gagal memuat katalog buku (HTTP ${response.status}: ${response.statusText})`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Format data buku tidak valid (bukan array).");
      }
      return data;
    } catch (error) {
      console.error("[ApiService] Error saat mengambil katalog buku:", error);
      throw error;
    }
  }

  /**
   * Mengambil daftar seluruh peminjaman dari localStorage
   * @returns {Array}
   */
  function getLoans() {
    try {
      const stored = localStorage.getItem(LOANS_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("[ApiService] Gagal mem-parse data peminjaman dari localStorage:", err);
      return [];
    }
  }

  /**
   * Menyimpan data peminjaman baru ke localStorage setelah validasi
   * @param {Object} loanData - { nama, nim, bookId, bookTitle, tanggalPinjam }
   * @returns {Object} Data peminjaman yang tersimpan
   */
  function saveLoan(loanData) {
    if (!loanData) {
      throw new Error("Data peminjaman tidak boleh kosong.");
    }

    const nama = (loanData.nama || "").trim();
    const nim = (loanData.nim || "").trim();
    const bookId = (loanData.bookId || "").trim();
    const bookTitle = (loanData.bookTitle || "").trim();
    const tanggalPinjam = loanData.tanggalPinjam || new Date().toISOString().split("T")[0];

    // Validasi input
    if (nama.length < 3) {
      throw new Error("Nama peminjam minimal harus 3 karakter.");
    }

    if (!/^[0-9]{7,12}$/.test(nim)) {
      throw new Error("NIM harus berupa 7-12 digit angka.");
    }

    if (!bookId || !bookTitle) {
      throw new Error("Buku yang dipilih tidak valid.");
    }

    const currentLoans = getLoans();

    // ID Peminjaman unik: PJ-TIMESTAMP-RANDOM
    const newId = `PJ-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const newLoan = {
      id: newId,
      nama: nama,
      nim: nim,
      bookId: bookId,
      bookTitle: bookTitle,
      tanggalPinjam: tanggalPinjam,
      status: "Dipinjam",
      createdAt: new Date().toISOString()
    };

    currentLoans.unshift(newLoan); // Masukkan paling atas (terbaru)
    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(currentLoans));

    return newLoan;
  }

  /**
   * Memperbarui status peminjaman menjadi "Dikembalikan" (Return Book)
   * @param {string} loanId
   * @returns {boolean}
   */
  function returnLoan(loanId) {
    const currentLoans = getLoans();
    const loanIndex = currentLoans.findIndex(item => item.id === loanId);

    if (loanIndex === -1) {
      throw new Error("Catatan peminjaman tidak ditemukan.");
    }

    // Ubah status peminjaman menjadi "Dikembalikan"
    currentLoans[loanIndex].status = "Dikembalikan";
    currentLoans[loanIndex].returnedAt = new Date().toISOString();

    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(currentLoans));
    return true;
  }

  /**
   * Menghitung sisa stok dinamis berdasarkan stok asli di JSON
   * dikurangi peminjaman aktif ("Dipinjam") di localStorage
   * @param {Array} originalBooks
   * @param {Array} loans
   * @returns {Array} Buku dengan stokTersedia dan isAvailable
   */
  function computeBooksAvailability(originalBooks, loans) {
    // Hitung jumlah buku yang sedang dipinjam per bookId
    const activeBorrowedCounts = {};
    loans.forEach(loan => {
      if (loan.status === "Dipinjam") {
        activeBorrowedCounts[loan.bookId] = (activeBorrowedCounts[loan.bookId] || 0) + 1;
      }
    });

    return originalBooks.map(book => {
      const borrowedCount = activeBorrowedCounts[book.id] || 0;
      const stokTersedia = Math.max(0, (book.stok || 0) - borrowedCount);
      return {
        ...book,
        stokAsli: book.stok,
        stokTersedia: stokTersedia,
        isAvailable: stokTersedia > 0
      };
    });
  }

  return {
    fetchProfile,
    fetchBooks,
    getLoans,
    saveLoan,
    returnLoan,
    computeBooksAvailability
  };
})();

# Defect Report Tracker

Industrial-grade defect report management dashboard — React + Vite, Firebase (Auth + Firestore), Cloudinary (images), Tailwind CSS.

---

## Tech Stack

| Kegunaan | Teknologi |
|---|---|
| UI Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Authentication | Firebase Auth (Google Sign-In) |
| Database | Firebase Firestore |
| Image Storage | **Cloudinary** (unsigned upload) |
| Image Cropper | Cropper.js via react-cropper |
| PDF Export | jsPDF + jspdf-autotable |
| Deploy | GitHub Pages |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/defect-report-tracker.git
cd defect-report-tracker
npm install
```

### 2. Setup Firebase

1. Buka https://console.firebase.google.com/ → buat project baru
2. Aktifkan **Authentication → Google** sign-in provider
3. Aktifkan **Firestore Database** (production mode)
4. *Firebase Storage tidak diperlukan — gambar disimpan di Cloudinary*
5. Project Settings → Your apps → Add Web App → copy config

### 3. Setup Cloudinary

1. Daftar/login di https://cloudinary.com
2. Buka **Settings → Upload → Upload Presets**
3. Klik **Add upload preset**
4. Set **Signing Mode = Unsigned**
5. (Opsional) Set folder default = `defect-reports`
6. Save → catat **Preset Name**
7. Catat juga **Cloud Name** dari dashboard utama

### 4. Konfigurasi environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
```

### 5. Deploy Firestore rules

```bash
npm install -g firebase-tools
firebase login
firebase init   # pilih Firestore, link ke project kamu
firebase deploy --only firestore:rules
```

### 6. Jalankan lokal

```bash
npm run dev
```

Buka http://localhost:5173/defect-report-tracker/

---

## Deploy ke GitHub Pages

```bash
# Pastikan base di vite.config.js sesuai nama repo
npm run deploy
```

Setelah deploy, tambahkan domain GitHub Pages ke Firebase:
**Authentication → Settings → Authorized domains** → tambah `YOUR_USERNAME.github.io`

---

## Cara Kerja Upload Gambar (Cloudinary)

```
User pilih gambar
    → Cropper.js (zoom/pan/reposition)
    → Canvas.toBlob() → JPEG blob
    → POST ke https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
    → Cloudinary returns secure_url (HTTPS)
    → URL disimpan di Firestore (positionImageUrl / detailImageUrl)
```

Upload menggunakan **unsigned preset** — tidak butuh backend/server, aman untuk digunakan langsung dari browser.

---

## Project Structure

```
src/
├── components/
│   ├── QuadrantProgress.jsx   # indikator 4-kuadran
│   ├── ImageCropper.jsx       # cropper single/dual
│   ├── ImageUploader.jsx      # modal layout + crop + upload Cloudinary
│   ├── ReportModal.jsx        # form tambah/edit
│   ├── ConfirmDialog.jsx      # dialog hapus
│   └── ImageModal.jsx         # fullscreen viewer
├── hooks/
│   ├── useAuth.jsx            # Firebase Auth context
│   ├── useReports.js          # Firestore CRUD
│   └── useDarkMode.js         # dark mode
├── lib/
│   ├── firebase.js            # Firebase init (Auth + Firestore)
│   ├── db.js                  # Firestore operations
│   ├── cloudinary.js          # Cloudinary upload helper ← BARU
│   └── pdfExport.js           # PDF A4 landscape
├── pages/
│   ├── LoginPage.jsx
│   └── Dashboard.jsx
├── index.css
└── main.jsx
```

---

## Database Schema (Firestore)

**Collection:** `reports`

| Field | Type | Keterangan |
|---|---|---|
| `unitNo` | string | ID unit (misal: UNIT-001) |
| `cause` | string | Penyebab defect |
| `countermeasure` | string | Tindakan perbaikan |
| `progress` | integer 0–4 | Progress perbaikan (×25%) |
| `verification` | integer 0–4 | Verifikasi countermeasure (×25%) |
| `layoutType` | "single"\|"dual" | Tipe layout gambar |
| `positionImageUrl` | string\|null | URL Cloudinary — foto posisi |
| `detailImageUrl` | string\|null | URL Cloudinary — foto detail (dual only) |
| `createdAt` | Timestamp | Auto-set saat dibuat |
| `updatedAt` | Timestamp | Auto-update setiap perubahan |

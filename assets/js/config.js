'use strict';

// ─── ENVIRONMENT CONFIG ──────────────────────────────────────────────────────
// This is the ONLY file that should differ between the Prod and UAT copies of this repo.
// Replace API_URL with your deployed Apps Script Web App URL after running setup.
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbx9LEJqnx2BMu_YIf7sjUDa5InI5htXsQ-NIzIcXnhtQFiEbs-yABUEQP3sCgI0wjI/exec',
  // Live GitHub Pages site URL (no trailing slash) — used only by docs/qr-print.html, which runs
  // locally (opened as a file, not deployed), to build door-ledger.html links that actually work
  // when a tenant scans them on their phone.
  SITE_URL: 'https://rentmanagementtmk.github.io/rmsUAT',
};

// Ustawia motyw przed pierwszym renderem (bez „mignięcia”). Osobny plik — CSP blokuje skrypty inline.
(function () {
  var preference = 'system';
  try {
    preference = localStorage.getItem('pdf-insight:theme') || 'system';
  } catch {
    // brak dostępu do localStorage — używamy ustawień systemu
  }
  var dark =
    preference === 'dark' ||
    (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();

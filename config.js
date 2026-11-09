// ============================================================
// CONFIGURACIÓN DE LA PÁGINA
// API_URL: pega aquí la URL de tu Apps Script (la que termina en /exec).
//   Si la dejas vacía, la página funciona en MODO DEMO:
//   - los votos se guardan solo en este navegador
//   - PIN de mesas: 1111, 2222, 3333, 4444, 5555
//   - estudiantes de ejemplo: Mesa 1 → 1001…1008, Mesa 2 → 2001…2008, etc.
//   - código secreto de la central: DEMO2026
// INSIGNIA: nombre del archivo con la insignia del colegio (súbelo junto a
//   estos archivos). Si no existe, se muestra el emblema electoral.
// ============================================================
window.VOTO_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyCxiZAIumqoBoQ-6Q1_SiBwOHwP-vfp6NivuOHXEE714IAsjFLpGy2ud3SWPlnTe2x/exec',
  INSIGNIA: 'insignia.png'
};

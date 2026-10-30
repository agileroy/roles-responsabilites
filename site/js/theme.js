// Bouton de thème clair / sombre. Le thème initial est appliqué par le script en tête de index.html.
// Choix propre au navigateur : jamais envoyé à la salle.

const STORAGE_KEY = 'roles-responsabilites.theme';
const root = document.documentElement;
const button = document.getElementById('theme-toggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function storedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function apply(theme) {
  root.dataset.theme = theme;
  const label = theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre';
  button.setAttribute('aria-label', label);
  button.title = label;
}

apply(storedTheme() ?? (systemDark.matches ? 'dark' : 'light'));

button.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  apply(next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* stockage indisponible : choix non mémorisé */ }
});

// Sans choix mémorisé, le thème suit les changements du réglage système.
systemDark.addEventListener('change', (event) => {
  if (!storedTheme()) apply(event.matches ? 'dark' : 'light');
});

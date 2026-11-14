/* ---------- Elements & state ---------- */
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');
const themeToggle = document.getElementById('theme-toggle');
const langToggle = document.getElementById('lang-toggle');
const projectsList = document.getElementById('projects-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const root = document.documentElement;

let allProjects = [];
let currentFilter = 'all';
let translations = {};
let currentLang = localStorage.getItem('lang') || 'en';

/* ---------- Mobile menu ---------- */
function closeMenu() {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}

toggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

/* ---------- Theme ---------- */
function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  themeToggle.textContent = isDark ? '\u2600' : '\u263E';
  themeToggle.setAttribute(
    'aria-label',
    isDark ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  localStorage.setItem('theme', nextTheme);
});

/* ---------- Translation helpers ---------- */
function t(key, fallback) {
  const dictionary = translations[currentLang];
  return (dictionary && dictionary[key]) || fallback;
}

function pick(field) {
  return field[currentLang] || field.en;
}

/* ---------- Projects ---------- */
function createCard(project) {
  const card = document.createElement('article');
  card.className = 'card';

  const title = document.createElement('h3');
  title.textContent = pick(project.title);

  const description = document.createElement('p');
  description.textContent = pick(project.description);

  card.append(title, description);

  if (project.tags.length > 0) {
    const tagList = document.createElement('ul');
    tagList.className = 'tags';
    project.tags.forEach((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      tagList.append(item);
    });
    card.append(tagList);
  }

  if (project.link) {
    const link = document.createElement('a');
    link.href = project.link;
    link.textContent = t('project.link', 'View on GitHub');
    link.target = '_blank';
    link.rel = 'noopener';
    card.append(link);
  }

  const status = document.createElement('p');
  status.className = 'status';
  status.textContent = pick(project.status);
  card.append(status);

  return card;
}

function renderProjects(filter) {
  currentFilter = filter;
  const visible =
    filter === 'all'
      ? allProjects
      : allProjects.filter((project) => project.category === filter);

  if (visible.length === 0) {
    projectsList.textContent = t(
      'projects.empty',
      'No projects in this category yet.'
    );
    return;
  }
  projectsList.replaceChildren(...visible.map(createCard));
}

async function loadProjects() {
  try {
    const response = await fetch('data/projects.json');
    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }
    allProjects = await response.json();
    renderProjects(currentFilter);
  } catch (error) {
    console.error(error);
    projectsList.textContent = t(
      'projects.error',
      'Projects could not be loaded.'
    );
  }
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((other) => {
      other.classList.remove('active');
      other.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    renderProjects(button.dataset.filter);
  });
});

/* ---------- Language ---------- */
function setLanguage(lang) {
  const dictionary = translations[lang];
  if (!dictionary) return;

  currentLang = lang;
  root.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const text = dictionary[element.dataset.i18n];
    if (text) element.textContent = text;
  });

  document.title = dictionary['meta.title'];
  langToggle.textContent = lang === 'en' ? 'FR' : 'EN';
  langToggle.setAttribute(
    'aria-label',
    lang === 'en' ? 'Passer en français' : 'Switch to English'
  );
  localStorage.setItem('lang', lang);

  if (allProjects.length > 0) {
    renderProjects(currentFilter);
    refreshFormErrors();
  }
}

async function loadTranslations() {
  try {
    const response = await fetch('data/translations.json');
    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }
    translations = await response.json();
    setLanguage(currentLang);
  } catch (error) {
    console.error(error);
  }
}

langToggle.addEventListener('click', () => {
  setLanguage(currentLang === 'en' ? 'fr' : 'en');
});

/* ---------- Contact form ---------- */
const CONTACT_EMAIL = 'simo.leninem@gmail.com'; // replace with your public address

const form = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

const fields = [
  {
    input: document.getElementById('name'),
    errorId: 'name-error',
    key: 'form.error.name',
    fallback: 'Please enter your name (at least 2 characters).',
    isValid: (value) => value.trim().length >= 2,
  },
  {
    input: document.getElementById('email'),
    errorId: 'email-error',
    key: 'form.error.email',
    fallback: 'Please enter a valid email address.',
    isValid: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  },
  {
    input: document.getElementById('message'),
    errorId: 'message-error',
    key: 'form.error.message',
    fallback: 'Please write a message (at least 10 characters).',
    isValid: (value) => value.trim().length >= 10,
  },
];

function validateField(field) {
  const valid = field.isValid(field.input.value);
  document.getElementById(field.errorId).textContent = valid
    ? ''
    : t(field.key, field.fallback);
  field.input.setAttribute('aria-invalid', String(!valid));
  return valid;
}

function refreshFormErrors() {
  fields.forEach((field) => {
    if (field.input.getAttribute('aria-invalid') === 'true') {
      validateField(field);
    }
  });
}

fields.forEach((field) => {
  field.input.addEventListener('blur', () => validateField(field));
  field.input.addEventListener('input', () => {
    if (field.input.getAttribute('aria-invalid') === 'true') {
      validateField(field);
    }
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  formStatus.textContent = '';

  const results = fields.map(validateField);
  if (!results.every(Boolean)) {
    fields[results.indexOf(false)].input.focus();
    return;
  }

  const [nameField, emailField, messageField] = fields.map((f) => f.input.value.trim());
  const subject = encodeURIComponent('Portfolio contact from ' + nameField);
  const body = encodeURIComponent(
    messageField + '\n\n' + nameField + ' (' + emailField + ')'
  );
  window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
  formStatus.textContent = t(
    'form.success',
    'Your email app should open with your message. Just press send.'
  );
});

/* ---------- Start ---------- */
loadProjects();
loadTranslations();
/* ---------- Scroll animations ---------- */
const revealSections = document.querySelectorAll('main section:not(.hero)');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  revealSections.forEach((section) => {
    section.classList.add('reveal');
    observer.observe(section);
  });
}
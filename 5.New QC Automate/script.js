// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.style.background = 'rgba(10,12,15,0.97)';
  } else {
    navbar.style.background = 'rgba(10,12,15,0.85)';
  }
});

// ===== SMOOTH SCROLL =====
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== COUNTER ANIMATION =====
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 1800;
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

// ===== INTERSECTION OBSERVER =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');

      // Trigger counters when hero is visible
      if (entry.target.id === 'hero') {
        setTimeout(() => {
          document.querySelectorAll('.stat-num').forEach(animateCounter);
        }, 5200);
      }
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('section').forEach(s => observer.observe(s));

// ===== CONTACT FORM =====
function submitForm() {
  const name  = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const msg   = document.getElementById('c-msg').value.trim();
  const status = document.getElementById('form-status');

  if (!name || !email || !msg) {
    status.style.color = '#ff3d5a';
    status.textContent = '⚠ กรุณากรอกข้อมูลให้ครบทุกช่อง';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.style.color = '#ff3d5a';
    status.textContent = '⚠ รูปแบบอีเมลไม่ถูกต้อง';
    return;
  }

  status.style.color = '#00ff88';
  status.textContent = '✓ ส่งข้อความสำเร็จ! ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง';
  document.getElementById('c-name').value = '';
  document.getElementById('c-email').value = '';
  document.getElementById('c-msg').value = '';

  setTimeout(() => { status.textContent = ''; }, 5000);
}

// ===== ACTIVE NAV LINK =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 80) current = s.id;
  });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute('href') === `#${current}` ? 'var(--accent)' : '';
  });
});

// ===== MINI CARD HOVER SOUND EFFECT (visual only) =====
document.querySelectorAll('.mini-card, .feature-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = '0 0 0 1px rgba(0,229,255,0.15), 0 16px 40px rgba(0,0,0,0.4)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = '';
  });
});

console.log('%c[QC-Automate] System Ready ✓', 'color:#00e5ff;font-family:monospace;font-size:14px');

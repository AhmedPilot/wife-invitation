import { CONFIG } from './config.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.replace('pending', 'visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08 }
  );
  document.querySelectorAll('.reveal').forEach((section) => {
    section.classList.add('pending');
    observer.observe(section);
  });
}

// Resolve midnight in the configured IANA timezone, independently of the guest's timezone.
function startOfEventDay() {
  const [year, month, day] = CONFIG.eventDate.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.timezone,
    timeZoneName: 'longOffset'
  }).formatToParts(new Date(utc));
  const offset = parts
    .find((part) => part.type === 'timeZoneName')
    .value.match(/GMT([+-])(\d{2}):(\d{2})/);
  const minutes = offset
    ? (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === '+' ? 1 : -1)
    : 0;
  return utc - minutes * 60000;
}
const target = CONFIG.eventDateTime ? Date.parse(CONFIG.eventDateTime) : startOfEventDay();
const timer = document.querySelector('.countdown');
const heading = document.querySelector('#countdown-heading');
const note = document.querySelector('#countdown-note');
if (CONFIG.eventDateTime) {
  note.textContent = `العدّ إلى موعد الحفل الساعة ${CONFIG.timeLabel}.`;
  timer.setAttribute('aria-label', 'الوقت المتبقي إلى موعد عقد القران');
}
function updateCountdown() {
  const remaining = Math.max(0, target - Date.now());
  const seconds = Math.floor(remaining / 1000);
  const values = [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60
  ];
  ['days', 'hours', 'minutes', 'seconds'].forEach((id, index) => {
    document.getElementById(id).textContent = String(values[index]).padStart(2, '0');
  });
  if (!remaining) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: CONFIG.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    heading.textContent =
      today === CONFIG.eventDate ? 'حان موعد الفرح' : 'دامت المودّة والرحمة';
    note.textContent =
      today === CONFIG.eventDate ? 'ننتظركم اليوم في منزلهم العامر بدمبو' : 'شكرًا لحضوركم ودعواتكم المباركة';
    timer.hidden = true;
  }
}
updateCountdown();
const interval = setInterval(updateCountdown, 1000);
window.addEventListener('pagehide', () => clearInterval(interval), { once: true });
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload();
});

const audio = document.getElementById('audio');
const music = document.getElementById('music');
const mute = document.getElementById('mute');
const audioStatus = document.getElementById('audio-status');
audio.volume = 0.18;
document.querySelector('.music-controls').hidden = false;
function syncMusic() {
  music.setAttribute('aria-pressed', String(!audio.paused));
  music.setAttribute('aria-label', audio.paused ? 'تشغيل الموسيقى' : 'إيقاف الموسيقى');
  music.textContent = audio.paused ? '♫' : 'Ⅱ';
}
async function playMusic() {
  try {
    await audio.play();
    audioStatus.textContent = '';
  } catch {
    audioStatus.textContent = 'تعذّر تشغيل الموسيقى. يمكنك الاستمتاع بالدعوة دون صوت.';
  }
  syncMusic();
}
function firstInteraction(event) {
  document.removeEventListener('click', firstInteraction);
  if (!event.target.closest('.music-controls')) void playMusic();
}
document.addEventListener('click', firstInteraction);

// Opening gate: the "افتح الدعوة" tap is the user gesture browsers require before playing sound.
const gate = document.querySelector('.opening');
const openButton = document.getElementById('open-invite');
function closeGate() {
  gate.classList.add('closing');
  document.removeEventListener('click', firstInteraction);
  gate.addEventListener('animationend', () => gate.remove(), { once: true });
  setTimeout(() => gate.isConnected && gate.remove(), 900);
}
document.documentElement.classList.add('gate');
openButton.hidden = false;
gate.querySelector('.open-hint').hidden = false;
openButton.focus({ preventScroll: true });
openButton.addEventListener('click', () => {
  void playMusic();
  closeGate();
});
// Some browsers allow sound straight away; if so, play and open without waiting for the tap.
audio.play().then(() => {
  syncMusic();
  setTimeout(closeGate, 1800);
}, () => {});
if (new URLSearchParams(location.search).get('autoplay') === '1') {
  history.replaceState(null, '', location.pathname + location.hash);
}
music.addEventListener('click', () => {
  if (audio.paused) void playMusic();
  else audio.pause();
});
mute.addEventListener('click', () => {
  audio.muted = !audio.muted;
  mute.setAttribute('aria-pressed', String(audio.muted));
  mute.setAttribute('aria-label', audio.muted ? 'إلغاء كتم الموسيقى' : 'كتم الموسيقى');
});
audio.addEventListener('play', syncMusic);
audio.addEventListener('pause', syncMusic);
audio.addEventListener('error', () => {
  audioStatus.textContent = 'الموسيقى غير متاحة. الدعوة متاحة بالكامل دون صوت.';
  music.disabled = true;
  mute.disabled = true;
  music.setAttribute('aria-label', 'الموسيقى غير متاحة');
});

document.getElementById('share').addEventListener('click', async () => {
  const url = CONFIG.siteUrl || window.location.href.split('#')[0];
  const status = document.getElementById('share-status');
  if (navigator.share) {
    try {
      await navigator.share({
        title: `دعوة عقد قران ${CONFIG.groom} و${CONFIG.bride}`,
        text: 'حضوركم شرفٌ لنا، ودعواتكم تزيد فرحتنا',
        url
      });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = 'تم نسخ رابط الدعوة';
  } catch {
    const field = document.getElementById('share-url');
    field.hidden = false;
    field.value = url;
    field.focus();
    field.select();
    status.textContent = 'انسخ الرابط وشاركه مع أحبّتك';
  }
});

// Location link: every [data-live] element opens CONFIG.mapsUrl (Google Maps) in a new tab.
document.querySelectorAll('[data-live]').forEach((el) => {
  if (CONFIG.mapsUrl) {
    el.href = CONFIG.mapsUrl;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
    el.removeAttribute('aria-disabled');
    el.setAttribute('role', 'link');
  } else {
    el.removeAttribute('href');
    el.setAttribute('aria-disabled', 'true');
  }
});

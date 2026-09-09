(function () {
'use strict';
document.querySelectorAll('svg:not([aria-label]):not([role])').forEach(function (svg) {
svg.setAttribute('aria-hidden', 'true');
});
var nav = document.getElementById('nav');
var hamburger = document.getElementById('hamburger');
var navLinks = document.getElementById('navLinks');
function updateNav() {
if (!nav) return;
if (window.scrollY > 60) {
nav.classList.add('scrolled');
} else {
nav.classList.remove('scrolled');
}
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();
if (hamburger && navLinks) {
hamburger.addEventListener('click', function () {
var isOpen = navLinks.classList.toggle('open');
hamburger.classList.toggle('active');
hamburger.setAttribute('aria-expanded', isOpen);
document.body.style.overflow = isOpen ? 'hidden' : '';
});
navLinks.querySelectorAll('a').forEach(function (link) {
link.addEventListener('click', function () {
navLinks.classList.remove('open');
hamburger.classList.remove('active');
hamburger.setAttribute('aria-expanded', 'false');
document.body.style.overflow = '';
});
});
}
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
link.addEventListener('click', function (e) {
var target = document.querySelector(this.getAttribute('href'));
if (target) {
e.preventDefault();
target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
});
});
var animateEls = document.querySelectorAll('[data-animate]');
if (animateEls.length > 0 && 'IntersectionObserver' in window) {
var observer = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
entry.target.classList.add('animate-in');
observer.unobserve(entry.target);
}
});
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
animateEls.forEach(function (el) { observer.observe(el); });
} else {
animateEls.forEach(function (el) { el.classList.add('animate-in'); });
}
var counterEls = document.querySelectorAll('[data-count]');
if (counterEls.length > 0 && 'IntersectionObserver' in window) {
var counterObserver = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
animateCounter(entry.target);
counterObserver.unobserve(entry.target);
}
});
}, { threshold: 0.5 });
counterEls.forEach(function (el) { counterObserver.observe(el); });
}
function animateCounter(el) {
var target = parseInt(el.getAttribute('data-count'));
var duration = 1500;
var start = 0;
var startTime = null;
function step(timestamp) {
if (!startTime) startTime = timestamp;
var progress = Math.min((timestamp - startTime) / duration, 1);
var eased = 1 - Math.pow(1 - progress, 3);
el.textContent = Math.floor(eased * target);
if (progress < 1) {
requestAnimationFrame(step);
} else {
el.textContent = target;
}
}
requestAnimationFrame(step);
}
document.querySelectorAll('[data-location]').forEach(function (btn) {
btn.addEventListener('click', function (e) {
e.preventDefault();
var locationId = this.getAttribute('data-location');
if (window.amanthosBooking && window.amanthosBooking.selectLocation) {
window.amanthosBooking.selectLocation(locationId);
}
var bookingBar = document.getElementById('bookingBar');
if (bookingBar) {
bookingBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
});
});
try {
var preselect = localStorage.getItem('preselect_location');
if (preselect) {
if (window.amanthosBooking && window.amanthosBooking.selectLocation) {
window.amanthosBooking.selectLocation(preselect);
}
localStorage.removeItem('preselect_location');
}
} catch (e) { /* Storage gesperrt: Private Mode, Cookie-Blocker */ }
/*
Entfernt am 09.09.2026: der Live-Ticker im Hero und die Buchungs-Einblendung.
Der Ticker wuerfelte Betrachterzahlen, Buchungen pro Tag und "nur noch N frei"
aus Math.random(); die Einblendung behauptete, eine namentlich genannte Person
habe gerade gebucht, aus einer Liste von 96 erfundenen Namen. Beides sind
erfundene Nachfrage- und Verknappungsangaben und damit nach UWG (CH) und
Richtlinie 2005/29/EG (EU) unzulaessig. Ersatzlos gestrichen, samt HTML,
Sprachschluesseln (Namensraeume ticker.*, toast.*) und CSS.
*/
var stickyCta = document.getElementById('stickyCta');
if (stickyCta) {
var heroSection = document.getElementById('hero');
function checkStickyCta() {
if (heroSection) {
var heroBottom = heroSection.getBoundingClientRect().bottom;
if (heroBottom < 0) {
stickyCta.classList.add('visible');
} else {
stickyCta.classList.remove('visible');
}
}
}
window.addEventListener('scroll', checkStickyCta, { passive: true });
checkStickyCta();
}
var gameSection = document.getElementById('game');
if (gameSection && 'IntersectionObserver' in window) {
var gameObserver = new IntersectionObserver(function (entries) {
if (entries[0].isIntersecting) {
var script = document.createElement('script');
var basePath = document.querySelector('script[src*="app.js"]');
var prefix = basePath ? basePath.src.replace(/js\/app\.js.*$/, '') : './';
script.src = prefix + 'js/game.js';
document.body.appendChild(script);
gameObserver.disconnect();
}
}, { rootMargin: '200px' });
gameObserver.observe(gameSection);
}
var chatToggle = document.getElementById('chatToggle');
if (chatToggle) {
chatToggle.addEventListener('click', function () {
toggleChat();
});
}
function trapFocus(container) {
var focusable = container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
if (focusable.length === 0) return;
var first = focusable[0];
var last = focusable[focusable.length - 1];
container.addEventListener('keydown', function (e) {
if (e.key === 'Tab') {
if (e.shiftKey) {
if (document.activeElement === first) { e.preventDefault(); last.focus(); }
} else {
if (document.activeElement === last) { e.preventDefault(); first.focus(); }
}
}
if (e.key === 'Escape') {
container.style.display = 'none';
if (container.id === 'chatPanel') {
var toggle = document.getElementById('chatToggle');
if (toggle) toggle.focus();
}
}
});
}
window.toggleChat = function () {
var panel = document.getElementById('chatPanel');
if (!panel) return;
var isVisible = panel.style.display !== 'none';
panel.style.display = isVisible ? 'none' : 'flex';
if (!isVisible) {
var input = document.getElementById('chatInput');
if (input) setTimeout(function () { input.focus(); }, 200);
trapFocus(panel);
}
};
var chatClose = document.getElementById('chatClose');
if (chatClose) {
chatClose.addEventListener('click', function () {
window.toggleChat();
});
}
var exitPopup = document.getElementById('exitPopup');
if (exitPopup) {
var exitShown = false;
document.addEventListener('mouseout', function (e) {
if (exitShown) return;
if (e.clientY < 5 && e.relatedTarget == null) {
exitShown = true;
// Das Fenster zeigte hier drei gewuerfelte Zahlen (Suchende, heutige Buchungen,
// freie Apartments). Sie sind am 09.09.2026 entfallen, der Inhalt steht jetzt
// fest im HTML und ist auf der Seite belegt. Das Fenster selbst bleibt.
exitPopup.style.display = 'block';
var exitContent = exitPopup.querySelector('.exit-popup-content');
if (exitContent) {
trapFocus(exitPopup);
var closeBtn = exitPopup.querySelector('.exit-popup-close');
if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 100);
}
sessionStorage.setItem('exitShown', '1');
}
});
if (sessionStorage.getItem('exitShown')) {
exitShown = true;
}
}
/*
Ebenfalls am 09.09.2026 entfernt: die Leiste unter dem Kostenvergleich
(angeblich Vergleichende, angeblich letzte Buchung) und die Verknappungsleiste
unter dem Titelbild (gebuchte Apartments in 24h, "nur noch N frei"). Alle fuenf
Zahlen kamen aus Math.random(), keine davon aus dem PMS. Dazu die Sprachschluessel
fomo.* und urgency_banner.* in allen sieben Sprachdateien.
*/
document.querySelectorAll('[data-scroll-to]').forEach(function (el) {
el.addEventListener('click', function (e) {
var targetId = this.getAttribute('data-scroll-to');
var target = document.getElementById(targetId);
if (target) {
e.preventDefault();
target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
});
});
document.querySelectorAll('[data-close-popup]').forEach(function (el) {
el.addEventListener('click', function () {
var popupId = this.getAttribute('data-close-popup');
var popup = document.getElementById(popupId);
if (popup) {
popup.style.display = 'none';
popup.setAttribute('aria-hidden', 'true');
}
});
});
if (!hamburger && document.querySelector('.hamburger')) {
var locHamburger = document.querySelector('.hamburger');
var locNavLinks = document.querySelector('.nav-links');
if (locHamburger && locNavLinks) {
locHamburger.addEventListener('click', function () {
var isOpen = locNavLinks.classList.toggle('open');
locHamburger.classList.toggle('active');
locHamburger.setAttribute('aria-expanded', isOpen);
document.body.style.overflow = isOpen ? 'hidden' : '';
});
locNavLinks.querySelectorAll('a').forEach(function (link) {
link.addEventListener('click', function () {
locNavLinks.classList.remove('open');
locHamburger.classList.remove('active');
locHamburger.setAttribute('aria-expanded', 'false');
document.body.style.overflow = '';
});
});
}
}
})();
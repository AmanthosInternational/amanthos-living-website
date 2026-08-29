/**
 * Sentry browser telemetry — Amanthos Living (www.amanthosliving.com)
 *
 * Loaded from the CDN bundle rather than the Loader script: the org lives in
 * Sentry's EU region, and keeping the whole configuration here means sampling
 * rates and privacy settings are reviewable in git instead of hidden behind a
 * dashboard toggle. The bundle is pinned to an exact version and guarded by an
 * SRI hash, so a compromised CDN cannot execute anything on these pages. The one
 * exception is the replay chunk further down: the SDK injects it itself, without an
 * integrity attribute, so that single file is version-pinned but not hash-pinned.
 *
 * Both script tags are `defer`, and this file is ordered before the site's own
 * scripts. Deferred scripts run in document order, so Sentry is initialised
 * before app.js/booking.js and catches their errors, without blocking render.
 */
(function () {
  // The bundle is blocked by common ad blockers. Without this guard that turns
  // into a ReferenceError on every such visit — noise in the console of exactly
  // the users we cannot observe anyway.
  if (typeof Sentry === 'undefined') return;

  // Never report from a local test server. On 29.08.2026 two runs against
  // 127.0.0.1, serving a copy of this site to reproduce a storage bug, created
  // two real issues in the production project. The DSN ships inside the page, so
  // any copy of it reports as production unless this guard stops it.
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname)) return;

  Sentry.init({
    dsn: 'https://3bd21c8c41472fd79d39b47a16bf7fcc@o4511372064915456.ingest.de.sentry.io/4511927219126352',
    environment: 'production',

    // No IP addresses, no cookies, no request bodies. Guest data must not leave
    // the browser; the point of this instrumentation is broken code, not people.
    sendDefaultPii: false,

    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Core Web Vitals and page load timings. 10% is enough to see trends on a
    // marketing site and keeps well inside the org's event quota.
    tracesSampleRate: 0.1,

    // DELIBERATELY EMPTY — do not add the API hosts here without changing them
    // first. Trace propagation adds `sentry-trace` and `baggage` headers to
    // outgoing requests. Measured 2026-08-17: the booking API answers the CORS
    // preflight with `Access-Control-Allow-Headers: Content-Type, X-API-Key,
    // Authorization`. Neither header is on that list, so the browser would
    // reject the preflight and the availability call would fail — the booking
    // funnel would break to gain a trace. Connecting browser and backend traces
    // requires allowing both headers server-side first.
    tracePropagationTargets: [],

    // Record a replay only when something actually broke: no blanket recording
    // of every visitor, and the material that matters (what the guest did
    // before the booking failed) is still captured. Raise the session rate only
    // together with the cookie banner and the privacy policy. Both are root
    // options and are read by the replay integration that is added lazily below,
    // so they have to stay here even though the integration is no longer in the
    // list above.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Noise that is not our code and cannot be fixed by us. Left unfiltered,
    // these bury the real errors — the same failure mode that made 559 of 673
    // events in this org a single client disconnect (fixed 2026-08-17).
    ignoreErrors: [
      // Benign browser layout notice, fires on healthy pages.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Browser extensions and injected scripts.
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Network hiccups on the visitor's side, not a defect of the site.
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'Load failed',
      // Safari/iOS quirks with no actionable stack.
      'Non-Error promise rejection captured',
      // Extensions that inject into the page. Their frames carry our document
      // URL, so denyUrls never sees them; only the message identifies them.
      /Invalid call to runtime\.sendMessage/,
      /xbrowser is not defined/,
    ],

    // Google Translate rewrites the page and runs its own minified bundle. Sentry
    // attributes those frames to the document URL, not to a Google origin, so
    // denyUrls cannot reach them: reports arrive as "/zurich/:226:382 in Gk"
    // while that line is plain HTML of the booking bar. Two landed here, a
    // RangeError on 29.08.2026 and a truncated "Error: Ca" on chalet-swiss.ch,
    // both with a breadcrumb clicking "a > font > font", the <font> tags
    // Translate injects.
    //
    // The trade-off is deliberate: while a page is translated its DOM is no
    // longer ours, so an error raised in it cannot be attributed to our code
    // with any confidence. Dropping the whole class is better than a stream of
    // reports nobody can act on. Translate marks the document itself, which is
    // what this reads.
    beforeSend: function (event) {
      var wurzel = document.documentElement;
      if (wurzel && /(^|\s)translated-(ltr|rtl)(\s|$)/.test(wurzel.className || '')) {
        return null;
      }
      return event;
    },

    denyUrls: [
      // Third-party tags: their errors belong to their owners, not to us.
      /googletagmanager\.com/,
      /google-analytics\.com/,
      /gstatic\.com/,
      /extensions\//,
      /^chrome:\/\//,
    ],
  });

  // Replay wiegt 150 KB (der Chunk kommt unkomprimiert vom CDN) und ist nur fuer
  // die Buchungsstrecke wertvoll (Analyse von Buchungsabbruechen). Er laedt deshalb
  // erst bei der ersten Interaktion mit der Buchungsleiste, nicht bei jedem
  // Seitenaufruf. Auf Unterseiten ohne #bookingBar laedt er nie — gewollt.
  //
  // Der schlanke Bundle bringt einen Platzhalter namens replayIntegration mit, der
  // nur warnt und nichts tut. lazyLoadIntegration() gibt einen vorhandenen Export
  // unveraendert zurueck, sofern er nicht das Flag _isShim traegt — und im Bundle
  // 10.68.0 traegt nur der Feedback-Platzhalter dieses Flag, der Replay-Platzhalter
  // nicht (am 21.08.2026 im heruntergeladenen Bundle nachgesehen). Ohne die naechsten
  // Zeilen laedt replay.min.js also nie, und die Konsole meldet lediglich "You are
  // using replayIntegration() even though this bundle does not include replay."
  // Der Platzhalter wird deshalb vorher entfernt, aber nur wenn er nachweislich
  // einer ist: replayIntegration da, getReplay nicht. Wird hier spaeter wieder ein
  // Bundle mit echtem Replay eingebunden, tut die Zeile nichts.
  var replayArmed = false;
  function armReplay() {
    if (replayArmed) return;
    replayArmed = true;
    if (typeof Sentry.replayIntegration === 'function' && typeof Sentry.getReplay !== 'function') {
      delete Sentry.replayIntegration;
    }
    Sentry.lazyLoadIntegration('replayIntegration').then(function (replayIntegration) {
      Sentry.addIntegration(replayIntegration({
        // All three default to true — set explicitly so the privacy posture is
        // stated in the file rather than inherited silently.
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }));
    }).catch(function () {
      // Adblocker oder Netzproblem: Replay entfaellt, Fehler-Reporting laeuft weiter.
    });
  }
  var bookingBar = document.getElementById('bookingBar');
  if (bookingBar) {
    ['focusin', 'pointerdown'].forEach(function (t) {
      bookingBar.addEventListener(t, armReplay, { once: true, passive: true });
    });
  }

  // Which of the four sites an event came from, without relying on the URL.
  Sentry.setTag('site', 'amanthos-living-website');
})();

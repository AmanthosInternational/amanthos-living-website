#!/usr/bin/env python3
"""Test-Harness fuer die Deep-Link-Pruefung im Browser (Kontrakt K7).

Serviert das Repo-Verzeichnis und schreibt beim Ausliefern ausschliesslich im
Speicher um: API-Host auf die gleiche Origin, Script-Tag fuer deeplink.js vor
booking.js, gtag-Stub mit window.__gtagCalls. Beantwortet /health, /api/offers
aus tests/fixtures/offers-<code>.json und /api/bookings synthetisch. Legt nie
eine Datei an und ist kein Produktivcode. Aufruf: python3 tests/dev-server.py [port]
"""
import json
import os
import sys
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES = os.path.join(ROOT, "tests", "fixtures")
LIVE_API = "https://amanthos-website-api.onrender.com"
BOOKING_TAG = '<script src="./js/booking.js" defer></script>'
HARNESS = (
    "<script>"
    "(function(){var prev=window.gtag;window.__gtagCalls=[];"
    "window.gtag=function(){window.__gtagCalls.push(Array.prototype.slice.call(arguments));"
    "if(prev){try{prev.apply(null,arguments);}catch(e){}}};"
    "if(location.search.indexOf('fixture=empty')!==-1){var f=window.fetch;"
    "window.fetch=function(u,o){"
    "return f(typeof u==='string'&&u.indexOf('/api/offers')!==-1?u+'&fixture=empty':u,o);};}"
    "})();</script>\n"
    '  <script src="./js/deeplink.js" defer></script>\n  '
)


def read(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as handle:
        return handle.read()


class Harness(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        pass  # zu laut; interessant ist allein der Buchungs-Body unten

    def _json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _text(self, body, ctype):
        raw = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        if parsed.path == "/health":
            return self._json({"status": "ok"})
        if parsed.path == "/api/offers":
            return self._offers(query)
        if parsed.path in ("/", "/index.html"):
            html = read(ROOT, "index.html").replace(BOOKING_TAG, HARNESS + BOOKING_TAG, 1)
            return self._text(html, "text/html; charset=utf-8")
        if parsed.path == "/js/booking.js":
            src = read(ROOT, "js", "booking.js").replace(LIVE_API, "")
            return self._text(src, "application/javascript; charset=utf-8")
        return super().do_GET()

    def _offers(self, query):
        code = (query.get("propertyId") or [""])[0]
        path = os.path.join(FIXTURES, "offers-%s.json" % code.lower())
        data = json.loads(read(path)) if os.path.exists(path) else {"offers": []}
        data["property"] = code.upper()
        data["propertyName"] = data.get("propertyName", code.upper())
        data["arrival"] = (query.get("arrival") or [data.get("arrival", "")])[0]
        data["departure"] = (query.get("departure") or [data.get("departure", "")])[0]
        data["adults"] = int((query.get("adults") or ["2"])[0])
        try:
            data["nights"] = (
                date.fromisoformat(data["departure"]) - date.fromisoformat(data["arrival"])
            ).days
        except ValueError:
            data["nights"] = 1
        if "empty" in query.get("fixture", []):
            data["offers"] = []
        return self._json(data)

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        if urlparse(self.path).path != "/api/bookings":
            return self._json({"error": "unbekannter Pfad"}, 404)
        print("BOOKING-BODY " + raw, flush=True)
        try:
            property_id = json.loads(raw).get("propertyId", "")
        except ValueError:
            property_id = ""
        return self._json({
            "success": True,
            "confirmationId": "TEST-0001",
            "reservationId": "TEST-RES-0001",
            "propertyId": property_id,
            "paymentRequired": False,
        })


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print("Harness auf http://localhost:%d (Repo %s)" % (port, ROOT), flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Harness).serve_forever()

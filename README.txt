KRVAVÝ GRIMOÁR – webový prototyp 0.2

Soubory:
- index.html
- styles.css
- data.js   (obsah, GPS, pečetě, nápovědy)
- app.js    (logika hry)
- assets/dulni_bludiste.png

Co je nové ve 0.2:
- gotičtější typografie hlavních nadpisů (Google Fonts s bezpečným fallbackem),
- výraznější pergamenová grafika a ornamentální členění,
- nenápadná možnost přeskočit GPS: „GPS stávkuje? Jděte k úkolu.",
- rozcestník používá návodná hesla místo latinských názvů etap,
- hra počítá 8 indicií: 1 úvodní šifra + 7 pečetí,
- finále se odemkne až po označení úvodní indicie a získání všech 7 pečetí.

Spuštění:
1) Pro běžné prohlížení lze otevřít index.html.
2) GPS v mobilním prohlížeči vyžaduje HTTPS (nebo localhost).
3) Nejjednodušší publikace: GitHub Pages / Netlify / školní webserver s HTTPS.

DŮLEŽITÉ:
- GPS souřadnice jsou v data.js a před ostrou hrou je doporučuji ověřit na místě.
- Ruthardtka má GPS záměrně vypnutou.
- U lapků je finální ověřovací kód ponechán k doplnění těsně před hrou.
- Některé pečetě jsou zatím označeny ? – doplňte finální kombinace.
- U alchymistů je zatím textová značka pro vložení stereogramu.
- Úvodní šifra „21 – I“ se v této verzi jen označí jako zapsaná; její automatickou kontrolu doplníme, až bude definitivně potvrzen její očekávaný výsledek.

Herní logika:
- stanoviště s GPS se odemkne po ověření polohy nebo po nouzovém přeskočení GPS,
- po špatné odpovědi se zobrazí nápověda,
- úspěch se ukládá do localStorage zařízení,
- finále se odemkne po získání všech 8 indicií.

Ich möchte ein neues Feature "Garten" zu unserer Familien-App hinzufügen.

## Ziel
Eine Gartenübersicht, die mir sagt wann ich was tun muss, was ich schon getan habe,
und mir hilft aus vergangenen Saisons zu lernen.

## Kern-Features

**1. Meine Pflanzen**
- Pflanze hinzufügen (Name, Sorte, Anzuchtmethode: Voranzucht oder Direktaussaat)
- Integration mit der OpenFarm API (https://openfarm.cc/api/v1) um automatisch
  Aussaatzeiten, Pflanzabstände und Pflegehinweise zu laden
- Manuelle Überschreibung aller API-Daten möglich

**2. Kalender / Zeitplan**
- Automatisch generierte Ereignisse pro Pflanze:
  - Aussaat innen (Voranzucht)
  - Pikieren
  - Direktaussaat
  - Auspflanzen (Eisheilige: 15. Mai als fest eingebetteter Stichtag)
  - Ernte-Zeitraum
- Timeline- oder Listenansicht nach Monat filterbar

**3. Todos**
- Automatisch aus dem Kalender generierte Aufgaben ("Diese Woche: Tomaten pikieren")
- Als erledig markierbar
- Integration in das bestehende Todo-System der App (falls vorhanden)

**4. Beetverwaltung**
- Beete anlegen (Name, Größe optional)
- Pflanzen einem Beet zuweisen
- Übersicht: welches Beet ist womit bepflanzt

**5. Gartentagebuch (Learnings)**
- Pro Pflanze oder pro Saison: kurze Notiz hinterlassen
- Einfache Bewertung (hat geklappt / hat nicht geklappt)
- Einträge aus Vorjahren tauchen beim nächsten Jahr wieder auf als Erinnerung

## OpenFarm API
- Base URL: https://openfarm.cc/api/v1/crops?filter=<Pflanzenname>
- Kostenlos, kein API-Key nötig
- Relevante Felder: name, description, sun_requirements, sowing_method,
  spread, row_spacing, height, growing_degree_days

## Wichtige Details
- Eisheiligen (11.–15. Mai) als fester Orientierungspunkt im Kalender einbauen
- Alle Zeitangaben relativ zum aktuellen Jahr berechnen
- Daten lokal persistieren (offline-fähig)
- Das Feature soll sich nahtlos in die bestehende App-Struktur einfügen

Bitte fang mit dem Datenmodell und der Grundstruktur an, dann bauen wir
Feature für Feature auf.
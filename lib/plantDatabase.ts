// Static plant database — replaces the defunct OpenFarm API (openfarm.cc is down).
// Format mirrors the OpenFarm API response so PlantsTab.tsx needs no changes.

export interface PlantEntry {
  id: string
  attributes: {
    name: string
    slug: string
    description: string | null
    sun_requirements: string | null
    sowing_method: string | null
    spread: number | null
    row_spacing: number | null
    height: number | null
    growing_degree_days: number | null
    harvest_days?: number | null
  }
}

const PLANTS: PlantEntry[] = [
  { id: "tomate", attributes: { name: "Tomate", slug: "tomate", description: "Beliebtes Sommergemüse, wärmeliebend.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 60, row_spacing: 50, height: 150, growing_degree_days: 1050 } },
  { id: "cherry-tomate", attributes: { name: "Cherrytomate", slug: "cherry-tomate", description: "Kleinfrüchtige Tomatenart, sehr produktiv.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 50, row_spacing: 50, height: 180, growing_degree_days: 900 } },
  { id: "gurke", attributes: { name: "Gurke", slug: "gurke", description: "Wärmeliebende Kletterpflanze.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 50, row_spacing: 60, height: 200, growing_degree_days: 750 } },
  { id: "zucchini", attributes: { name: "Zucchini", slug: "zucchini", description: "Sehr ertragreiche Sommerkürbisart.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat oder Voranzucht", spread: 80, row_spacing: 80, height: 60, growing_degree_days: 600 } },
  { id: "paprika", attributes: { name: "Paprika", slug: "paprika", description: "Wärmeliebend, lange Anzuchtzeit.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 50, row_spacing: 45, height: 70, growing_degree_days: 1200 } },
  { id: "aubergine", attributes: { name: "Aubergine", slug: "aubergine", description: "Sehr wärmeliebend, für geschützte Standorte.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 50, row_spacing: 50, height: 80, growing_degree_days: 1350 } },
  { id: "salat", attributes: { name: "Kopfsalat", slug: "salat", description: "Schnell wachsend, auch für Halbschatten geeignet.", sun_requirements: "Halbschatten bis Sonne", sowing_method: "Direktsaat", spread: 30, row_spacing: 25, height: 20, growing_degree_days: 450 } },
  { id: "pflücksalat", attributes: { name: "Pflücksalat", slug: "pflücksalat", description: "Blätter können einzeln geerntet werden.", sun_requirements: "Halbschatten bis Sonne", sowing_method: "Direktsaat", spread: 25, row_spacing: 20, height: 20, growing_degree_days: 360 } },
  { id: "spinat", attributes: { name: "Spinat", slug: "spinat", description: "Kältetolerantes Blattgemüse, schießt im Sommer schnell.", sun_requirements: "Halbschatten", sowing_method: "Direktsaat", spread: 20, row_spacing: 20, height: 30, growing_degree_days: 360 } },
  { id: "mangold", attributes: { name: "Mangold", slug: "mangold", description: "Robustes Blattgemüse, über Monate erntebar.", sun_requirements: "Sonne bis Halbschatten", sowing_method: "Direktsaat", spread: 40, row_spacing: 30, height: 50, growing_degree_days: 600 } },
  { id: "karotte", attributes: { name: "Karotte / Möhre", slug: "karotte", description: "Tiefe, lockere Erde bevorzugt.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 10, row_spacing: 15, height: 30, growing_degree_days: 1050 } },
  { id: "radieschen", attributes: { name: "Radieschen", slug: "radieschen", description: "Sehr schnell wachsend, ideal zum Lückenfüllen.", sun_requirements: "Sonne bis Halbschatten", sowing_method: "Direktsaat", spread: 10, row_spacing: 8, height: 15, growing_degree_days: 270 } },
  { id: "rettich", attributes: { name: "Rettich", slug: "rettich", description: "Größere Wurzel als Radieschen, kräftiger Geschmack.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 20, row_spacing: 20, height: 30, growing_degree_days: 450 } },
  { id: "erbse", attributes: { name: "Erbse", slug: "erbse", description: "Kühle Temperaturen bevorzugt, früh säen.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 15, row_spacing: 10, height: 120, growing_degree_days: 675 } },
  { id: "buschbohne", attributes: { name: "Buschbohne", slug: "buschbohne", description: "Wärmeliebend, ab Mai säen.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 25, row_spacing: 20, height: 40, growing_degree_days: 750 } },
  { id: "stangenbohne", attributes: { name: "Stangenbohne", slug: "stangenbohne", description: "Kletterpflanze, braucht Stützgerüst.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 30, row_spacing: 50, height: 250, growing_degree_days: 825 } },
  { id: "brokkoli", attributes: { name: "Brokkoli", slug: "brokkoli", description: "Kühles Klima bevorzugt, Herbstanbau gut geeignet.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 50, row_spacing: 50, height: 60, growing_degree_days: 900 } },
  { id: "blumenkohl", attributes: { name: "Blumenkohl", slug: "blumenkohl", description: "Gleichmäßige Feuchtigkeit wichtig.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 50, row_spacing: 50, height: 50, growing_degree_days: 1050 } },
  { id: "kohlrabi", attributes: { name: "Kohlrabi", slug: "kohlrabi", description: "Schnell wachsend, mehrere Sätze möglich.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat oder Voranzucht", spread: 25, row_spacing: 25, height: 40, growing_degree_days: 540 } },
  { id: "kürbis", attributes: { name: "Kürbis", slug: "kürbis", description: "Braucht viel Platz und Nährstoffe.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 150, row_spacing: 150, height: 40, growing_degree_days: 1050 } },
  { id: "zwiebel", attributes: { name: "Zwiebel", slug: "zwiebel", description: "Steckzwiebeln oder Aussaat ab März.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 15, row_spacing: 15, height: 40, growing_degree_days: 900 } },
  { id: "knoblauch", attributes: { name: "Knoblauch", slug: "knoblauch", description: "Herbst- oder Frühjahrspflanzung.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 15, row_spacing: 15, height: 50, growing_degree_days: 900 } },
  { id: "erdbeere", attributes: { name: "Erdbeere", slug: "erdbeere", description: "Staude, erste Ernte meist im zweiten Jahr.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht oder Setzlinge", spread: 30, row_spacing: 30, height: 20, growing_degree_days: null } },
  { id: "basilikum", attributes: { name: "Basilikum", slug: "basilikum", description: "Sehr wärmeliebend, nicht zu gießen.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht drinnen", spread: 20, row_spacing: 20, height: 30, growing_degree_days: 450 } },
  { id: "petersilie", attributes: { name: "Petersilie", slug: "petersilie", description: "Langsam keimend, früh säen.", sun_requirements: "Sonne bis Halbschatten", sowing_method: "Direktsaat", spread: 20, row_spacing: 20, height: 40, growing_degree_days: 600 } },
  { id: "schnittlauch", attributes: { name: "Schnittlauch", slug: "schnittlauch", description: "Ausdauernde Staude, sehr pflegeleicht.", sun_requirements: "Sonne bis Halbschatten", sowing_method: "Direktsaat", spread: 20, row_spacing: 20, height: 30, growing_degree_days: null } },
  { id: "dill", attributes: { name: "Dill", slug: "dill", description: "Direktsaat, nicht verpflanzen.", sun_requirements: "Vollsonne", sowing_method: "Direktsaat", spread: 20, row_spacing: 20, height: 100, growing_degree_days: 450 } },
  { id: "koriander", attributes: { name: "Koriander", slug: "koriander", description: "Schießt bei Wärme schnell, besser Herbstanbau.", sun_requirements: "Sonne", sowing_method: "Direktsaat", spread: 20, row_spacing: 20, height: 50, growing_degree_days: 450 } },
  { id: "thymian", attributes: { name: "Thymian", slug: "thymian", description: "Winterharte Staude, trockenheitsresistent.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht oder Direktsaat", spread: 30, row_spacing: 25, height: 25, growing_degree_days: null } },
  { id: "rosmarin", attributes: { name: "Rosmarin", slug: "rosmarin", description: "Mediterrane Staude, braucht Winterschutz.", sun_requirements: "Vollsonne", sowing_method: "Voranzucht oder Stecklinge", spread: 60, row_spacing: 60, height: 80, growing_degree_days: null } },
]

export function searchPlants(query: string): PlantEntry[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return PLANTS.filter(p =>
    p.attributes.name.toLowerCase().includes(q) ||
    p.id.toLowerCase().includes(q)
  ).slice(0, 8)
}

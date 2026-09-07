import type { VocabPair } from "./pairs-context";

// The same 50 everyday-noun concepts used for sample-vocab-lists/*/vocab-50.txt,
// aligned by index across all three supported languages — lets a starter list
// be built for ANY pair among them (e.g. Spanish -> French), not just pairs
// that happen to include English.
const CONCEPTS: { English: string; Spanish: string; French: string }[] = [
  { English: "house", Spanish: "casa", French: "maison" },
  { English: "dog", Spanish: "perro", French: "chien" },
  { English: "cat", Spanish: "gato", French: "chat" },
  { English: "book", Spanish: "libro", French: "livre" },
  { English: "table", Spanish: "mesa", French: "table" },
  { English: "chair", Spanish: "silla", French: "chaise" },
  { English: "water", Spanish: "agua", French: "eau" },
  { English: "food", Spanish: "comida", French: "nourriture" },
  { English: "school", Spanish: "escuela", French: "école" },
  { English: "friend", Spanish: "amigo", French: "ami" },
  { English: "family", Spanish: "familia", French: "famille" },
  { English: "car", Spanish: "carro", French: "voiture" },
  { English: "city", Spanish: "ciudad", French: "ville" },
  { English: "country", Spanish: "país", French: "pays" },
  { English: "day", Spanish: "día", French: "jour" },
  { English: "night", Spanish: "noche", French: "nuit" },
  { English: "week", Spanish: "semana", French: "semaine" },
  { English: "month", Spanish: "mes", French: "mois" },
  { English: "year", Spanish: "año", French: "année" },
  { English: "money", Spanish: "dinero", French: "argent" },
  { English: "job", Spanish: "trabajo", French: "travail" },
  { English: "door", Spanish: "puerta", French: "porte" },
  { English: "window", Spanish: "ventana", French: "fenêtre" },
  { English: "street", Spanish: "calle", French: "rue" },
  { English: "park", Spanish: "parque", French: "parc" },
  { English: "beach", Spanish: "playa", French: "plage" },
  { English: "mountain", Spanish: "montaña", French: "montagne" },
  { English: "river", Spanish: "río", French: "rivière" },
  { English: "sea", Spanish: "mar", French: "mer" },
  { English: "sky", Spanish: "cielo", French: "ciel" },
  { English: "sun", Spanish: "sol", French: "soleil" },
  { English: "moon", Spanish: "luna", French: "lune" },
  { English: "star", Spanish: "estrella", French: "étoile" },
  { English: "tree", Spanish: "árbol", French: "arbre" },
  { English: "flower", Spanish: "flor", French: "fleur" },
  { English: "fruit", Spanish: "fruta", French: "fruit" },
  { English: "apple", Spanish: "manzana", French: "pomme" },
  { English: "bread", Spanish: "pan", French: "pain" },
  { English: "milk", Spanish: "leche", French: "lait" },
  { English: "coffee", Spanish: "café", French: "café" },
  { English: "egg", Spanish: "huevo", French: "œuf" },
  { English: "meat", Spanish: "carne", French: "viande" },
  { English: "fish", Spanish: "pescado", French: "poisson" },
  { English: "clothing", Spanish: "ropa", French: "vêtements" },
  { English: "shoe", Spanish: "zapato", French: "chaussure" },
  { English: "hat", Spanish: "sombrero", French: "chapeau" },
  { English: "shirt", Spanish: "camisa", French: "chemise" },
  { English: "clock", Spanish: "reloj", French: "horloge" },
  { English: "bridge", Spanish: "puente", French: "pont" },
  { English: "garden", Spanish: "jardín", French: "jardin" },
];

type StarterLanguage = keyof (typeof CONCEPTS)[number];

// Returns 50 starter pairs for any language pair covered by CONCEPTS, or
// null if either language isn't covered (LANGUAGES currently only has
// English/Spanish/French, all covered) or source/target are the same.
export function getStarterPairs(sourceLanguage: string, targetLanguage: string): VocabPair[] | null {
  const source = sourceLanguage as StarterLanguage;
  const target = targetLanguage as StarterLanguage;
  if (source === target) return null;
  if (!CONCEPTS[0][source] || !CONCEPTS[0][target]) return null;

  return CONCEPTS.map((concept) => ({
    "source word": concept[source],
    "target word": concept[target],
  }));
}

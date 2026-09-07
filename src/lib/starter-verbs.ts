import type { VocabPair } from "./pairs-context";

// The same 50 verb concepts used for sample-vocab-lists/*/verbs-50.txt,
// aligned by index across all three supported languages — mirrors
// starter-vocab.ts's approach so a starter verb list can be built for ANY
// pair among the three (e.g. Spanish -> French), not just pairs that
// happen to include English. English holds the "to X" infinitive gloss;
// Spanish/French hold bare infinitives (no separate particle needed).
const CONCEPTS: { English: string; Spanish: string; French: string }[] = [
  { English: "to speak", Spanish: "hablar", French: "parler" },
  { English: "to eat", Spanish: "comer", French: "manger" },
  { English: "to live", Spanish: "vivir", French: "vivre" },
  { English: "to have", Spanish: "tener", French: "avoir" },
  { English: "to do", Spanish: "hacer", French: "faire" },
  { English: "to go", Spanish: "ir", French: "aller" },
  { English: "to be", Spanish: "ser", French: "être" },
  { English: "to be", Spanish: "estar", French: "être" },
  { English: "to be able to", Spanish: "poder", French: "pouvoir" },
  { English: "to want", Spanish: "querer", French: "vouloir" },
  { English: "to say", Spanish: "decir", French: "dire" },
  { English: "to see", Spanish: "ver", French: "voir" },
  { English: "to give", Spanish: "dar", French: "donner" },
  { English: "to know", Spanish: "saber", French: "savoir" },
  { English: "to come", Spanish: "venir", French: "venir" },
  { English: "to leave", Spanish: "salir", French: "partir" },
  { English: "to put", Spanish: "poner", French: "mettre" },
  { English: "to think", Spanish: "pensar", French: "penser" },
  { English: "to find", Spanish: "encontrar", French: "trouver" },
  { English: "to arrive", Spanish: "llegar", French: "arriver" },
  { English: "to happen", Spanish: "pasar", French: "se passer" },
  { English: "to owe", Spanish: "deber", French: "devoir" },
  { English: "to follow", Spanish: "seguir", French: "suivre" },
  { English: "to feel", Spanish: "sentir", French: "sentir" },
  { English: "to return", Spanish: "volver", French: "retourner" },
  { English: "to take", Spanish: "tomar", French: "prendre" },
  { English: "to know a person", Spanish: "conocer", French: "connaître" },
  { English: "to carry", Spanish: "llevar", French: "porter" },
  { English: "to leave something", Spanish: "dejar", French: "laisser" },
  { English: "to call", Spanish: "llamar", French: "appeler" },
  { English: "to understand", Spanish: "entender", French: "comprendre" },
  { English: "to ask for", Spanish: "pedir", French: "demander" },
  { English: "to receive", Spanish: "recibir", French: "recevoir" },
  { English: "to show", Spanish: "mostrar", French: "montrer" },
  { English: "to create", Spanish: "crear", French: "créer" },
  { English: "to work", Spanish: "trabajar", French: "travailler" },
  { English: "to study", Spanish: "estudiar", French: "étudier" },
  { English: "to write", Spanish: "escribir", French: "écrire" },
  { English: "to read", Spanish: "leer", French: "lire" },
  { English: "to play", Spanish: "jugar", French: "jouer" },
  { English: "to run", Spanish: "correr", French: "courir" },
  { English: "to walk", Spanish: "caminar", French: "marcher" },
  { English: "to sleep", Spanish: "dormir", French: "dormir" },
  { English: "to wake up", Spanish: "despertar", French: "se réveiller" },
  { English: "to begin", Spanish: "empezar", French: "commencer" },
  { English: "to finish", Spanish: "terminar", French: "finir" },
  { English: "to open", Spanish: "abrir", French: "ouvrir" },
  { English: "to close", Spanish: "cerrar", French: "fermer" },
  { English: "to buy", Spanish: "comprar", French: "acheter" },
  { English: "to sell", Spanish: "vender", French: "vendre" },
];

type StarterLanguage = keyof (typeof CONCEPTS)[number];

// Returns 50 starter verb pairs for any language pair covered by CONCEPTS,
// or null if either language isn't covered or source/target are the same.
export function getStarterVerbPairs(sourceLanguage: string, targetLanguage: string): VocabPair[] | null {
  const source = sourceLanguage as StarterLanguage;
  const target = targetLanguage as StarterLanguage;
  if (source === target) return null;
  if (!CONCEPTS[0][source] || !CONCEPTS[0][target]) return null;

  return CONCEPTS.map((concept) => ({
    "source word": concept[source],
    "target word": concept[target],
  }));
}

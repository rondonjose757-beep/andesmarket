// Tono visual y frase de cada departamento. Solo presentación: los tonos se
// definen en index.css (.tone-*) y no alteran datos ni filtros.
const TONES = ['durazno', 'cielo', 'lavanda', 'mantequilla', 'rosa', 'menta', 'arena']

const RULES = [
  [/abarrote|despensa|harina|arroz|pasta|grano/i, 'mantequilla', 'Lo básico de tu despensa.'],
  [/bebida|refresco|jugo|agua|licor|cerveza/i, 'cielo', 'Algo frío para cada momento.'],
  [/l[aá]cteo|leche|yogur|queso/i, 'rosa', 'Cremosos y ricos, como te gustan.'],
  [/limpieza|hogar|detergente/i, 'menta', 'Tu casa, reluciente.'],
  [/cuidado|personal|higiene|belleza/i, 'lavanda', 'Para cuidarte todos los días.'],
  [/snack|dulce|golosina|galleta|chuche/i, 'durazno', 'Un antojo siempre a mano.'],
  [/fruta|verdura|vegetal/i, 'menta', 'Color y sabor para tu mesa.'],
  [/carne|charcuter|embutido|pollo|pescado/i, 'durazno', 'Para tus mejores recetas.'],
  [/\bpan\b|panader|reposter/i, 'arena', 'Para acompañar cada comida.'],
  [/congelad|helado/i, 'cielo', 'Listo en tu congelador.'],
  [/mascota/i, 'arena', 'Para los consentidos de la casa.'],
  [/beb[eé]|infantil/i, 'lavanda', 'Todo para los más pequeños.'],
]

function hash(text) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

export function categoryLook(name = '') {
  const rule = RULES.find(([pattern]) => pattern.test(name))
  if (rule) return { tone: rule[1], caption: rule[2] }
  return { tone: TONES[hash(name) % TONES.length], caption: 'Todo lo que necesitas, en un solo lugar.' }
}

export function productTone(product) {
  return product?.category ? categoryLook(product.category.name).tone : 'menta'
}

export const BUSINESS_PHONE_LABEL = '0412-2636533'
export const BUSINESS_PHONE_HREF = 'tel:+584122636533'
export const BUSINESS_INSTAGRAM_URL = 'https://www.instagram.com/andesmarket.app/'

function whatsappUrl(message) {
  return `https://wa.me/584122636533?text=${encodeURIComponent(message)}`
}

export const CONTACT_WHATSAPP_URL = whatsappUrl('Hola, quisiera hacer una consulta sobre AndesMarket.')
export const ORDER_HELP_WHATSAPP_URL = whatsappUrl('Hola, necesito ayuda para hacer un pedido en AndesMarket.')

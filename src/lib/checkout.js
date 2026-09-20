import { supabase } from './supabaseClient'

export async function submitOrder({ customerId, name, phone, sectorId, address, instructions, googleMapsUrl, items }) {
  const payload = {
    customer_id: customerId,
    name,
    phone,
    sector_id: sectorId,
    address,
    instructions: instructions ?? null,
    google_maps_url: googleMapsUrl ?? null,
    items: items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  }

  const { data: order, error } = await supabase.rpc('create_delivery_order', { payload }).single()

  if (error) throw error

  return order
}

import { supabase } from './supabaseClient'

export async function submitOrder({ customerId, orderType, address, items }) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      order_type: orderType,
      address: orderType === 'delivery' ? address?.trim() || null : null,
    })
    .select()
    .single()

  if (orderError) throw orderError

  const rows = items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(rows)
  if (itemsError) throw itemsError

  return order
}

-- Verify order items exist and are properly linked
SELECT
  o.id as order_id,
  o.created_at as order_created,
  s.name as stall_name,
  s.image_url as stall_image,
  oi.id as order_item_id,
  oi.quantity,
  mi.id as menu_item_id,
  mi.name as menu_item_name
FROM orders o
LEFT JOIN stalls s ON o.stall_id = s.id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
ORDER BY o.created_at DESC
LIMIT 20;

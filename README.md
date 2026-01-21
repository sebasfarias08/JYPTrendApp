# JYPTrendApp
JyP Tren App 

Frontend:     HTML + Tailwind + JS (modular)
Backend:      Supabase (Postgres + Auth + Storage)
Hosting:      Cloudflare Pages
Auth:         Google OAuth (PKCE)
Seguridad:    RLS real
Offline base: localStorage
Deploy:       GitHub → CI automático

🧭 Próximo paso lógico (te recomiendo seguir así)
Ahora sí entramos en desarrollo funcional:

🟢 Sprint 1 (Completo)
conectar Supabase (solo lectura)
listar productos reales
mostrar imágenes desde Storage
filtros y búsqueda

🟢 Sprint 2 (Completo)
detalle producto
compartir WhatsApp / Instagram
link público del producto

🟢 Sprint 3 (Completo)
pedidos
login
RLS
offline

🟢 Sprint 4 — Offline real
Para vendedores sin señal.
pedidos offline
cola de sincronización
reintento automático
indicador “pendiente de envío”
👉 Esto te transforma la app en nivel campo / calle.

🟢 Sprint 5 — Historial de pedidos
listado por vendedor
estados (enviado / cobrado / entregado)
filtros por fecha
export a Excel

🟢 Sprint 6 — Backoffice
vista admin
todos los pedidos
totales por vendedor
control de stock
dashboard

🟢 Sprint 7 — Integraciones
Mercado Pago link
WhatsApp automático
comprobante PDF
QR de pago
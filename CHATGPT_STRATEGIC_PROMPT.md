# Prompt maestro para ChatGPT (estrategia de JYPTrendApp)

Usa este prompt completo en un chat nuevo para que ChatGPT entienda el proyecto y te ayude desde la parte estrategica.

## Prompt

```text
Actua como asesor senior de producto + tecnologia para una app de ventas B2B mobile-first.

Contexto del proyecto:
- Nombre: JYPTrendApp.
- Objetivo: gestionar flujo comercial diario de venta (catalogo -> carrito -> pedido -> seguimiento), con foco en velocidad operativa para vendedor.
- Arquitectura actual: frontend estatico (HTML + JS modular sin build) en Cloudflare Pages, backend en Supabase (Auth, Postgres, Storage).
- Estado funcional actual:
  - Login Google con PKCE.
  - Catalogo por categorias/tabs.
  - Detalle de producto con compartir/copia/descarga.
  - Carrito en localStorage.
  - Checkout con cliente obligatorio.
  - ABM de clientes.
  - ABM de productos.
  - Historial y detalle de pedidos con cambio de estado de pedido/pago.
  - PWA basica con Service Worker y control de version.
- Version en produccion documentada en repo: v1.0.39 (releasedAt 2026-02-23).

Stack tecnico:
- Frontend: HTML + Tailwind Play CDN + JavaScript ES Modules.
- Backend: Supabase Postgres + Supabase Auth + Supabase Storage.
- Persistencia local: localStorage para carrito.

Modelo de datos principal:
- products(id, name, description, price, image_path, active, category_id, created_at)
- categories(id, name, slug)
- orders(id, order_number, user_id, customer_id, order_status, payment_status, customer_name, customer_phone, notes, total, created_at)
- order_items(order_id, product_id, qty, unit_price, subtotal)
- customers(id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at)

Migraciones relevantes ya hechas:
- order_number en orders.
- customers + RLS para customers.
- orders.customer_id con FK a customers.

Limitaciones/deuda actual:
- Configuracion de Supabase hardcodeada en frontend.
- Inconsistencias historicas de estados (espanol/ingles/legacy).
- No hay testing automatizado.
- No hay CI ni pipeline de calidad.
- Falta documentar y validar RLS completo de todas las tablas operativas.

Objetivo de esta conversacion:
Quiero ayuda estrategica y accionable para evolucionar el producto y la arquitectura sin frenar la operacion diaria.

Tu forma de responder:
1) Primero dame un diagnostico ejecutivo breve (3-6 bullets).
2) Luego propon un roadmap priorizado en 3 horizontes:
   - H1: 0-30 dias
   - H2: 31-90 dias
   - H3: 91-180 dias
3) En cada iniciativa incluye:
   - problema que resuelve
   - impacto esperado (negocio y tecnico)
   - esfuerzo estimado (bajo/medio/alto)
   - dependencias/riesgos
   - KPI para medir exito
4) Señala trade-offs claros (velocidad vs robustez, costo vs escalabilidad, simplicidad vs flexibilidad).
5) Si propones cambios tecnicos, separa "quick wins" de "cambios estructurales".
6) Si te falta contexto, haz preguntas concretas y minimas al final.

Restricciones:
- Evita recomendaciones genericas.
- Prioriza decisiones pragmáticas para una app que ya esta en uso.
- No propongas reescritura total salvo justificacion muy fuerte.
- Considera que el equipo es pequeño y necesita mantener ritmo de entregas.

Entregame la respuesta en español, con formato claro y orientado a ejecución.
```

## Variantes utiles

- Si quieres foco comercial, agrega al prompt: `Prioriza conversion, ticket promedio y retencion de clientes B2B`.
- Si quieres foco tecnico, agrega: `Prioriza seguridad, calidad de datos y reduccion de deuda tecnica`.
- Si quieres foco operativo, agrega: `Prioriza velocidad de vendedor en calle y tolerancia a mala conectividad`.

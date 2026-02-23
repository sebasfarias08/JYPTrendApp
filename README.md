# JYPTrendApp

Aplicacion web de ventas para JyP, construida como frontend estatico con Supabase.

## Stack actual

- Frontend: HTML + Tailwind CDN + JavaScript modular (sin build step)
- Backend: Supabase (Postgres + Auth + Storage)
- Auth: Google OAuth con PKCE
- Hosting: Cloudflare Pages (sitio estatico en `public/`)
- Offline base: Service Worker + `localStorage`

## Estado funcional (implementado)

- Login protegido en paginas privadas (`/pages/login.html`, `/pages/auth-callback.html`)
- Catalogo de productos desde Supabase (`products` + `categories`)
- Detalle de producto con compartir (Web Share API / copiar link / fallback WhatsApp)
- Carrito local en `localStorage`
- Creacion de pedidos (`orders` + `order_items`)
- Listado de pedidos con filtros por estado y busqueda
- Detalle de pedido con actualizacion de:
  - estado del pedido
  - estado de pago
- PWA basica:
  - `manifest.webmanifest`
  - `sw.js` con cache estatico/runtime
  - boton de actualizacion cuando hay nueva version

## Estructura del proyecto

```text
public/
  index.html
  sw.js
  manifest.webmanifest
  _headers
  pages/
    login.html
    auth-callback.html
    home.html
    producto.html
    pedidos.html
    pedido-detalle.html
    checkout.html
    clientes.html
    cliente-form.html
    productos.html
    producto-form.html
    about.html
  js/
    app-shell.js
    auth.js
    cart.js
    catalog-service.js
    checkout-page.js
    client-form-page.js
    clients-page.js
    customers-service.js
    image.js
    order-ref.js
    order-service.js
    order-status.js
    orders-service.js
    product-form-page.js
    product-page.js
    product-service.js
    products-page.js
    share.js
    status-ui.js
    supabase-client.js
    sw-register.js
    toast.js
```

## Flujo principal

1. Usuario inicia sesion con Google.
2. Visualiza catalogo y entra a detalle de producto.
3. Agrega productos al carrito.
4. Confirma pedido.
5. Consulta historial y detalle de pedidos.
6. Actualiza estado de pedido/pago desde detalle.

## Modelo de datos esperado (Supabase)

- `products` (incluye `active`, `image_path`, `category_id`)
- `categories`
- `orders` (incluye `order_status`, `payment_status`, `total`, `user_id`)
- `order_items` (relacion con `orders` y `products`)

## Observaciones tecnicas

- Hay valores de configuracion hardcodeados:
  - URL y anon key de Supabase en `public/js/supabase-client.js`
  - Project ID en `public/js/image.js`
- El Service Worker no precachea todas las paginas/modulos usados en navegacion completa.

## Prioridades sugeridas (siguiente actualizacion)

1. Centralizar configuracion de Supabase via variables de entorno/runtime.
2. Resolver inconsistencias de estados y eliminar codigo duplicado.
3. Mejorar estrategia offline:
   - precache completo de rutas criticas
   - cola de pedidos offline con reintentos
4. Agregar validaciones y manejo de errores de red en flujos de pedido.
5. Documentar RLS esperado por tabla/politica en este README.

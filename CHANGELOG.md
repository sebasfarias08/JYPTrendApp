# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and semantic versioning.

## [v1.1.3] - 2026-03-12
### Added
- Campo `Direccion` en clientes para alta/edicion/visualizacion.
- Vista de detalle de cliente con acciones de edicion y alta/baja.

### Changed
- Validacion de telefono de clientes al formato WhatsApp `54 9 codigo_area numero`.
- Mensaje de error para duplicado de nombre + telefono segun constraint de Supabase.
- Listado de clientes visible para todos los roles autenticados.
- Permisos de modificacion/baja de clientes limitados a `admin` y `seller`.
- Checkout protegido por rol para que solo `admin` y `seller` puedan crear pedidos.
- Version de app actualizada a `v1.1.3`.

## [v1.1.0] - 2026-03-10
### Added
- Initial CHANGELOG.md baseline for release management.

### Changed
- Project release snapshot prepared for `v1.1.0`.

### Notes
- This release is tagged and branched as a stable baseline (`release/v1.1.0`).

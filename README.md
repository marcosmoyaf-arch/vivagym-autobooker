# Agente VivaGym

Reserva automaticamente **V-Power presencial en VivaGym Dos Hermanas, todos los lunes a las 20:15**. Con la cuota PRIME intenta reservar el lunes anterior, desde el momento en que se abre la ventana de siete dias.

## Protecciones incluidas

- Las credenciales solo se leen desde secretos cifrados de GitHub.
- Nunca se escriben en el repositorio ni se muestran en los registros.
- Comprueba si la clase ya esta reservada antes de actuar.
- Solo selecciona Dos Hermanas, V-Power y las 20:15.
- Verifica que VivaGym muestre la clase en "Tus proximas clases".
- Los intentos programados fuera del lunes entre las 20:15 y las 22:00, hora de Madrid, terminan sin hacer nada.

## Configuracion en GitHub

1. Crea un repositorio **privado** y sube estos archivos.
2. Abre `Settings > Secrets and variables > Actions`.
3. Crea dos secretos del repositorio:
   - `VIVAGYM_EMAIL`: el email de acceso a VivaGym.
   - `VIVAGYM_PASSWORD`: la contrasena de acceso a VivaGym.
4. Abre la pestana `Actions`, selecciona `Reservar V-Power` y ejecuta primero `Run workflow` con `dry_run` activado.
5. Revisa que la prueba localice la clase sin reservarla. La ejecucion semanal ya queda habilitada por el calendario del workflow.

## Ejecucion manual segura

El disparador manual usa `dry_run` por defecto. Si se desactiva, intentara realizar la reserva de verdad para el siguiente lunes.

## Limites

VivaGym no ofrece una API publica para reservas. El agente utiliza la web de socios y puede necesitar ajustes si VivaGym cambia su diseno o incorpora una verificacion adicional.

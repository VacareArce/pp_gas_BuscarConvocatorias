# Descripcion ampliada del proyecto

## Nombre sugerido

`pp_gas_BuscarConvocatorias`

## Descripcion corta para GitHub

Agente pasivo en Google Apps Script y Google Sheets para buscar, clasificar y priorizar empleos o convocatorias laborales usando Gemini, prompts configurables y procesamiento por lotes.

## Descripcion ampliada

`pp_gas_BuscarConvocatorias` es una automatizacion construida sobre Google Apps Script que convierte una hoja de Google Sheets en un observatorio personal de oportunidades laborales.

El sistema esta diseñado para trabajar de manera pasiva: una vez configurado el perfil profesional, las reglas salariales y los prompts, el agente ejecuta busquedas periodicas, registra oportunidades nuevas, evita duplicados y analiza cada empleo en lotes pequenos para reducir consumo de API.

La herramienta es especialmente util para perfiles profesionales que quieren monitorear oportunidades remotas, hibridas o presenciales segun una ciudad base, con reglas salariales diferenciadas cuando una oferta exige mudanza dentro del pais o al exterior.

## Problema que resuelve

Buscar empleos relevantes manualmente consume tiempo y suele generar ruido: ofertas duplicadas, cargos demasiado junior, oportunidades no remuneradas, vacantes sin modalidad clara o cargos que exigen mudanza sin compensacion suficiente.

Este proyecto centraliza la busqueda en Google Sheets y permite que la IA ayude a filtrar y priorizar, sin reemplazar la decision humana final.

## Enfoque funcional

El flujo principal es:

1. Leer un perfil profesional estructurado desde la hoja `Perfil`.
2. Leer criterios, prompts y reglas salariales desde `Config`.
3. Buscar empleos vigentes usando Gemini con Google Search.
4. Insertar oportunidades nuevas en `Empleos`.
5. Crear tareas de analisis en `ColaIA`.
6. Analizar por lotes la compatibilidad de cada empleo.
7. Clasificar modalidad, ubicacion, salario, prioridad y accion recomendada.
8. Registrar errores y ejecuciones en `Log`.

## Componentes principales

### Google Sheets

La hoja de calculo funciona como panel de control y base de datos operativa.

- `Perfil`: informacion del CV o perfil profesional.
- `Config`: parametros y prompts editables.
- `Empleos`: oportunidades encontradas y analizadas.
- `ColaIA`: cola de procesamiento por lotes.
- `Log`: trazabilidad de ejecuciones.

### Google Apps Script

El codigo en `gas/` administra menus, triggers, llamadas a Gemini, escritura en hojas, deduplicacion y reintentos.

### Gemini API

La IA se usa para busqueda asistida y analisis estructurado. Las respuestas se exigen en JSON para facilitar su escritura en Google Sheets.

## Reglas salariales

El proyecto soporta una estrategia de salario base con multiplicadores:

- Salario base para ciudad objetivo o remoto.
- Multiplicador para ofertas que requieren mudanza dentro del pais.
- Multiplicador para ofertas que requieren mudanza internacional.

Ejemplo conceptual:

```text
SALARIO_BASE_MINIMO = 6500000
MULTIPLICADOR_OTRA_CIUDAD_COLOMBIA = 2
MULTIPLICADOR_OTRO_PAIS = 3
```

Esto permite exigir condiciones salariales mas altas cuando la oportunidad implica mayor costo o friccion personal.

## Acciones recomendadas

Cada empleo puede clasificarse como:

- `Aplicar`: alto ajuste, condiciones claras y salario suficiente.
- `Revisar`: potencial interesante, pero falta validar salario, modalidad o requisitos.
- `Descartar`: bajo ajuste, no remunerado, demasiado junior o no cumple criterios clave.

La IA recomienda, pero la decision final permanece en manos del usuario.

## Diseno para bajo consumo de API

El proyecto evita ejecuciones grandes:

- Busca pocos resultados por ejecucion.
- Analiza en lotes pequenos.
- Usa una cola persistente.
- Evita fichas tecnicas automaticas.
- Reintenta en caso de errores temporales.

## Buenas practicas de publicacion

No deben publicarse:

- `.clasp.json` real.
- API keys.
- PDFs de hojas de vida.
- Datos personales de candidatos.
- Capturas con correos, telefonos o identificadores privados.
- Exports reales de hojas de calculo.

Se incluye `.clasp.example.json` como plantilla segura.

## Posibles mejoras futuras

- Soporte para multiples perfiles.
- Actualizacion automatica de vigencia de empleos existentes.
- Normalizacion de monedas y conversion automatica.
- Integracion con Gmail para alertas.
- Panel resumen con metricas por prioridad, fuente y modalidad.
- Generacion manual de paquete de postulacion para oportunidades seleccionadas.

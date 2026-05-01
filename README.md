# pp_gas_BuscarConvocatorias

Agente pasivo en Google Apps Script para buscar, clasificar y priorizar oportunidades laborales desde Google Sheets usando Gemini y Google Search.

El proyecto esta pensado para personas que quieren monitorear empleos o convocatorias laborales alineadas con una hoja de vida especifica, sin ejecutar busquedas manuales todos los dias. La configuracion se administra desde una hoja de calculo y el flujo corre automaticamente con triggers de Apps Script.

## Caracteristicas

- Busqueda diaria automatica de empleos remunerados.
- Configuracion desde Google Sheets, sin tocar codigo.
- Prompts editables desde la pestaña `Config`.
- Perfil profesional editable desde la pestaña `Perfil`.
- Procesamiento por lotes para reducir consumo de API gratuita.
- Clasificacion por modalidad: remoto, hibrido, presencial o no claro.
- Evaluacion de viabilidad desde una ciudad base.
- Reglas salariales con multiplicadores para mudanza dentro del pais o fuera del pais.
- Deduplicacion por link y combinacion cargo/organizacion.
- Cola de analisis en `ColaIA`.
- Registro de ejecuciones y errores en `Log`.
- Sin fichas tecnicas automaticas para ahorrar uso de IA.
- Manual de uso embebido disponible desde el menu de Google Sheets.

## Estructura

```text
gas/
  appsscript.json
  config.js
  eventos.js
  ui.js
  utils.js
docs/
  GITHUB_PROJECT_DESCRIPTION.md
MANUAL_IMPLEMENTACION.md
.clasp.example.json
.gitignore
README.md
```

## Hojas que crea el script

| Hoja | Uso |
|---|---|
| `Perfil` | Datos estructurados de la hoja de vida. |
| `Config` | Parametros, prompts, salarios y criterios. |
| `Empleos` | Resultados encontrados y analisis de compatibilidad. |
| `ColaIA` | Tareas pendientes por lote. |
| `Log` | Registro de ejecuciones, errores y reintentos. |

## Configuracion rapida

1. Crear o abrir un proyecto de Apps Script vinculado a Google Sheets.
2. Copiar `.clasp.example.json` como `.clasp.json` y reemplazar `TU_SCRIPT_ID_DE_APPS_SCRIPT`.
3. Instalar/login en clasp si hace falta:

```bash
npm i -g @google/clasp
clasp login
```

4. Subir el codigo:

```bash
clasp push
```

5. En Apps Script, configurar la propiedad del script:

```text
GEMINI_API_KEY = tu_api_key_de_gemini
```

6. Abrir Google Sheets y ejecutar:

```text
Agente Empleos HV > Configurar estructura
```

7. Diligenciar `Perfil` y revisar `Config`.
8. Instalar el trigger diario:

```text
Agente Empleos HV > Instalar trigger diario
```

## Seguridad

No publiques `.clasp.json`, claves de API, hojas de vida, PDFs, capturas de pantalla con datos personales ni exports reales de Google Sheets.

La API key se lee desde propiedades del script, no desde el codigo fuente.

## Documentacion

- Manual de implementacion: [`MANUAL_IMPLEMENTACION.md`](MANUAL_IMPLEMENTACION.md)
- Descripcion ampliada para GitHub: [`docs/GITHUB_PROJECT_DESCRIPTION.md`](docs/GITHUB_PROJECT_DESCRIPTION.md)
- Manual embebido en Google Sheets: `Agente Empleos HV > Ver manual de uso`

## Licencia

Este repositorio no define una licencia por defecto. Agrega una licencia antes de reutilizarlo o distribuirlo ampliamente.

# Manual de implementacion - Agente Empleos HV

## Objetivo

Este Apps Script convierte una hoja de Google Sheets en un agente pasivo de busqueda diaria de empleos para una hoja de vida especifica.

El sistema busca empleos relevantes, los clasifica por compatibilidad con el perfil, modalidad, viabilidad desde Medellin, salario y accion recomendada.

No realiza postulaciones automaticas y no crea fichas tecnicas en esta version.

## Archivos del proyecto

| Archivo | Funcion |
|---|---|
| `config.js` | Configuracion global, prompts por defecto, columnas y valores iniciales. |
| `eventos.js` | Busqueda de empleos, analisis por lotes, deduplicacion y escritura de resultados. |
| `utils.js` | Utilidades de hojas, configuracion, Gemini, logs, reintentos y migraciones. |
| `ui.js` | Menu de Google Sheets para preparar estructura e instalar triggers. |
| `appsscript.json` | Configuracion del runtime de Apps Script. |

## Requisitos previos

1. Tener acceso al Google Sheet asociado al Apps Script.
2. Tener acceso al proyecto Apps Script.
3. Tener una API key de Gemini.
4. Haber subido el codigo con `clasp push`.

## Configurar API Key

La API key debe configurarse en las propiedades del script, no en la hoja.

Pasos:

1. Abrir el proyecto Apps Script.
2. Ir a **Configuracion del proyecto**.
3. Buscar **Propiedades de la secuencia de comandos**.
4. Agregar esta propiedad:

| Propiedad | Valor |
|---|---|
| `GEMINI_API_KEY` | API key de Gemini |

5. Guardar.

El script automatico lee la key con:

```js
PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')
```

## Preparar la hoja

En Google Sheets:

1. Recargar la hoja.
2. Abrir el menu `Agente Empleos HV`.
3. Ejecutar `Configurar estructura`.

Esto crea o actualiza estas pestañas:

| Pestaña | Uso |
|---|---|
| `Perfil` | Datos estructurados de la hoja de vida. |
| `Config` | Parametros, reglas salariales y prompts. |
| `Empleos` | Resultados y analisis. |
| `ColaIA` | Tareas pendientes para analisis por lotes. |
| `Log` | Registro de ejecuciones y errores. |

## Diligenciar `Perfil`

La pestaña `Perfil` alimenta los prompts de busqueda y analisis. Debe contener informacion clara del CV.

Campos minimos recomendados:

| Campo | Valor sugerido |
|---|---|
| `Nombre` | Nombre de la persona candidata |
| `Ciudad base` | Ciudad donde la persona quiere vivir o trabajar |
| `Pais base` | Pais de residencia principal |
| `Nacionalidad` | Nacionalidad o permiso laboral relevante |
| `Profesion principal` | Profesion, especialidad y enfoque principal del perfil |
| `Anios de experiencia` | Experiencia total aproximada |
| `Nivel academico` | Titulos, posgrados, certificaciones y formacion relevante |
| `Idiomas` | Idiomas y nivel, por ejemplo: Espanol nativo, ingles B2 |
| `Areas fuertes` | Temas donde la persona tiene experiencia real y que deben orientar la busqueda |
| `Cargos objetivo` | Cargos o titulos laborales que el agente debe priorizar |
| `Sectores objetivo` | Sectores deseados, como ONG, tecnologia, salud, sostenibilidad, educacion o cooperacion |
| `Habilidades clave` | Competencias, herramientas, metodologias y conocimientos tecnicos |
| `Logros destacados` | Logros medibles o diferenciales del perfil profesional |
| `Resumen CV IA` | Resumen profesional del perfil. |
| `Texto completo CV` | Texto completo o resumen amplio del PDF. |

## Diligenciar `Config`

La pestaña `Config` controla el comportamiento sin tocar codigo.

Valores recomendados:

| Clave | Valor recomendado |
|---|---|
| `CIUDAD_BASE` | Medellin |
| `PAIS_BASE` | Colombia |
| `RESULTADOS_POR_BUSQUEDA` | 5 |
| `EMPLEOS_POR_LOTE_ANALISIS` | 3 |
| `EJECUCION_DIARIA_HORA` | 07:00 |
| `SALARIO_MONEDA` | COP |
| `SALARIO_MINIMO` | 6500000 |
| `SALARIO_BASE_MONEDA` | COP |
| `SALARIO_BASE_MINIMO` | 6500000 |
| `MULTIPLICADOR_OTRA_CIUDAD_COLOMBIA` | 2 |
| `MULTIPLICADOR_OTRO_PAIS` | 3 |
| `ACEPTAR_SALARIO_NO_PUBLICADO` | Si |
| `SALARIO_NO_PUBLICADO_ACCION` | Revisar |
| `APLICAR_SIN_SALARIO_PUBLICADO` | No |
| `PRIORIZAR_SALARIO_PUBLICADO` | Si |
| `PUNTAJE_MINIMO_GUARDAR` | 65 |
| `PUNTAJE_MINIMO_FUERA_MEDELLIN` | 90 |
| `FUENTES_PRIORITARIAS` | LinkedIn, paginas oficiales de ONG, paginas oficiales de empresas de sostenibilidad, consultoras ESG, organismos internacionales, agencias de cooperacion, Devex, ReliefWeb, Impactpool, Idealist |
| `IDIOMAS_ACEPTADOS` | Espanol, ingles |
| `EXCLUIR` | voluntariado, practicas no remuneradas, cursos, empleos sin remuneracion, ventas comerciales puras, call center, community manager junior, diseno grafico junior, cargos puramente administrativos |

## Reglas salariales

El sistema usa un salario base y multiplicadores para decidir si una oportunidad que exige mudanza vale la pena.

Con la configuracion recomendada:

| Escenario | Regla | Minimo calculado |
|---|---|---:|
| Remoto desde Medellin, hibrido Medellin o presencial Medellin | salario base | 6.500.000 COP |
| Bogota u otra ciudad de Colombia | salario base x 2 | 13.000.000 COP |
| Otro pais | salario base x 3 | 19.500.000 COP |

Reglas adicionales:

- Si el empleo no publica salario, no debe recomendar `Aplicar`.
- Si no publica salario pero es muy relevante y viable desde Medellin, debe quedar como `Revisar`.
- Si no publica salario y exige mudanza, debe quedar como `Revisar` solo si es excepcional; de lo contrario `Descartar`.
- Si publica salario menor al minimo aplicable segun ubicacion, no debe recomendar `Aplicar`.

## Prompts configurables

Los prompts viven en `Config`:

| Clave | Uso |
|---|---|
| `PROMPT_BUSQUEDA` | Instrucciones para encontrar empleos nuevos. |
| `PROMPT_ANALISIS` | Instrucciones para evaluar compatibilidad, modalidad, salario y accion recomendada. |
| `PROMPT_ACTUALIZACION` | Reservado para revisar vigencia de empleos. |

El menu tambien incluye `Ver generador de prompts`, una plantilla copiable para pegar en otra IA junto con una hoja de vida y pedirle que genere los tres prompts principales del sistema.

Variables disponibles en prompts:

| Variable | Significado |
|---|---|
| `{{fecha_hoy}}` | Fecha actual. |
| `{{perfil}}` | Texto construido desde la pestaña `Perfil`. |
| `{{empleo}}` | Datos de un empleo para analisis. |
| `{{empleos_existentes}}` | Resumen de empleos ya registrados. |
| `{{ciudad_base}}` | Ciudad base configurada. |
| `{{pais_base}}` | Pais base configurado. |
| `{{fuentes_prioritarias}}` | Fuentes objetivo. |
| `{{idiomas_aceptados}}` | Idiomas aceptados. |
| `{{excluir}}` | Tipos de oportunidades excluidas. |
| `{{salario_base_moneda}}` | Moneda base. |
| `{{salario_base_minimo}}` | Salario base minimo. |
| `{{multiplicador_otra_ciudad_colombia}}` | Multiplicador para mudanza dentro de Colombia. |
| `{{multiplicador_otro_pais}}` | Multiplicador para mudanza internacional. |
| `{{salario_minimo_medellin_o_remoto}}` | Minimo para Medellin/remoto. |
| `{{salario_minimo_otra_ciudad_colombia}}` | Minimo para otra ciudad en Colombia. |
| `{{salario_minimo_otro_pais}}` | Minimo para otro pais. |
| `{{salario_no_publicado_accion}}` | Accion esperada cuando no hay salario publicado. |

## Flujo automatico

El sistema esta diseñado para uso pasivo.

Flujo diario:

1. El trigger ejecuta `procesarFlujoDiario`.
2. `buscarEmpleosPorPerfil(false)` busca hasta `RESULTADOS_POR_BUSQUEDA` empleos nuevos.
3. Los empleos se insertan en `Empleos` con estado `Nuevo`.
4. Se crean tareas `ANALIZAR` en `ColaIA`.
5. `analizarLoteEmpleos(false)` procesa hasta `EMPLEOS_POR_LOTE_ANALISIS` tareas.
6. Se actualizan columnas de modalidad, ubicacion, salario, puntaje, prioridad y accion recomendada.

## Instalar ejecucion diaria

En Google Sheets:

1. Abrir `Agente Empleos HV`.
2. Ejecutar `Instalar trigger diario`.

El trigger usa la hora configurada en:

```text
EJECUCION_DIARIA_HORA
```

Ejemplo:

```text
07:00
```

Nota: Apps Script ejecuta triggers diarios alrededor de la hora indicada, no necesariamente al minuto exacto.

El campo `EJECUCION_DIARIA_HORA` acepta valores como `1:00`, `01:00`, `13:00` o celdas con formato hora de Google Sheets. El script toma la hora e instala el trigger dentro de la ventana aproximada correspondiente.

## Detener ejecucion diaria

En Google Sheets:

1. Abrir `Agente Empleos HV`.
2. Ejecutar `Eliminar triggers del agente`.

Esto elimina triggers de:

- `procesarFlujoDiario`
- `recuperarBuscarEmpleos`
- `recuperarAnalizarEmpleos`

## Interpretar `Empleos`

Columnas clave:

| Columna | Significado |
|---|---|
| `Modalidad` | Remoto, Hibrido, Presencial o No claro. |
| `Ejecutable desde Medellin` | Si puede trabajarse desde Medellin. |
| `Clasificacion ubicacion` | Medellin, remoto viable, otra ciudad Colombia, otro pais o no claro. |
| `Salario` | Salario publicado o `No publicado`. |
| `Salario minimo aplicable` | Minimo que aplica segun ubicacion. |
| `Cumple salario` | Si, No o No claro. |
| `Puntaje match` | Compatibilidad 0-100. |
| `Prioridad` | Alta, Media o Baja. |
| `Accion recomendada` | Aplicar, Revisar o Descartar. |
| `Estado` | Nuevo, Revisado, Aplicado, Descartado o Vencido. |
| `Notas para aplicar` | Recomendaciones utiles para revisar la oferta. |

Para revisar una oferta en formato mas comodo, selecciona una celda de la fila en `Empleos` y usa:

```text
Agente Empleos HV > Ver empleo seleccionado
```

La vista HTML muestra los datos principales del empleo, evaluacion IA, salario, modalidad, brechas y link. No modifica la hoja.

## Accion recomendada

| Valor | Significado |
|---|---|
| `Aplicar` | Alta compatibilidad, viable desde Medellin o cumple regla salarial, salario publicado suficiente. |
| `Revisar` | Buena oportunidad, pero falta validar salario, modalidad, requisitos o condiciones. |
| `Descartar` | Bajo ajuste, no remunerado, demasiado junior, exige mudanza sin salario suficiente o no encaja con el perfil. |

Regla importante:

```text
Si no hay salario publicado, debe quedar como Revisar, no Aplicar.
```

## Seguimiento manual

Aunque el sistema corre de forma pasiva, la decision final es manual.

Uso recomendado:

1. Filtrar `Accion recomendada = Aplicar`.
2. Revisar esas ofertas primero.
3. Cambiar `Estado` a `Aplicado` cuando se postule.
4. Filtrar `Accion recomendada = Revisar`.
5. Abrir los links y validar salario/modalidad.
6. Cambiar `Estado` a `Descartado` si no sirve.
7. Usar `Notas` para comentarios humanos.

## Control de cuota gratuita

Para cuidar el API gratuito:

- `RESULTADOS_POR_BUSQUEDA` recomendado: 5.
- `EMPLEOS_POR_LOTE_ANALISIS` recomendado: 3.
- No hay fichas tecnicas automaticas.
- No hay ejecuciones manuales de IA desde el menu.
- Los errores 429 o 503 se manejan con reintentos y triggers diferidos.

## Reintentos y fallos definitivos

El sistema usa reintentos controlados para evitar loops y gasto accidental de cuota.

Campos principales en `Config`:

| Clave | Valor recomendado | Uso |
|---|---:|---|
| `MAX_REINTENTOS_INMEDIATOS` | 1 | Despues del primer fallo de Gemini, intenta una vez mas. |
| `SEGUNDOS_REINTENTO_INMEDIATO` | 10 | Segundos de espera antes del reintento inmediato. |
| `MAX_CICLOS_FALLO_GEMINI` | 5 | Maximo de ciclos fallidos antes de abandonar. |
| `MINUTOS_REINTENTO_DIFERIDO` | 30 | Minutos antes de reintentar por trigger temporal. |
| `EVITAR_TRIGGERS_DUPLICADOS` | Si | Evita crear varios triggers de recuperacion para la misma funcion. |

Un ciclo fallido incluye:

1. Intento inicial contra Gemini.
2. Espera de `SEGUNDOS_REINTENTO_INMEDIATO`.
3. Un reintento inmediato.
4. Si vuelve a fallar, se agenda un reintento diferido.

Si una tarea de `ColaIA` llega a `MAX_CICLOS_FALLO_GEMINI`, queda con estado `Fallo definitivo` y no se reintenta automaticamente.

En busqueda, el contador de ciclos fallidos se guarda en propiedades del script y se reinicia cuando la busqueda vuelve a funcionar.

## Troubleshooting

### No aparece el menu

Recargar Google Sheets. Si sigue sin aparecer, abrir Apps Script y ejecutar `onOpen` una vez desde el editor.

### Error de API key

Verificar que exista la propiedad del script:

```text
GEMINI_API_KEY
```

Debe estar en propiedades del script, no en la hoja `Config`.

### No encuentra empleos

Revisar:

- `Perfil` tiene suficiente informacion.
- `PROMPT_BUSQUEDA` no esta demasiado restrictivo.
- `RESULTADOS_POR_BUSQUEDA` no es 0.
- `EXCLUIR` no bloquea demasiadas opciones.

### Muchos empleos irrelevantes

Ajustar en `Config`:

- `EXCLUIR`
- `PROMPT_BUSQUEDA`
- `PUNTAJE_MINIMO_GUARDAR`
- `FUENTES_PRIORITARIAS`

### Muchos empleos sin salario

Ajustar:

```text
ACEPTAR_SALARIO_NO_PUBLICADO = No
```

O endurecer el prompt para excluir ofertas sin salario.

### El sistema recomienda mudanza con salario bajo

Revisar estos campos:

```text
SALARIO_BASE_MINIMO
MULTIPLICADOR_OTRA_CIUDAD_COLOMBIA
MULTIPLICADOR_OTRO_PAIS
```

Tambien verificar que `PROMPT_ANALISIS` incluya las reglas salariales nuevas.

## Mantenimiento con clasp

Descargar cambios remotos:

```bash
clasp pull
```

Subir cambios locales:

```bash
clasp push
```

Ver estado:

```bash
clasp status
```

## Checklist de implementacion

1. API key configurada en propiedades del script.
2. Codigo subido con `clasp push`.
3. Google Sheet recargado.
4. Menu `Agente Empleos HV` visible.
5. `Configurar estructura` ejecutado.
6. `Perfil` diligenciado.
7. `Config` revisado.
8. Prueba controlada ejecutada con `Probar ahora`.
9. Trigger diario instalado.
10. Al dia siguiente, revisar `Empleos`, `ColaIA` y `Log`.

## Prueba controlada

El menu incluye `Probar ahora` para validar el flujo sin esperar al trigger diario.

Esta opcion pide confirmacion porque hace llamadas reales a Gemini usando la API key maestra. La prueba esta limitada a:

| Accion | Limite |
|---|---:|
| Busqueda | 1 empleo nuevo |
| Analisis | 1 empleo pendiente |

Despues de ejecutarla, revisa `Empleos`, `ColaIA` y `Log`.

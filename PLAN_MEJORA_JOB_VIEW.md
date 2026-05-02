# Plan de Mejora: job_view.html - Herramienta de Decisión Rápida

## ¿Qué hemos hecho hasta ahora?

### Objetivo
- Ajustar job_view.html para funcionar como una herramienta de decisión rápida para postulantes, priorizando: recomendación de acción, notas para aplicar, brechas, salario y viabilidad desde Medellín.

### Restricciones y Preferencias
- La vista debe ser utilizable en menos de 1 minuto para decidir: aplicar, revisar o descartar.
- **Priorizar**: recomendación de acción, prioridad, puntuación de compatibilidad, notas para aplicar, brechas, modalidad/ubicación, cumplimiento de salario.
- **Despriorizar**: número de fila, fuente, fecha de publicación, fecha de búsqueda, última actualización, tipo de organización, área profesional.
- Vista de solo lectura por ahora (sin escritura en hoja en esta fase).
- Renombrar opción de menú de "Ver empleo seleccionado" a "Evaluar empleo seleccionado".

### Progreso

#### Completado
- Creado job_view.html con vista completa de detalles de empleo.
- Añadida opción "Ver empleo seleccionado" en ui.js.
- Creada función leerEmpleoSeleccionado_() para leer fila activa de hoja Empleos.
- Publicado en Apps Script vía clasp push (8 archivos).
- Añadida documentación en manual.html, README.md y MANUAL_IMPLEMENTACION.md.
- Modificado gas/job_view.html con nuevo diseño de decisión.
- Renombrada opción de menú en ui.js a "Evaluar empleo seleccionado".

#### En Progreso
- Ninguno.

#### Bloqueado
- Ninguno.

### Decisiones Clave
- La vista del empleo debe servir al postulante, no funcionar como documentación técnica.
- "Notas para aplicar" es el campo de mayor valor para la decisión.
- Sin salario publicado, la acción debe ser "Revisar" (según regla anterior).
- Solo lectura por ahora; botones de acción (marcar como Aplicado/Descartado/Revisar) diferidos a fase futura.

---

## Próximos Pasos

1. **Modificar gas/job_view.html con nuevo diseño**:
   - Banner grande de decisión (acción recomendada, prioridad, puntuación de coincidencia)
   - Sección "Por qué podría interesarte" (razón de coincidencia, resumen)
   - Lista de verificación antes de aplicar (brechas, ubicación, salario, fecha límite, modalidad)
   - Tarjeta prominente de "Notas para aplicar"
   - Sección de alineación de compatibilidad (fortalezas/riesgos)
   - Viabilidad de modalidad y ubicación
   - Bloque de cumplimiento de salario con codificación de colores
   - Datos del empleo (título, organización, ciudad/país, enlace, requisitos, resumen)
   - Botones de utilidad (abrir enlace, copiar lista de verificación de decisión)

2. **Opcionalmente renombrar opción de menú en ui.js** a "Evaluar empleo seleccionado".

3. **Verificar sintaxis y clasp push** cuando el usuario lo solicite.

---

## Contexto Crítico

- **Archivo actual**: job_view.html muestra las 30 columnas de EMPLEOS_HEADERS.
- **Usuario objetivo**: postulante de empleo revisando ofertas rápidamente.
- **ID del proyecto Apps Script**: 1yFnMWB_65jWWfgCnJwINRHB8M1zOwsX5eTr9wCGmVcJBCL09a5NkPc9d
- **clasp push reciente**: incluyó config.js, eventos.js, utils.js, ui.js, manual.html, prompt_generator.html, job_view.html, appsscript.json.

---

## Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `gas/job_view.html` | Vista HTML principal a rediseñar |
| `gas/ui.js` | Contiene opción de menú y función leerEmpleoSeleccionado_() a actualizar |
| `gas/config.js` | Define array EMPLEOS_HEADERS con columnas usadas en la vista |
| `MANUAL_IMPLEMENTACION.md` | Documentación de referencia para el usuario |

---

## Estado de Implementación

| Componente | Estado | Notas |
|------------|--------|-------|
| Vista actual de empleo | ❌ Obsoleta | Muestra todas las columnas sin priorización |
| Nuevo diseño de decisión | 📋 Planificado | Pendiente de implementación |
| Renombrar menú | 📋 Planificado | De "Ver empleo seleccionado" a "Evaluar empleo seleccionado" |
| Buttons de acción | ⏳ Diferido | Fase futura |
// =========================================================================
// CONFIGURACION GLOBAL DEL AGENTE DE EMPLEOS
// =========================================================================

const CONFIG = {
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  SHEETS: {
    PERFIL: 'Perfil',
    CONFIG: 'Config',
    EMPLEOS: 'Empleos',
    COLA: 'ColaIA',
    LOG: 'Log'
  }
};

const PERFIL_DEFAULTS = [
  ['Nombre', ''],
  ['Ciudad base', 'Medellin'],
  ['Pais base', 'Colombia'],
  ['Nacionalidad', ''],
  ['Profesion principal', ''],
  ['Anios de experiencia', ''],
  ['Nivel academico', ''],
  ['Idiomas', 'Espanol, ingles'],
  ['Areas fuertes', ''],
  ['Cargos objetivo', ''],
  ['Sectores objetivo', ''],
  ['Habilidades clave', ''],
  ['Logros destacados', ''],
  ['Resumen CV IA', ''],
  ['Texto completo CV', 'Pega aqui el texto del PDF de la hoja de vida o un resumen amplio del perfil.']
];

const PERFIL_NOTES = {
  'Nombre': 'Nombre completo de la persona candidata.',
  'Ciudad base': 'Ciudad desde donde la persona quiere trabajar o mantener residencia.',
  'Pais base': 'Pais de residencia principal para evaluar ubicacion y empleos remotos.',
  'Nacionalidad': 'Nacionalidad o permiso de trabajo relevante si aplica.',
  'Profesion principal': 'Titulo profesional y especialidad principal que orientan la busqueda.',
  'Anios de experiencia': 'Experiencia total aproximada. Ayuda a evitar cargos demasiado junior.',
  'Nivel academico': 'Formacion academica principal, posgrados, cursos o certificaciones relevantes.',
  'Idiomas': 'Idiomas y nivel. Ejemplo: Espanol nativo, ingles B2.',
  'Areas fuertes': 'Temas donde la persona tiene experiencia real y debe ser priorizada.',
  'Cargos objetivo': 'Titulos de cargo que el agente debe buscar y priorizar.',
  'Sectores objetivo': 'Sectores o industrias deseadas. Ejemplo: ONG, cooperacion, ESG, sostenibilidad.',
  'Habilidades clave': 'Competencias, metodologias, herramientas y conocimientos tecnicos relevantes.',
  'Logros destacados': 'Logros diferenciadores que ayudan a evaluar seniority y match.',
  'Resumen CV IA': 'Resumen profesional corto y claro para orientar la busqueda.',
  'Texto completo CV': 'Texto completo extraido del PDF o resumen amplio del CV. Es el insumo principal para la IA.'
};

const DEFAULT_PROMPT_BUSQUEDA = `Hoy es {{fecha_hoy}}.

Busca maximo {{resultados_por_busqueda}} empleos remunerados vigentes para este perfil profesional:

{{perfil}}

Condiciones:
- REGLA ESTRICTA DE VIGENCIA: Verifica minuciosamente que la oferta de empleo sigue ABIERTA. Si la fecha límite ya pasó, o el empleo fue publicado hace más de 45 días sin evidencia de seguir activo, DESCÁRTALO por completo.
- La persona vive en {{ciudad_base}}, {{pais_base}}.
- Prioriza empleos remotos, hibridos en Medellin o presenciales en Medellin.
- Incluye empleos fuera de Medellin solo si son de muy alto ajuste profesional o alta remuneracion.
- Incluye ofertas en {{idiomas_aceptados}}.
- Prioriza estas fuentes: {{fuentes_prioritarias}}.
- Excluye: {{excluir}}.
- Salario base minimo para empleos remotos desde Medellin, hibridos en Medellin o presenciales en Medellin: {{salario_minimo_medellin_o_remoto}} {{salario_base_moneda}}.
- Si requiere moverse a Bogota u otra ciudad de Colombia, solo incluyelo si el salario publicado o estimado es al menos {{salario_minimo_otra_ciudad_colombia}} {{salario_base_moneda}}, equivalente a {{multiplicador_otra_ciudad_colombia}} veces el salario base, o si es una oportunidad excepcional.
- Si requiere moverse a otro pais, solo incluyelo si el salario publicado o estimado es al menos {{salario_minimo_otro_pais}} {{salario_base_moneda}}, equivalente a {{multiplicador_otro_pais}} veces el salario base, o si incluye paquete claro de reubicacion y compensacion superior.
- Si el salario no esta publicado pero el empleo parece muy relevante, incluyelo como oportunidad para {{salario_no_publicado_accion}}.
- No marques como Aplicar ningun empleo sin salario publicado.
- No inventes salario, modalidad, ciudad ni fechas.
- Si un dato no esta disponible, usa "No publicado" o "No claro".
- No repitas estos empleos: {{empleos_existentes}}.

Devuelve unicamente un arreglo JSON valido. No uses Markdown.
Cada elemento debe tener exactamente estas claves:
cargo, organizacion, tipo_organizacion, pais, ciudad, modalidad, link, fuente, fecha_publicacion, fecha_limite, area_profesional, seniority, salario, moneda, resumen, requisitos_clave.`;

const DEFAULT_PROMPT_ANALISIS = `Evalua este empleo contra el perfil profesional.

Perfil:
{{perfil}}

Empleo:
{{empleo}}

Criterios:
- La persona vive en {{ciudad_base}}, {{pais_base}}.
- Clasifica modalidad: Remoto, Hibrido, Presencial o No claro.
- Clasifica si se puede ejecutar desde Medellin.
- Si es remoto Colombia, remoto LATAM o remoto global sin restriccion migratoria, es viable desde Medellin.
- Si requiere presencialidad o residencia en otra ciudad o pais, indicalo claramente.
- Evalua si parece remunerado.
- Salario base minimo para Medellin o remoto viable desde Medellin: {{salario_minimo_medellin_o_remoto}} {{salario_base_moneda}}.
- Para Bogota u otra ciudad de Colombia, el minimo es {{salario_minimo_otra_ciudad_colombia}} {{salario_base_moneda}}.
- Para otro pais, el minimo es {{salario_minimo_otro_pais}} {{salario_base_moneda}}.
- Si no publica salario, no recomiendes Aplicar.
- Si no publica salario pero es viable desde Medellin y muy relevante para el perfil, recomienda {{salario_no_publicado_accion}}.
- Si no publica salario y requiere mudanza a Bogota, otra ciudad de Colombia u otro pais, recomienda Revisar solo si es excepcional; de lo contrario recomienda Descartar.
- Si publica salario menor al minimo aplicable segun ubicacion, no recomiendes Aplicar.
- Si publica salario igual o mayor al minimo aplicable y el match es alto, puedes recomendar Aplicar.
- Calcula puntaje match de 0 a 100.
- Recomienda Aplicar, Revisar o Descartar.
- REGLA DE VIGENCIA: Verifica minuciosamente si la convocatoria sigue abierta. Si detectas que ya cerró o expiró, tu accion_recomendada DEBE SER estrictamente "Descartar", asigna un puntaje de 0, y en notas_para_aplicar escribe "Convocatoria cerrada".

Devuelve unicamente un objeto JSON valido. No uses Markdown.
El objeto debe tener exactamente estas claves:
modalidad, ejecutable_desde_medellin, clasificacion_ubicacion, motivo_ubicacion, salario, moneda, parece_remunerado, salario_minimo_aplicable, cumple_salario, puntaje_match, nivel_match, razon_match, brechas, prioridad, accion_recomendada, notas_para_aplicar.`;

const DEFAULT_PROMPT_ACTUALIZACION = `Revisa si este empleo sigue vigente y si hubo cambios relevantes.

Hoy es {{fecha_hoy}}.
Empleo:
{{empleo}}

Devuelve unicamente un objeto JSON valido con estas claves:
estado_vigencia, fecha_limite, cambios_detectados, resumen_cambios.`;

const CONFIG_DEFAULTS = [
  ['CIUDAD_BASE', 'Medellin'],
  ['PAIS_BASE', 'Colombia'],
  ['RESULTADOS_POR_BUSQUEDA', '5'],
  ['EMPLEOS_POR_LOTE_ANALISIS', '3'],
  ['EJECUCION_DIARIA_HORA', '07:00'],
  ['SALARIO_MONEDA', 'COP'],
  ['SALARIO_MINIMO', '6500000'],
  ['SALARIO_BASE_MONEDA', 'COP'],
  ['SALARIO_BASE_MINIMO', '6500000'],
  ['MULTIPLICADOR_OTRA_CIUDAD_COLOMBIA', '2'],
  ['MULTIPLICADOR_OTRO_PAIS', '3'],
  ['ACEPTAR_SALARIO_NO_PUBLICADO', 'Si'],
  ['SALARIO_NO_PUBLICADO_ACCION', 'Revisar'],
  ['APLICAR_SIN_SALARIO_PUBLICADO', 'No'],
  ['PRIORIZAR_SALARIO_PUBLICADO', 'Si'],
  ['PUNTAJE_MINIMO_GUARDAR', '60'],
  ['PUNTAJE_MINIMO_FUERA_MEDELLIN', '88'],
  ['MAX_REINTENTOS_INMEDIATOS', '1'],
  ['SEGUNDOS_REINTENTO_INMEDIATO', '10'],
  ['MAX_CICLOS_FALLO_GEMINI', '5'],
  ['MINUTOS_REINTENTO_DIFERIDO', '30'],
  ['EVITAR_TRIGGERS_DUPLICADOS', 'Si'],
  ['FUENTES_PRIORITARIAS', 'LinkedIn, paginas oficiales/directas de organizaciones'],
  ['IDIOMAS_ACEPTADOS', 'Espanol, ingles'],
  ['EXCLUIR', 'voluntariado, practicas no remuneradas, cursos, empleos sin remuneracion'],
  ['PROMPT_BUSQUEDA', DEFAULT_PROMPT_BUSQUEDA],
  ['PROMPT_ANALISIS', DEFAULT_PROMPT_ANALISIS],
  ['PROMPT_ACTUALIZACION', DEFAULT_PROMPT_ACTUALIZACION]
];

const CONFIG_NOTES = {
  'CIUDAD_BASE': 'Ciudad que se usa como referencia para decidir si una oferta es viable sin mudanza.',
  'PAIS_BASE': 'Pais de residencia usado para evaluar elegibilidad, ubicacion y remoto.',
  'RESULTADOS_POR_BUSQUEDA': 'Cantidad maxima de empleos nuevos que se buscaran por ejecucion diaria.',
  'EMPLEOS_POR_LOTE_ANALISIS': 'Cantidad maxima de empleos que se analizaran por lote para cuidar la cuota gratuita de la API.',
  'EJECUCION_DIARIA_HORA': 'Hora aproximada para instalar el trigger diario. Puedes escribir 1:00, 01:00, 13:00 o usar formato hora de Google Sheets. Apps Script ejecuta dentro de una ventana horaria, no al minuto exacto.',
  'SALARIO_MONEDA': 'Campo heredado por compatibilidad. Usa la misma moneda que SALARIO_BASE_MONEDA.',
  'SALARIO_MINIMO': 'Campo heredado por compatibilidad. Usa el mismo valor que SALARIO_BASE_MINIMO.',
  'SALARIO_BASE_MONEDA': 'Moneda de referencia para calcular los minimos salariales con multiplicadores.',
  'SALARIO_BASE_MINIMO': 'Salario minimo aceptable para empleos remotos desde Medellin o ubicados en Medellin.',
  'MULTIPLICADOR_OTRA_CIUDAD_COLOMBIA': 'Multiplica el salario base cuando el empleo requiere mudarse a Bogota u otra ciudad de Colombia.',
  'MULTIPLICADOR_OTRO_PAIS': 'Multiplica el salario base cuando el empleo requiere mudarse a otro pais.',
  'ACEPTAR_SALARIO_NO_PUBLICADO': 'Permite conservar ofertas interesantes aunque no publiquen salario.',
  'SALARIO_NO_PUBLICADO_ACCION': 'Accion recomendada cuando una oferta no publica salario. Normalmente: Revisar.',
  'APLICAR_SIN_SALARIO_PUBLICADO': 'Control conceptual para evitar recomendar Aplicar cuando no hay salario publicado.',
  'PRIORIZAR_SALARIO_PUBLICADO': 'Indica a la IA que favorezca ofertas con salario visible y competitivo.',
  'PUNTAJE_MINIMO_GUARDAR': 'Puntaje minimo desde el cual una oferta empieza a valer la pena revisar.',
  'PUNTAJE_MINIMO_FUERA_MEDELLIN': 'Umbral mas alto para oportunidades que requieren mudanza o presencialidad fuera de Medellin.',
  'MAX_REINTENTOS_INMEDIATOS': 'Cantidad de reintentos inmediatos despues del primer fallo de Gemini. Recomendado: 1.',
  'SEGUNDOS_REINTENTO_INMEDIATO': 'Segundos de espera antes del reintento inmediato. Recomendado: 10.',
  'MAX_CICLOS_FALLO_GEMINI': 'Maximo de ciclos fallidos antes de abandonar. Cada ciclo incluye intento inicial y reintento inmediato.',
  'MINUTOS_REINTENTO_DIFERIDO': 'Minutos que espera el agente antes de reintentar por trigger temporal. Recomendado: 30.',
  'EVITAR_TRIGGERS_DUPLICADOS': 'Si esta en Si, no crea otro trigger de recuperacion si ya hay uno pendiente para la misma funcion.',
  'FUENTES_PRIORITARIAS': 'Portales o fuentes que la IA debe priorizar al buscar empleos.',
  'IDIOMAS_ACEPTADOS': 'Idiomas aceptables para las ofertas y postulaciones.',
  'EXCLUIR': 'Tipos de ofertas que deben evitarse, como voluntariados, practicas no remuneradas o cargos irrelevantes.',
  'PROMPT_BUSQUEDA': 'Prompt que define como Gemini debe buscar empleos nuevos. Puedes ajustarlo sin tocar codigo.',
  'PROMPT_ANALISIS': 'Prompt que define como Gemini debe evaluar match, modalidad, salario y accion recomendada.',
  'PROMPT_ACTUALIZACION': 'Prompt reservado para futuras revisiones de vigencia de ofertas existentes.'
};

const EMPLEOS_HEADERS = [
  'Fecha busqueda', 'Cargo', 'Organizacion', 'Tipo organizacion', 'Pais', 'Ciudad',
  'Modalidad', 'Ejecutable desde Medellin', 'Clasificacion ubicacion', 'Motivo ubicacion',
  'Link', 'Fuente', 'Fecha publicacion', 'Fecha limite', 'Area profesional', 'Seniority',
  'Salario', 'Moneda', 'Resumen', 'Requisitos clave', 'Puntaje match', 'Nivel match',
  'Razon match', 'Brechas', 'Prioridad', 'Accion recomendada', 'Estado',
  'Notas para aplicar', 'Ultima actualizacion', 'Notas', 'Salario minimo aplicable',
  'Cumple salario'
];

const COLA_HEADERS = [
  'Fecha creacion', 'Tipo tarea', 'Estado', 'Fila empleo', 'Intentos', 'Ultimo error',
  'Proxima ejecucion', 'Prioridad tarea'
];

const LOG_HEADERS = ['Fecha', 'Funcion', 'Resultado', 'Mensaje', 'Lote'];

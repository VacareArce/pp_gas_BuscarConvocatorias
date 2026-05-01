/**
 * Función interna para obtener la API Key según el contexto
 */
function _obtenerApiKey(esManual) {
  let apiKey = "";
  if (esManual === true) {
    const propiedades = PropertiesService.getUserProperties();
    apiKey = propiedades.getProperty('GEMINI_API_KEY');
    if (!apiKey) throw new Error("No hay API Key personal configurada. Las ejecuciones manuales de IA estan desactivadas en esta version.");
  } else {
    apiKey = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : '';
    if (!apiKey || apiKey === 'TU_API_KEY_AQUI') throw new Error("Ejecucion automatica cancelada: No hay API Key maestra en las propiedades del script.");
  }
  return apiKey;
}

function _sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function asegurarEncabezados_(sheet, headers) {
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).isBlank()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');
    sheet.setFrozenRows(1);
    return;
  }

  const actuales = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  let requiereCambio = false;
  for (let i = 0; i < headers.length; i++) {
    if (actuales[i] !== headers[i]) {
      requiereCambio = true;
      break;
    }
  }
  if (requiereCambio) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');
    sheet.setFrozenRows(1);
  }
}

function configurarEstructuraEmpleos() {
  const perfilSheet = _sheet(CONFIG.SHEETS.PERFIL);
  if (perfilSheet.getLastRow() === 0 || perfilSheet.getRange('A1').isBlank()) {
    perfilSheet.getRange(1, 1, 1, 2).setValues([['Campo', 'Valor']]);
    perfilSheet.getRange(2, 1, PERFIL_DEFAULTS.length, 2).setValues(PERFIL_DEFAULTS);
    perfilSheet.getRange('A1:B1').setFontWeight('bold').setBackground('#d9ead3');
    perfilSheet.setFrozenRows(1);
    perfilSheet.autoResizeColumns(1, 2);
  }
  aplicarNotasClaveValor_(perfilSheet, PERFIL_NOTES);

  const configSheet = _sheet(CONFIG.SHEETS.CONFIG);
  if (configSheet.getLastRow() === 0 || configSheet.getRange('A1').isBlank()) {
    configSheet.getRange(1, 1, 1, 2).setValues([['Clave', 'Valor']]);
    configSheet.getRange(2, 1, CONFIG_DEFAULTS.length, 2).setValues(CONFIG_DEFAULTS);
    configSheet.getRange('A1:B1').setFontWeight('bold').setBackground('#d9ead3');
    configSheet.setFrozenRows(1);
    configSheet.autoResizeColumns(1, 2);
  } else {
    const existentes = leerTablaClaveValor_(configSheet);
    const nuevas = CONFIG_DEFAULTS.filter(row => !existentes[row[0]]);
    if (nuevas.length > 0) {
      configSheet.getRange(configSheet.getLastRow() + 1, 1, nuevas.length, 2).setValues(nuevas);
    }
    migrarPromptsSalariales_(configSheet, existentes);
  }
  aplicarNotasClaveValor_(configSheet, CONFIG_NOTES);

  asegurarEncabezados_(_sheet(CONFIG.SHEETS.EMPLEOS), EMPLEOS_HEADERS);
  asegurarEncabezados_(_sheet(CONFIG.SHEETS.COLA), COLA_HEADERS);
  asegurarEncabezados_(_sheet(CONFIG.SHEETS.LOG), LOG_HEADERS);
}

function aplicarNotasClaveValor_(sheet, notesMap) {
  if (!notesMap || sheet.getLastRow() < 2) return;
  const claves = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const notes = claves.map(row => [notesMap[String(row[0] || '').trim()] || '']);
  sheet.getRange(2, 1, notes.length, 1).setNotes(notes);
}

function migrarPromptsSalariales_(sheet, config) {
  const promptBusqueda = String(config.PROMPT_BUSQUEDA || '');
  const promptAnalisis = String(config.PROMPT_ANALISIS || '');
  if (promptBusqueda && promptBusqueda.indexOf('{{salario_minimo_otra_ciudad_colombia}}') === -1) {
    actualizarConfigClave_(sheet, 'PROMPT_BUSQUEDA', DEFAULT_PROMPT_BUSQUEDA);
  }
  if (promptAnalisis && promptAnalisis.indexOf('salario_minimo_aplicable') === -1) {
    actualizarConfigClave_(sheet, 'PROMPT_ANALISIS', DEFAULT_PROMPT_ANALISIS);
  }
}

function actualizarConfigClave_(sheet, claveBuscada, valor) {
  if (sheet.getLastRow() < 2) return;
  const claves = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < claves.length; i++) {
    if (String(claves[i][0] || '').trim() === claveBuscada) {
      sheet.getRange(i + 2, 2).setValue(valor);
      return;
    }
  }
}

function leerTablaClaveValor_(sheet) {
  const salida = {};
  if (sheet.getLastRow() < 2) return salida;
  const valores = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  valores.forEach(row => {
    const clave = String(row[0] || '').trim();
    if (clave) salida[clave] = row[1];
  });
  return salida;
}

function obtenerConfig_() {
  configurarEstructuraEmpleos();
  const config = leerTablaClaveValor_(_sheet(CONFIG.SHEETS.CONFIG));
  CONFIG_DEFAULTS.forEach(row => {
    if (config[row[0]] === undefined || config[row[0]] === '') config[row[0]] = row[1];
  });
  return config;
}

function obtenerPerfilTexto_() {
  configurarEstructuraEmpleos();
  const perfil = leerTablaClaveValor_(_sheet(CONFIG.SHEETS.PERFIL));
  const partes = [];
  Object.keys(perfil).forEach(clave => {
    const valor = perfil[clave];
    if (valor !== undefined && String(valor).trim() !== '') {
      partes.push(`${clave}: ${valor}`);
    }
  });
  if (partes.length === 0) throw new Error('La hoja Perfil esta vacia. Pega el texto del CV o completa los campos principales.');
  return partes.join('\n');
}

function normalizarTexto_(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function reemplazarVariablesPrompt_(template, variables) {
  let salida = String(template || '');
  Object.keys(variables).forEach(key => {
    const re = new RegExp('{{' + key + '}}', 'g');
    salida = salida.replace(re, variables[key] === undefined ? '' : String(variables[key]));
  });
  return salida;
}

function limpiarRespuestaGemini_(texto) {
  return String(texto || '').replace(/```json/gi, '').replace(/```/g, '').trim();
}

function extraerJson_(texto, esperarArreglo) {
  const limpio = limpiarRespuestaGemini_(texto);
  const regex = esperarArreglo ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = limpio.match(regex);
  if (!match) throw new Error('La IA no devolvio JSON valido. Respuesta: ' + limpio.substring(0, 250));
  return JSON.parse(match[0]);
}

function contenidoTextoGemini_(response) {
  const json = JSON.parse(response.getContentText());
  if (json.error) throw new Error(json.error.message || response.getContentText());
  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
    throw new Error('Gemini no devolvio contenido util.');
  }
  const parts = json.candidates[0].content.parts;
  if (!parts || !parts.length || !parts[0].text) {
    throw new Error('Gemini devolvio una respuesta vacia o censurada.');
  }
  return parts[0].text;
}

function llamarGeminiTexto_(prompt, esManual, temperature) {
  const apiKey = _obtenerApiKey(esManual);
  const baseUrl = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_URL : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  const url = `${baseUrl}?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: temperature === undefined ? 0.2 : temperature }
  };
  const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };
  const response = llamarGeminiConReintentos(url, options);
  return contenidoTextoGemini_(response);
}

function escribirLog_(funcion, resultado, mensaje, lote) {
  try {
    configurarEstructuraEmpleos();
    _sheet(CONFIG.SHEETS.LOG).appendRow([new Date(), funcion, resultado, mensaje || '', lote || '']);
  } catch (e) {
    console.error('No se pudo escribir log: ' + e.message);
  }
}

/**
 * Función que envuelve la llamada a la API con reintentos automáticos (Exponential Backoff)
 * Mitiga los errores 503 (Alta demanda temporal) y 429 (Límite de cuota)
 */
function llamarGeminiConReintentos(url, options, maxReintentos = 7) {
  let intento = 0;
  let tiempoEspera = 2000; // 2 segundos iniciales
  
  while (intento <= maxReintentos) {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    
    // Si la respuesta es exitosa o llegamos al último intento, la devolvemos
    if (!json.error || intento === maxReintentos) {
      return response; 
    }
    
    // Si es un error 5XX (Saturación, Error Interno, Timeout) o 429 (Cuota excedida)
    if (json.error && (json.error.code >= 500 || json.error.code === 429)) {
      console.warn(`Error de Gemini (${json.error.code}) en intento ${intento + 1}. Reintentando en ${tiempoEspera/1000}s...`);
      Utilities.sleep(tiempoEspera);
      tiempoEspera *= 2; // Exponential backoff (2s, 4s, 8s, 16s, 32s...)
      if (tiempoEspera > 40000) tiempoEspera = 40000; // Tope máximo de 40s por espera para no agotar el límite de 6 min de Apps Script
      intento++;
    } else {
      // Otro error que no se soluciona reintentando (ej. 400 Bad Request)
      return response;
    }
  }
}

/**
 * Elimina exclusivamente el trigger que invocó el evento actual usando su ID Único.
 */
function limpiarTriggerEspecifico(evento) {
  if (evento && evento.triggerUid) {
    const todosLosTriggers = ScriptApp.getProjectTriggers();
    todosLosTriggers.forEach(t => {
      if (t.getUniqueId() === evento.triggerUid) {
        ScriptApp.deleteTrigger(t);
      }
    });
  }
}

/**
 * Crea un trigger temporizado (30 minutos) que ejecuta una función específica.
 */
function agendarReintento30Mins(nombreFuncionProxy) {
  console.warn(`Programando reintento diferido para la función: ${nombreFuncionProxy} en 30 minutos...`);
  ScriptApp.newTrigger(nombreFuncionProxy)
    .timeBased()
    .after(30 * 60 * 1000)
    .create();
}

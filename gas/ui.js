/**
 * Configura las hojas necesarias para el agente de empleos.
 */
function configurarHoja() {
  configurarEstructuraEmpleos();
  SpreadsheetApp.getActiveSpreadsheet().toast('Estructura configurada: Perfil, Config, Empleos, ColaIA y Log.', 'Agente Empleos HV', 5);
}

/**
 * Crea el menu personalizado en Google Sheets.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Agente Empleos HV')
    .addItem('1. Configurar estructura', 'configurarHoja')
    .addItem('Ver manual de uso', 'mostrarManualUso')
    .addItem('Ver generador de prompts', 'mostrarGeneradorPrompts')
    .addSeparator()
    .addItem('Evaluar empleo seleccionado', 'mostrarEmpleoSeleccionado')
    .addItem('Probar ahora', 'probarFlujoAhora')
    .addItem('Aplicar parche anti-cerradas', 'aplicarParcheVigencia')
    .addSeparator()
    .addItem('Instalar trigger diario', 'instalarTriggerDiarioEmpleos')
    .addItem('Eliminar triggers del agente', 'eliminarTriggersAgenteEmpleos')
    .addToUi();
}

/**
 * Muestra un manual embebido para uso desde Google Sheets.
 */
function mostrarManualUso() {
  const html = HtmlService.createHtmlOutputFromFile('manual')
    .setTitle('Manual de uso - Agente Empleos HV')
    .setWidth(900)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Manual de uso');
}

/**
 * Muestra una guia copiable para generar prompts personalizados con otra IA.
 */
function mostrarGeneradorPrompts() {
  const html = HtmlService.createHtmlOutputFromFile('prompt_generator')
    .setTitle('Generador de prompts - Agente Empleos HV')
    .setWidth(950)
    .setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, 'Generador de prompts');
}

/**
 * Muestra una presentacion legible de la fila activa en la hoja Empleos.
 */
function mostrarEmpleoSeleccionado() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const fila = sheet.getActiveCell().getRow();

  if (sheet.getName() !== CONFIG.SHEETS.EMPLEOS) {
    ui.alert('Seleccion invalida', 'Debes estar en la hoja Empleos para usar esta opcion.', ui.ButtonSet.OK);
    return;
  }

  if (fila <= 1) {
    ui.alert('Seleccion invalida', 'Selecciona una fila de empleo, no el encabezado.', ui.ButtonSet.OK);
    return;
  }

  if (sheet.getRange(fila, 2).isBlank()) {
    ui.alert('Seleccion invalida', 'La fila seleccionada no parece contener un empleo.', ui.ButtonSet.OK);
    return;
  }

  const empleo = leerEmpleoSeleccionado_(sheet, fila);
  const template = HtmlService.createTemplateFromFile('job_view');
  template.empleoJson = JSON.stringify(empleo);
  const html = template.evaluate()
    .setTitle('Detalle del empleo')
    .setWidth(950)
    .setHeight(760);
  ui.showModalDialog(html, 'Detalle del empleo');
}

function leerEmpleoSeleccionado_(sheet, fila) {
  const valores = sheet.getRange(fila, 1, 1, EMPLEOS_HEADERS.length).getDisplayValues()[0];
  const empleo = { fila: fila };
  EMPLEOS_HEADERS.forEach((header, index) => empleo[header] = valores[index] || '');
  return empleo;
}

/**
 * Función expuesta para que el modal job_view HTML pueda navegar a otra fila.
 */
function obtenerEmpleoData(fila) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.EMPLEOS);
  if (fila <= 1 || fila > sheet.getLastRow() || sheet.getRange(fila, 2).isBlank()) {
    return null;
  }
  return leerEmpleoSeleccionado_(sheet, fila);
}

/**
 * Ejecuta una prueba controlada con limites pequenos para validar configuracion.
 */
function probarFlujoAhora() {
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.alert(
    'Probar agente',
    'Esta prueba hara llamadas reales a Gemini usando la API key maestra.\n\nLimites de prueba:\n- Buscar maximo 1 empleo nuevo.\n- Analizar maximo 1 empleo pendiente.\n\nDeseas continuar?',
    ui.ButtonSet.YES_NO
  );

  if (respuesta !== ui.Button.YES) return;

  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Ejecutando prueba controlada...', 'Agente Empleos HV', 5);
    const resultadoBusqueda = buscarEmpleosPorPerfil(false, { resultadosPorBusqueda: 1 });
    const resultadoAnalisis = analizarLoteEmpleos(false, { empleosPorLoteAnalisis: 1 });
    escribirLog_('probarFlujoAhora', 'OK', 'Prueba ejecutada con limites: 1 busqueda / 1 analisis.', 'TEST');
    ui.alert(
      'Prueba finalizada',
      (resultadoBusqueda || 'Busqueda completada.') + '\n' + (resultadoAnalisis || 'Analisis completado.') + '\n\nRevisa las hojas Empleos, ColaIA y Log.',
      ui.ButtonSet.OK
    );
  } catch (error) {
    escribirLog_('probarFlujoAhora', 'ERROR', error.message, 'TEST');
    console.error('Error en prueba controlada: ' + error.message);
    ui.alert('Error en prueba', error.message, ui.ButtonSet.OK);
  }
}

/**
 * Aplica los ajustes de vigencia directamente en la hoja de Config del usuario.
 */
function aplicarParcheVigencia() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (!configSheet) {
    SpreadsheetApp.getUi().alert('Error: No se encontro la hoja Config.');
    return;
  }
  
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.alert('Parche Anti-Cerradas', 'Esto insertara las reglas estrictas para descartar convocatorias vencidas en tus Prompts actuales en la hoja Config.\\n\\n¿Deseas continuar?', ui.ButtonSet.YES_NO);
  
  if (respuesta !== ui.Button.YES) return;

  const data = configSheet.getDataRange().getValues();
  let modificado = false;

  for (let i = 0; i < data.length; i++) {
    const clave = String(data[i][0]).trim();
    if (clave === 'PROMPT_BUSQUEDA') {
      let prompt = data[i][1];
      if (!prompt.includes('REGLA ESTRICTA DE VIGENCIA')) {
        prompt = prompt.replace('Condiciones:\\n', 'Condiciones:\\n- REGLA ESTRICTA DE VIGENCIA: Verifica minuciosamente que la oferta de empleo sigue ABIERTA. Si la fecha límite ya pasó, o el empleo fue publicado hace más de 45 días sin evidencia de seguir activo, DESCÁRTALO por completo.\\n');
        configSheet.getRange(i + 1, 2).setValue(prompt);
        modificado = true;
      }
    }
    if (clave === 'PROMPT_ANALISIS') {
      let prompt = data[i][1];
      if (!prompt.includes('REGLA DE VIGENCIA')) {
        prompt = prompt.replace('Devuelve unicamente un objeto JSON', '- REGLA DE VIGENCIA: Verifica minuciosamente si la convocatoria sigue abierta. Si detectas que ya cerró o expiró, tu accion_recomendada DEBE SER estrictamente "Descartar", asigna un puntaje de 0, y en notas_para_aplicar escribe "Convocatoria cerrada".\\n\\nDevuelve unicamente un objeto JSON');
        configSheet.getRange(i + 1, 2).setValue(prompt);
        modificado = true;
      }
    }
  }

  if (modificado) {
    ui.alert('Exito', 'Tus prompts han sido actualizados exitosamente. El agente ahora filtrara rigurosamente las vacantes cerradas.', ui.ButtonSet.OK);
  } else {
    ui.alert('Info', 'Parece que las reglas de vigencia ya estaban aplicadas en tus prompts.', ui.ButtonSet.OK);
  }
}

/**
 * Instala un trigger diario segun la hora configurada en Config!EJECUCION_DIARIA_HORA.
 */
function instalarTriggerDiarioEmpleos() {
  eliminarTriggersAgenteEmpleos();
  const config = obtenerConfig_();
  const horaConfigurada = config.EJECUCION_DIARIA_HORA || '07:00';
  const hora = parsearHoraTrigger_(horaConfigurada);
  const horaFormateada = Utilities.formatString('%02d:00', hora);
  ScriptApp.newTrigger('procesarFlujoDiario')
    .timeBased()
    .everyDays(1)
    .atHour(hora)
    .create();
  SpreadsheetApp.getUi().alert(
    'Trigger instalado',
    'El agente se ejecutara diariamente dentro de la ventana aproximada de ' + horaFormateada + ' a ' + Utilities.formatString('%02d:00', (hora + 1) % 24) + '.\n\nValor configurado: ' + describirValorHora_(horaConfigurada) + '\nHora interpretada: ' + horaFormateada,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function parsearHoraTrigger_(valor) {
  if (valor instanceof Date) {
    return valor.getHours();
  }

  if (typeof valor === 'number') {
    const horaDesdeNumero = Math.floor((valor % 1) * 24);
    if (horaDesdeNumero >= 0 && horaDesdeNumero <= 23) return horaDesdeNumero;
  }

  const texto = String(valor || '').trim().toLowerCase();
  const match12h = texto.match(/^(\d{1,2})(?::\d{2})?\s*(am|pm)$/i);
  if (match12h) {
    let hora12 = parseInt(match12h[1], 10);
    if (hora12 >= 1 && hora12 <= 12) {
      if (match12h[2] === 'pm' && hora12 !== 12) hora12 += 12;
      if (match12h[2] === 'am' && hora12 === 12) hora12 = 0;
      return hora12;
    }
  }

  const match24h = texto.match(/^(\d{1,2})(?::\d{2})?/);
  if (match24h) {
    const hora = parseInt(match24h[1], 10);
    if (hora >= 0 && hora <= 23) return hora;
  }

  return 7;
}

function describirValorHora_(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(valor || '07:00');
}

function eliminarTriggersAgenteEmpleos() {
  const funciones = ['procesarFlujoDiario', 'recuperarBuscarEmpleos', 'recuperarAnalizarEmpleos'];
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (funciones.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

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
    .addSeparator()
    .addItem('Instalar trigger diario', 'instalarTriggerDiarioEmpleos')
    .addItem('Eliminar triggers del agente', 'eliminarTriggersAgenteEmpleos')
    .addToUi();
}

/**
 * Instala un trigger diario segun la hora configurada en Config!EJECUCION_DIARIA_HORA.
 */
function instalarTriggerDiarioEmpleos() {
  eliminarTriggersAgenteEmpleos();
  const config = obtenerConfig_();
  const horaTexto = String(config.EJECUCION_DIARIA_HORA || '07:00');
  const hora = parseInt(horaTexto.split(':')[0], 10);
  ScriptApp.newTrigger('procesarFlujoDiario')
    .timeBased()
    .everyDays(1)
    .atHour(isNaN(hora) ? 7 : hora)
    .create();
  SpreadsheetApp.getUi().alert('Trigger instalado', 'El agente se ejecutara diariamente alrededor de las ' + horaTexto + '.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function eliminarTriggersAgenteEmpleos() {
  const funciones = ['procesarFlujoDiario', 'recuperarBuscarEmpleos', 'recuperarAnalizarEmpleos'];
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (funciones.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

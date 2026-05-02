/**
 * Proxy para recuperar una busqueda diaria despues de un fallo temporal.
 */
function recuperarBuscarEmpleos(e) {
  console.log('[RECUPERACION_BUSQUEDA] Iniciando reintento diferido de busqueda. triggerUid=' + (e && e.triggerUid ? e.triggerUid : 'sin-triggerUid'));
  limpiarTriggerEspecifico(e);
  buscarEmpleosPorPerfil(false);
}

/**
 * Proxy para recuperar analisis por lotes despues de un fallo temporal.
 */
function recuperarAnalizarEmpleos(e) {
  console.log('[RECUPERACION_ANALISIS] Iniciando reintento diferido de analisis. triggerUid=' + (e && e.triggerUid ? e.triggerUid : 'sin-triggerUid'));
  limpiarTriggerEspecifico(e);
  analizarLoteEmpleos(false);
}

/**
 * Flujo principal diario: busca empleos nuevos y analiza un lote pequeno.
 */
function procesarFlujoDiario(esManual) {
  console.log('[FLUJO_DIARIO] Inicio. esManual=' + (esManual === true));
  buscarEmpleosPorPerfil(esManual === true);
  analizarLoteEmpleos(esManual === true);
  console.log('[FLUJO_DIARIO] Fin.');
}

/**
 * Busca empleos remunerados segun el perfil y deja el analisis detallado en cola.
 */
function buscarEmpleosPorPerfil(esManual, overrides) {
  console.log('[BUSQUEDA] Inicio. esManual=' + (esManual === true) + ', overrides=' + JSON.stringify(overrides || {}));
  configurarEstructuraEmpleos();
  const config = obtenerConfig_();
  const perfil = obtenerPerfilTexto_();
  const empleosSheet = _sheet(CONFIG.SHEETS.EMPLEOS);
  const colaSheet = _sheet(CONFIG.SHEETS.COLA);
  const fechaHoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const existentes = obtenerResumenEmpleosExistentes_();
  const resultadosPorBusqueda = (overrides && overrides.resultadosPorBusqueda) || parseInt(config.RESULTADOS_POR_BUSQUEDA, 10) || 5;
  console.log('[BUSQUEDA] Config cargada. resultadosPorBusqueda=' + resultadosPorBusqueda + ', ciudad=' + (config.CIUDAD_BASE || '') + ', pais=' + (config.PAIS_BASE || ''));

  const variables = crearVariablesPrompt_(config, perfil, {
    fecha_hoy: fechaHoy,
    resultados_por_busqueda: resultadosPorBusqueda,
    empleos_existentes: existentes
  });
  const prompt = reemplazarVariablesPrompt_(config.PROMPT_BUSQUEDA, variables);

  try {
    console.log('[BUSQUEDA] Llamando a Gemini para buscar empleos.');
    const texto = llamarGeminiTexto_(prompt, esManual === true, 0.25);
    const empleos = extraerJson_(texto, true);
    console.log('[BUSQUEDA] Respuesta parseada. empleosRecibidos=' + (Array.isArray(empleos) ? empleos.length : 0));
    if (!Array.isArray(empleos) || empleos.length === 0) {
      resetearCiclosFalloBusqueda_();
      escribirLog_('buscarEmpleosPorPerfil', 'OK', 'No se encontraron empleos nuevos.', '');
      return 'No se encontraron empleos nuevos.';
    }

    const dedupe = obtenerDedupeEmpleos_();
    let insertados = 0;

    empleos.slice(0, resultadosPorBusqueda).forEach(empleo => {
      if (esDuplicadoEmpleo_(empleo, dedupe)) {
        console.log('[BUSQUEDA] Duplicado omitido: ' + ((empleo.cargo || 'sin cargo') + ' - ' + (empleo.organizacion || 'sin organizacion')));
        return;
      }

      const fila = [
        new Date(),
        empleo.cargo || '',
        empleo.organizacion || '',
        empleo.tipo_organizacion || '',
        empleo.pais || '',
        empleo.ciudad || '',
        empleo.modalidad || 'No claro',
        '',
        '',
        '',
        empleo.link || '',
        empleo.fuente || '',
        empleo.fecha_publicacion || '',
        empleo.fecha_limite || '',
        empleo.area_profesional || '',
        empleo.seniority || '',
        empleo.salario || 'No publicado',
        empleo.moneda || '',
        empleo.resumen || '',
        empleo.requisitos_clave || '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Nuevo',
        '',
        '',
        '',
        '',
        ''
      ];

      empleosSheet.appendRow(fila);
      const filaEmpleo = empleosSheet.getLastRow();
      colaSheet.appendRow([new Date(), 'ANALIZAR', 'Pendiente', filaEmpleo, 0, '', '', 'Media']);
      console.log('[BUSQUEDA] Empleo insertado. fila=' + filaEmpleo + ', cargo=' + (empleo.cargo || '') + ', organizacion=' + (empleo.organizacion || ''));
      registrarDedupe_(empleo, dedupe);
      insertados++;
    });

    const mensaje = `Se agregaron ${insertados} empleos nuevos y quedaron en cola de analisis.`;
    resetearCiclosFalloBusqueda_();
    escribirLog_('buscarEmpleosPorPerfil', 'OK', mensaje, '');
    console.log('[BUSQUEDA] Fin OK. ' + mensaje);
    return mensaje;
  } catch (error) {
    console.error('[BUSQUEDA] Error: ' + error.message);
    escribirLog_('buscarEmpleosPorPerfil', 'ERROR', error.message, '');
    if (esManual === true) throw error;
    manejarFalloBusqueda_(error, config);
  }
}

/**
 * Analiza un lote pequeno de empleos pendientes para cuidar la cuota gratuita.
 */
function analizarLoteEmpleos(esManual, overrides) {
  console.log('[ANALISIS] Inicio. esManual=' + (esManual === true) + ', overrides=' + JSON.stringify(overrides || {}));
  configurarEstructuraEmpleos();
  const config = obtenerConfig_();
  const perfil = obtenerPerfilTexto_();
  const empleosSheet = _sheet(CONFIG.SHEETS.EMPLEOS);
  const colaSheet = _sheet(CONFIG.SHEETS.COLA);
  const maxLote = (overrides && overrides.empleosPorLoteAnalisis) || parseInt(config.EMPLEOS_POR_LOTE_ANALISIS, 10) || 3;
  const tareas = obtenerTareasPendientes_(colaSheet, 'ANALIZAR', maxLote);
  console.log('[ANALISIS] Tareas seleccionadas=' + tareas.length + ', maxLote=' + maxLote);

  if (tareas.length === 0) {
    console.log('[ANALISIS] No hay empleos pendientes por analizar.');
    return 'No hay empleos pendientes por analizar.';
  }

  let procesados = 0;

  for (let i = 0; i < tareas.length; i++) {
    const tarea = tareas[i];
    const filaEmpleo = parseInt(tarea.filaEmpleo, 10);
    if (!filaEmpleo || filaEmpleo < 2 || filaEmpleo > empleosSheet.getLastRow()) {
      console.warn('[ANALISIS] Tarea con fila invalida. filaCola=' + tarea.filaCola + ', filaEmpleo=' + tarea.filaEmpleo);
      marcarTarea_(colaSheet, tarea.filaCola, 'Error', 'Fila de empleo invalida');
      continue;
    }

    console.log('[ANALISIS] Procesando tarea. filaCola=' + tarea.filaCola + ', filaEmpleo=' + filaEmpleo + ', intentosPrevios=' + (tarea.intentos || 0));
    marcarTarea_(colaSheet, tarea.filaCola, 'Procesando', '');
    const empleo = leerEmpleo_(empleosSheet, filaEmpleo);
    const variables = crearVariablesPrompt_(config, perfil, { empleo: JSON.stringify(empleo, null, 2) });
    const prompt = reemplazarVariablesPrompt_(config.PROMPT_ANALISIS, variables);

    try {
      console.log('[ANALISIS] Llamando a Gemini para filaEmpleo=' + filaEmpleo + '.');
      const texto = llamarGeminiTexto_(prompt, esManual === true, 0.15);
      const analisis = extraerJson_(texto, false);
      console.log('[ANALISIS] Respuesta parseada para filaEmpleo=' + filaEmpleo + ', accion=' + (analisis.accion_recomendada || 'sin accion') + ', puntaje=' + (analisis.puntaje_match || 'sin puntaje'));
      escribirAnalisisEmpleo_(empleosSheet, filaEmpleo, analisis);
      marcarTarea_(colaSheet, tarea.filaCola, 'Completado', '');
      console.log('[ANALISIS] Tarea completada. filaCola=' + tarea.filaCola + ', filaEmpleo=' + filaEmpleo);
      procesados++;
      SpreadsheetApp.flush();
    } catch (error) {
      console.error('[ANALISIS] Error en filaEmpleo=' + filaEmpleo + ': ' + error.message);
      const intentos = (parseInt(tarea.intentos, 10) || 0) + 1;
      colaSheet.getRange(tarea.filaCola, 5).setValue(intentos);
      escribirLog_('analizarLoteEmpleos', 'ERROR', error.message, filaEmpleo);
      if (esManual === true) throw error;

      const maxCiclos = obtenerNumeroConfig_(config.MAX_CICLOS_FALLO_GEMINI, 5);
      const minutosReintento = obtenerNumeroConfig_(config.MINUTOS_REINTENTO_DIFERIDO, 30);
      if (!esErrorReintentable_(error) || intentos >= maxCiclos) {
        marcarTarea_(colaSheet, tarea.filaCola, 'Fallo definitivo', error.message, 0);
        console.error('[ANALISIS] Fallo definitivo. filaEmpleo=' + filaEmpleo + ', intentos=' + intentos + ', maxCiclos=' + maxCiclos);
        escribirLog_('COLAIA', 'FALLO_DEFINITIVO', `Fila ${filaEmpleo} supero limite o error no reintentable: ${error.message}`, filaEmpleo);
      } else {
        marcarTarea_(colaSheet, tarea.filaCola, 'Error', error.message, minutosReintento);
        console.warn('[ANALISIS] Reintento diferido solicitado. filaEmpleo=' + filaEmpleo + ', intentos=' + intentos + '/' + maxCiclos + ', minutos=' + minutosReintento);
        agendarReintentoDiferido_('recuperarAnalizarEmpleos', minutosReintento, config, filaEmpleo);
      }
      break;
    }
  }

  const mensaje = `Analisis completado para ${procesados} empleo(s).`;
  escribirLog_('analizarLoteEmpleos', 'OK', mensaje, '');
  console.log('[ANALISIS] Fin. ' + mensaje);
  return mensaje;
}

function crearVariablesPrompt_(config, perfil, extras) {
  const salarioBaseMoneda = config.SALARIO_BASE_MONEDA || config.SALARIO_MONEDA || 'COP';
  const salarioBaseMinimo = numeroConfig_(config.SALARIO_BASE_MINIMO || config.SALARIO_MINIMO, 6500000);
  const multiplicadorOtraCiudad = numeroConfig_(config.MULTIPLICADOR_OTRA_CIUDAD_COLOMBIA, 2);
  const multiplicadorOtroPais = numeroConfig_(config.MULTIPLICADOR_OTRO_PAIS, 3);
  const salarioMinimoOtraCiudad = Math.round(salarioBaseMinimo * multiplicadorOtraCiudad);
  const salarioMinimoOtroPais = Math.round(salarioBaseMinimo * multiplicadorOtroPais);

  const variables = {
    perfil: perfil,
    ciudad_base: config.CIUDAD_BASE || 'Medellin',
    pais_base: config.PAIS_BASE || 'Colombia',
    salario_moneda: salarioBaseMoneda,
    salario_minimo: salarioBaseMinimo,
    salario_base_moneda: salarioBaseMoneda,
    salario_base_minimo: salarioBaseMinimo,
    multiplicador_otra_ciudad_colombia: multiplicadorOtraCiudad,
    multiplicador_otro_pais: multiplicadorOtroPais,
    salario_minimo_medellin_o_remoto: salarioBaseMinimo,
    salario_minimo_otra_ciudad_colombia: salarioMinimoOtraCiudad,
    salario_minimo_otro_pais: salarioMinimoOtroPais,
    salario_no_publicado_accion: config.SALARIO_NO_PUBLICADO_ACCION || 'Revisar',
    fuentes_prioritarias: config.FUENTES_PRIORITARIAS || '',
    idiomas_aceptados: config.IDIOMAS_ACEPTADOS || '',
    excluir: config.EXCLUIR || ''
  };
  Object.keys(extras || {}).forEach(key => variables[key] = extras[key]);
  return variables;
}

function numeroConfig_(valor, fallback) {
  const limpio = String(valor || '').replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(limpio);
  return isNaN(numero) ? fallback : numero;
}

function manejarFalloBusqueda_(error, config) {
  if (!esErrorReintentable_(error)) {
    console.warn('[BUSQUEDA] Error no reintentable. No se agenda reintento: ' + error.message);
    escribirLog_('BUSQUEDA', 'SIN_REINTENTO', `Error no reintentable: ${error.message}`, 'BUSQUEDA');
    return;
  }

  const ciclos = incrementarCiclosFalloBusqueda_();
  const maxCiclos = obtenerNumeroConfig_(config.MAX_CICLOS_FALLO_GEMINI, 5);
  if (ciclos >= maxCiclos) {
    console.error('[BUSQUEDA] Fallo definitivo. ciclos=' + ciclos + ', maxCiclos=' + maxCiclos + ', error=' + error.message);
    escribirLog_('BUSQUEDA', 'FALLO_DEFINITIVO', `Supero ${maxCiclos} ciclos fallidos: ${error.message}`, 'BUSQUEDA');
    return;
  }

  const minutosReintento = obtenerNumeroConfig_(config.MINUTOS_REINTENTO_DIFERIDO, 30);
  escribirLog_('BUSQUEDA', 'REINTENTO_DIFERIDO', `Ciclo fallido ${ciclos}/${maxCiclos}.`, 'BUSQUEDA');
  console.warn('[BUSQUEDA] Reintento diferido solicitado. ciclos=' + ciclos + '/' + maxCiclos + ', minutos=' + minutosReintento);
  agendarReintentoDiferido_('recuperarBuscarEmpleos', minutosReintento, config, 'BUSQUEDA');
}

function incrementarCiclosFalloBusqueda_() {
  const props = PropertiesService.getScriptProperties();
  const actual = parseInt(props.getProperty('BUSQUEDA_CICLOS_FALLO_GEMINI') || '0', 10) || 0;
  const nuevo = actual + 1;
  props.setProperty('BUSQUEDA_CICLOS_FALLO_GEMINI', String(nuevo));
  return nuevo;
}

function resetearCiclosFalloBusqueda_() {
  PropertiesService.getScriptProperties().deleteProperty('BUSQUEDA_CICLOS_FALLO_GEMINI');
}

function obtenerResumenEmpleosExistentes_() {
  const sheet = _sheet(CONFIG.SHEETS.EMPLEOS);
  if (sheet.getLastRow() < 2) return 'Ninguno';
  const data = sheet.getRange(2, 2, Math.min(sheet.getLastRow() - 1, 25), 10).getValues();
  return data.map(row => `${row[0]} - ${row[1]} - ${row[9]}`).filter(Boolean).join('\n');
}

function obtenerDedupeEmpleos_() {
  const sheet = _sheet(CONFIG.SHEETS.EMPLEOS);
  const dedupe = { links: {}, cargoOrg: {} };
  if (sheet.getLastRow() < 2) return dedupe;
  const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 10).getValues();
  data.forEach(row => {
    const cargo = row[0];
    const org = row[1];
    const link = row[9];
    if (link) dedupe.links[normalizarTexto_(link)] = true;
    if (cargo || org) dedupe.cargoOrg[normalizarTexto_(cargo + '|' + org)] = true;
  });
  return dedupe;
}

function esDuplicadoEmpleo_(empleo, dedupe) {
  const link = normalizarTexto_(empleo.link || '');
  const tieneCargoOrg = Boolean(empleo.cargo || empleo.organizacion);
  const cargoOrg = tieneCargoOrg ? normalizarTexto_((empleo.cargo || '') + '|' + (empleo.organizacion || '')) : '';
  return (link && dedupe.links[link]) || (cargoOrg && dedupe.cargoOrg[cargoOrg]);
}

function registrarDedupe_(empleo, dedupe) {
  const link = normalizarTexto_(empleo.link || '');
  const tieneCargoOrg = Boolean(empleo.cargo || empleo.organizacion);
  const cargoOrg = tieneCargoOrg ? normalizarTexto_((empleo.cargo || '') + '|' + (empleo.organizacion || '')) : '';
  if (link) dedupe.links[link] = true;
  if (cargoOrg) dedupe.cargoOrg[cargoOrg] = true;
}

function obtenerTareasPendientes_(sheet, tipo, maxLote) {
  if (sheet.getLastRow() < 2) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, COLA_HEADERS.length).getValues();
  const ahora = new Date();
  const tareas = [];
  for (let i = 0; i < data.length && tareas.length < maxLote; i++) {
    const row = data[i];
    const estado = String(row[2] || '').trim();
    const proxima = row[6];
    const listaParaReintento = !proxima || !(proxima instanceof Date) || proxima <= ahora;
    if (row[1] === tipo && (estado === 'Pendiente' || estado === 'Error') && listaParaReintento) {
      tareas.push({
        filaCola: i + 2,
        filaEmpleo: row[3],
        intentos: row[4]
      });
    }
  }
  return tareas;
}

function marcarTarea_(sheet, filaCola, estado, error, minutosReintento) {
  sheet.getRange(filaCola, 3).setValue(estado);
  sheet.getRange(filaCola, 6).setValue(error || '');
  if (estado === 'Error') {
    const minutos = minutosReintento === undefined ? 30 : minutosReintento;
    sheet.getRange(filaCola, 7).setValue(new Date(Date.now() + minutos * 60 * 1000));
  } else if (estado === 'Completado' || estado === 'Fallo definitivo') {
    sheet.getRange(filaCola, 7).setValue('');
  }
}

function leerEmpleo_(sheet, fila) {
  const valores = sheet.getRange(fila, 1, 1, EMPLEOS_HEADERS.length).getValues()[0];
  const empleo = {};
  EMPLEOS_HEADERS.forEach((header, i) => empleo[header] = valores[i]);
  return empleo;
}

function escribirAnalisisEmpleo_(sheet, fila, analisis) {
  sheet.getRange(fila, 7).setValue(analisis.modalidad || 'No claro');
  sheet.getRange(fila, 8).setValue(analisis.ejecutable_desde_medellin || 'No claro');
  sheet.getRange(fila, 9).setValue(analisis.clasificacion_ubicacion || 'No claro');
  sheet.getRange(fila, 10).setValue(analisis.motivo_ubicacion || '');
  if (analisis.salario) sheet.getRange(fila, 17).setValue(analisis.salario);
  if (analisis.moneda) sheet.getRange(fila, 18).setValue(analisis.moneda);
  sheet.getRange(fila, 21).setValue(analisis.puntaje_match || '');
  sheet.getRange(fila, 22).setValue(analisis.nivel_match || '');
  sheet.getRange(fila, 23).setValue(analisis.razon_match || '');
  sheet.getRange(fila, 24).setValue(analisis.brechas || '');
  sheet.getRange(fila, 25).setValue(analisis.prioridad || '');
  sheet.getRange(fila, 26).setValue(analisis.accion_recomendada || 'Revisar');
  sheet.getRange(fila, 27).setValue(analisis.accion_recomendada === 'Descartar' ? 'Descartado' : 'Revisado');
  sheet.getRange(fila, 28).setValue(analisis.notas_para_aplicar || '');
  sheet.getRange(fila, 29).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm');
  sheet.getRange(fila, 31).setValue(analisis.salario_minimo_aplicable || '');
  sheet.getRange(fila, 32).setValue(analisis.cumple_salario || 'No claro');
}

// Internacionalização (i18n): Português do Brasil (pt-BR / pt), Inglês (en) e Espanhol (es).

export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'];

export const TRANSLATIONS = {
  'pt-BR': {
    'app.title': 'DINO DASH 3D',
    'menu.play': '▶ Jogar Agora',
    'menu.multiplayer': '🌐 Multiplayer',
    'menu.dinos': '🦖 Dinossauros',
    'menu.customize': '🎨 Personalização',
    'menu.gacha': '🎲 Gacha 3D',
    'menu.settings': '⚙️ Configurações',
    'menu.guide': '📖 Guia',
    'settings.title': '⚙️ Configurações',
    'settings.close': 'Fechar',
    'settings.tab.general': 'Geral',
    'settings.tab.graphics': 'Gráficos',
    'settings.tab.audio': 'Áudio',
    'settings.tab.controls': 'Controles',
    'settings.tab.a11y': 'Acessibilidade',
    'settings.language': 'Idioma',
    'settings.analytics_optin': '📊 Telemetria Anônima Opt-in (Sem Dados Pessoais)',
    'settings.error_panel': '🩺 Painel de Diagnóstico & Erros',
    'settings.reduce_flashes': '✨ Reduzir Flashes e Cintilações',
    'hud.paused': 'JOGO PAUSADO',
    'hud.gameover': 'FIM DE CORRIDA!',
    'hud.rematch': '🔄 Revanche na Mesma Sala'
  },
  en: {
    'app.title': 'DINO DASH 3D',
    'menu.play': '▶ Play Now',
    'menu.multiplayer': '🌐 Multiplayer',
    'menu.dinos': '🦖 Dinosaurs',
    'menu.customize': '🎨 Customize',
    'menu.gacha': '🎲 3D Gacha',
    'menu.settings': '⚙️ Settings',
    'menu.guide': '📖 Guide',
    'settings.title': '⚙️ Settings',
    'settings.close': 'Close',
    'settings.tab.general': 'General',
    'settings.tab.graphics': 'Graphics',
    'settings.tab.audio': 'Audio',
    'settings.tab.controls': 'Controls',
    'settings.tab.a11y': 'Accessibility',
    'settings.language': 'Language',
    'settings.analytics_optin': '📊 Opt-in Anonymous Telemetry (No Personal Data)',
    'settings.error_panel': '🩺 Diagnostics & Error Panel',
    'settings.reduce_flashes': '✨ Reduce Flashes & Strobes',
    'hud.paused': 'GAME PAUSED',
    'hud.gameover': 'GAME OVER!',
    'hud.rematch': '🔄 Rematch in Same Room'
  },
  es: {
    'app.title': 'DINO DASH 3D',
    'menu.play': '▶ Jugar Ahora',
    'menu.multiplayer': '🌐 Multijugador',
    'menu.dinos': '🦖 Dinosaurios',
    'menu.customize': '🎨 Personalización',
    'menu.gacha': '🎲 Gacha 3D',
    'menu.settings': '⚙️ Ajustes',
    'menu.guide': '📖 Guía',
    'settings.title': '⚙️ Ajustes',
    'settings.close': 'Cerrar',
    'settings.tab.general': 'General',
    'settings.tab.graphics': 'Gráficos',
    'settings.tab.audio': 'Audio',
    'settings.tab.controls': 'Controles',
    'settings.tab.a11y': 'Accesibilidad',
    'settings.language': 'Idioma',
    'settings.analytics_optin': '📊 Telemetría Anónima Opt-in (Sin Datos Personales)',
    'settings.error_panel': '🩺 Panel de Diagnóstico y Errores',
    'settings.reduce_flashes': '✨ Reducir Destellos y Parpadeos',
    'hud.paused': 'JUEGO EN PAUSA',
    'hud.gameover': '¡FIN DE LA CARRERA!',
    'hud.rematch': '🔄 Revancha en la Misma Sala'
  }
};

export function normalizeLocale(lang = 'pt-BR') {
  const raw = String(lang || 'pt-BR').trim().toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('es')) return 'es';
  return 'pt-BR';
}

export function t(key, lang = 'pt-BR') {
  const loc = normalizeLocale(lang);
  return TRANSLATIONS[loc]?.[key] ?? TRANSLATIONS['pt-BR']?.[key] ?? key;
}

export function applyDomLanguage(lang = 'pt-BR') {
  const loc = normalizeLocale(lang);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = loc;
  }
  return loc;
}

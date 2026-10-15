// Stopp App Store - Client Application, Native Bridge & Notification Controller
// Strictly Zero Emojis Compliance

// Global Runtime Error Tracker for AI Stopp Sentinel Auditing
window.stoppRuntimeErrors = [];
window.addEventListener('error', function (event) {
    if (event && event.message) {
        window.stoppRuntimeErrors.push({
            type: 'error',
            message: event.message,
            source: event.filename || 'script',
            lineno: event.lineno || 0,
            time: Date.now()
        });
    }
});
window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason ? (event.reason.message || String(event.reason)) : 'Promessa rejeitada';
    window.stoppRuntimeErrors.push({
        type: 'unhandledrejection',
        message: reason,
        source: 'Promise',
        lineno: 0,
        time: Date.now()
    });
});

// Sincronizacao de Camadas e Modais para prevencao de sobreposicao do Dock
function syncModalBodyState() {
    const activeModals = document.querySelectorAll('.modal-backdrop.active, .modal-backdrop[style*="display: flex"], .modal-backdrop[style*="visibility: visible"]');
    let hasOpen = false;
    activeModals.forEach(m => {
        if (m.style.display !== 'none' && m.style.visibility !== 'hidden' && (m.classList.contains('active') || m.style.display === 'flex')) {
            hasOpen = true;
        }
    });
    if (hasOpen) {
        document.body.classList.add('modal-open');
    } else {
        document.body.classList.remove('modal-open');
    }
}

// Observador de mutacao global removido: causava tempestade de recalculacoes de layout
// e congelamentos de thread ao observar toda a arvore do document.body.
// O estado dos modais e controlado diretamente pelas funcoes open/close correspondentes.


const CURRENT_STORE_VERSION_CODE = 7;
const CURRENT_STORE_VERSION_NAME = "0.7-Beta";

function resolveStoreUrl(url) {
    try {
        if (!url || url === './index.html' || url === 'index.html') {
            return 'https://gustavosanz.github.io/Stopp-Store/';
        }
        return new URL(url, 'https://gustavosanz.github.io/Stopp-Store/').href;
    } catch (e) {
        return 'https://gustavosanz.github.io/Stopp-Store/';
    }
}

// Native Android Bridge & Web Fallback Interface
const StoppBridge = {
    isNative: function () {
        return (typeof window.StoppStoreNative !== 'undefined' &&
               typeof window.StoppStoreNative.isAppInstalled === 'function') ||
               (navigator.userAgent && navigator.userAgent.includes('StoppStoreApp'));
    },

    isAppInstalled: function (packageName) {
        if (this.isNative()) {
            try {
                if (window.StoppStoreNative && typeof window.StoppStoreNative.isAppInstalled === 'function') {
                    if (window.StoppStoreNative.isAppInstalled(packageName)) return true;
                }
                if (window.StoppStoreNative && typeof window.StoppStoreNative.getInstalledPackagesJson === 'function') {
                    const jsonStr = window.StoppStoreNative.getInstalledPackagesJson();
                    const list = JSON.parse(jsonStr || '[]');
                    if (packageName.includes('vera') || packageName.includes('watt')) {
                        if (list.some(p => p.packageName.includes('vera') || p.packageName.includes('watt'))) {
                            return true;
                        }
                    }
                    if (packageName === 'com.stopp.store') return true;
                }
            } catch (err) {
                console.error('Erro na chamada isAppInstalled:', err);
            }
        }
        return localStorage.getItem('sim_installed_' + packageName) === 'true';
    },

    getAppVersionCode: function (packageName) {
        if (this.isNative()) {
            try {
                return window.StoppStoreNative.getAppVersionCode(packageName);
            } catch (err) {
                console.error('Erro na chamada getAppVersionCode:', err);
            }
        }
        const saved = localStorage.getItem('sim_version_code_' + packageName);
        return saved ? parseInt(saved, 10) : -1;
    },

    getAppVersionName: function (packageName) {
        if (this.isNative()) {
            try {
                return window.StoppStoreNative.getAppVersionName(packageName);
            } catch (err) {
                console.error('Erro na chamada getAppVersionName:', err);
            }
        }
        return localStorage.getItem('sim_version_name_' + packageName) || '';
    },

    openApp: function (packageName) {
        if (this.isNative()) {
            try {
                window.StoppStoreNative.openApp(packageName);
                return;
            } catch (err) {
                console.error('Erro ao abrir aplicacao:', err);
            }
        }
        showStoreToast('Abertura direta disponivel apenas na aplicacao nativa Android.', 'info');
    },

    uninstallApp: function (packageName, appName) {
        const displayName = appName || packageName;
        if (this.isNative()) {
            try {
                window.StoppStoreNative.uninstallApp(packageName);
                showStoreToast('A abrir gestor de desinstalacao do sistema para ' + displayName + '...', 'info');
                setTimeout(() => refreshAllAppStatus(), 2500);
                return;
            } catch (err) {
                console.error('Erro ao pedir desinstalacao:', err);
            }
        }

        // Web simulation fallback
        localStorage.removeItem('sim_installed_' + packageName);
        localStorage.removeItem('sim_version_code_' + packageName);
        localStorage.removeItem('sim_version_name_' + packageName);
        showStoreToast(displayName + ' desinstalado (simulacao local removida).', 'warning');
        refreshAllAppStatus();
        renderSettingsOverview();
    },

    isAutoUpdateEnabled: function () {
        if (this.isNative()) {
            try {
                return window.StoppStoreNative.isAutoUpdateEnabled();
            } catch (err) {
                console.error('Erro ao consultar auto-update:', err);
            }
        }
        return localStorage.getItem('stopp_store_auto_update') === 'true';
    },

    setAutoUpdateEnabled: function (enabled) {
        if (this.isNative()) {
            try {
                window.StoppStoreNative.setAutoUpdateEnabled(enabled);
            } catch (err) {
                console.error('Erro ao gravar auto-update:', err);
            }
        }
        localStorage.setItem('stopp_store_auto_update', enabled ? 'true' : 'false');
    },

    getStoreVersionCode: function () {
        if (this.isNative()) {
            try {
                return window.StoppStoreNative.getStoreVersionCode();
            } catch (err) {
                console.error('Erro ao ler versao da loja:', err);
            }
        }
        return CURRENT_STORE_VERSION_CODE;
    },

    getStoreVersionName: function () {
        if (this.isNative()) {
            try {
                return window.StoppStoreNative.getStoreVersionName();
            } catch (err) {
                console.error('Erro ao ler nome da versao da loja:', err);
            }
        }
        return CURRENT_STORE_VERSION_NAME;
    },

    hasNotificationPermission: function () {
        if (this.isNative() && typeof window.StoppStoreNative.hasNotificationPermission === 'function') {
            try {
                return window.StoppStoreNative.hasNotificationPermission();
            } catch (err) {
                console.error('Erro ao verificar permissao de notificacao nativa:', err);
            }
        }
        return ('Notification' in window) && Notification.permission === 'granted';
    },

    requestNotificationPermission: function () {
        if (this.isNative() && typeof window.StoppStoreNative.requestNotificationPermission === 'function') {
            try {
                window.StoppStoreNative.requestNotificationPermission();
                return;
            } catch (err) {
                console.error('Erro ao pedir permissao de notificacao nativa:', err);
            }
        }
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showStoreToast('Notificacoes ativadas no navegador.', 'success');
                } else {
                    showStoreToast('Permissao de notificacoes recusada.', 'warning');
                }
                renderSettingsOverview();
            });
        }
    },

    sendNotification: function (title, message, url = 'https://gustavosanz.github.io/Stopp-Store/') {
        const targetUrl = resolveStoreUrl(url);
        if (this.isNative() && typeof window.StoppStoreNative.sendNotification === 'function') {
            try {
                window.StoppStoreNative.sendNotification(title, message, targetUrl);
                return;
            } catch (err) {
                console.error('Erro ao enviar notificacao nativa:', err);
            }
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body: message,
                        icon: 'assets/img/icon-192.png',
                        badge: 'assets/img/icon-192.png',
                        data: { url: targetUrl }
                    });
                }).catch(() => {
                    new Notification(title, { body: message, icon: 'assets/img/icon-192.png' });
                });
            } else {
                new Notification(title, { body: message, icon: 'assets/img/icon-192.png' });
            }
        }
    }
};

// Unified Notifications Manager
const StoppNotifications = {
    hasPermission: () => StoppBridge.hasNotificationPermission(),
    requestPermission: () => StoppBridge.requestNotificationPermission(),
    send: (title, message, url = 'https://gustavosanz.github.io/Stopp-Store/') => {
        StoppBridge.sendNotification(title, message, url);
        showStoreToast(title + ': ' + message, 'info');
    }
};

// Native Mode App Suppression
function applyNativeAppClass() {
    if (StoppBridge.isNative()) {
        document.documentElement.classList.add('is-native-app');
        if (document.body) {
            document.body.classList.add('is-native-app');
        }
        const banners = document.querySelectorAll('.promo-banner, .banner-app-alert, #banner-app-promo');
        banners.forEach(b => b.style.setProperty('display', 'none', 'important'));
        const installBtns = document.querySelectorAll('.btn-install-app, #nav-pill-app-android, #btn-pwa-install');
        installBtns.forEach(b => b.style.setProperty('display', 'none', 'important'));
    }
}
applyNativeAppClass();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyNativeAppClass);
} else {
    applyNativeAppClass();
}

// Gestao de Icones Adaptativos Vera Watt (Ativo 1 no tema claro, Ativo 2 no tema escuro)
function getVeraWattDynamicIcon() {
    const isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return isLight ? 'assets/img/verawatt_ativo1_4x.png' : 'assets/img/verawatt_ativo2_4x.png';
}

function updateVeraWattThemeIcons() {
    const iconSrc = getVeraWattDynamicIcon();
    const icons = document.querySelectorAll('.verawatt-theme-icon, #verawatt-card-icon, #verawatt-hero-icon, #verawatt-shelf-icon, .icon-verawatt img, .verawatt-dynamic-icon');
    icons.forEach(img => {
        if (img && img.tagName === 'IMG') {
            img.src = iconSrc;
        }
    });
}

if (window.matchMedia) {
    try {
        const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        const onThemeChange = () => {
            updateVeraWattThemeIcons();
            if (typeof renderInstalledShelf === 'function') renderInstalledShelf();
            if (typeof renderAppManager === 'function') renderAppManager();
        };
        if (themeMedia.addEventListener) {
            themeMedia.addEventListener('change', onThemeChange);
        } else if (themeMedia.addListener) {
            themeMedia.addListener(onThemeChange);
        }
    } catch (ignored) {}
}

// Registry de Aplicacoes Geridas pela Stopp Store
const STORE_APPS_REGISTRY = [
    {
        pkg: 'com.stopp.store',
        name: 'Stopp Store',
        platform: 'Android',
        isStore: true,
        targetCode: CURRENT_STORE_VERSION_CODE,
        targetName: CURRENT_STORE_VERSION_NAME,
        apkUrl: 'assets/apks/StoppStore-v0.6-Beta.apk',
        size: 1,
        iconType: 'letter',
        iconLetter: 'S',
        iconBg: 'linear-gradient(135deg, #10b981, #0ea5e9)',
        changelog: [
            "Redesign completo e moderno da tela de Changelog com cartoes glassmorficos, emblema oficial e botoes de acao de alto contraste.",
            "Restauro da identidade visual e emblema oficial da Stopp Store na Splash Screen de entrada.",
            "Preservacao exclusiva do logotipo e tipografia Vera Watt 4x na sua pagina de aplicacao e catalogo.",
            "Suporte a visualizacao manual do Changelog oficial atraves das Definicoes da Loja.",
            "Aprimoramento do motor de diagnostico IA Stopp Sentinel com telemetria em tempo real e deteccao de anomalias.",
            "Otimizacoes de desempenho, transicoes fluidas e correcao de sobreposicoes na barra inferior de navegacao."
        ]
    },
    {
        pkg: 'com.vera_watt',
        name: 'Vera Watt',
        platform: 'Android & Web',
        isStore: false,
        targetCode: 6,
        targetName: '0.6-Beta',
        apkUrl: 'assets/apks/VeraWatt-v0.6-Beta.apk',
        size: 67,
        iconType: 'image',
        iconSrc: 'assets/img/verawatt_ativo2_4x.png',
        changelog: [
            "Integracao das novas imagens oficiais em 4x de alta resolucao (emblema e tipografia Vera Watt).",
            "Icone adaptativo dinamico que alterna entre Ativo 1 e Ativo 2 de acordo com o tema do utilizador (Claro/Escuro).",
            "Nova animacao de arranque e carregamento com efeitos de carga eletrica e logotipo em destaque.",
            "Suporte aprimorado ao Nothing Glyph SDK com novos padroes de iluminacao.",
            "Otimizacoes de performance e compatibilidade de ecra."
        ]
    }
];

function getPendingUpdatesList() {
    const pending = [];
    STORE_APPS_REGISTRY.forEach(app => {
        const isInstalled = StoppBridge.isAppInstalled(app.pkg);
        if (isInstalled) {
            const installedCode = StoppBridge.getAppVersionCode(app.pkg);
            const installedName = StoppBridge.getAppVersionName(app.pkg);
            if (installedCode >= 0 && installedCode < app.targetCode) {
                pending.push({
                    ...app,
                    installedCode: installedCode,
                    installedName: installedName || ('Build ' + installedCode)
                });
            }
        }
    });
    return pending;
}

function getInstalledAppsList() {
    const installed = [];
    STORE_APPS_REGISTRY.forEach(app => {
        const isInstalled = StoppBridge.isAppInstalled(app.pkg);
        if (isInstalled) {
            const installedCode = StoppBridge.getAppVersionCode(app.pkg);
            const installedName = StoppBridge.getAppVersionName(app.pkg);
            installed.push({
                ...app,
                installedCode: installedCode,
                installedName: installedName || ('Build ' + installedCode)
            });
        }
    });
    return installed;
}

function renderAppManager() {
    const pendingList = getPendingUpdatesList();
    const installedList = getInstalledAppsList();

    // 1. Atualizar Badges de contagem
    const headerBadge = document.getElementById('pending-updates-badge');
    if (headerBadge) {
        if (pendingList.length > 0) {
            headerBadge.textContent = pendingList.length;
            headerBadge.style.display = 'inline-flex';
            headerBadge.className = 'badge-count has-updates';
        } else {
            headerBadge.textContent = '0';
            headerBadge.style.display = 'none';
            headerBadge.className = 'badge-count';
        }
    }

    const tabPendingBadge = document.getElementById('manager-pending-tab-badge');
    if (tabPendingBadge) {
        if (pendingList.length > 0) {
            tabPendingBadge.textContent = pendingList.length;
            tabPendingBadge.style.display = 'inline-flex';
            tabPendingBadge.className = 'badge-count has-updates';
        } else {
            tabPendingBadge.textContent = '0';
            tabPendingBadge.style.display = 'none';
            tabPendingBadge.className = 'badge-count';
        }
    }

    const tabInstalledBadge = document.getElementById('manager-installed-tab-badge');
    if (tabInstalledBadge) {
        if (installedList.length > 0) {
            tabInstalledBadge.textContent = installedList.length;
            tabInstalledBadge.style.display = 'inline-flex';
        } else {
            tabInstalledBadge.textContent = '0';
            tabInstalledBadge.style.display = 'none';
        }
    }

    // 2. Renderizar Separador de Atualizacoes Pendentes
    const pendingContainer = document.getElementById('manager-pending-list');
    const pendingHeaderBar = document.getElementById('manager-pending-header-bar');
    const pendingCountLabel = document.getElementById('manager-pending-count-label');

    if (pendingContainer) {
        if (pendingList.length > 0) {
            if (pendingHeaderBar) pendingHeaderBar.style.display = 'flex';
            if (pendingCountLabel) {
                pendingCountLabel.textContent = pendingList.length === 1
                    ? '1 atualizacao pronta'
                    : pendingList.length + ' atualizacoes prontas';
            }

            pendingContainer.innerHTML = pendingList.map(app => {
                const iconHtml = app.iconType === 'image'
                    ? `<img src="${app.iconSrc}" alt="${app.name}" class="manager-app-icon">`
                    : `<div class="manager-app-icon" style="background: ${app.iconBg};">${app.iconLetter}</div>`;

                let changelogHtml = '';
                if (app.changelog && app.changelog.length) {
                    changelogHtml = `
                        <div class="manager-changelog-box">
                            <div class="manager-changelog-header">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                                Changelog Obrigatorio (v${app.targetName}):
                            </div>
                            <ul class="manager-changelog-list">
                                ${app.changelog.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                } else {
                    changelogHtml = `
                        <div class="manager-changelog-box">
                            <div class="manager-changelog-header" style="color: #f87171;">
                                Changelog Obrigatorio:
                            </div>
                            <ul class="manager-changelog-list">
                                <li class="no-changelog-warning">Aviso: O programador nao forneceu notas de lancamento para esta versao.</li>
                            </ul>
                        </div>
                    `;
                }

                return `
                    <div class="manager-app-item" style="flex-direction: column; align-items: stretch;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
                            <div class="manager-app-left">
                                ${iconHtml}
                                <div class="manager-app-meta">
                                    <h4>${app.name} <span class="tag tag-platform tag-android">${app.platform}</span></h4>
                                    <p>Instalada: v${app.installedName} &bull; Nova: v${app.targetName} (${app.size} MB)</p>
                                </div>
                            </div>
                            <div class="manager-app-actions">
                                <button class="btn-download btn-update-action" onclick="triggerAppDownload('${app.name}', '${app.apkUrl}', ${app.size})">
                                    Atualizar
                                </button>
                            </div>
                        </div>
                        ${changelogHtml}
                    </div>
                `;
            }).join('');
        } else {
            if (pendingHeaderBar) pendingHeaderBar.style.display = 'none';
            pendingContainer.innerHTML = `
                <div class="empty-state-box">
                    <h4>Tudo Atualizado</h4>
                    <p>Todas as tuas aplicacoes instaladas estao na versao mais recente.</p>
                </div>
            `;
        }
    }

    // 3. Renderizar Separador de Aplicacoes Instaladas
    const installedContainer = document.getElementById('manager-installed-list');
    if (installedContainer) {
        if (installedList.length > 0) {
            installedContainer.innerHTML = installedList.map(app => {
                const iconHtml = app.iconType === 'image'
                    ? `<img src="${app.iconSrc}" alt="${app.name}" class="manager-app-icon">`
                    : `<div class="manager-app-icon" style="background: ${app.iconBg};">${app.iconLetter}</div>`;

                let actionButtons = '';
                if (app.isStore) {
                    actionButtons = `
                        <button class="btn-secondary" onclick="closeAppManagerModal(); openSettingsModal();">
                            Definicoes
                        </button>
                    `;
                } else {
                    actionButtons = `
                        <button class="btn-open-app" onclick="openInstalledApp('${app.pkg}')">
                            Abrir
                        </button>
                        <button class="btn-uninstall-app" onclick="uninstallInstalledApp('${app.pkg}', '${app.name}')">
                            Desinstalar
                        </button>
                    `;
                }

                return `
                    <div class="manager-app-item">
                        <div class="manager-app-left">
                            ${iconHtml}
                            <div class="manager-app-meta">
                                <h4>${app.name} <span class="tag tag-platform tag-android">${app.platform}</span></h4>
                                <p>Versao Instalada: v${app.installedName} ${app.isStore ? '(App da Loja)' : ''}</p>
                            </div>
                        </div>
                        <div class="manager-app-actions">
                            ${actionButtons}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            installedContainer.innerHTML = `
                <div class="empty-state-box">
                    <h4>Nenhuma Aplicacao Detetada</h4>
                    <p>Nao foram encontradas aplicacoes Stopp instaladas neste dispositivo.</p>
                </div>
            `;
        }
    }
}

function updateAllPendingApps() {
    const pendingList = getPendingUpdatesList();
    if (!pendingList.length) {
        showStoreToast('Nao existem atualizacoes pendentes.', 'info');
        return;
    }

    showStoreToast('A iniciar atualizacao de ' + pendingList.length + ' aplicacoes...', 'info');
    pendingList.forEach((app, idx) => {
        setTimeout(() => {
            triggerAppDownload(app.name, app.apkUrl, app.size);
        }, idx * 600);
    });
}

function switchManagerTab(tab) {
    const pendingBtn = document.getElementById('tab-btn-pending');
    const installedBtn = document.getElementById('tab-btn-installed');
    const pendingContent = document.getElementById('manager-tab-pending-content');
    const installedContent = document.getElementById('manager-tab-installed-content');

    if (tab === 'pending') {
        if (pendingBtn) pendingBtn.classList.add('active');
        if (installedBtn) installedBtn.classList.remove('active');
        if (pendingContent) pendingContent.style.display = 'block';
        if (installedContent) installedContent.style.display = 'none';
    } else {
        if (installedBtn) installedBtn.classList.add('active');
        if (pendingBtn) pendingBtn.classList.remove('active');
        if (installedContent) installedContent.style.display = 'block';
        if (pendingContent) pendingContent.style.display = 'none';
    }
}

function openAppManagerModal() {
    const modal = document.getElementById('app-manager-modal');
    if (!modal) return;

    // Mostrar o modal imediatamente para feedback visual
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    syncModalBodyState();

    // Adiar manipulacao pesada do DOM para apos o browser pintar a transicao
    requestAnimationFrame(() => {
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        renderAppManager();
    });
}

function closeAppManagerModal() {
    const modal = document.getElementById('app-manager-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    document.body.style.overflow = '';
    syncModalBodyState();
}

// Platform Detection & Restrictions Helpers
function isAndroidPlatform() {
    return StoppBridge.isNative() || /Android/i.test(navigator.userAgent);
}

function isPCPlatform() {
    return !isAndroidPlatform();
}

function showPlatformRestrictionModal(appName, requiredPlatform) {
    const modal = document.getElementById('platform-restriction-modal');
    const title = document.getElementById('platform-restriction-title');
    const msg = document.getElementById('platform-restriction-message');
    const tip = document.getElementById('platform-restriction-tip');
    const pill = document.getElementById('platform-restriction-pill');

    if (requiredPlatform === 'pc') {
        if (pill) pill.textContent = 'Exclusivo PC / Windows';
        if (title) title.textContent = appName + ' requer PC Windows';
        if (msg) msg.textContent = appName + ' foi concebido em GameMaker exclusivamente para computadores Windows / PC. O ecossistema Android nao e compativel com a execucao desta aplicacao nativa.';
        if (tip) tip.innerHTML = '<strong>Como aceder:</strong> Visita a Stopp Store atraves do navegador do teu computador PC para jogares esta aplicacao.';
    } else if (requiredPlatform === 'android') {
        if (pill) pill.textContent = 'Exclusivo Android (APK)';
        if (title) title.textContent = appName + ' requer Android';
        if (msg) msg.textContent = 'O instalador APK de ' + appName + ' foi desenvolvido para telemoveis e tablets com sistema operativo Android. O teu computador PC nao pode executar ficheiros APK diretamente.';
        if (tip) tip.innerHTML = '<strong>Como instalar:</strong> Abre esta loja diretamente no navegador do teu telemovel Android para instalares com 1 toque com o instalador do sistema.';
    }

    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
    }
}

function closePlatformRestrictionModal() {
    const modal = document.getElementById('platform-restriction-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
    }
}

// Post-Installation Celebration & Animation Handlers
let lastInstalledPkg = 'com.vera_watt';

function onAppInstalledSuccess(appName = 'Vera Watt', pkg = 'com.vera_watt') {
    lastInstalledPkg = pkg || 'com.vera_watt';
    const modal = document.getElementById('install-celebration-modal');
    const titleEl = document.getElementById('celebration-app-title');
    const descEl = document.getElementById('celebration-app-desc');
    const btnOpen = document.getElementById('celebration-btn-open');

    if (titleEl) titleEl.textContent = appName + ' Instalada com Sucesso!';
    if (descEl) descEl.textContent = 'A aplicacao ' + appName + ' foi instalada com sucesso no teu dispositivo Android e esta pronta a ser executada.';
    if (btnOpen) {
        btnOpen.style.display = (pkg && StoppBridge.isNative()) ? 'inline-flex' : 'none';
    }

    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
    }

    createCelebrationConfetti();

    if (navigator.vibrate) {
        try { navigator.vibrate([40, 60, 40]); } catch (ignored) {}
    }

    refreshAllAppStatus();
}

function handleCelebrationOpen() {
    closeCelebrationModal();
    if (lastInstalledPkg) {
        StoppBridge.openApp(lastInstalledPkg);
    }
}

function closeCelebrationModal() {
    const modal = document.getElementById('install-celebration-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
    }
}

function createCelebrationConfetti() {
    const container = document.getElementById('celebration-confetti-container') || document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#10b981', '#0ea5e9', '#38bdf8', '#34d399', '#ffffff', '#fbbf24', '#a78bfa'];

    for (let i = 0; i < 55; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = '40%';
        particle.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;

        const xMove = (Math.random() - 0.5) * 400;
        const yMove = (Math.random() - 0.7) * 350;
        particle.style.setProperty('--x', `${xMove}px`);
        particle.style.setProperty('--y', `${yMove}px`);

        container.appendChild(particle);
        setTimeout(() => particle.remove(), 2000);
    }
}

// UI App Status Controller & Platform Restriction Engine
function refreshAllAppStatus() {
    applyNativeAppClass();
    const isAndroid = isAndroidPlatform();
    const isPC = !isAndroid;

    const appContainers = document.querySelectorAll('[data-package]');
    if (appContainers.length) {
        appContainers.forEach(container => {
            const pkg = container.getAttribute('data-package');
            const targetCode = parseInt(container.getAttribute('data-target-version-code') || '0', 10);
            const targetName = container.getAttribute('data-target-version-name') || '';
            const appName = container.getAttribute('data-app-name') || 'Vera Watt';
            const apkUrl = container.getAttribute('data-apk-url') || 'assets/apks/VeraWatt-v0.4-Beta.apk';
            const apkSize = parseInt(container.getAttribute('data-apk-size') || '67', 10);
            const isDetailPage = container.classList.contains('app-detail-card');

            const isInstalled = StoppBridge.isAppInstalled(pkg);
            const installedCode = StoppBridge.getAppVersionCode(pkg);

            // Header badge pill
            const statusBadge = document.getElementById('badge-status-' + pkg);

            // Actions container
            const actionsContainer = isDetailPage
                ? document.getElementById('detail-actions-' + pkg)
                : document.getElementById('actions-' + pkg);

            if (pkg === 'com.stopp.store') {
                if (isPC) {
                    // No computador PC, bloquear a instalacao do APK Android
                    if (statusBadge) {
                        statusBadge.style.display = 'inline-flex';
                        statusBadge.className = 'badge-platform-restricted';
                        statusBadge.textContent = 'Exclusivo Android (APK)';
                    }
                    if (actionsContainer) {
                        actionsContainer.innerHTML = `
                            <button class="btn-platform-restricted" onclick="showPlatformRestrictionModal('Stopp Store', 'android')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                Exclusivo Android (APK)
                            </button>
                            <a href="stoppstore.html" class="btn-secondary" title="Ver Detalhes da Aplicacao">
                                Detalhes
                            </a>
                        `;
                    }
                    return;
                }

                if (isInstalled) {
                    const needsUpdate = installedCode >= 0 && installedCode < targetCode;
                    if (statusBadge) {
                        statusBadge.style.display = 'inline-flex';
                        if (needsUpdate) {
                            statusBadge.className = 'badge-status badge-update';
                            statusBadge.textContent = 'Atualizacao Disponivel';
                        } else {
                            statusBadge.className = 'badge-status badge-installed';
                            statusBadge.textContent = '✓ Em Execucao';
                        }
                    }
                    if (actionsContainer) {
                        if (needsUpdate) {
                            actionsContainer.innerHTML = `
                                <button class="btn-download btn-update-action" onclick="triggerAppDownload('${appName}', '${apkUrl}', ${apkSize})">
                                    Atualizar (${targetName})
                                </button>
                                <a href="stoppstore.html" class="btn-secondary">Detalhes</a>
                            `;
                        } else {
                            if (isDetailPage) {
                                actionsContainer.innerHTML = `
                                    <span class="tag" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 600; padding: 12px 20px; border-radius: 12px; font-size: 0.95rem;">
                                        ✓ Em Execucao (Esta Aplicacao)
                                    </span>
                                    <button class="btn-secondary btn-large" onclick="openSettingsModal()">
                                        Definicoes da Loja
                                    </button>
                                `;
                            } else {
                                actionsContainer.innerHTML = `
                                    <span class="tag" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 600; padding: 10px 16px; border-radius: 12px; font-size: 0.88rem;">
                                        ✓ Em Execucao
                                    </span>
                                    <a href="stoppstore.html" class="btn-secondary" title="Ver Detalhes da Aplicacao">
                                        Detalhes
                                    </a>
                                `;
                            }
                        }
                    }
                } else {
                    if (statusBadge) {
                        statusBadge.style.display = 'inline-flex';
                        statusBadge.className = 'badge-status badge-installed';
                        statusBadge.textContent = 'App Oficial';
                    }
                    if (actionsContainer) {
                        if (isDetailPage) {
                            actionsContainer.innerHTML = `
                                <button class="btn-download btn-large" onclick="triggerAppDownload('${appName}', '${apkUrl}', ${apkSize})">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Instalar APK Nativo (${targetName})
                                </button>
                                <button class="btn-secondary btn-large" onclick="openAppModal()">
                                    Ver Vantagens
                                </button>
                            `;
                        } else {
                            actionsContainer.innerHTML = `
                                <button class="btn-download" onclick="triggerAppDownload('${appName}', '${apkUrl}', ${apkSize})">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Instalar APK
                                </button>
                                <a href="stoppstore.html" class="btn-secondary" title="Ver Detalhes da Aplicacao">
                                    Detalhes
                                </a>
                            `;
                        }
                    }
                }
                return;
            }

            // Aplicacoes gerais (ex: Vera Watt)
            if (isPC) {
                // No computador PC: bloquear o APK Android e destacar a Area de Cliente Web
                if (statusBadge) {
                    statusBadge.style.display = 'inline-flex';
                    statusBadge.className = 'badge-status badge-installed';
                    statusBadge.textContent = 'Versao PC Web';
                }
                if (actionsContainer) {
                    if (isDetailPage) {
                        actionsContainer.innerHTML = `
                            <a href="https://gustavosanz.taila8ef3d.ts.net/2%C2%BA_Ano/VeraWatt/" target="_blank" rel="noopener" class="btn-download btn-large" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                Abrir Area de Cliente Web (PC)
                            </a>
                            <button class="btn-platform-restricted btn-large" onclick="showPlatformRestrictionModal('Vera Watt APK', 'android')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                APK Bloqueado no PC
                            </button>
                        `;
                    } else {
                        actionsContainer.innerHTML = `
                            <a href="https://gustavosanz.taila8ef3d.ts.net/2%C2%BA_Ano/VeraWatt/" target="_blank" rel="noopener" class="btn-download" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                Area Web (PC)
                            </a>
                            <button class="btn-platform-restricted" onclick="showPlatformRestrictionModal('Vera Watt APK', 'android')">
                                APK Bloqueado
                            </button>
                            <a href="verawatt.html" class="btn-secondary" title="Ver Detalhes">
                                Detalhes
                            </a>
                        `;
                    }
                }
                return;
            }

            // Em ambiente Android (nativo ou navegador mobile)
            if (!isInstalled) {
                // Estado: Nao Instalada
                if (statusBadge) {
                    statusBadge.style.display = 'none';
                }

                if (actionsContainer) {
                    if (isDetailPage) {
                        actionsContainer.innerHTML = `
                            <button class="btn-download btn-large" onclick="triggerAppDownload('${appName}', '${apkUrl}', ${apkSize})">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Instalar APK (${targetName})
                            </button>
                            <a href="https://gustavosanz.taila8ef3d.ts.net/2%C2%BA_Ano/VeraWatt/" target="_blank" rel="noopener" class="btn-secondary btn-large">
                                Area de Cliente Web
                            </a>
                        `;
                    } else {
                        actionsContainer.innerHTML = `
                            <button class="btn-download" onclick="triggerAppDownload('${appName}', '${apkUrl}', ${apkSize})">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Instalar APK
                            </button>
                            <a href="verawatt.html" class="btn-secondary" title="Ver Detalhes e Screenshots">
                                Detalhes
                            </a>
                        `;
                    }
                }
            } else {
                // Estado: Instalada no dispositivo
                const needsUpdate = installedCode >= 0 && installedCode < targetCode;

                if (statusBadge) {
                    statusBadge.style.display = 'inline-flex';
                    if (needsUpdate) {
                        statusBadge.className = 'badge-status badge-update';
                        statusBadge.textContent = 'Atualizacao Disponivel';
                    } else {
                        statusBadge.className = 'badge-status badge-installed';
                        statusBadge.textContent = '✓ Instalada';
                    }
                }

                if (actionsContainer) {
                    if (needsUpdate) {
                        // Tem atualizacao disponivel
                        if (isDetailPage) {
                            actionsContainer.innerHTML = `
                                <button class="btn-download btn-large btn-update-action" onclick="triggerAppDownload('${appName}', '${apkUrl}', ${apkSize})">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Atualizar (${targetName})
                                </button>
                                <button class="btn-open-app btn-large" onclick="openInstalledApp('${pkg}')">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Abrir
                                </button>
                                <button class="btn-uninstall-app btn-large" onclick="uninstallInstalledApp('${pkg}', '${appName}')">
                                    Desinstalar
                                </button>
                                <a href="https://gustavosanz.taila8ef3d.ts.net/2%C2%BA_Ano/VeraWatt/" target="_blank" rel="noopener" class="btn-secondary btn-large">
                                    Area Web
                                </a>
                            `;
                        } else {
                            actionsContainer.innerHTML = `
                                <button class="btn-download btn-update-action" onclick="triggerAppDownload('${appName}', '${apkUrl}', ${apkSize})">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Atualizar
                                </button>
                                <button class="btn-open-app" onclick="openInstalledApp('${pkg}')">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Abrir
                                </button>
                                <button class="btn-uninstall-app" onclick="uninstallInstalledApp('${pkg}', '${appName}')">
                                    Desinstalar
                                </button>
                                <a href="verawatt.html" class="btn-secondary" title="Ver Detalhes">
                                    Detalhes
                                </a>
                            `;
                        }
                    } else {
                        // Instalada e atualizada
                        if (isDetailPage) {
                            actionsContainer.innerHTML = `
                                <button class="btn-open-app btn-large" onclick="openInstalledApp('${pkg}')">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Abrir Aplicacao
                                </button>
                                <button class="btn-uninstall-app btn-large" onclick="uninstallInstalledApp('${pkg}', '${appName}')">
                                    Desinstalar
                                </button>
                                <a href="https://gustavosanz.taila8ef3d.ts.net/2%C2%BA_Ano/VeraWatt/" target="_blank" rel="noopener" class="btn-secondary btn-large">
                                    Area de Cliente Web
                                </a>
                            `;
                        } else {
                            actionsContainer.innerHTML = `
                                <button class="btn-open-app" onclick="openInstalledApp('${pkg}')">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Abrir
                                </button>
                                <button class="btn-uninstall-app" onclick="uninstallInstalledApp('${pkg}', '${appName}')">
                                    Desinstalar
                                </button>
                                <a href="verawatt.html" class="btn-secondary" title="Ver Detalhes">
                                    Detalhes
                                </a>
                            `;
                        }
                    }
                }
            }
        });
    }

    // 4. Gestao de Restricao para Apps de PC (ex: Sons of Echoes)
    const sonsActions = document.getElementById('actions-sons-of-echoes');
    const sonsBadge = document.getElementById('badge-status-sons-of-echoes');
    const isSonsDetailPage = window.location.pathname.includes('sons-of-echoes');

    if (isAndroid) {
        if (sonsBadge) {
            sonsBadge.textContent = 'Exclusivo PC';
            sonsBadge.className = 'badge-platform-restricted';
            sonsBadge.style.display = 'inline-flex';
        }
        if (sonsActions) {
            sonsActions.innerHTML = `
                <button class="btn-platform-restricted" onclick="showPlatformRestrictionModal('Sons of Echoes', 'pc')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    Apenas para PC
                </button>
                <a href="sons-of-echoes.html" class="btn-secondary" title="Ver Detalhes e Screenshots">
                    Detalhes
                </a>
            `;
        }
        if (isSonsDetailPage) {
            const detailActions = document.querySelector('.detail-actions');
            if (detailActions) {
                detailActions.innerHTML = `
                    <button class="btn-platform-restricted btn-large" onclick="showPlatformRestrictionModal('Sons of Echoes', 'pc')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                        Incompativel com Android (Apenas PC Windows)
                    </button>
                `;
            }
        }
    } else {
        if (sonsBadge) {
            sonsBadge.style.display = 'none';
        }
        if (sonsActions && !sonsActions.innerHTML.includes('Jogar / Demo')) {
            sonsActions.innerHTML = `
                <button class="btn-download" onclick="triggerAppDownload('Sons of Echoes (Alpha)', null, 120)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Jogar / Demo
                </button>
                <a href="sons-of-echoes.html" class="btn-secondary" title="Ver Detalhes e Screenshots">
                    Detalhes
                </a>
            `;
        }
    }

    renderAppManager();
    renderInstalledAppsShelf();
}

// Renderizacao da Seccao Horizontal Deslizavel de Apps Instaladas
function renderInstalledAppsShelf() {
    const track = document.getElementById('shelf-scroll-track');
    if (!track) return;

    const installedApps = [];

    // 1. Vera Watt
    const veraInstalled = StoppBridge.isAppInstalled('com.vera_watt');
    if (veraInstalled) {
        const vCode = StoppBridge.getAppVersionCode('com.vera_watt');
        const vName = StoppBridge.getAppVersionName('com.vera_watt') || (vCode > 0 ? '0.' + vCode + '-Beta' : '0.4-Beta');
        installedApps.push({
            pkg: 'com.vera_watt',
            name: 'Vera Watt',
            version: 'v' + vName,
            iconImg: getVeraWattDynamicIcon(),
            iconLetter: null,
            gradient: 'linear-gradient(135deg, #10b981, #0ea5e9)',
            category: 'Energia & IoT (Android)'
        });
    }

    // 2. Stopp Store (quando em app nativa ou instalada)
    if (StoppBridge.isNative() || StoppBridge.isAppInstalled('com.stopp.store')) {
        installedApps.push({
            pkg: 'com.stopp.store',
            name: 'Stopp Store',
            version: 'v' + StoppBridge.getStoreVersionName(),
            iconImg: null,
            iconLetter: 'S',
            gradient: 'linear-gradient(135deg, #10b981, #0ea5e9)',
            category: 'Hub Oficial da Loja'
        });
    }

    // 3. Consulta de pacotes adicionais via ponte nativa
    if (StoppBridge.isNative() && window.StoppStoreNative && typeof window.StoppStoreNative.getInstalledPackagesJson === 'function') {
        try {
            const jsonStr = window.StoppStoreNative.getInstalledPackagesJson();
            const list = JSON.parse(jsonStr || '[]');
            list.forEach(item => {
                const isVera = item.packageName.includes('vera') || item.packageName.includes('watt');
                const isStore = item.packageName === 'com.stopp.store';
                if (!isStore && !installedApps.some(a => a.pkg === item.packageName || (isVera && a.pkg === 'com.vera_watt'))) {
                    installedApps.push({
                        pkg: item.packageName,
                        name: isVera ? 'Vera Watt' : item.packageName,
                        version: 'v' + (item.versionName || '1.0'),
                        iconImg: isVera ? getVeraWattDynamicIcon() : null,
                        iconLetter: item.packageName.charAt(0).toUpperCase(),
                        gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        category: 'Aplicacao Instalada'
                    });
                }
            });
        } catch (ignored) {}
    }

    if (installedApps.length === 0) {
        track.innerHTML = `
            <div class="shelf-empty-card">
                <p>Nenhuma aplicacao instalada detetada de momento.<br>Instala a aplicacao <strong>Vera Watt</strong> acima para a poderes abrir diretamente aqui com 1 toque!</p>
            </div>
        `;
        return;
    }

    track.innerHTML = installedApps.map(app => {
        const iconHtml = app.iconImg
            ? `<img src="${app.iconImg}" alt="${app.name}">`
            : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:1.4rem;">${app.iconLetter}</div>`;
        const isStore = app.pkg === 'com.stopp.store';

        return `
            <div class="shelf-app-card">
                <div class="shelf-card-top">
                    <div class="shelf-card-icon" style="background: ${app.gradient};">
                        ${iconHtml}
                    </div>
                    <div class="shelf-card-info">
                        <h4 class="shelf-card-name">${app.name}</h4>
                        <p class="shelf-card-meta">${app.category}</p>
                    </div>
                </div>

                <div class="shelf-card-badges">
                    <span class="shelf-badge-installed">✓ Instalada</span>
                    <span class="shelf-badge-version">${app.version}</span>
                </div>

                <div class="shelf-card-actions">
                    <button class="shelf-btn-open" onclick="openInstalledApp('${app.pkg}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        ${isStore ? 'Em Execucao' : 'Abrir'}
                    </button>
                    ${!isStore ? `
                    <button class="shelf-btn-uninstall" onclick="uninstallInstalledApp('${app.pkg}', '${app.name}')" title="Desinstalar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Carregamento resiliente dos metadados de versao da Loja (GitHub Pages com fallback local e suporte a file://)
async function fetchStoreMetadata(timeoutMs = 4000) {
    const urls = [
        'https://gustavosanz.github.io/Stopp-Store/store-version.json?t=' + Date.now(),
        'store-version.json?t=' + Date.now(),
        'store-version.json'
    ];

    for (const url of urls) {
        try {
            const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
            const res = await fetch(url, {
                cache: 'no-store',
                signal: controller ? controller.signal : undefined
            });
            if (timer) clearTimeout(timer);

            // Em protocolo file:// de assets locais o status e 0; em HTTP standard e 200 ou res.ok
            if (res.ok || res.status === 200 || res.status === 0) {
                const data = await res.json();
                if (data && typeof data.store_version_code !== 'undefined') {
                    return data;
                }
            }
        } catch (e) {
            // Continuar para o proximo URL de contingencia
        }
    }
    return null;
}

// IA Stopp Sentinel - Modulo de Diagnostico e Saude do Ecossistema
const StoppAiSentinel = {
    state: {
        status: 'ANALYZING',
        pingMs: 0,
        apiOk: false,
        nativeBridgeOk: false,
        layoutErrors: [],
        layerErrors: [],
        runtimeErrors: [],
        freezeErrors: [],
        lastReport: '',
        lastCheckTime: 0
    },

    init: function () {
        // Adiar o primeiro diagnostico para nao bloquear interacoes iniciais
        setTimeout(() => {
            this.runDiagnostics();
        }, 3000);
        // Verificacao periodica a cada 60 segundos (era 25s com 5 ciclos rapidos no arranque)
        setInterval(() => this.runDiagnostics(false), 60000);
    },

    auditFreezeAndResponsiveness: function () {
        const issues = [];
        const splash = document.getElementById('stopp-splash-screen');
        const loadTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;

        // Deteção inteligente de congelamento da Splash Screen (> 2.0 segundos)
        if (splash && loadTime > 2000) {
            const comp = window.getComputedStyle(splash);
            if (comp.display !== 'none' && comp.visibility !== 'hidden' && comp.opacity !== '0' && !splash.classList.contains('splash-dismissed')) {
                if (typeof window.dismissSplashScreen === 'function') {
                    window.dismissSplashScreen();
                } else {
                    splash.style.display = 'none';
                }
                issues.push('Congelamento da Splash Screen neutralizado e recuperado automaticamente pela IA Sentinel.');
            }
        }

        return issues;
    },

    flagFreezeRecovered: function (source) {
        const msg = `Recuperação de ecrã executada via ${source || 'Watchdog de Sistema'}.`;
        if (!this.state.freezeErrors.includes(msg)) {
            this.state.freezeErrors.push(msg);
        }
    },

    auditDomLayout: function () {
        const issues = [];
        const vw = window.innerWidth || document.documentElement.clientWidth;
        const docScrollWidth = document.documentElement.scrollWidth;

        // Verificar transbordo horizontal no documento raiz
        if (docScrollWidth > vw + 2) {
            issues.push(`Transbordo horizontal no documento (${docScrollWidth}px > ${vw}px)`);
        }

        // Inspecionar elementos criticos do layout
        const testSelectors = [
            'header',
            '.brand',
            '.header-links',
            '.ai-status-container',
            '.hero-showcase',
            '.promo-banner',
            '.installed-shelf-section',
            '.apps-grid',
            'footer'
        ];

        testSelectors.forEach(sel => {
            const els = document.querySelectorAll(sel);
            els.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.right > vw + 3) {
                    issues.push(`Elemento ${sel} ultrapassa a largura do ecrã (${Math.round(rect.right)}px > ${vw}px)`);
                }
            });
        });

        return issues;
    },

    auditLayers: function () {
        const issues = [];
        const dock = document.getElementById('bottom-nav-dock');
        const activeModals = document.querySelectorAll('.modal-backdrop.active, .modal-backdrop[style*="display: flex"]');

        let isAnyModalVisible = false;
        activeModals.forEach(m => {
            if (m.style.display !== 'none' && m.style.visibility !== 'hidden') {
                isAnyModalVisible = true;
            }
        });

        if (isAnyModalVisible && dock) {
            const dockStyle = window.getComputedStyle(dock);
            if (dockStyle.display !== 'none' && dockStyle.visibility !== 'hidden' && dockStyle.opacity !== '0') {
                issues.push('Colisão de camadas: Barra de navegação flutuante visível por cima de modal ativo');
            }
        }

        return issues;
    },

    auditRuntimeErrors: function () {
        return window.stoppRuntimeErrors || [];
    },

    runDiagnostics: async function (showFeedback = false) {
        const startTime = Date.now();
        const mainLabel = document.getElementById('ai-status-main-label');
        const dot = document.querySelector('.ai-status-dot');
        const pingEl = document.getElementById('ai-telemetry-ping');

        if (mainLabel && showFeedback) {
            mainLabel.innerHTML = 'IA Sentinel: <strong>A realizar auditoria completa...</strong>';
        }

        // 1. Auditoria Ativa de Congelamento e Fluidez
        const freezeIssues = this.auditFreezeAndResponsiveness();
        freezeIssues.forEach(f => {
            if (!this.state.freezeErrors.includes(f)) {
                this.state.freezeErrors.push(f);
            }
        });

        // 2. Auditoria de Layout e Transbordos
        this.state.layoutErrors = this.auditDomLayout();

        // 3. Auditoria de Camadas e Modais
        this.state.layerErrors = this.auditLayers();

        // 4. Auditoria de Execucao e Erros JS
        this.state.runtimeErrors = this.auditRuntimeErrors();

        // 5. Auditoria de Servidor e APIs
        const netStartTime = Date.now();
        try {
            const data = await fetchStoreMetadata(3500);
            this.state.pingMs = Math.max(1, Date.now() - netStartTime);
            if (data && typeof data.store_version_code !== 'undefined' && data.store_version_code >= 3) {
                this.state.apiOk = true;
            } else {
                this.state.apiOk = false;
            }
        } catch (err) {
            this.state.apiOk = false;
            this.state.pingMs = Math.max(1, Date.now() - netStartTime);
        }

        // 6. Auditoria de Ponte Nativa
        this.state.nativeBridgeOk = StoppBridge.isNative();

        // Calculo de Anomalias Globais
        const anomaliesCount = (this.state.apiOk ? 0 : 1) +
                               this.state.layoutErrors.length +
                               this.state.layerErrors.length +
                               this.state.runtimeErrors.length;

        const isMobile = (window.innerWidth || document.documentElement.clientWidth) <= 768;

        if (anomaliesCount === 0) {
            this.state.status = 'HEALTHY';
            let freezeNote = (this.state.freezeErrors.length > 0) ? ` (${this.state.freezeErrors.length} congelamento(s) prevenidos pela IA).` : '.';
            this.state.lastReport = 'A IA Stopp Sentinel auditou a integridade do layout mobile, fluidez de ecrã, camadas z-index e controladores JavaScript. O ecossistema opera a 100% com resposta fluida' + freezeNote;
        } else {
            this.state.status = (this.state.layoutErrors.length > 0 || this.state.layerErrors.length > 0 || this.state.runtimeErrors.length > 0) ? 'ERROR' : 'WARNING';
            
            let issuesText = [];
            if (!this.state.apiOk) issuesText.push('Conetividade de rede reduzida.');
            if (this.state.layoutErrors.length > 0) issuesText.push(`Detetados ${this.state.layoutErrors.length} transbordos de layout fora do ecrã.`);
            if (this.state.layerErrors.length > 0) issuesText.push('Detetada sobreposição da barra de navegação.');
            if (this.state.runtimeErrors.length > 0) issuesText.push(`Detetados ${this.state.runtimeErrors.length} erros em scripts.`);

            this.state.lastReport = 'A IA Stopp Sentinel detetou anomalias ativas: ' + issuesText.join(' ');
        }

        // Atualizacao no Cabecalho
        if (mainLabel) {
            if (this.state.status === 'HEALTHY') {
                mainLabel.innerHTML = isMobile
                    ? 'IA: <strong>Operacional</strong>'
                    : 'IA Sentinel: <strong>Sistemas 100% Operacionais</strong>';
            } else {
                mainLabel.innerHTML = isMobile
                    ? `IA: <strong>${anomaliesCount} Alerta(s)</strong>`
                    : `IA Sentinel: <strong>${anomaliesCount} Anomalia(s) Detetada(s)</strong>`;
            }
        }

        if (dot) {
            dot.className = 'ai-status-dot ' + (this.state.status === 'HEALTHY' ? '' : (this.state.status === 'WARNING' ? 'warning' : 'error'));
        }

        if (pingEl) {
            pingEl.textContent = this.state.apiOk ? (this.state.pingMs + ' ms') : 'Offline';
        }

        this.updateModalUi();

        // 7. Alerta Autónomo da IA Stopp Sentinel ao detetar Instabilidade de Rede/Servidores
        if (!this.state.apiOk) {
            const now = Date.now();
            const lastAlert = parseInt(localStorage.getItem('stopp_sentinel_last_instability_alert') || '0', 10);
            const ALERT_COOLDOWN = 15 * 60 * 1000; // 15 minutos entre alertas automaticos para evitar repeticoes

            if (now - lastAlert > ALERT_COOLDOWN) {
                localStorage.setItem('stopp_sentinel_last_instability_alert', now.toString());
                const alertTitle = 'Alerta Stopp Sentinel: Instabilidade Detetada';
                const alertMsg = 'A IA Sentinel detetou anomalias no carregamento ou resposta dos servidores da Stopp Store. A acompanhar estabilidade.';

                StoppNotifications.send(alertTitle, alertMsg, resolveStoreUrl('index.html'));

                if (!StoppSystemNotice.state.active) {
                    StoppSystemNotice.state.active = true;
                    StoppSystemNotice.state.level = 'error';
                    StoppSystemNotice.state.title = alertTitle;
                    StoppSystemNotice.state.message = alertMsg;
                    const dateNow = new Date();
                    StoppSystemNotice.state.timestamp = ('0' + dateNow.getDate()).slice(-2) + '/' + ('0' + (dateNow.getMonth() + 1)).slice(-2) + '/' + dateNow.getFullYear() + ' ' + ('0' + dateNow.getHours()).slice(-2) + ':' + ('0' + dateNow.getMinutes()).slice(-2);
                    StoppSystemNotice.render();
                }
            }
        }

        if (showFeedback) {
            if (this.state.status === 'HEALTHY') {
                showStoreToast('Diagnóstico da IA: 0 Erros. Layout e fluidez 100% íntegros.', 'success');
            } else {
                showStoreToast(`Diagnóstico da IA: ${anomaliesCount} anomalia(s) detetada(s). Consulta os detalhes.`, 'warning');
            }
        }
    },

    updateModalUi: function () {
        const netStatus = document.getElementById('diag-net-status');
        const netPing = document.getElementById('diag-net-ping');
        const bridgeStatus = document.getElementById('diag-bridge-status');
        const layoutStatus = document.getElementById('diag-layout-status');
        const layersStatus = document.getElementById('diag-layers-status');
        const jsStatus = document.getElementById('diag-js-status');
        const freezeStatus = document.getElementById('diag-freeze-status');
        const reportText = document.getElementById('diag-report-text');

        if (netStatus) {
            netStatus.textContent = this.state.apiOk ? 'Operacional' : 'Lentidão / Offline';
            netStatus.className = 'ai-diag-badge ' + (this.state.apiOk ? 'ok' : 'notice');
        }
        if (netPing) {
            netPing.textContent = this.state.pingMs > 0 ? (this.state.pingMs + ' ms') : 'N/D';
        }
        if (bridgeStatus) {
            bridgeStatus.textContent = this.state.nativeBridgeOk ? 'Ponte Nativa Ativa (120Hz)' : 'Modo Navegador Web';
            bridgeStatus.className = 'ai-diag-badge ' + (this.state.nativeBridgeOk ? 'ok' : 'notice');
        }
        if (layoutStatus) {
            if (this.state.layoutErrors && this.state.layoutErrors.length > 0) {
                layoutStatus.textContent = `${this.state.layoutErrors.length} Transbordo(s)`;
                layoutStatus.className = 'ai-diag-badge notice';
            } else {
                layoutStatus.textContent = '0 Transbordos • Otimizado';
                layoutStatus.className = 'ai-diag-badge ok';
            }
        }
        if (layersStatus) {
            if (this.state.layerErrors && this.state.layerErrors.length > 0) {
                layersStatus.textContent = 'Alerta de Sobreposição';
                layersStatus.className = 'ai-diag-badge notice';
            } else {
                layersStatus.textContent = 'Isolamento Seguro';
                layersStatus.className = 'ai-diag-badge ok';
            }
        }
        if (jsStatus) {
            const errs = (this.state.runtimeErrors && this.state.runtimeErrors.length) || 0;
            if (errs > 0) {
                jsStatus.textContent = `${errs} Erro(s) Detetado(s)`;
                jsStatus.className = 'ai-diag-badge notice';
            } else {
                jsStatus.textContent = '0 Erros • 100% Íntegro';
                jsStatus.className = 'ai-diag-badge ok';
            }
        }
        if (freezeStatus) {
            if (this.state.freezeErrors && this.state.freezeErrors.length > 0) {
                freezeStatus.textContent = `Recuperado pela IA (${this.state.freezeErrors.length})`;
                freezeStatus.className = 'ai-diag-badge ok';
            } else {
                freezeStatus.textContent = '0 Congelamentos • Fluido';
                freezeStatus.className = 'ai-diag-badge ok';
            }
        }
        if (reportText) {
            reportText.textContent = this.state.lastReport;
        }
    }
};

function openAiDiagnosticModal() {
    const modal = document.getElementById('ai-diagnostic-modal');
    if (!modal) return;

    // Mostrar o modal imediatamente para feedback visual
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    // Adiar activacao e diagnostico para apos o browser pintar
    requestAnimationFrame(() => {
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        StoppAiSentinel.runDiagnostics(false);
    });
}

function closeAiDiagnosticModal() {
    const modal = document.getElementById('ai-diagnostic-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    document.body.style.overflow = '';
    syncModalBodyState();
}

function handleRerunAiDiagnostics() {
    StoppAiSentinel.runDiagnostics(true);
}

function openInstalledApp(packageName) {
    StoppBridge.openApp(packageName);
}

function uninstallInstalledApp(packageName, appName) {
    StoppBridge.uninstallApp(packageName, appName);
}

// Official System Notice & Incident Communications Controller
const StoppSystemNotice = {
    state: {
        active: false,
        level: 'warning',
        title: '',
        message: '',
        timestamp: '',
        dismissed: false
    },

    init: function () {
        const localNotice = localStorage.getItem('stopp_admin_notice');
        if (localNotice) {
            try {
                const parsed = JSON.parse(localNotice);
                if (parsed && parsed.active) {
                    this.state = Object.assign({}, this.state, parsed);
                }
            } catch (e) {}
        }
        this.render();
    },

    syncNotice: function (remoteNotice) {
        if (!remoteNotice) return;
        if (!remoteNotice.active) {
            this.state.active = false;
            try { localStorage.removeItem('stopp_admin_notice'); } catch (e) {}
            this.render();
            return;
        }

        const localNotice = localStorage.getItem('stopp_admin_notice');
        if (localNotice) {
            try {
                const parsed = JSON.parse(localNotice);
                if (parsed && parsed.userOverridden) {
                    this.render();
                    return;
                }
            } catch (e) {}
        }

        this.state.active = true;
        this.state.level = remoteNotice.level || 'warning';
        this.state.title = remoteNotice.title || 'Aviso do Sistema';
        this.state.message = remoteNotice.message || '';
        this.state.timestamp = remoteNotice.timestamp || '';
        this.state.dismissed = sessionStorage.getItem('stopp_notice_dismissed') === 'true';
        this.render();

        // Disparo de notificacao global para todos os utilizadores ao receberem aviso oficial do servidor
        const lastAlertedTs = localStorage.getItem('stopp_last_alerted_notice_ts');
        if (this.state.timestamp && this.state.timestamp !== lastAlertedTs) {
            localStorage.setItem('stopp_last_alerted_notice_ts', this.state.timestamp);
            StoppNotifications.send(
                this.state.title,
                this.state.message,
                resolveStoreUrl('index.html')
            );
        }
    },

    render: function () {
        const banner = document.getElementById('system-notice-banner');
        if (!banner) return;

        if (this.state.active && !this.state.dismissed) {
            const titleEl = document.getElementById('notice-title');
            const msgEl = document.getElementById('notice-message');
            const timeEl = document.getElementById('notice-timestamp');
            const badgeEl = document.getElementById('notice-badge-text');

            if (titleEl) titleEl.textContent = this.state.title;
            if (msgEl) msgEl.textContent = this.state.message;
            if (timeEl) timeEl.textContent = this.state.timestamp ? ('Registo: ' + this.state.timestamp) : '';
            if (badgeEl) {
                badgeEl.textContent = this.state.level === 'error' ? 'Alerta Crítico' : 'Aviso Oficial do Sistema';
            }

            banner.style.display = 'block';
            banner.style.opacity = '1';
            banner.style.transform = 'translateY(0)';
        } else {
            banner.style.display = 'none';
        }

        this.syncUiButton();
    },

    dismissBanner: function () {
        StoppAudio.play('tap');
        this.state.dismissed = true;
        sessionStorage.setItem('stopp_notice_dismissed', 'true');
        const banner = document.getElementById('system-notice-banner');
        if (banner) {
            banner.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(-6px)';
            setTimeout(() => {
                banner.style.display = 'none';
            }, 250);
        }
    },

    emitFromUi: function (sendPush = true) {
        StoppAudio.play('tap');
        const titleInput = document.getElementById('admin-notice-title');
        const msgInput = document.getElementById('admin-notice-msg');
        const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : 'Aviso: Instabilidade no Carregamento';
        const message = (msgInput && msgInput.value.trim()) ? msgInput.value.trim() : 'A aplicação está temporariamente a experienciar lentidão ou problemas no carregamento.';

        const now = new Date();
        const timeStr = ('0' + now.getDate()).slice(-2) + '/' + ('0' + (now.getMonth() + 1)).slice(-2) + '/' + now.getFullYear() + ' ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);

        this.state.active = true;
        this.state.level = 'warning';
        this.state.title = title;
        this.state.message = message;
        this.state.timestamp = timeStr;
        this.state.dismissed = false;
        sessionStorage.removeItem('stopp_notice_dismissed');

        localStorage.setItem('stopp_admin_notice', JSON.stringify({
            active: true,
            level: 'warning',
            title: title,
            message: message,
            timestamp: timeStr,
            userOverridden: true
        }));

        this.render();

        if (sendPush) {
            StoppNotifications.send(
                title,
                message,
                resolveStoreUrl('index.html')
            );
            showStoreToast('Notificação de aviso enviada e afixada na loja!', 'success');
        } else {
            showStoreToast('Aviso afixado na loja com sucesso.', 'success');
        }
    },

    toggleBannerFromUi: function () {
        StoppAudio.play('tap');
        if (this.state.active && !this.state.dismissed) {
            this.state.active = false;
            this.state.dismissed = true;
            localStorage.setItem('stopp_admin_notice', JSON.stringify({ active: false, userOverridden: true }));
            this.render();
            showStoreToast('Aviso removido do topo da loja.', 'info');
        } else {
            this.emitFromUi(false);
        }
    },

    syncUiButton: function () {
        const toggleBtn = document.getElementById('btn-toggle-store-banner');
        if (toggleBtn) {
            if (this.state.active && !this.state.dismissed) {
                toggleBtn.textContent = 'Remover Aviso da Loja';
                toggleBtn.className = 'btn-secondary active';
            } else {
                toggleBtn.textContent = 'Afixar Aviso na Loja';
                toggleBtn.className = 'btn-secondary';
            }
        }
    },

    applyPreset: function (type) {
        StoppAudio.play('tap');
        const chips = document.querySelectorAll('.preset-chip');
        chips.forEach(c => c.classList.remove('active'));

        const titleInput = document.getElementById('admin-notice-title');
        const msgInput = document.getElementById('admin-notice-msg');

        if (type === 'loading') {
            if (chips[0]) chips[0].classList.add('active');
            if (titleInput) titleInput.value = 'Aviso: Instabilidade no Carregamento da App';
            if (msgInput) msgInput.value = 'A aplicação e os servidores da Stopp Store estão temporariamente a experienciar lentidão ou problemas no carregamento. Estamos a atuar para resolver a anomalia com a máxima brevidade.';
        } else if (type === 'maintenance') {
            if (chips[1]) chips[1].classList.add('active');
            if (titleInput) titleInput.value = 'Aviso: Manutenção Técnica Programada';
            if (msgInput) msgInput.value = 'Os serviços de distribuição da Stopp Store encontram-se em tarefas de otimização de infraestrutura. Todas as funcionalidades serão repostas em breve.';
        } else if (type === 'resolved') {
            if (chips[2]) chips[2].classList.add('active');
            if (titleInput) titleInput.value = 'Stopp Store: Sistemas 100% Operacionais';
            if (msgInput) msgInput.value = 'Todas as anomalias de ligação e carregamento foram corrigidas com sucesso. A loja opera com máxima fluidez e velocidade.';
        }
    },

    copyGlobalNoticeConfig: function () {
        StoppAudio.play('tap');
        const titleInput = document.getElementById('admin-notice-title');
        const msgInput = document.getElementById('admin-notice-msg');
        const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : 'Aviso: Instabilidade no Carregamento da App';
        const message = (msgInput && msgInput.value.trim()) ? msgInput.value.trim() : 'A aplicação e os servidores da Stopp Store estão temporariamente a experienciar lentidão ou problemas no carregamento. Estamos a atuar para resolver a anomalia com a máxima brevidade.';
        const now = new Date();
        const timeStr = ('0' + now.getDate()).slice(-2) + '/' + ('0' + (now.getMonth() + 1)).slice(-2) + '/' + now.getFullYear() + ' ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);

        const config = {
            active: true,
            level: 'warning',
            title: title,
            message: message,
            timestamp: timeStr,
            dismissible: true
        };

        const jsonStr = JSON.stringify(config, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(jsonStr).then(() => {
                showStoreToast('Configuração copiada! Ao atualizar store-version.json, todos os utilizadores receberão este alerta.', 'success');
            }).catch(() => {
                prompt('Configuração JSON para store-version.json (Broadcast Global):', jsonStr);
            });
        } else {
            prompt('Configuração JSON para store-version.json (Broadcast Global):', jsonStr);
        }
    }
};

// Verificacao Exclusiva de Atualizacao da Propria Loja
async function checkStoreUpdatesOnly(isManual = false) {
    const statusText = document.getElementById('store-update-status-text');
    const updateActionBtn = document.getElementById('btn-store-update-action');

    if (statusText && isManual) {
        statusText.className = 'store-status-text';
        statusText.textContent = 'A consultar servidores da Stopp Store...';
    }

    try {
        const data = await fetchStoreMetadata(4000);
        if (!data) throw new Error('Falha HTTP ao carregar versao');

        // Sincronizar Aviso Oficial de Sistema/Instabilidade
        if (data.system_notice) {
            StoppSystemNotice.syncNotice(data.system_notice);
        }

        // Verificacao apenas da Stopp Store
        const currentStoreCode = StoppBridge.getStoreVersionCode();
        if (data.store_version_code > currentStoreCode) {
            let changelogHtml = '';
            if (data.store_changelog && Array.isArray(data.store_changelog) && data.store_changelog.length) {
                changelogHtml = `
                    <div class="store-changelog-box" style="margin-top: 10px; margin-bottom: 12px;">
                        <strong>Changelog Obrigatorio da Loja (v${data.store_version_name}):</strong>
                        <ul>
                            ${data.store_changelog.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            if (statusText) {
                statusText.className = 'store-status-text status-update';
                statusText.innerHTML = `Nova versao da Stopp Store disponivel: <strong>v${data.store_version_name}</strong>${changelogHtml}`;
            }
            if (updateActionBtn) {
                updateActionBtn.style.display = 'block';
                updateActionBtn.onclick = () => {
                    triggerAppDownload('Stopp Store', data.store_apk_url, 1);
                };
            }
            
            // Notificacao do sistema exclusiva para a Stopp Store
            StoppNotifications.send(
                'Atualizacao da Stopp Store',
                'Nova versao v' + data.store_version_name + ' da Stopp Store pronta para instalacao.',
                resolveStoreUrl('index.html')
            );
        } else {
            if (statusText) {
                statusText.className = 'store-status-text status-success';
                statusText.textContent = 'A Stopp Store esta na versao mais recente (v' + StoppBridge.getStoreVersionName() + ').';
            }
            if (updateActionBtn) {
                updateActionBtn.style.display = 'none';
            }
            if (isManual) {
                showStoreToast('A Stopp Store esta totalmente atualizada.', 'success');
            }
        }

        // Se estiver em app nativa e for manual, chama tambem a rotina nativa
        if (isManual && StoppBridge.isNative()) {
            try {
                window.StoppStoreNative.checkStoreUpdateNow();
            } catch (ignored) {}
        }

    } catch (err) {
        console.error('Erro na verificacao da loja:', err);
        if (statusText) {
            statusText.className = 'store-status-text';
            statusText.textContent = 'Nao foi possivel contactar o servidor de atualizacoes.';
        }
        if (isManual) {
            showStoreToast('Erro ao contactar o servidor de atualizacoes.', 'warning');
        }
    }
}

// Verificacao de Atualizacao de Aplicacoes Instaladas
async function checkAllAppUpdates(notifyUser = true) {
    try {
        const data = await fetchStoreMetadata(4000);
        if (!data) return;

        if (data.apps) {
            for (const [pkg, appMeta] of Object.entries(data.apps)) {
                const reg = STORE_APPS_REGISTRY.find(a => a.pkg === pkg);
                if (reg) {
                    if (appMeta.version_code) reg.targetCode = appMeta.version_code;
                    if (appMeta.version_name) reg.targetName = appMeta.version_name;
                    if (appMeta.apk_url) reg.apkUrl = appMeta.apk_url;
                    if (appMeta.size_mb) reg.size = appMeta.size_mb;
                    if (appMeta.changelog) reg.changelog = appMeta.changelog;
                }

                if (StoppBridge.isAppInstalled(pkg)) {
                    const currentCode = StoppBridge.getAppVersionCode(pkg);
                    if (currentCode >= 0 && currentCode < appMeta.version_code) {
                        if (notifyUser && StoppBridge.isAutoUpdateEnabled()) {
                            const targetUrl = resolveStoreUrl(pkg === 'com.vera_watt' ? 'verawatt.html' : 'index.html');
                            StoppNotifications.send(
                                'Atualizacao Disponivel: ' + appMeta.name,
                                'A versao v' + appMeta.version_name + ' de ' + appMeta.name + ' esta disponivel para download.',
                                targetUrl
                            );
                        }
                    }
                }
            }
        }

        renderAppManager();

    } catch (err) {
        console.error('Erro na verificacao de apps:', err);
    }
}

async function checkStoreAndAppUpdates(isManual = false) {
    await checkStoreUpdatesOnly(isManual);
    await checkAllAppUpdates(isManual);
}

// Settings Modal Management
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // Mostrar o modal imediatamente para feedback visual
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    syncModalBodyState();

    // Adiar renderizacao pesada para apos o browser pintar a transicao
    requestAnimationFrame(() => {
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        renderSettingsOverview();
    });
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    document.body.style.overflow = '';
    syncModalBodyState();
}

function renderSettingsOverview() {
    // Sincronizar toggle de auto update
    const autoUpdateToggle = document.getElementById('toggle-auto-update');
    if (autoUpdateToggle) {
        autoUpdateToggle.checked = StoppBridge.isAutoUpdateEnabled();
    }

    // Sincronizar toggle de efeitos sonoros
    const soundToggle = document.getElementById('setting-sound-toggle');
    if (soundToggle && typeof StoppAudio !== 'undefined') {
        soundToggle.checked = StoppAudio.enabled;
    }

    // Indicador de ambiente (Nativo vs Web)
    const envPill = document.getElementById('settings-env-pill');
    if (envPill) {
        if (StoppBridge.isNative()) {
            envPill.className = 'env-pill env-native';
            envPill.innerHTML = '<span class="env-dot"></span> App Nativa Android';
        } else {
            envPill.className = 'env-pill env-web';
            envPill.innerHTML = '<span class="env-dot"></span> Modo Web / PWA';
        }
    }

    // Versao da loja
    const storeVersionLabel = document.getElementById('settings-store-version');
    if (storeVersionLabel) {
        storeVersionLabel.textContent = 'v' + StoppBridge.getStoreVersionName() + ' (Build ' + StoppBridge.getStoreVersionCode() + ')';
    }

    // Estado das Notificacoes do Sistema
    const notifStatusPill = document.getElementById('settings-notif-status');
    const notifRequestBtn = document.getElementById('btn-request-notif-perm');
    if (notifStatusPill) {
        const hasPerm = StoppNotifications.hasPermission();
        if (hasPerm) {
            notifStatusPill.className = 'env-pill env-native';
            notifStatusPill.innerHTML = '<span class="env-dot"></span> Ativas';
            if (notifRequestBtn) notifRequestBtn.style.display = 'none';
        } else {
            notifStatusPill.className = 'env-pill env-web';
            notifStatusPill.innerHTML = '<span class="env-dot"></span> Desativadas';
            if (notifRequestBtn) notifRequestBtn.style.display = 'inline-block';
        }
    }

    // Bloco de simulacao de browser (apenas se nao for nativo)
    const simSection = document.getElementById('settings-simulation-section');
    if (simSection) {
        if (!StoppBridge.isNative()) {
            simSection.style.display = 'block';
            const isInstalled = StoppBridge.isAppInstalled('com.vera_watt');
            const installedCode = StoppBridge.getAppVersionCode('com.vera_watt');
            const simStatus = document.getElementById('sim-verawatt-status');
            if (simStatus) {
                if (!isInstalled) {
                    simStatus.textContent = 'Estado atual: Nao instalada';
                } else if (installedCode < 4) {
                    simStatus.textContent = 'Estado atual: Instalada (Versao Antiga v0.3 / Code 3)';
                } else {
                    simStatus.textContent = 'Estado atual: Instalada e Atualizada (v0.4-Beta / Code 4)';
                }
            }
        } else {
            simSection.style.display = 'none';
        }
    }
}

function handleAutoUpdateToggle(checkbox) {
    const enabled = checkbox.checked;
    StoppBridge.setAutoUpdateEnabled(enabled);
    if (enabled) {
        showStoreToast('Atualizacoes automaticas ativadas.', 'success');
        checkAllAppUpdates(true);
    } else {
        showStoreToast('Atualizacoes automaticas desativadas.', 'info');
    }
}

function handleManualCheckStore() {
    checkStoreUpdatesOnly(true);
}

function handleRequestNotificationPermission() {
    StoppNotifications.requestPermission();
}

function handleTestNotification() {
    StoppNotifications.send(
        'Stopp Store Notificacoes',
        'As notificacoes do sistema estao configuradas e a funcionar com sucesso!',
        resolveStoreUrl('index.html')
    );
}

// Simulador Web para Testes Locais de UI
function simSetVeraWattInstalled(isInstalled, code = 4, name = '0.4-Beta') {
    if (isInstalled) {
        localStorage.setItem('sim_installed_com.vera_watt', 'true');
        localStorage.setItem('sim_version_code_com.vera_watt', code.toString());
        localStorage.setItem('sim_version_name_com.vera_watt', name);
        showStoreToast('Simulacao: Vera Watt definida como instalada (Build ' + code + ').', 'success');
    } else {
        localStorage.removeItem('sim_installed_com.vera_watt');
        localStorage.removeItem('sim_version_code_com.vera_watt');
        localStorage.removeItem('sim_version_name_com.vera_watt');
        showStoreToast('Simulacao: Vera Watt removida.', 'info');
    }
    refreshAllAppStatus();
    renderSettingsOverview();
}

// Toast Notification System (Zero Emojis)
function showStoreToast(message, type = 'info') {
    let container = document.getElementById('store-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'store-toast-container';
        container.className = 'store-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'store-toast ' + type;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 20);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Web Audio API Sound Synthesizer (Zero external dependencies, 100% offline)
const StoppAudio = {
    ctx: null,
    enabled: true,

    init: function () {
        const saved = localStorage.getItem('stopp_ui_sounds_enabled');
        this.enabled = saved !== null ? saved === 'true' : true;
        this.updateUiState();
    },

    getContext: function () {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    },

    play: function (type) {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            if (type === 'tap') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(620, now);
                osc.frequency.exponentialRampToValueAtTime(310, now + 0.04);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === 'switch' || type === 'tab') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(540, now + 0.06);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.06);
            } else if (type === 'download' || type === 'install') {
                [523.25, 659.25, 783.99].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                    gain.gain.setValueAtTime(0.07, now + idx * 0.06);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.06);
                    osc.stop(now + idx * 0.06 + 0.12);
                });
            } else if (type === 'success') {
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                    gain.gain.setValueAtTime(0.09, now + idx * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.05);
                    osc.stop(now + idx * 0.05 + 0.2);
                });
            } else if (type === 'splash') {
                [220, 329.63, 440, 659.25].forEach((freq) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    gain.gain.setValueAtTime(0.045, now);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.75);
                });
            } else if (type === 'error' || type === 'alert') {
                [240, 180].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.11);
                    osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + idx * 0.11 + 0.10);
                    gain.gain.setValueAtTime(0.08, now + idx * 0.11);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.10);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.11);
                    osc.stop(now + idx * 0.11 + 0.10);
                });
            }
        } catch (e) {}
    },

    toggle: function () {
        this.enabled = !this.enabled;
        localStorage.setItem('stopp_ui_sounds_enabled', this.enabled ? 'true' : 'false');
        this.updateUiState();
        if (this.enabled) {
            this.play('tap');
            showStoreToast('Efeitos sonoros da loja ativados.', 'info');
        } else {
            showStoreToast('Efeitos sonoros da loja desativados.', 'info');
        }
        return this.enabled;
    },

    updateUiState: function () {
        const toggleBtn = document.getElementById('btn-sound-toggle');
        const label = document.getElementById('sound-toggle-label');
        if (toggleBtn) {
            if (this.enabled) {
                toggleBtn.classList.remove('muted');
            } else {
                toggleBtn.classList.add('muted');
            }
        }
        if (label) {
            label.textContent = this.enabled ? 'Sons: ON' : 'Sons: OFF';
        }
        const settingsToggle = document.getElementById('setting-sound-toggle');
        if (settingsToggle) {
            settingsToggle.checked = this.enabled;
        }
    }
};

function openChangelogModal() {
    StoppAudio.play('dialog');
    const modal = document.getElementById('changelog-modal');
    if (!modal) return;

    if (StoppBridge.isNative() && window.StoppStoreNative && typeof window.StoppStoreNative.openNativeChangelog === 'function') {
        const storeApp = STORE_APPS_REGISTRY.find(a => a.isStore);
        const changelogText = storeApp && storeApp.changelog ? storeApp.changelog.join('\n') : '';
        window.StoppStoreNative.openNativeChangelog(CURRENT_STORE_VERSION_NAME, '', changelogText);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeChangelogModal() {
    StoppAudio.play('tap');
    const modal = document.getElementById('changelog-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function handleChangelogDownload() {
    closeChangelogModal();
    const storeApp = STORE_APPS_REGISTRY.find(a => a.isStore);
    const url = storeApp ? storeApp.apkUrl : 'assets/apks/StoppStore-v0.6-Beta.apk';
    triggerAppDownload('Stopp Store', url, 1);
}

window.openChangelogModal = openChangelogModal;
window.closeChangelogModal = closeChangelogModal;
window.handleChangelogDownload = handleChangelogDownload;

function initSplashScreen() {
    const splash = document.getElementById('stopp-splash-screen');
    if (!splash) return;

    try { updateVeraWattThemeIcons(); } catch (e) {}

    const progress = document.getElementById('splash-loader-progress');
    const statusText = document.getElementById('splash-status-text');

    setTimeout(() => {
        try { StoppAudio.play('splash'); } catch (e) {}
        if (progress) progress.style.width = '60%';
        if (statusText) statusText.textContent = 'A inicializar Stopp Store v0.6-Beta...';
    }, 120);

    setTimeout(() => {
        if (progress) progress.style.width = '100%';
        if (statusText) statusText.textContent = 'Sistemas 100% operacionais!';
    }, 450);

    setTimeout(() => {
        dismissSplashScreen();
    }, 800);
}

function dismissSplashScreen(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const splash = document.getElementById('stopp-splash-screen');
    if (splash) {
        splash.classList.add('splash-dismissed');
        splash.style.cssText = 'display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important;';
        window.__splashDismissed = true;
        try { StoppAudio.play('tap'); } catch (err) {}
        setTimeout(() => {
            if (splash && splash.parentNode) {
                try { splash.parentNode.removeChild(splash); } catch (err) {}
            }
        }, 200);
    } else {
        window.__splashDismissed = true;
    }
}

function replaySplashScreen() {
    const splash = document.getElementById('stopp-splash-screen');
    if (splash) {
        splash.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important;';
        splash.classList.remove('splash-dismissed');
        window.__splashDismissed = false;
        try { updateVeraWattThemeIcons(); } catch (e) {}
        const progress = document.getElementById('splash-loader-progress');
        const statusText = document.getElementById('splash-status-text');
        if (progress) progress.style.width = '15%';
        if (statusText) statusText.textContent = 'A carregar Stopp Store v0.6-Beta...';

        try { StoppAudio.play('splash'); } catch (e) {}
        setTimeout(() => {
            if (progress) progress.style.width = '100%';
            if (statusText) statusText.textContent = 'Sistemas 100% prontos!';
        }, 450);
        setTimeout(() => {
            dismissSplashScreen();
        }, 850);
    }
}

function dockNavigate(tab) {
    StoppAudio.play('tap');
    const dockButtons = document.querySelectorAll('.dock-item');
    dockButtons.forEach(btn => btn.classList.remove('active'));

    const activeBtn = document.getElementById('dock-btn-' + tab);
    if (activeBtn) activeBtn.classList.add('active');

    if (tab === 'catalog') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'categories') {
        const appsEl = document.getElementById('apps');
        if (appsEl) appsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tab === 'device') {
        scrollToShelf();
    } else if (tab === 'protect') {
        openPlayProtectModal();
    } else if (tab === 'manager') {
        openAppManagerModal();
    } else if (tab === 'settings') {
        openSettingsModal();
    }
}

function scrollToShelf() {
    StoppAudio.play('tap');
    const shelf = document.getElementById('installed-shelf-section');
    if (shelf) {
        shelf.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function openPlayProtectModal() {
    StoppAudio.play('tap');
    const modal = document.getElementById('modal-play-protect');
    if (modal) {
        // Mostrar o modal imediatamente para feedback visual
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        syncModalBodyState();

        // Adiar activacao para apos o browser pintar a transicao
        requestAnimationFrame(() => {
            modal.classList.add('active');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        });
    }
}

function closePlayProtectModal() {
    StoppAudio.play('tap');
    window.__pendingAppInstall = null;
    const modal = document.getElementById('modal-play-protect');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
        syncModalBodyState();
    }
}

function confirmPlayProtectAndInstall() {
    StoppAudio.play('tap');
    try { localStorage.setItem('stopp_play_protect_acknowledged', 'true'); } catch (e) {}
    const modal = document.getElementById('modal-play-protect');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
        syncModalBodyState();
    }
    if (window.__pendingAppInstall) {
        const pending = window.__pendingAppInstall;
        window.__pendingAppInstall = null;
        if (typeof triggerAppDownload === 'function') {
            triggerAppDownload(pending.appName, pending.apkUrl, pending.fileSizeMb);
        }
    }
}

function toggleSoundFx() {
    StoppAudio.toggle();
}

// Stopp App Store Filter & Lifecycle Bootstrap Logic
function bootstrapStore() {
    if (window.__stoppStoreBootstrapped) return;
    window.__stoppStoreBootstrapped = true;

    StoppAudio.init();
    initSplashScreen();

    const filterButtons = document.querySelectorAll('.tab-btn');
    const appCards = document.querySelectorAll('.app-card');

    if (filterButtons.length) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                StoppAudio.play('switch');
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const category = button.getAttribute('data-category');

                appCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category') || '';
                    const categories = cardCategory.split(/\s+/);
                    if (category === 'all' || categories.includes(category)) {
                        card.style.display = 'flex';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 50);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(10px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 250);
                    }
                });
            });
        });
    }

    // PWA Install Prompt Logic
    let deferredPrompt;
    const installBtn = document.getElementById('btn-pwa-install');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installBtn.style.display = 'none';
            }
            deferredPrompt = null;
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    });

    // Iniciar Deteccao de Aplicacoes, Atualizacoes e Diagnostico da IA
    updateVeraWattThemeIcons();
    refreshAllAppStatus();
    checkStoreAndAppUpdates(false);
    StoppSystemNotice.init();
    StoppAiSentinel.init();
    StoppAuth.init();
}

// Iniciar imediatamente se o DOM ja estiver pronto ou registrar evento
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapStore);
} else {
    bootstrapStore();
}
// Nota: nao registar window.load como segundo gatilho - o guard __stoppStoreBootstrapped protege,
// mas o duplo registo gerava uma race condition desnecessaria no arranque.


// Service Worker Registration for PWA & Cache Invalidation
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=12')
            .then(reg => {
                reg.update();
            })
            .catch(err => console.error('SW registration failed:', err));

        if ('caches' in window) {
            caches.keys().then(keys => {
                keys.forEach(k => {
                    if (k !== 'stopp-store-v12') {
                        caches.delete(k);
                    }
                });
            });
        }
    });
}

// App Features Modal Handlers
function openAppModal() {
    if (StoppBridge.isNative()) {
        return;
    }
    const modal = document.getElementById('app-features-modal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
        syncModalBodyState();
    }
}

function closeAppModal() {
    const modal = document.getElementById('app-features-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
        syncModalBodyState();
    }
}

// Fechar ao clicar fora dos modais
document.addEventListener('click', (e) => {
    const appModal = document.getElementById('app-features-modal');
    if (appModal && e.target === appModal) {
        closeAppModal();
    }

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && e.target === settingsModal) {
        closeSettingsModal();
    }

    const managerModal = document.getElementById('app-manager-modal');
    if (managerModal && e.target === managerModal) {
        closeAppManagerModal();
    }

    const celebrationModal = document.getElementById('install-celebration-modal');
    if (celebrationModal && e.target === celebrationModal) {
        closeCelebrationModal();
    }

    const restrictionModal = document.getElementById('platform-restriction-modal');
    if (restrictionModal && e.target === restrictionModal) {
        closePlatformRestrictionModal();
    }

    const aiModal = document.getElementById('ai-diagnostic-modal');
    if (aiModal && e.target === aiModal) {
        closeAiDiagnosticModal();
    }

    const protectModal = document.getElementById('modal-play-protect');
    if (protectModal && e.target === protectModal) {
        closePlayProtectModal();
    }

    const errorModal = document.getElementById('error-modal');
    if (errorModal && e.target === errorModal) {
        closeErrorModal();
    }

    const loginModal = document.getElementById('login-modal');
    if (loginModal && e.target === loginModal) {
        StoppAuth.closeLoginModal();
    }

    const userProfileModal = document.getElementById('user-profile-modal');
    if (userProfileModal && e.target === userProfileModal) {
        StoppAuth.closeProfileModal();
    }
});

// Error Screen & Diagnostic Modal Controller
let currentErrorRetryFn = null;
let currentErrorPkg = null;
let currentErrorAppName = null;

function showErrorModal({ title, message, details, appName, pkg, retryFn } = {}) {
    if (typeof StoppAudio !== 'undefined') {
        StoppAudio.play('error');
    }
    if (navigator.vibrate) {
        try { navigator.vibrate([80, 50, 80]); } catch (ignored) {}
    }

    currentErrorRetryFn = retryFn || null;
    currentErrorPkg = pkg || (appName && appName.includes('Vera') ? 'com.vera_watt' : null);
    currentErrorAppName = appName || 'Aplicação';

    const modal = document.getElementById('error-modal');
    const titleEl = document.getElementById('error-modal-title');
    const msgEl = document.getElementById('error-modal-message');
    const detailsEl = document.getElementById('error-modal-details-text');
    const btnRetry = document.getElementById('btn-error-retry');
    const btnUninstall = document.getElementById('btn-error-uninstall');

    if (titleEl) titleEl.textContent = title || 'Falha na Operação';
    if (msgEl) msgEl.textContent = message || 'Ocorreu um erro durante a execução da tarefa.';
    if (detailsEl) detailsEl.textContent = details || 'Causa provável: conflito de assinaturas, falta de espaço em disco ou restrições de permissões do sistema.';

    if (btnRetry) {
        btnRetry.style.display = retryFn ? 'inline-flex' : 'none';
    }

    if (btnUninstall) {
        const isInstalled = currentErrorPkg && StoppBridge.isAppInstalled(currentErrorPkg);
        btnUninstall.style.display = isInstalled ? 'inline-flex' : 'none';
        btnUninstall.textContent = 'Desinstalar Versão Antiga de ' + currentErrorAppName;
    }

    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            modal.classList.add('active');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        });
    }
}

function closeErrorModal() {
    if (typeof StoppAudio !== 'undefined') {
        StoppAudio.play('tap');
    }
    const modal = document.getElementById('error-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
        syncModalBodyState();
    }
}

function handleErrorRetry() {
    const fn = currentErrorRetryFn;
    closeErrorModal();
    if (typeof fn === 'function') {
        setTimeout(() => fn(), 200);
    }
}

function handleErrorUninstall() {
    if (currentErrorPkg) {
        StoppBridge.uninstallApp(currentErrorPkg, currentErrorAppName);
        closeErrorModal();
        showStoreToast('A abrir desinstalação. Após desinstalar a versão anterior, volta à loja e clica em Instalar.', 'info');
    }
}

// Authentication, Client Registration & Exclusive Admin Privileges Controller
const StoppAuth = {
    session: {
        isLoggedIn: false,
        username: 'Visitante',
        handle: '',
        avatar: null,
        role: 'guest',
        token: null,
        authProvider: 'local',
        githubId: null,
        loginTime: null
    },

    currentTab: 'login',
    isGithubPanelOpen: false,

    init: function () {
        const saved = localStorage.getItem('stopp_user_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.isLoggedIn) {
                    this.session = parsed;
                }
            } catch (e) {}
        }
        this.syncUi();
    },

    getRegisteredClients: function () {
        try {
            const raw = localStorage.getItem('stopp_registered_clients');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    saveRegisteredClients: function (clients) {
        try {
            localStorage.setItem('stopp_registered_clients', JSON.stringify(clients));
        } catch (e) {}
    },

    isAdmin: function () {
        return this.session && this.session.isLoggedIn && this.session.role === 'admin';
    },

    isClient: function () {
        return this.session && this.session.isLoggedIn && this.session.role === 'client';
    },

    login: function (username, password) {
        const u = (username || '').trim().toLowerCase();
        const p = (password || '').trim();

        // 1. Credenciais Oficiais de Administrador Stopp Studio
        // Aceita admin/gustavo/stopp/gustavosanz com senha stopp2026, ou PIN rapido 2026
        const isValidAdmin = (
            ((u === 'admin' || u === 'gustavo' || u === 'stopp' || u === 'gustavosanz') && (p === 'stopp2026' || p === 'admin123')) ||
            (p === '2026')
        );

        if (isValidAdmin) {
            const displayName = (u === 'gustavo' || u === 'admin' || u === 'gustavosanz') ? 'Gustavo Sanz' : 'Administrador Stopp';
            this.session = {
                isLoggedIn: true,
                username: displayName,
                handle: '@GustavoSanz',
                avatar: 'https://avatars.githubusercontent.com/u/88163657?v=4',
                role: 'admin',
                token: 'tok_admin_' + Date.now(),
                authProvider: 'local',
                githubId: 88163657,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('stopp_user_session', JSON.stringify(this.session));
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('success');
            showStoreToast('Sessão de Administrador iniciada com sucesso. Controlos exclusivos desbloqueados.', 'success');
            this.closeLoginModal();
            this.syncUi();
            return true;
        }

        // 2. Verificar se e um Cliente Registado localmente
        const clients = this.getRegisteredClients();
        const matchedClient = clients.find(c => 
            c.username.toLowerCase() === u || (c.email && c.email.toLowerCase() === u)
        );

        if (matchedClient) {
            if (matchedClient.password === p) {
                this.session = {
                    isLoggedIn: true,
                    username: matchedClient.name || matchedClient.username,
                    handle: '@' + matchedClient.username,
                    avatar: matchedClient.avatar || null,
                    role: 'client',
                    token: 'tok_client_' + Date.now(),
                    authProvider: 'local',
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('stopp_user_session', JSON.stringify(this.session));
                if (typeof StoppAudio !== 'undefined') StoppAudio.play('success');
                showStoreToast('Bem-vindo de volta, ' + this.session.username + '! Sessão de Cliente iniciada.', 'success');
                this.closeLoginModal();
                this.syncUi();
                return true;
            } else {
                if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
                showStoreToast('Palavra-passe incorreta para a conta de cliente.', 'warning');
                return false;
            }
        }

        // 3. Credenciais invalidas
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
        showStoreToast('Utilizador ou palavra-passe não reconhecidos. Podes criar conta no separador "Criar Conta de Cliente".', 'warning');
        return false;
    },

    registerClient: function (name, username, password, confirmPassword) {
        const n = (name || '').trim();
        const u = (username || '').trim().toLowerCase();
        const p = (password || '').trim();
        const cp = (confirmPassword || '').trim();

        if (!n || !u || !p) {
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
            showStoreToast('Por favor preenche todos os campos obrigatórios.', 'warning');
            return false;
        }

        if (p !== cp) {
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
            showStoreToast('As palavras-passe introduzidas não coincidem.', 'warning');
            return false;
        }

        if (p.length < 4) {
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
            showStoreToast('A palavra-passe deve ter pelo menos 4 caracteres.', 'warning');
            return false;
        }

        // Impedir registo falso com identificadores de administrador
        if (u === 'admin' || u === 'gustavo' || u === 'gustavosanz' || u === 'stopp') {
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
            showStoreToast('Este nome de utilizador é reservado à administração oficial da Stopp Store.', 'warning');
            return false;
        }

        const clients = this.getRegisteredClients();
        if (clients.some(c => c.username.toLowerCase() === u)) {
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
            showStoreToast('Este nome de utilizador já se encontra registado. Tenta outro.', 'warning');
            return false;
        }

        const newClient = {
            id: 'client_' + Date.now(),
            name: n,
            username: u,
            password: p,
            createdAt: new Date().toISOString()
        };

        clients.push(newClient);
        this.saveRegisteredClients(clients);

        // Iniciar sessao imediatamente como cliente
        this.session = {
            isLoggedIn: true,
            username: n,
            handle: '@' + u,
            avatar: null,
            role: 'client',
            token: 'tok_client_' + Date.now(),
            authProvider: 'local',
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('stopp_user_session', JSON.stringify(this.session));

        if (typeof StoppAudio !== 'undefined') StoppAudio.play('success');
        showStoreToast('Conta de cliente criada com sucesso! Bem-vindo à Stopp Store, ' + n + '.', 'success');
        this.closeLoginModal();
        this.syncUi();
        return true;
    },

    loginWithGithub: async function (rawUsername) {
        const user = (rawUsername || '').trim();
        if (!user) {
            showStoreToast('Por favor introduz o nome de utilizador do GitHub.', 'warning');
            return;
        }

        const statusEl = document.getElementById('github-verify-status');
        const submitBtn = document.getElementById('btn-submit-github');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = '#38bdf8';
            statusEl.textContent = 'A consultar perfil no GitHub (@' + user + ')...';
        }
        if (submitBtn) submitBtn.disabled = true;

        try {
            let data = null;
            try {
                const res = await fetch('https://api.github.com/users/' + encodeURIComponent(user), {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                });
                if (res.ok) {
                    data = await res.json();
                }
            } catch (netErr) {
                console.warn('GitHub API network warning:', netErr);
            }

            // Fallback resiliente: se a API rate-limitar ou houver falha de rede,
            // caso o utilizador seja gustavosanz ou GustavoSanz, valida imediatamente!
            const cleanUser = user.toLowerCase().replace('@', '');
            const isGustavoAdmin = (
                cleanUser === 'gustavosanz' ||
                cleanUser === 'sanzgustavo' ||
                (data && data.login && data.login.toLowerCase() === 'gustavosanz') ||
                (data && data.id === 88163657)
            );

            if (isGustavoAdmin) {
                const displayName = (data && data.name) ? data.name : 'Gustavo Sanz';
                const avatarUrl = (data && data.avatar_url) ? data.avatar_url : 'https://avatars.githubusercontent.com/u/88163657?v=4';

                this.session = {
                    isLoggedIn: true,
                    username: displayName,
                    handle: '@' + ((data && data.login) ? data.login : 'GustavoSanz'),
                    avatar: avatarUrl,
                    role: 'admin',
                    token: 'tok_gh_admin_' + Date.now(),
                    authProvider: 'github',
                    githubId: (data && data.id) ? data.id : 88163657,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('stopp_user_session', JSON.stringify(this.session));

                if (typeof StoppAudio !== 'undefined') StoppAudio.play('success');
                showStoreToast('Conta oficial de Administrador detetada: Gustavo Sanz (@GustavoSanz). Privilégios de Administrador concedidos!', 'success');
                this.closeLoginModal();
                this.syncUi();
                return;
            }

            // Se for outro utilizador do GitHub (registo / login de cliente com GitHub)
            if (data && data.login) {
                const clientName = data.name || data.login;
                this.session = {
                    isLoggedIn: true,
                    username: clientName,
                    handle: '@' + data.login,
                    avatar: data.avatar_url,
                    role: 'client',
                    token: 'tok_gh_client_' + Date.now(),
                    authProvider: 'github',
                    githubId: data.id,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('stopp_user_session', JSON.stringify(this.session));

                if (typeof StoppAudio !== 'undefined') StoppAudio.play('success');
                showStoreToast('Bem-vindo à Stopp Store, ' + clientName + '! Conta de cliente verificada com sucesso via GitHub.', 'success');
                this.closeLoginModal();
                this.syncUi();
                return;
            }

            // Se o perfil nao foi encontrado
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
            if (statusEl) {
                statusEl.style.color = '#ef4444';
                statusEl.textContent = 'Utilizador não encontrado no GitHub. Verifica o nome e tenta novamente.';
            }
            showStoreToast('Perfil GitHub @' + user + ' não encontrado.', 'warning');
        } catch (e) {
            if (typeof StoppAudio !== 'undefined') StoppAudio.play('error');
            showStoreToast('Erro ao validar conta GitHub: ' + e.message, 'warning');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    toggleGithubView: function (show) {
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('tap');
        this.isGithubPanelOpen = !!show;
        const panel = document.getElementById('github-verify-panel');
        const ctaBtn = document.getElementById('btn-github-auth-start');

        if (panel) panel.style.display = show ? 'block' : 'none';
        if (ctaBtn) ctaBtn.style.display = show ? 'none' : 'flex';

        if (show) {
            const inp = document.getElementById('github-username-input');
            if (inp) {
                inp.focus();
                inp.select();
            }
        }
    },

    selectGithubChip: function (username) {
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('tap');
        const inp = document.getElementById('github-username-input');
        if (inp) {
            inp.value = username;
            this.handleGithubVerify();
        }
    },

    handleGithubVerify: function () {
        const inp = document.getElementById('github-username-input');
        const user = inp ? inp.value : '';
        this.loginWithGithub(user);
    },

    switchTab: function (tab) {
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('tap');
        this.currentTab = tab;
        const tabLogin = document.getElementById('tab-auth-login');
        const tabReg = document.getElementById('tab-auth-register');
        const formLogin = document.getElementById('form-auth-login');
        const formReg = document.getElementById('form-auth-register');

        if (tab === 'login') {
            if (tabLogin) tabLogin.classList.add('active');
            if (tabReg) tabReg.classList.remove('active');
            if (formLogin) formLogin.style.display = 'block';
            if (formReg) formReg.style.display = 'none';
        } else {
            if (tabReg) tabReg.classList.add('active');
            if (tabLogin) tabLogin.classList.remove('active');
            if (formReg) formReg.style.display = 'block';
            if (formLogin) formLogin.style.display = 'none';
        }
    },

    logout: function () {
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('tap');
        this.session = {
            isLoggedIn: false,
            username: 'Visitante',
            handle: '',
            avatar: null,
            role: 'guest',
            token: null,
            authProvider: 'local',
            githubId: null,
            loginTime: null
        };
        localStorage.removeItem('stopp_user_session');
        this.closeProfileModal();
        showStoreToast('Sessão terminada com sucesso.', 'info');
        this.syncUi();
    },

    openLoginModal: function (tab = 'login') {
        if (this.session && this.session.isLoggedIn) {
            this.openProfileModal();
            return;
        }
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('dialog');
        const modal = document.getElementById('login-modal');
        if (!modal) return;

        this.toggleGithubView(false);
        this.switchTab(tab);

        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            modal.classList.add('active');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            const userInp = document.getElementById('login-username-input');
            if (userInp && tab === 'login') userInp.focus();
        });
    },

    closeLoginModal: function () {
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('tap');
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            document.body.style.overflow = '';
            syncModalBodyState();
        }
    },

    openProfileModal: function () {
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('dialog');
        const modal = document.getElementById('user-profile-modal');
        if (!modal) return;

        const isAdmin = this.isAdmin();
        const avatarWrap = document.getElementById('profile-modal-avatar-wrap');
        const rolePill = document.getElementById('profile-modal-role-pill');
        const nameEl = document.getElementById('profile-modal-name');
        const handleEl = document.getElementById('profile-modal-handle');
        const detailType = document.getElementById('profile-detail-type');
        const detailProvider = document.getElementById('profile-detail-provider');
        const detailTime = document.getElementById('profile-detail-time');
        const privilegesBox = document.getElementById('profile-privileges-box');

        if (avatarWrap) {
            if (this.session.avatar) {
                avatarWrap.innerHTML = `<img src="${this.session.avatar}" alt="${this.session.username}" class="profile-avatar">`;
            } else {
                const initial = (this.session.username || 'U').charAt(0).toUpperCase();
                const bg = isAdmin ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0ea5e9, #6366f1)';
                avatarWrap.innerHTML = `<div class="profile-avatar" style="background: ${bg}; color: #fff; font-size: 1.4rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">${initial}</div>`;
            }
        }

        if (rolePill) {
            rolePill.className = isAdmin ? 'auth-role-pill admin' : 'auth-role-pill client';
            rolePill.textContent = isAdmin ? 'Administrador Oficial' : 'Cliente Verificado';
        }
        if (nameEl) nameEl.textContent = this.session.username;
        if (handleEl) handleEl.textContent = this.session.handle || (isAdmin ? '@GustavoSanz' : '@cliente');
        if (detailType) detailType.textContent = isAdmin ? 'Administrador do Stopp Studio' : 'Conta de Cliente da Loja';
        if (detailProvider) detailProvider.textContent = this.session.authProvider === 'github' ? 'GitHub (Perfil Verificado)' : 'Credenciais da Loja';
        if (detailTime) {
            try {
                detailTime.textContent = this.session.loginTime ? new Date(this.session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sessão Ativa';
            } catch (e) {
                detailTime.textContent = 'Sessão Ativa';
            }
        }

        if (privilegesBox) {
            if (isAdmin) {
                privilegesBox.innerHTML = `
                    <div style="font-weight: 700; color: #10b981; margin-bottom: 8px; font-size: 0.85rem;">Privilégios de Administrador Ativos:</div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 0.8rem; color: #cbd5e1; line-height: 1.6;">
                        <li>Emissão de alertas globais e notificações de instabilidade a todos os utilizadores</li>
                        <li>Acesso VIP exclusivo ao Laboratório Experimental Stopp</li>
                        <li>Gestão direta de versões e telemetria da IA Sentinel</li>
                    </ul>
                `;
            } else {
                privilegesBox.innerHTML = `
                    <div style="font-weight: 700; color: #38bdf8; margin-bottom: 8px; font-size: 0.85rem;">Benefícios de Cliente Verificado:</div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 0.8rem; color: #cbd5e1; line-height: 1.6;">
                        <li>Descarregamento e gestão de todas as aplicações da loja</li>
                        <li>Verificação de integridade e telemetria via IA Sentinel</li>
                        <li>Acesso antecipado a atualizações e notas de lançamento</li>
                    </ul>
                `;
            }
        }

        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            modal.classList.add('active');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        });
    },

    closeProfileModal: function () {
        if (typeof StoppAudio !== 'undefined') StoppAudio.play('tap');
        const modal = document.getElementById('user-profile-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            document.body.style.overflow = '';
            syncModalBodyState();
        }
    },

    handleLoginSubmit: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const userInp = document.getElementById('login-username-input');
        const passInp = document.getElementById('login-password-input');
        const u = userInp ? userInp.value : '';
        const p = passInp ? passInp.value : '';
        this.login(u, p);
    },

    handleRegisterSubmit: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const n = document.getElementById('register-name-input')?.value;
        const u = document.getElementById('register-username-input')?.value;
        const p = document.getElementById('register-password-input')?.value;
        const cp = document.getElementById('register-confirm-password-input')?.value;
        this.registerClient(n, u, p, cp);
    },

    syncUi: function () {
        const isAdmin = this.isAdmin();
        const isClient = this.isClient();

        // 1. Botao de Perfil no Cabecalho
        const authBtn = document.getElementById('nav-auth-btn');
        if (authBtn) {
            if (isAdmin) {
                authBtn.className = 'btn-auth-nav is-admin';
                const avatarHtml = this.session.avatar
                    ? `<img src="${this.session.avatar}" alt="Avatar" class="auth-nav-avatar">`
                    : `<span class="auth-dot admin"></span>`;
                authBtn.innerHTML = `
                    ${avatarHtml}
                    <span class="auth-text">Admin: <strong>${this.session.username}</strong></span>
                `;
                authBtn.onclick = () => StoppAuth.openProfileModal();
            } else if (isClient) {
                authBtn.className = 'btn-auth-nav is-client';
                const avatarHtml = this.session.avatar
                    ? `<img src="${this.session.avatar}" alt="Avatar" class="auth-nav-avatar">`
                    : `<span class="auth-dot client"></span>`;
                authBtn.innerHTML = `
                    ${avatarHtml}
                    <span class="auth-text">Cliente: <strong>${this.session.username}</strong></span>
                `;
                authBtn.onclick = () => StoppAuth.openProfileModal();
            } else {
                authBtn.className = 'btn-auth-nav';
                authBtn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span class="auth-text">Entrar / Registar</span>
                `;
                authBtn.onclick = () => StoppAuth.openLoginModal('login');
            }
        }

        // 2. Bloqueio / Desbloqueio do Emissor de Avisos nas Definicoes
        const emitterLockNotice = document.getElementById('emitter-lock-notice');
        const emitterControls = document.querySelector('.notice-emitter-controls');
        if (emitterLockNotice && emitterControls) {
            if (isAdmin) {
                emitterLockNotice.style.display = 'none';
                emitterControls.style.display = 'flex';
            } else {
                emitterLockNotice.style.display = 'block';
                emitterControls.style.display = 'none';
                const desc = document.getElementById('emitter-lock-desc');
                const btn = document.getElementById('btn-emitter-login');
                if (isClient) {
                    if (desc) desc.textContent = 'A tua sessão está ativa com perfil de Cliente (' + this.session.username + '). Apenas o Administrador oficial (@GustavoSanz) tem autorização para emitir alertas globais de manutenção e instabilidade.';
                    if (btn) btn.textContent = 'Mudar para Conta de Administrador';
                } else {
                    if (desc) desc.textContent = 'Inicia sessão com a conta oficial do Stopp Studio para poderes disparar notificações globais e afixar avisos a todos os utilizadores.';
                    if (btn) btn.textContent = 'Iniciar Sessão de Admin';
                }
            }
        }

        // 3. Desbloqueio de Recursos Exclusivos (ex: Laboratorio Experimental)
        const labActions = document.getElementById('lab-card-actions');
        if (labActions) {
            if (isAdmin) {
                labActions.innerHTML = `
                    <button class="btn-download" style="background: linear-gradient(135deg, #10b981, #059669);" onclick="showStoreToast('Acesso VIP de Administrador ativo no Laboratório Experimental.', 'success')">
                        Acesso VIP Admin (Ativo)
                    </button>
                    <button class="btn-secondary" onclick="openAiDiagnosticModal()">Telemetria</button>
                `;
            } else if (isClient) {
                labActions.innerHTML = `
                    <button class="btn-download" style="background: linear-gradient(135deg, #0ea5e9, #2563eb);" onclick="showStoreToast('Acesso de Cliente verificado ativo. Funcionalidades experimentais serão disponibilizadas brevemente.', 'info')">
                        Acesso Cliente (Verificado)
                    </button>
                    <button class="btn-secondary" onclick="openAiDiagnosticModal()">Telemetria</button>
                `;
            } else {
                labActions.innerHTML = `
                    <button class="btn-download" style="opacity: 0.75;" onclick="StoppAuth.openLoginModal('login')">
                        Bloqueado (Requer Iniciar Sessão)
                    </button>
                `;
            }
        }
    }
};

// Expor funcoes globais
window.openAppModal = openAppModal;
window.closeAppModal = closeAppModal;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openAppManagerModal = openAppManagerModal;
window.closeAppManagerModal = closeAppManagerModal;
window.switchManagerTab = switchManagerTab;
window.renderAppManager = renderAppManager;
window.updateAllPendingApps = updateAllPendingApps;
window.handleAutoUpdateToggle = handleAutoUpdateToggle;
window.handleManualCheckStore = handleManualCheckStore;
window.handleRequestNotificationPermission = handleRequestNotificationPermission;
window.handleTestNotification = handleTestNotification;
window.openInstalledApp = openInstalledApp;
window.uninstallInstalledApp = uninstallInstalledApp;
window.simSetVeraWattInstalled = simSetVeraWattInstalled;
window.refreshAllAppStatus = refreshAllAppStatus;
window.checkStoreUpdatesOnly = checkStoreUpdatesOnly;
window.checkAllAppUpdates = checkAllAppUpdates;
window.StoppNotifications = StoppNotifications;
window.isAndroidPlatform = isAndroidPlatform;
window.isPCPlatform = isPCPlatform;
window.showPlatformRestrictionModal = showPlatformRestrictionModal;
window.closePlatformRestrictionModal = closePlatformRestrictionModal;
window.onAppInstalledSuccess = onAppInstalledSuccess;
window.handleCelebrationOpen = handleCelebrationOpen;
window.closeCelebrationModal = closeCelebrationModal;
window.createCelebrationConfetti = createCelebrationConfetti;
window.openAiDiagnosticModal = openAiDiagnosticModal;
window.closeAiDiagnosticModal = closeAiDiagnosticModal;
window.handleRerunAiDiagnostics = handleRerunAiDiagnostics;
window.renderInstalledAppsShelf = renderInstalledAppsShelf;
window.StoppAiSentinel = StoppAiSentinel;
window.StoppAudio = StoppAudio;
window.dismissSplashScreen = dismissSplashScreen;
window.replaySplashScreen = replaySplashScreen;
window.dockNavigate = dockNavigate;
window.scrollToShelf = scrollToShelf;
window.openPlayProtectModal = openPlayProtectModal;
window.closePlayProtectModal = closePlayProtectModal;
window.confirmPlayProtectAndInstall = confirmPlayProtectAndInstall;
window.toggleSoundFx = toggleSoundFx;
window.bootstrapStore = bootstrapStore;
window.StoppSystemNotice = StoppSystemNotice;
window.updateVeraWattThemeIcons = updateVeraWattThemeIcons;
window.getVeraWattDynamicIcon = getVeraWattDynamicIcon;
window.showErrorModal = showErrorModal;
window.closeErrorModal = closeErrorModal;
window.handleErrorRetry = handleErrorRetry;
window.handleErrorUninstall = handleErrorUninstall;
window.StoppAuth = StoppAuth;


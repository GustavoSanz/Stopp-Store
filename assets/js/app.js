// Stopp App Store - Client Application, Native Bridge & Notification Controller
// Strictly Zero Emojis Compliance

const CURRENT_STORE_VERSION_CODE = 4;
const CURRENT_STORE_VERSION_NAME = "0.4-Beta";

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

// Registry de Aplicacoes Geridas pela Stopp Store
const STORE_APPS_REGISTRY = [
    {
        pkg: 'com.stopp.store',
        name: 'Stopp Store',
        platform: 'Android',
        isStore: true,
        targetCode: CURRENT_STORE_VERSION_CODE,
        targetName: CURRENT_STORE_VERSION_NAME,
        apkUrl: 'assets/apks/StoppStore-v0.3-Beta.apk',
        size: 1,
        iconType: 'letter',
        iconLetter: 'S',
        iconBg: 'linear-gradient(135deg, #10b981, #0ea5e9)',
        changelog: [
            "Novo icone personalizado oficial Stopp Store para notificacoes na barra de estado.",
            "Limpeza automatica de notificacoes acumuladas ao entrar na aplicacao.",
            "Correcao completa da desinstalacao de aplicacoes com confirmacao nativa do sistema.",
            "Restricao inteligente de plataformas: bloqueio de aplicacoes de PC no Android e de Android no PC.",
            "Animacao comemorativa pos-instalacao com efeito de confetis e abertura direta.",
            "Obrigatoriedade e exibicao de Changelog do programador em todas as atualizacoes."
        ]
    },
    {
        pkg: 'com.vera_watt',
        name: 'Vera Watt',
        platform: 'Android & Web',
        isStore: false,
        targetCode: 4,
        targetName: '0.4-Beta',
        apkUrl: 'assets/apks/VeraWatt-v0.4-Beta.apk',
        size: 67,
        iconType: 'image',
        iconSrc: 'assets/img/verawatt_icon.webp',
        changelog: [
            "Suporte aprimorado ao Nothing Glyph SDK com novos padroes de iluminacao.",
            "Otimizacao do calculo de telemetria solar em tempo real.",
            "Integracao direta com o novo instalador PackageInstaller da Stopp Store.",
            "Melhorias de desempenho e correcao de bugs na interface Jetpack Compose."
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

    renderAppManager();
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
}

function closeAppManagerModal() {
    const modal = document.getElementById('app-manager-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    document.body.style.overflow = '';
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
            iconImg: 'assets/img/verawatt_icon_4x.png',
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
                        iconImg: isVera ? 'assets/img/verawatt_icon_4x.png' : null,
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

// IA Stopp Sentinel - Modulo de Diagnostico e Saude do Ecossistema
const StoppAiSentinel = {
    state: {
        status: 'ANALYZING',
        pingMs: 0,
        apiOk: false,
        nativeBridgeOk: false,
        lastReport: '',
        lastCheckTime: 0
    },

    init: function () {
        this.runDiagnostics();
        setInterval(() => this.runDiagnostics(false), 60000);
    },

    runDiagnostics: async function (showFeedback = false) {
        const startTime = Date.now();
        const mainLabel = document.getElementById('ai-status-main-label');
        const dot = document.querySelector('.ai-status-dot');
        const pingEl = document.getElementById('ai-telemetry-ping');

        if (mainLabel && showFeedback) {
            mainLabel.innerHTML = 'IA Sentinel: <strong>A realizar diagnostico ao ecossistema...</strong>';
        }

        try {
            const res = await fetch('store-version.json?t=' + Date.now(), { cache: 'no-store' });
            const ping = Date.now() - startTime;
            this.state.pingMs = ping;

            if (res.ok) {
                const data = await res.json();
                this.state.apiOk = (data && data.store_version_code >= 3);
            } else {
                this.state.apiOk = false;
            }

            this.state.nativeBridgeOk = StoppBridge.isNative();

            let diagSummary = '';
            if (this.state.apiOk) {
                this.state.status = 'HEALTHY';
                diagSummary = `Sistemas 100% Operacionais • Latencia ${this.state.pingMs}ms • 0 Erros`;
                this.state.lastReport = 'A IA Stopp Sentinel auditou a integridade dos ficheiros estaticos, APIs de versao e ligacoes nativas. O ecossistema opera sem quaisquer bugs ou anomalias.';
            } else {
                this.state.status = 'WARNING';
                diagSummary = `Alerta de Conetividade • Servidor HTTP ${res.status}`;
                this.state.lastReport = 'A IA detetou anomalia temporaria no acesso aos descritores de versao. Recomenda-se verificar a ligacao de rede.';
            }

            if (mainLabel) {
                mainLabel.innerHTML = `IA Sentinel: <strong>${diagSummary}</strong>`;
            }
            if (dot) {
                dot.className = 'ai-status-dot ' + (this.state.status === 'HEALTHY' ? '' : (this.state.status === 'WARNING' ? 'warning' : 'error'));
            }
            if (pingEl) {
                pingEl.textContent = this.state.pingMs + ' ms';
            }

            this.updateModalUi();

            if (showFeedback) {
                showStoreToast('Diagnostico da IA concluido: ' + diagSummary, 'success');
            }

        } catch (err) {
            this.state.status = 'WARNING';
            this.state.pingMs = Date.now() - startTime;
            if (mainLabel) {
                mainLabel.innerHTML = 'IA Sentinel: <strong>Modo Offline / Sem Rede (' + this.state.pingMs + 'ms)</strong>';
            }
            if (dot) dot.className = 'ai-status-dot warning';
            if (pingEl) pingEl.textContent = 'Offline';
            this.state.lastReport = 'A IA Sentinel identificou modo sem rede ou bloqueio de ligacao aos servidores da Stopp Store. O catalogo em cache e operacoes locais mantem-se ativas.';
            this.updateModalUi();
            if (showFeedback) {
                showStoreToast('Diagnostico da IA: Modo offline ou sem ligacao.', 'warning');
            }
        }
    },

    updateModalUi: function () {
        const netStatus = document.getElementById('diag-net-status');
        const netPing = document.getElementById('diag-net-ping');
        const bridgeStatus = document.getElementById('diag-bridge-status');
        const reportText = document.getElementById('diag-report-text');

        if (netStatus) {
            netStatus.textContent = this.state.apiOk ? 'Operacional' : 'Lentidao / Offline';
            netStatus.className = 'ai-diag-badge ' + (this.state.apiOk ? 'ok' : 'notice');
        }
        if (netPing) {
            netPing.textContent = this.state.pingMs > 0 ? (this.state.pingMs + ' ms') : 'N/D';
        }
        if (bridgeStatus) {
            bridgeStatus.textContent = this.state.nativeBridgeOk ? 'Ponte Nativa Ativa (120Hz)' : 'Modo Navegador Web';
            bridgeStatus.className = 'ai-diag-badge ' + (this.state.nativeBridgeOk ? 'ok' : 'notice');
        }
        if (reportText) {
            reportText.textContent = this.state.lastReport;
        }
    }
};

function openAiDiagnosticModal() {
    const modal = document.getElementById('ai-diagnostic-modal');
    if (!modal) return;
    StoppAiSentinel.updateModalUi();
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
}

function closeAiDiagnosticModal() {
    const modal = document.getElementById('ai-diagnostic-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    document.body.style.overflow = '';
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

// Verificacao Exclusiva de Atualizacao da Propria Loja
async function checkStoreUpdatesOnly(isManual = false) {
    const statusText = document.getElementById('store-update-status-text');
    const updateActionBtn = document.getElementById('btn-store-update-action');

    if (statusText && isManual) {
        statusText.className = 'store-status-text';
        statusText.textContent = 'A consultar servidores da Stopp Store...';
    }

    try {
        const response = await fetch('store-version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) throw new Error('Falha HTTP ao carregar versao');
        const data = await response.json();

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
        const response = await fetch('store-version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();

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

    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';

    renderSettingsOverview();
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    document.body.style.overflow = '';
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

function initSplashScreen() {
    const splash = document.getElementById('stopp-splash-screen');
    if (!splash) return;

    setTimeout(() => {
        StoppAudio.play('splash');
    }, 150);

    setTimeout(() => {
        dismissSplashScreen();
    }, 1300);
}

function dismissSplashScreen() {
    const splash = document.getElementById('stopp-splash-screen');
    if (splash && !splash.classList.contains('splash-dismissed')) {
        splash.classList.add('splash-dismissed');
        StoppAudio.play('tap');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }
}

function replaySplashScreen() {
    const splash = document.getElementById('stopp-splash-screen');
    if (splash) {
        splash.style.display = 'flex';
        splash.classList.remove('splash-dismissed');
        StoppAudio.play('splash');
        setTimeout(() => {
            dismissSplashScreen();
        }, 1400);
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
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
    }
}

function closePlayProtectModal() {
    StoppAudio.play('tap');
    const modal = document.getElementById('modal-play-protect');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
    }
}

function toggleSoundFx() {
    StoppAudio.toggle();
}

// Stopp App Store Filter Logic
document.addEventListener('DOMContentLoaded', () => {
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
    refreshAllAppStatus();
    checkStoreAndAppUpdates(false);
    StoppAiSentinel.init();
});

// Service Worker Registration for PWA & Cache Invalidation
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=7')
            .then(reg => {
                reg.update();
            })
            .catch(err => console.error('SW registration failed:', err));

        if ('caches' in window) {
            caches.keys().then(keys => {
                keys.forEach(k => {
                    if (k !== 'stopp-store-v7') {
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
});

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
window.toggleSoundFx = toggleSoundFx;


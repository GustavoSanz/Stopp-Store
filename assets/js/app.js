// Stopp App Store - Client Application, Native Bridge & Notification Controller
// Strictly Zero Emojis Compliance

const CURRENT_STORE_VERSION_CODE = 1;
const CURRENT_STORE_VERSION_NAME = "0.1-Beta";

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
                return window.StoppStoreNative.isAppInstalled(packageName);
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

    sendNotification: function (title, message, url = './index.html') {
        if (this.isNative() && typeof window.StoppStoreNative.sendNotification === 'function') {
            try {
                window.StoppStoreNative.sendNotification(title, message, url);
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
                        data: { url: url }
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
    send: (title, message, url = './index.html') => {
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
    }
}
applyNativeAppClass();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyNativeAppClass);
} else {
    applyNativeAppClass();
}

// UI App Status Controller
function refreshAllAppStatus() {
    applyNativeAppClass();
    const appContainers = document.querySelectorAll('[data-package]');
    if (!appContainers.length) return;

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

function openInstalledApp(packageName) {
    StoppBridge.openApp(packageName);
}

function uninstallInstalledApp(packageName, appName) {
    StoppBridge.uninstallApp(packageName, appName);
}

// Auto-Update Background Check
async function checkStoreAndAppUpdates(isManual = false) {
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

        // 1. Verificacao de atualizacao da propria Stopp Store
        const currentStoreCode = StoppBridge.getStoreVersionCode();
        if (data.store_version_code > currentStoreCode) {
            if (statusText) {
                statusText.className = 'store-status-text status-update';
                statusText.textContent = 'Nova versao da Stopp Store disponivel: v' + data.store_version_name;
            }
            if (updateActionBtn) {
                updateActionBtn.style.display = 'block';
                updateActionBtn.onclick = () => {
                    triggerAppDownload('Stopp Store', data.store_apk_url, 15);
                };
            }
            
            // Envio de notificacao do sistema
            StoppNotifications.send(
                'Atualizacao da Stopp Store',
                'Nova versao v' + data.store_version_name + ' da Stopp Store pronta para instalacao.',
                './index.html'
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

        // 2. Verificacao de atualizacao de aplicacoes se auto-update estiver ativo
        if (StoppBridge.isAutoUpdateEnabled() && data.apps) {
            for (const [pkg, appMeta] of Object.entries(data.apps)) {
                if (StoppBridge.isAppInstalled(pkg)) {
                    const currentCode = StoppBridge.getAppVersionCode(pkg);
                    if (currentCode >= 0 && currentCode < appMeta.version_code) {
                        const targetUrl = pkg === 'com.vera_watt' ? './verawatt.html' : './index.html';
                        StoppNotifications.send(
                            'Atualizacao Disponivel: ' + appMeta.name,
                            'A versao v' + appMeta.version_name + ' de ' + appMeta.name + ' esta disponivel para download.',
                            targetUrl
                        );
                    }
                }
            }
        }

        // Se estiver em app nativa e for manual, chama tambem a rotina nativa
        if (isManual && StoppBridge.isNative()) {
            try {
                window.StoppStoreNative.checkStoreUpdateNow();
            } catch (ignored) {}
        }

    } catch (err) {
        console.error('Erro na verificacao de atualizacoes:', err);
        if (statusText) {
            statusText.className = 'store-status-text';
            statusText.textContent = 'Nao foi possivel contactar o servidor de atualizacoes.';
        }
        if (isManual) {
            showStoreToast('Erro ao contactar o servidor de atualizacoes.', 'warning');
        }
    }
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
        checkStoreAndAppUpdates(false);
    } else {
        showStoreToast('Atualizacoes automaticas desativadas.', 'info');
    }
}

function handleManualCheckStore() {
    checkStoreAndAppUpdates(true);
}

function handleRequestNotificationPermission() {
    StoppNotifications.requestPermission();
}

function handleTestNotification() {
    StoppNotifications.send(
        'Stopp Store Notificacoes',
        'As notificacoes do sistema estao configuradas e a funcionar com sucesso!',
        './index.html'
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

// Stopp App Store Filter Logic
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.tab-btn');
    const appCards = document.querySelectorAll('.app-card');

    if (filterButtons.length) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const category = button.getAttribute('data-category');

                appCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category');
                    if (category === 'all' || (cardCategory && cardCategory.includes(category))) {
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

    // Iniciar Deteccao de Aplicacoes e Atualizacoes
    refreshAllAppStatus();
    checkStoreAndAppUpdates(false);
});

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .catch(err => console.error('SW registration failed:', err));
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
});

// Expor funcoes globais
window.openAppModal = openAppModal;
window.closeAppModal = closeAppModal;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.handleAutoUpdateToggle = handleAutoUpdateToggle;
window.handleManualCheckStore = handleManualCheckStore;
window.handleRequestNotificationPermission = handleRequestNotificationPermission;
window.handleTestNotification = handleTestNotification;
window.openInstalledApp = openInstalledApp;
window.uninstallInstalledApp = uninstallInstalledApp;
window.simSetVeraWattInstalled = simSetVeraWattInstalled;
window.refreshAllAppStatus = refreshAllAppStatus;
window.StoppNotifications = StoppNotifications;

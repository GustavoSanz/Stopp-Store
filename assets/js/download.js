// Stopp App Store - Interactive Download Manager with Progress, Platform Guard & Celebration Animation
function triggerAppDownload(appName, apkUrl, fileSizeMb = 64) {
    const isNative = typeof StoppBridge !== 'undefined' && StoppBridge.isNative();
    const isAndroid = isNative || (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent));
    const isPC = !isAndroid;

    // 1. Guard de Plataforma: Bloquear APKs Android no PC
    if (isPC && apkUrl && apkUrl.endsWith('.apk')) {
        if (typeof showPlatformRestrictionModal === 'function') {
            showPlatformRestrictionModal(appName, 'android');
        } else if (typeof showStoreToast === 'function') {
            showStoreToast('Esta aplicacao (APK) e exclusiva para telemoveis Android e esta bloqueada no PC.', 'warning');
        }
        return;
    }

    // 2. Guard de Plataforma: Bloquear Jogos de PC no Android
    if (isAndroid && (appName.includes('Sons of Echoes') || (apkUrl && apkUrl.endsWith('.exe')))) {
        if (typeof showPlatformRestrictionModal === 'function') {
            showPlatformRestrictionModal(appName, 'pc');
        } else if (typeof showStoreToast === 'function') {
            showStoreToast('Esta aplicacao foi desenvolvida exclusivamente para computadores Windows / PC.', 'warning');
        }
        return;
    }

    // 3. Guia de Seguranca Google Play Protect: Exibido apenas antes da primeira instalacao de APK
    const hasSeenPlayProtect = localStorage.getItem('stopp_play_protect_acknowledged') === 'true';
    if (!hasSeenPlayProtect && isAndroid && apkUrl && apkUrl.endsWith('.apk')) {
        window.__pendingAppInstall = { appName, apkUrl, fileSizeMb };
        if (typeof openPlayProtectModal === 'function') {
            openPlayProtectModal();
            return;
        }
    }

    const modal = document.getElementById('download-modal');
    const progressBar = document.getElementById('dl-progress-bar');
    const progressText = document.getElementById('dl-progress-text');
    const statusText = document.getElementById('dl-status-text');
    const successBox = document.getElementById('dl-success-box');
    const progressBox = document.getElementById('dl-progress-container');
    const modalTitle = document.getElementById('dl-modal-title');

    if (typeof closeAppModal === 'function') {
        closeAppModal();
    }
    document.body.style.overflow = 'hidden';

    if (!apkUrl) {
        if (typeof showStoreToast === 'function') {
            showStoreToast('Transferencia ainda nao disponivel.', 'warning');
        }
        return;
    }

    const appPkg = (appName.includes('Vera') || (apkUrl && apkUrl.includes('VeraWatt')))
        ? 'com.vera_watt'
        : 'com.stopp.store';

    if (modalTitle) modalTitle.textContent = `A transferir ${appName}`;
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    if (statusText) {
        statusText.textContent = isNative
            ? 'A iniciar transferência segura...'
            : 'A estabelecer ligação segura...';
    }
    
    if (progressBox) progressBox.style.display = 'block';
    if (successBox) successBox.style.display = 'none';
    if (modal) {
        modal.classList.add('active');
        if (typeof syncModalBodyState === 'function') syncModalBodyState();
    }
    if (typeof window.StoppAudio !== 'undefined') window.StoppAudio.play('download');

    // Em modo nativo Android, iniciar download real e escutar progresso direto
    if (isNative && window.StoppStoreNative && typeof window.StoppStoreNative.downloadAndInstall === 'function') {
        const fullUrl = new URL(apkUrl, window.location.href).href;
        const fileName = apkUrl.split('/').pop() || 'app.apk';

        window.updateNativeDownloadProgress = function(percent, downloadedMb, totalMb) {
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) progressText.textContent = `${percent}%`;
            if (statusText) {
                if (totalMb > 0) {
                    statusText.textContent = `A descarregar pacote APK (${downloadedMb} MB de ${totalMb} MB)...`;
                } else {
                    statusText.textContent = `A transferir pacote APK (${percent}%)...`;
                }
            }
        };

        window.onNativeDownloadCompleted = function() {
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
            if (statusText) statusText.textContent = 'Transferência concluída! A abrir instalador do Android...';
            if (typeof window.StoppAudio !== 'undefined') window.StoppAudio.play('success');
            setTimeout(() => {
                closeDownloadModal();
                if (typeof onAppInstalledSuccess === 'function') {
                    onAppInstalledSuccess(appName, appPkg);
                }
            }, 600);
        };

        window.StoppStoreNative.downloadAndInstall(fullUrl, fileName);
        return;
    }

    // Modo Web / Navegador: simulacao com animacao e descarregamento de ficheiro
    let current = 0;
    const interval = setInterval(() => {
        const inc = Math.floor(Math.random() * 8) + 3;
        current = Math.min(current + inc, 100);
        
        if (progressBar) progressBar.style.width = `${current}%`;
        if (progressText) progressText.textContent = `${current}%`;

        const downloadedMb = ((current / 100) * fileSizeMb).toFixed(1);
        if (statusText) {
            if (current < 30) {
                statusText.textContent = `A transferir ficheiro (${downloadedMb} MB de ${fileSizeMb} MB)...`;
            } else if (current < 85) {
                statusText.textContent = `A descarregar pacote APK (${downloadedMb} MB)...`;
            } else if (current < 100) {
                statusText.textContent = `A verificar integridade do pacote...`;
            } else {
                statusText.textContent = 'Concluído com sucesso!';
            }
        }

        if (current >= 100) {
            clearInterval(interval);

            const tempLink = document.createElement('a');
            tempLink.href = apkUrl;
            tempLink.download = apkUrl.split('/').pop();
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);

            if (apkUrl.includes('VeraWatt')) {
                localStorage.setItem('sim_installed_com.vera_watt', 'true');
                localStorage.setItem('sim_version_code_com.vera_watt', '4');
                localStorage.setItem('sim_version_name_com.vera_watt', '0.4-Beta');
                if (typeof refreshAllAppStatus === 'function') {
                    setTimeout(() => refreshAllAppStatus(), 600);
                }
            }

            if (typeof StoppNotifications !== 'undefined' && typeof StoppNotifications.send === 'function') {
                const targetUrl = typeof resolveStoreUrl === 'function'
                    ? resolveStoreUrl(apkUrl && apkUrl.includes('VeraWatt') ? 'verawatt.html' : 'index.html')
                    : 'https://gustavosanz.github.io/Stopp-Store/';
                StoppNotifications.send(
                    'Transferencia Concluida: ' + appName,
                    'O pacote foi descarregado com sucesso.',
                    targetUrl
                );
            }

            if (typeof window.StoppAudio !== 'undefined') window.StoppAudio.play('success');
            setTimeout(() => {
                closeDownloadModal();
                if (typeof onAppInstalledSuccess === 'function') {
                    onAppInstalledSuccess(appName, appPkg);
                }
            }, 500);
        }
    }, 120);
}

function closeDownloadModal() {
    const modal = document.getElementById('download-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = '';
    if (typeof syncModalBodyState === 'function') syncModalBodyState();
}

// Fechar modal de download ao clicar fora do conteudo
document.addEventListener('click', (e) => {
    const modal = document.getElementById('download-modal');
    if (modal && e.target === modal) {
        closeDownloadModal();
    }
});

// Confetti Particle Burst Animation
function createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#10b981', '#0ea5e9', '#38bdf8', '#34d399', '#ffffff', '#fbbf24'];

    for (let i = 0; i < 45; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = '50%';
        particle.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;

        const xMove = (Math.random() - 0.5) * 350;
        const yMove = (Math.random() - 0.7) * 300;
        particle.style.setProperty('--x', `${xMove}px`);
        particle.style.setProperty('--y', `${yMove}px`);

        container.appendChild(particle);
        setTimeout(() => particle.remove(), 1800);
    }
}

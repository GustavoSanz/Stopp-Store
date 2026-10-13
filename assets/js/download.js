// Stopp App Store - Interactive Download Manager with Progress & Celebration Animation
function triggerAppDownload(appName, apkUrl, fileSizeMb = 64) {
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

    const isNative = typeof StoppBridge !== 'undefined' && StoppBridge.isNative();

    modalTitle.textContent = `A transferir ${appName}`;
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    statusText.textContent = isNative
        ? 'A iniciar transferência segura...'
        : 'A estabelecer ligação segura...';
    
    progressBox.style.display = 'block';
    successBox.style.display = 'none';
    modal.classList.add('active');

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
            setTimeout(() => {
                if (progressBox) progressBox.style.display = 'none';
                if (successBox) successBox.style.display = 'block';
                createConfetti();
                setTimeout(() => closeDownloadModal(), 2000);
            }, 400);
        };

        window.StoppStoreNative.downloadAndInstall(fullUrl, fileName);
        return;
    }

    // Modo Web / Navegador: simulacao com animacao e descarregamento de ficheiro
    let current = 0;
    const interval = setInterval(() => {
        const inc = Math.floor(Math.random() * 8) + 3;
        current = Math.min(current + inc, 100);
        
        progressBar.style.width = `${current}%`;
        progressText.textContent = `${current}%`;

        const downloadedMb = ((current / 100) * fileSizeMb).toFixed(1);
        if (current < 30) {
            statusText.textContent = `A transferir ficheiro (${downloadedMb} MB de ${fileSizeMb} MB)...`;
        } else if (current < 85) {
            statusText.textContent = `A descarregar pacote APK (${downloadedMb} MB)...`;
        } else if (current < 100) {
            statusText.textContent = `A verificar integridade do pacote...`;
        } else {
            clearInterval(interval);
            statusText.textContent = 'Concluído com sucesso!';

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
                    'O pacote APK foi descarregado com sucesso.',
                    targetUrl
                );
            }

            setTimeout(() => {
                progressBox.style.display = 'none';
                successBox.style.display = 'block';
                createConfetti();
            }, 400);
        }
    }, 120);
}

function closeDownloadModal() {
    const modal = document.getElementById('download-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = '';
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

// ELEMENTOS PRINCIPAIS
const canvas = document.getElementById('scratch-canvas');
const ctx = canvas.getContext('2d');
const scratchSound = document.getElementById('som-raspar');
const confettiSound = document.getElementById('som-confete'); // Adicione o elemento <audio id="som-confete"> ao seu HTML
const prizeContent = document.querySelector('.prize-content');
const prizeContainer = document.querySelector('.scratch-wrapper');

// ✨ CONFIGURAÇÃO DOS CONFETES
let confettiTriggered = false;
// ✨ CORREÇÃO 1: Reduzido para 50% para estourar mais cedo
const WIN_THRESHOLD = 50; 

let isDrawing = false;
let lastPosition = null;
let isResizingAllowed = true;

// =============================
// SALVAR ESTADO
// =============================
function saveCanvasState() {
    const dataURL = canvas.toDataURL();
    sessionStorage.setItem('canvasState', dataURL);
}

// =============================
// CAMADA RASPÁVEL
// =============================
function setupCanvas() {
    const silverGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    silverGradient.addColorStop(0, '#c0c0c0');
    silverGradient.addColorStop(0.5, '#a9a9a9');
    silverGradient.addColorStop(1, '#c0c0c0');
    ctx.fillStyle = silverGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = canvas.height / 3;
    ctx.fillStyle = '#3f3020';
    ctx.font = `700 ${fontSize}px 'Oswald', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RASPE AQUI', canvas.width / 2, canvas.height / 2);

    saveCanvasState();
}

// =============================
// POSIÇÃO MOUSE / TOQUE
// =============================
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
}

// =============================
// FUNÇÃO DE RASPAR
// =============================
function scratch(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    const scratchRadiusBase = canvas.width / 40;
    const scratchRandom = canvas.width / 25;
    for (let i = 0; i < 20; i++) {
        const radius = scratchRadiusBase + Math.random() * (scratchRadiusBase / 2);
        const offsetX = Math.random() * scratchRandom - (scratchRandom / 2);
        const offsetY = Math.random() * scratchRandom - (scratchRandom / 2);
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// =============================
// DESENHAR LINHA CONTÍNUA
// =============================
function drawScratchLine(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const stepSize = canvas.width / 50;
    if (distance < stepSize) {
        scratch(to.x, to.y);
        return;
    }
    const steps = distance / stepSize;
    const stepX = dx / steps;
    const stepY = dy / steps;
    for (let i = 1; i < steps; i++) {
        const x = from.x + stepX * i;
        const y = from.y + stepY * i;
        scratch(x, y);
    }
    scratch(to.x, to.y);
    
    // Salva o estado uma única vez após toda a linha ser desenhada
    saveCanvasState(); 
    
    // Verifica o quanto já foi raspado
    checkScratchCompletion();
}

// =============================
// SOM
// =============================
function playSound() { scratchSound.play().catch(() => {}); }
function stopSound() { scratchSound.pause(); scratchSound.currentTime = 0; }

// =============================
// EVENTOS (AJUSTADOS)
// =============================
window.addEventListener('mouseup', () => { isDrawing = false; stopSound(); lastPosition = null; isResizingAllowed = true; });

canvas.addEventListener('mousedown', (e) => { isDrawing = true; isResizingAllowed = false; playSound(); lastPosition = getMousePos(e); scratch(lastPosition.x, lastPosition.y); });

// Mouse entra: reativa som e desenho
canvas.addEventListener('mouseenter', (e) => {
    if (e.buttons === 1) { 
        isDrawing = true;
        isResizingAllowed = false;
        playSound();
        lastPosition = getMousePos(e); 
    }
});

canvas.addEventListener('mousemove', (e) => { 
    if (!isDrawing) return; 
    const currentPos = getMousePos(e); 
    if (lastPosition) drawScratchLine(lastPosition, currentPos); 
    lastPosition = currentPos; 
});

canvas.addEventListener('mouseout', () => { stopSound(); lastPosition = null; });

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; isResizingAllowed = false; playSound(); lastPosition = getTouchPos(e); scratch(lastPosition.x, lastPosition.y); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!isDrawing) return; const currentPos = getTouchPos(e); if (lastPosition) drawScratchLine(lastPosition, currentPos); lastPosition = currentPos; }, { passive: false });
canvas.addEventListener('touchend', () => { isDrawing = false; stopSound(); lastPosition = null; isResizingAllowed = true; });
canvas.addEventListener('touchcancel', () => { isDrawing = false; stopSound(); lastPosition = null; isResizingAllowed = true; });

// =============================
// PARAMS DA URL
// =============================
const urlParams = new URLSearchParams(window.location.search);
const valorDoVale = urlParams.get('valor');
if (valorDoVale) document.getElementById('valor-premio').textContent = `(Vale R$${valorDoVale})`;
const genero = urlParams.get('genero');
const tituloElement = document.getElementById('titulo-presente');
if (genero === 'a') tituloElement.textContent = 'VOCÊ FOI PRESENTEADA COM UM VALE TATTOO';
else if (genero === 'o') tituloElement.textContent = 'VOCÊ FOI PRESENTEADO COM UM VALE TATTOO';

// =============================
// REDIMENSIONAMENTO
// =============================
function resizeAndSetupCanvas(force = false) {
    if (!isResizingAllowed && !force) return;
    const containerWidth = prizeContainer.clientWidth;
    const containerHeight = prizeContainer.clientHeight;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    prizeContent.style.visibility = 'visible';
    const savedCanvas = sessionStorage.getItem('canvasState');
    if (savedCanvas) {
        const img = new Image();
        img.onload = function () { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
        img.src = savedCanvas;
    } else setupCanvas();
}
function debounce(func, wait = 100) {
    let timeout;
    return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}
window.addEventListener('resize', debounce(() => resizeAndSetupCanvas(), 150));

// =============================
// 🎉 DETECTAR CONCLUSÃO E CONFETE
// =============================
function checkScratchCompletion() {
    // Se a função confetti não estiver disponível ou já tiver sido acionada, pare aqui
    if (typeof confetti === 'undefined' || confettiTriggered) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparentPixels++;
    }

    const totalPixels = canvas.width * canvas.height;
    const percentCleared = (transparentPixels / totalPixels) * 100;

    if (percentCleared > WIN_THRESHOLD) {
        confettiTriggered = true;
        startConfetti();
    }
}

function startConfetti() {
    // Toca o som de confete
    if (confettiSound) {
        confettiSound.volume = 0.3;
        confettiSound.currentTime = 0;
        confettiSound.play().catch(() => {});
    }

    // Calcula a origem do centro do elemento raspável
    const rect = prizeContainer.getBoundingClientRect();
    const originX = (rect.left + rect.width / 2) / window.innerWidth;
    const originY = (rect.top + rect.height / 2) / window.innerHeight;

    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    
    // ✨ CORREÇÃO 2: Cores mais variadas
    const defaults = { 
        startVelocity: 35,
        ticks: 60, 
        zIndex: 2000,
        colors: ['#ff0a54', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7', '#00b0ff', '#ffeb3b', '#4caf50', '#9c27b0'] // Mais cores!
    };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        
        const particleCount = 50 * (timeLeft / duration);
        
        // Lançamento 1: Dispersão Ampla e Lenta
        confetti(Object.assign({}, defaults, {
            particleCount: 20,
            origin: { x: originX, y: originY },
            angle: 90, 
            spread: 360,
            startVelocity: 25,
            decay: 0.94
        }));

        // Lançamento 2: Explosão para a Esquerda
        confetti(Object.assign({}, defaults, {
            particleCount: 15,
            origin: { x: originX, y: originY },
            angle: 120, // Diagonal para cima/esquerda
            spread: 60,
            startVelocity: 60 
        }));

        // Lançamento 3: Explosão para a Direita
        confetti(Object.assign({}, defaults, {
            particleCount: 15,
            origin: { x: originX, y: originY },
            angle: 60, // Diagonal para cima/direita
            spread: 60,
            startVelocity: 60
        }));
    }, 200);
}

// =============================
// INICIALIZAR
// =============================
resizeAndSetupCanvas(true);

// В начале файла, перед defaultSettings
const STORAGE_KEY = 'gameSettings';
const BEST_SCORE_KEY = 'bestScore';
const LAST_SCORE_KEY = 'lastScore';

// Настройки игры по умолчанию
const defaultSettings = {
    speed: 100,
    enemyCount: 25,
    plantCount: 100,
    difficulty: 100,
    maxMass: 100000  // Добавляем настройку максимальной массы
};

// Загружаем сохраненные настройки или используем значения по умолчанию
let gameSettings = loadSettings();
let gameState = 'menu'; // 'menu' или 'game'

// Добавим функции для работы с localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
        try {
            return JSON.parse(savedSettings);
        } catch (e) {
            return {...defaultSettings};
        }
    }
    return {...defaultSettings};
}

function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameSettings));
    } catch (e) {
        // Молча игнорируем ошибку
    }
}

function saveScore(score) {
    const bestScore = getBestScore();
    localStorage.setItem(LAST_SCORE_KEY, score);
    
    if (score > bestScore) {
        localStorage.setItem(BEST_SCORE_KEY, score);
    }
}

function getBestScore() {
    return parseInt(localStorage.getItem(BEST_SCORE_KEY)) || 0;
}

function getLastScore() {
    return parseInt(localStorage.getItem(LAST_SCORE_KEY)) || 0;
}

class Entity {
    constructor(x, y, hp) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.radius = this.calculateRadius(hp);
        this.speed = (gameSettings.speed / 100) * 0.5;
        this.isSlowed = false;
    }

    calculateRadius(hp) {
        // Размер как логарифм по основанию 2 от массы
        // Добавляем 1 к hp перед логарифмом, чтобы избежать отрицательных значений при hp < 1
        return hp**(1/3)*2+2;
    }

    updateRadius() {
        this.radius = this.calculateRadius(this.hp);
    }

    draw(ctx) {
        this.drawAt(ctx, this.x, this.y);
        
        // Отрисовка частей существа при пересечении границ
        if (this.x < this.radius) {
            this.drawAt(ctx, this.x + canvas.width, this.y);
        } else if (this.x > canvas.width - this.radius) {
            this.drawAt(ctx, this.x - canvas.width, this.y);
        }
        
        if (this.y < this.radius) {
            this.drawAt(ctx, this.x, this.y + canvas.height);
        } else if (this.y > canvas.height - this.radius) {
            this.drawAt(ctx, this.x, this.y - canvas.height);
        }
        
        // Отрисовка в углах при пересечении обеих границ
        if (this.x < this.radius && this.y < this.radius) {
            this.drawAt(ctx, this.x + canvas.width, this.y + canvas.height);
        } else if (this.x < this.radius && this.y > canvas.height - this.radius) {
            this.drawAt(ctx, this.x + canvas.width, this.y - canvas.height);
        } else if (this.x > canvas.width - this.radius && this.y < this.radius) {
            this.drawAt(ctx, this.x - canvas.width, this.y + canvas.height);
        } else if (this.x > canvas.width - this.radius && this.y > canvas.height - this.radius) {
            this.drawAt(ctx, this.x - canvas.width, this.y - canvas.height);
        }
    }

    drawAt(ctx, x, y) {
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this === player ? 'blue' : 'red';
        ctx.fill();
        ctx.closePath();
    }
}

class Plant {
    constructor(x, y, isBlack = false) {
        this.x = x;
        this.y = y;
        this.hp = isBlack ? 3 : 1;  // Черное растение дает 3 массы, обычное - 1
        this.size = 8;
        this.radius = 8;
        this.isBlack = isBlack;
    }

    draw(ctx) {
        // ctx.globalAlpha = 0.6; // Устанавливаем постоянную полупрозрачность
        ctx.font = `${this.size * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.isBlack ? '⚫️' : '🟢', this.x, this.y);
        // ctx.globalAlpha = 1.0; // Возвращаем нормальную прозрачность для остальных элементов
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const entities = [];
const plants = [];
let player;

// В начале файла добавим новые константы
const MAX_TOTAL_MASS = 50000; // Максимальная общая масса в игре
const PLANT_SPAWN_INTERVAL = 100; // Интервал появления растений (в миллисекундах)
const ENEMY_SPAWN_INTERVAL = 300; // Интервал появления противников (в миллисекундах)
let lastPlantSpawnTime = 0; // Время последнего создания растения
let lastEnemySpawnTime = 0; // Время последнего создания противника

// Функция для подсчета общей массы в игре
function getTotalMass() {
    const entityMass = entities.reduce((sum, entity) => sum + entity.hp, 0);
    return entityMass;
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Заголовок
    ctx.fillStyle = 'black';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Simple Life', canvas.width / 2, 100);

    // Версия
    ctx.font = '16px Arial';
    ctx.fillText('0.53', canvas.width / 2, 130);

    // Результаты
    const bestScore = getBestScore();
    const lastScore = getLastScore();
    ctx.font = '20px Arial';
    ctx.fillText(`Best score: ${bestScore}`, canvas.width / 2, 160);
    ctx.fillText(`Last score: ${lastScore}`, canvas.width / 2, 185);

    // Проверяем victory в localStorage
    if (localStorage.getItem('victory') === 'true') {
        ctx.fillStyle = '#4CAF50'; // Зеленый цвет
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Winner!', canvas.width / 2, 215);
        ctx.fillStyle = 'black'; // Возвращаем черный цвет для остального текста
    }

    // Отрисовка настроек
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    const startX = canvas.width / 2 - 150;
    
    // Скорость
    ctx.fillText(`Speed: ${gameSettings.speed}%`, startX - 6, 250);
    drawButton('speed-minus', startX + 250, 230, '-');
    drawButton('speed-plus', startX + 300, 230, '+');

    // Количество противников
    ctx.fillText(`Enemies: ${gameSettings.enemyCount}`, startX + 50, 300);
    drawButton('enemy-minus', startX + 250, 280, '-');
    drawButton('enemy-plus', startX + 300, 280, '+');

    // Количество растений
    ctx.fillText(`Plants: ${gameSettings.plantCount}`, startX + 45, 350);
    drawButton('plant-minus', startX + 250, 330, '-');
    drawButton('plant-plus', startX + 300, 330, '+');

    // Сложность
    ctx.fillText(`Difficulty: ${gameSettings.difficulty}%`, startX + 60, 400);
    drawButton('diff-minus', startX + 250, 380, '-');
    drawButton('diff-plus', startX + 300, 380, '+');

    // Максимальная масса
    ctx.fillText(`Max mass: ${gameSettings.maxMass}`, startX + 80, 450);
    drawButton('mass-minus', startX + 250, 430, '-');
    drawButton('mass-plus', startX + 300, 430, '+');

    // Кнопка старта в зеленом цвете
    ctx.fillStyle = '#4CAF50'; // Зеленый цвет в стиле Material Design
    ctx.fillRect(canvas.width / 2 - 60, 500, 120, 40);
    ctx.fillStyle = 'white'; // Белый текст
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Start', canvas.width / 2, 525);

    // Сохраняем координаты кнопки для обработки кликов
    buttons['start'] = { 
        x: canvas.width / 2 - 60, 
        y: 500, 
        width: 120, 
        height: 40 
    };
}

function drawButton(id, x, y, text, width = 40, height = 30) {
    buttons[id] = { x, y, width, height };
    ctx.fillStyle = 'lightgray';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width/2, y + height/2 + 7);
}

const buttons = {};

// Добавим обработчик тач-событий для меню
canvas.addEventListener('touchstart', (e) => {
    if (gameState !== 'menu') return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    Object.entries(buttons).forEach(([id, button]) => {
        if (touchX >= button.x && touchX <= button.x + button.width &&
            touchY >= button.y && touchY <= button.y + button.height) {
            handleButtonClick(id);
        }
    });
}, { passive: false });

// Обновим существующий обработчик кликов, чтобы он работал и с мышью
canvas.addEventListener('click', (e) => {
    if (gameState !== 'menu') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    Object.entries(buttons).forEach(([id, button]) => {
        if (clickX >= button.x && clickX <= button.x + button.width &&
            clickY >= button.y && clickY <= button.y + button.height) {
            handleButtonClick(id);
        }
    });
});

function handleButtonClick(id) {
    switch(id) {
        case 'speed-minus':
            gameSettings.speed = Math.max(20, gameSettings.speed - 5);
            break;
        case 'speed-plus':
            gameSettings.speed = Math.min(400, gameSettings.speed + 5);
            break;
        case 'enemy-minus':
            gameSettings.enemyCount = Math.max(1, gameSettings.enemyCount - 1);
            break;
        case 'enemy-plus':
            gameSettings.enemyCount = Math.min(50, gameSettings.enemyCount + 1);
            break;
        case 'plant-minus':
            gameSettings.plantCount = Math.max(1, gameSettings.plantCount - 5);
            break;
        case 'plant-plus':
            gameSettings.plantCount = Math.min(400, gameSettings.plantCount + 5);
            break;
        case 'diff-minus':
            gameSettings.difficulty = Math.max(0, gameSettings.difficulty - 5);
            break;
        case 'diff-plus':
            gameSettings.difficulty = Math.min(200, gameSettings.difficulty + 5);
            break;
        case 'mass-minus':
            gameSettings.maxMass = Math.max(5000, gameSettings.maxMass - 5000);
            break;
        case 'mass-plus':
            gameSettings.maxMass = Math.min(200000, gameSettings.maxMass + 5000);
            break;
        case 'start':
            startGame();
            return;
    }
    saveSettings();
}

function startGame() {
    gameState = 'game';
    entities.length = 0;
    plants.length = 0;
    localStorage.setItem('victory', 'false'); // Сбрасываем флаг победы при старте новой игры
    init();
}

function init() {
    player = new Entity(canvas.width / 2, canvas.height / 2, 1); // Стартовая масса 1
    entities.push(player);

    // Создаем начальных существ
    for (let i = 0; i < gameSettings.enemyCount; i++) {
        spawnRandomEntity();
    }

    // Создаем начальные растения
    for (let i = 0; i < gameSettings.plantCount; i++) {
        spawnPlant();
    }
}

function spawnRandomEntity() {
    // Минимальное безопасное расстояние от ирока
    const MIN_SAFE_DISTANCE = 100;
    
    let x, y, distanceToPlayer;
    
    // Пытаемся найти подходящую позицию
    do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
        distanceToPlayer = Math.hypot(x - player.x, y - player.y);
    } while (distanceToPlayer < MIN_SAFE_DISTANCE);
    
    // Используем сложность как процент от максимально возможного размера
    const minSizePercent = -1 + gameSettings.difficulty/100;
    const maxSizePercent = 0.1 + gameSettings.difficulty/100;
    
    const sizePercent = minSizePercent + Math.random() * (maxSizePercent - minSizePercent);
    const hp = Math.max(1, player.hp * sizePercent);
    
    entities.push(new Entity(x, y, hp));
}

function spawnPlant() {
    const x = Math.random() * (canvas.width - 10) + 5;
    const y = Math.random() * (canvas.height - 10) + 5;
    const isBlack = Math.random() < 0.1; // 10% шанс на черное растение
    plants.push(new Plant(x, y, isBlack));
}

function moveEntity(entity) {
    try {
        if (!entity || isNaN(entity.x) || isNaN(entity.y)) {
            return;
        }
        if (entity === player) return; // Игрок управляется клавишами

        let targetX = entity.x;
        let targetY = entity.y;
        let nearestThreatDist = Infinity;

        // Ищем ближайшую цель (существо или растение)
        [...entities, ...plants].forEach(target => {
            if (target === entity) return;
            
            // Вычисляем все возможные расстояния с учетом wrap-around
            const distances = [
                { 
                    dx: target.x - entity.x,
                    dy: target.y - entity.y
                },
                { 
                    dx: target.x - entity.x + canvas.width,
                    dy: target.y - entity.y
                },
                { 
                    dx: target.x - entity.x - canvas.width,
                    dy: target.y - entity.y
                },
                { 
                    dx: target.x - entity.x,
                    dy: target.y - entity.y + canvas.height
                },
                { 
                    dx: target.x - entity.x,
                    dy: target.y - entity.y - canvas.height
                }
            ];

            // Находим крачайшее расстояние
            const shortestPath = distances.reduce((shortest, current) => {
                const dist = Math.hypot(current.dx, current.dy);
                return dist < shortest.dist ? { dist, dx: current.dx, dy: current.dy } : shortest;
            }, { dist: Infinity, dx: 0, dy: 0 });

            // Учитываем радиусы существ при расчете дистанции
            const effectiveDistance = shortestPath.dist - entity.radius - (target.radius || 0);

            if (effectiveDistance < nearestThreatDist) {
                const targetHp = target.hp || 0;
                // Увеличиваем дистанцию обнаружения с учетом размера существа
                const detectionRange = 200 + entity.radius;
                
                if ((targetHp < entity.hp && effectiveDistance < detectionRange) || target instanceof Plant) {
                    // Движение к добыче
                    nearestThreatDist = effectiveDistance;
                    targetX = entity.x + shortestPath.dx;
                    targetY = entity.y + shortestPath.dy;
                } else if (targetHp > entity.hp && effectiveDistance < detectionRange / 2) {
                    // Убегание от угрозы
                    nearestThreatDist = effectiveDistance;
                    targetX = entity.x - shortestPath.dx;
                    targetY = entity.y - shortestPath.dy;
                }
            }
        });

        // Двигаемся к цели или от неё
        const angle = Math.atan2(targetY - entity.y, targetX - entity.x);
        entity.x += Math.cos(angle) * entity.speed;
        entity.y += Math.sin(angle) * entity.speed;

        // Wrap around
        if (entity.x < -entity.radius) entity.x += canvas.width;
        if (entity.x > canvas.width + entity.radius) entity.x -= canvas.width;
        if (entity.y < -entity.radius) entity.y += canvas.height;
        if (entity.y > canvas.height + entity.radius) entity.y -= canvas.height;
    } catch (error) {
        // Молча игнорируем ошибку
    }
}

function checkCollisions() {
    try {
        // В начале функции добавим проверку и исправление позиций
        entities.forEach(entity => {
            if (!entity || isNaN(entity.x) || isNaN(entity.y)) {
                return;
            }
            // Принудительно возвращаем объекты в пределы экрана, если они вышли слишком далеко
            while (entity.x < -entity.radius) entity.x += canvas.width;
            while (entity.x > canvas.width + entity.radius) entity.x -= canvas.width;
            while (entity.y < -entity.radius) entity.y += canvas.height;
            while (entity.y > canvas.height + entity.radius) entity.y -= canvas.height;
        });

        plants.forEach(plant => {
            while (plant.x < -plant.size) plant.x += canvas.width;
            while (plant.x > canvas.width + plant.size) plant.x -= canvas.width;
            while (plant.y < -plant.size) plant.y += canvas.height;
            while (plant.y > canvas.height + plant.size) plant.y -= canvas.height;
        });

        for (let i = entities.length - 1; i >= 0; i--) {
            const entity1 = entities[i];
            
            // Проверяем столкновения с растениями
            for (let j = plants.length - 1; j >= 0; j--) {
                const plant = plants[j];
                const dist = getMinDistance(entity1.x, entity1.y, plant.x, plant.y);
                if (dist < entity1.radius + plant.radius) {
                    entity1.hp += plant.hp;
                    entity1.updateRadius();
                    plants.splice(j, 1);
                    // Создаем новое растение взамен съеденного
                    spawnPlant();

                    // Если растение черное, замедляем существо
                    if (plant.isBlack) {
                        slowDownEntity(entity1);
                    }
                }
            }

            // Проверяем столкновения с другими существами
            if (player.hp > gameSettings.maxMass / 2) {
                const finalScore = Math.floor(player.hp);
                saveScore(finalScore);
                // сохранить игроку победу в локальное хранилище
                localStorage.setItem('victory', 'true');
                gameState = 'menu';
            }

            for (let j = i - 1; j >= 0; j--) {
                const entity2 = entities[j];
                const dist = getMinDistance(entity1.x, entity1.y, entity2.x, entity2.y);
                
                if (dist < entity1.radius + entity2.radius) {
                    if (entity1.hp > entity2.hp) {
                        entity1.hp += entity2.hp / 2;
                        entity1.updateRadius();
                        entities.splice(j, 1);
                        if (entity2 === player) {
                            const finalScore = Math.floor(player.hp);
                            saveScore(finalScore);
                            gameState = 'menu';
                        }
                    } else {
                        entity2.hp += entity1.hp / 2;
                        entity2.updateRadius();
                        entities.splice(i, 1);
                        if (entity1 === player) {
                            const finalScore = Math.floor(player.hp);
                            saveScore(finalScore);
                            gameState = 'menu';
                        }
                        break;
                    }
                }
            }
        }
    } catch (error) {
        // Молча игнорируем ошибку
    }
}

// Добавляем новую вспомогательную функцию для расчета минимального расстояния с учетом wrap-around
function getMinDistance(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    
    // Учитываем wrap-around по X
    const wrappedDx = Math.min(dx, canvas.width - dx);
    // Учитываем wrap-around по Y
    const wrappedDy = Math.min(dy, canvas.height - dy);
    
    return Math.hypot(wrappedDx, wrappedDy);
}

let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

let joystick = {
    active: false,
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0,
    radius: 50
};

// Обработчики тач-событий с выводом в консоль для отладки
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    joystick.startX = touch.clientX - rect.left;
    joystick.startY = touch.clientY - rect.top;
    joystick.moveX = joystick.startX;
    joystick.moveY = joystick.startY;
    joystick.active = true;
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!joystick.active) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    joystick.moveX = touch.clientX - rect.left;
    joystick.moveY = touch.clientY - rect.top;

    // Ограничиваем движение джойстика
    const dx = joystick.moveX - joystick.startX;
    const dy = joystick.moveY - joystick.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > joystick.radius) {
        joystick.moveX = joystick.startX + (dx / distance) * joystick.radius;
        joystick.moveY = joystick.startY + (dy / distance) * joystick.radius;
    }
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    joystick.active = false;
}, { passive: false });

// Функция отрисовки UI с более заметным джойстиком
function drawUI() {
    // Отрисовка статистики
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Mass: ${Math.floor(player.hp)}`, 10, 30);
    ctx.fillText(`Total mass: ${Math.floor(getTotalMass())}`, 10, 60);

    // Отрисовка джойстика с более заметными цветами
    if (joystick.active) {
        // Внешний круг (более заметный)
        ctx.beginPath();
        ctx.arc(joystick.startX, joystick.startY, joystick.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Внутренний круг (более заметный)
        ctx.beginPath();
        ctx.arc(joystick.moveX, joystick.moveY, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Функция изменения размера канваса
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Вызываем resizeCanvas при загрузке и изменении размера окна
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

// Убедимся, что функция movePlayer использует джойстик
function movePlayer() {
    // Проверяем наличие крупных врагов полизости
    const DANGER_DISTANCE = 150; // Расстояние, на котором активируется бонус
    const SPEED_BOOST = 1.1; // Бонус к скорости (10%)
    
    let isInDanger = false;
    
    // Проверяем всех врагов только если джойстик активен
    if (joystick.active) {
        entities.forEach(entity => {
            if (entity !== player) {
                const dist = getMinDistance(player.x, player.y, entity.x, entity.y);
                if (dist < DANGER_DISTANCE && entity.hp > player.hp) {
                    isInDanger = true;
                }
            }
        });
    }

    // Применяем базовую или увеличенную скорость
    const currentSpeed = player.speed * (isInDanger ? SPEED_BOOST : 1);

    if (joystick.active) {
        const dx = joystick.moveX - joystick.startX;
        const dy = joystick.moveY - joystick.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = currentSpeed * (distance / joystick.radius);
            player.x += (dx / distance) * speed;
            player.y += (dy / distance) * speed;
        }
    } else {
        // Стандартное управление клавиатурой всегда без бонуса
        if (keys.ArrowUp) player.y -= player.speed;
        if (keys.ArrowDown) player.y += player.speed;
        if (keys.ArrowLeft) player.x -= player.speed;
        if (keys.ArrowRight) player.x += player.speed;
    }

    // Wrap around
    if (player.x < -player.radius) player.x += canvas.width;
    if (player.x > canvas.width + player.radius) player.x -= canvas.width;
    if (player.y < -player.radius) player.y += canvas.height;
    if (player.y > canvas.height + player.radius) player.y -= canvas.height;
}

function gameLoop() {
    try {
        if (gameState === 'menu') {
            drawMenu();
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Проверка состояния игры
            // if (!player || !entities.includes(player)) {
            //     console.error('Player lost:', { 
            //         player: player,
            //         entities: entities.length,
            //         plants: plants.length,
            //         totalMass: getTotalMass()
            //     });
            //     const finalScore = Math.floor(player.hp);
            //     saveScore(finalScore);
            //     gameState = 'menu';
            //     return;
            // }

            const currentTime = Date.now();
            const totalMass = getTotalMass();

            if (currentTime - lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL && 
                entities.length < gameSettings.enemyCount + 1 && 
                totalMass < gameSettings.maxMass) {
                spawnRandomEntity();
                lastEnemySpawnTime = currentTime;
            }

            if (currentTime - lastPlantSpawnTime > PLANT_SPAWN_INTERVAL && 
                plants.length < gameSettings.plantCount && 
                totalMass < gameSettings.maxMass) {
                spawnPlant();
                lastPlantSpawnTime = currentTime;
            }

            // Проверка позиций всех объектов
            // entities.forEach(entity => {
            //     if (isNaN(entity.x) || isNaN(entity.y) || isNaN(entity.radius)) {
            //         console.error('Invalid entity:', entity);
            //     }
            // });

            movePlayer();
            entities.forEach(moveEntity);
            checkCollisions();

            // Отрисовка
            plants.forEach(plant => plant.draw(ctx));
            entities.forEach(entity => entity.draw(ctx));
            drawUI();
        }
    } catch (error) {
        // Молча игнорируем ошибку
    }

    requestAnimationFrame(gameLoop);
}

// Запускаем игру с меню
gameLoop(); 

function slowDownEntity(entity) {
    // Если существо уже замедлено, игнорируем
    if (entity.isSlowed) return;

    const originalSpeed = entity.speed;
    entity.speed *= 0.5;
    entity.isSlowed = true;

    setTimeout(() => {
        entity.speed = originalSpeed;
        entity.isSlowed = false;
    }, 1000);
} 

// Вызываем resizeCanvas при инициализации
resizeCanvas(); 

// В начале файла добавим создание и применение стиля
const style = document.createElement('style');
style.textContent = `
    #gameCanvas {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        touch-action: none;
    }

    body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: rgba(0,0,0,0);
        user-select: none;
    }
`;
document.head.appendChild(style);


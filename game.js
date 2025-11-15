// Multiplayer server configuration
// Set this to your multiplayer server URL when deploying to production
// Leave empty for local development (defaults to same origin)
const MULTIPLAYER_SERVER_URL = 'https://animalwars-production.up.railway.app';

// Sound Manager Class
class SoundManager {
    constructor() {
        this.sounds = {
            // Unit sounds
            infantry: new Audio('sounds/Unit_sound_infantry.wav'),
            tank: new Audio('sounds/Unit_sound_tank.wav'),
            chopper: new Audio('sounds/Unit_sound_chopper.wav'),

            // Action sounds
            move: new Audio('sounds/Unit_move.wav'),
            battle: new Audio('sounds/Battle_sounds.wav'),
            dies: new Audio('sounds/Unit_dies.wav'),

            // Game sounds
            turnStart: new Audio('sounds/Player_turn_start.wav'),
            victory: new Audio('sounds/Battle_won2.wav')
        };

        // Set volume levels
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.5;
        });
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            // Clone the audio to allow overlapping sounds
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = this.sounds[soundName].volume;
            sound.play().catch(err => {
                console.log('Sound playback failed:', err);
            });
        }
    }

    playUnitSound(unitType) {
        this.play(unitType);
    }
}

// Unit Class
class Unit {
    constructor(type, team, x, y) {
        this.type = type;
        this.team = team; // 'player' or 'enemy'
        this.x = x;
        this.y = y;
        this.hasMoved = false;
        this.hasAttacked = false;

        // Set properties based on unit type
        switch(type) {
            case 'infantry':
                this.maxHealth = 100;
                this.health = 100;
                this.maxSoldiers = 10;
                this.movement = 3;
                this.attackRange = 1;
                this.attackPower = 25;
                break;
            case 'tank':
                this.maxHealth = 100;
                this.health = 100;
                this.maxSoldiers = 4;
                this.movement = 5;
                this.attackRange = 1;
                this.attackPower = 60;
                break;
            case 'chopper':
                this.maxHealth = 100;
                this.health = 100;
                this.maxSoldiers = 3;
                this.movement = 6;
                this.attackRange = 2;
                this.attackPower = 35;
                break;
        }
    }

    get soldiers() {
        return Math.ceil((this.health / this.maxHealth) * this.maxSoldiers);
    }

    get displayNumber() {
        return Math.ceil(this.health / 10);
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }

    isAlive() {
        return this.health > 0;
    }

    reset() {
        this.hasMoved = false;
        this.hasAttacked = false;
    }
}

// Building Class
class Building {
    constructor(type, x, y, owner = 'neutral') {
        this.type = type; // 'city', 'factory', 'hq'
        this.x = x;
        this.y = y;
        this.owner = owner; // 'neutral', 'player', 'enemy'
        this.maxCapturePoints = type === 'hq' ? 30 : 20;
        this.capturePoints = this.maxCapturePoints; // When this reaches 0, building is captured
    }

    canProduce() {
        return this.type === 'factory';
    }

    getIncome() {
        // Buildings provide income when owned
        return this.type === 'hq' ? 200 : 100;
    }
}

// Game State
class Game {
    constructor() {
        this.boardWidth = 8;
        this.boardHeight = 10;
        this.units = [];
        this.buildings = [];
        this.selectedUnit = null;
        this.selectedBuilding = null;
        this.currentTurn = 'player';
        this.gameOver = false;
        this.movablePositions = [];
        this.attackablePositions = [];
        this.isMovingUnit = false;
        this.showingAttackRange = false;

        // Economy state
        this.playerMoney = 1000;
        this.enemyMoney = 1000;
        this.incomePerTurn = 300; // Base income per turn

        // UI state for buildings
        this.capturePopupVisible = false;
        this.productionMenuVisible = false;

        // Multiplayer state
        this.isMultiplayer = false;
        this.myTeam = null;
        this.socket = null;
        this.gameId = null;
        this.opponentId = null;

        // Sound manager
        this.soundManager = new SoundManager();

        this.initGame();
        this.setupEventListeners();
        this.initializeCutscene();
        this.initializeSocket();
        this.render();
    }

    initializeCutscene() {
        // Move battle cutscene into the game board
        const battleCutscene = document.getElementById('battle-cutscene');
        const gameBoard = document.getElementById('game-board');
        if (battleCutscene && gameBoard) {
            gameBoard.appendChild(battleCutscene);
        }
    }

    initGame() {
        this.units = [];
        this.buildings = [];
        this.gameOver = false;
        this.currentTurn = 'player';
        this.playerMoney = 1000;
        this.enemyMoney = 1000;

        // Create player units
        this.units.push(new Unit('infantry', 'player', 2, 8));
        this.units.push(new Unit('infantry', 'player', 2, 9));
        this.units.push(new Unit('tank', 'player', 0, 8));
        this.units.push(new Unit('chopper', 'player', 1, 9));

        // Create enemy units
        this.units.push(new Unit('infantry', 'enemy', 5, 1));
        this.units.push(new Unit('infantry', 'enemy', 5, 0));
        this.units.push(new Unit('tank', 'enemy', 7, 1));
        this.units.push(new Unit('chopper', 'enemy', 6, 0));

        // Create buildings
        // Player HQ and factory
        this.buildings.push(new Building('hq', 0, 9, 'player'));
        this.buildings.push(new Building('factory', 1, 8, 'player'));

        // Enemy HQ and factory
        this.buildings.push(new Building('hq', 7, 0, 'enemy'));
        this.buildings.push(new Building('factory', 6, 1, 'enemy'));

        // Neutral cities in the middle
        this.buildings.push(new Building('city', 2, 3, 'neutral'));
        this.buildings.push(new Building('city', 5, 3, 'neutral'));
        this.buildings.push(new Building('city', 3, 5, 'neutral'));
        this.buildings.push(new Building('city', 4, 5, 'neutral'));
        this.buildings.push(new Building('city', 2, 7, 'neutral'));
        this.buildings.push(new Building('city', 5, 7, 'neutral'));

        this.selectedUnit = null;
        this.selectedBuilding = null;
        this.movablePositions = [];
        this.attackablePositions = [];
        this.capturePopupVisible = false;
        this.productionMenuVisible = false;
    }

    setupEventListeners() {
        document.getElementById('end-turn-btn').addEventListener('click', () => {
            this.endTurn();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        document.getElementById('cancel-matchmaking-btn').addEventListener('click', () => {
            this.cancelMatchmaking();
        });

        // Capture popup buttons
        document.getElementById('capture-yes-btn').addEventListener('click', () => {
            this.confirmCapture();
        });

        document.getElementById('capture-no-btn').addEventListener('click', () => {
            this.cancelCapture();
        });

        // Production popup buttons
        document.getElementById('production-cancel-btn').addEventListener('click', () => {
            this.closeProductionMenu();
        });

        // Production options
        document.querySelectorAll('.production-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const unitType = btn.dataset.unit;
                this.produceUnit(unitType);
            });
        });
    }

    render() {
        const board = document.getElementById('game-board');

        // Save the battle cutscene if it exists
        const battleCutscene = document.getElementById('battle-cutscene');
        const cutsceneParent = battleCutscene ? battleCutscene.parentNode : null;

        board.innerHTML = '';

        // Create tiles
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.x = x;
                tile.dataset.y = y;

                // Check if this position is movable (only show if not in attack range mode)
                if (!this.showingAttackRange && this.isPositionMovable(x, y)) {
                    tile.classList.add('movable');
                }

                // Check if this position is attackable
                // Show targets both in attack mode and during movement selection
                if (this.isPositionAttackable(x, y)) {
                    tile.classList.add('attack-target');
                }

                // Check if there's a building here
                const building = this.getBuildingAt(x, y);
                if (building) {
                    const buildingDiv = document.createElement('div');
                    buildingDiv.className = `building building-${building.type} owner-${building.owner}`;

                    // Add building icon
                    const buildingIcon = document.createElement('div');
                    buildingIcon.className = 'building-icon';
                    buildingIcon.textContent = this.getBuildingIcon(building.type);
                    buildingDiv.appendChild(buildingIcon);

                    // Show capture progress if being captured or selected
                    if (building.capturePoints < building.maxCapturePoints || building === this.selectedBuilding) {
                        const captureBar = document.createElement('div');
                        captureBar.className = 'capture-progress';
                        const capturePercent = (building.capturePoints / building.maxCapturePoints) * 100;
                        captureBar.style.width = `${capturePercent}%`;
                        buildingDiv.appendChild(captureBar);
                    }

                    tile.appendChild(buildingDiv);
                }

                // Check if there's a unit here
                const unit = this.getUnitAt(x, y);
                if (unit) {
                    const unitDiv = document.createElement('div');
                    unitDiv.className = `unit unit-${unit.type} ${unit.team}`;
                    if (unit.hasMoved && unit.hasAttacked) {
                        unitDiv.classList.add('moved');
                    }

                    // Add the unit icon image
                    const iconImg = document.createElement('img');
                    iconImg.className = 'unit-icon';
                    iconImg.src = this.getUnitImagePath(unit.type, unit.team);
                    iconImg.alt = `${unit.team} ${unit.type}`;
                    iconImg.decoding = 'async';
                    unitDiv.appendChild(iconImg);

                    // Add the unit number display
                    const countDiv = document.createElement('div');
                    countDiv.className = 'unit-count';
                    countDiv.textContent = unit.displayNumber;
                    unitDiv.appendChild(countDiv);

                    tile.appendChild(unitDiv);

                    // Highlight selected unit
                    if (this.selectedUnit === unit) {
                        tile.classList.add('selected');
                    }
                }

                tile.addEventListener('click', () => this.handleTileClick(x, y));
                board.appendChild(tile);
            }
        }

        // Append battle cutscene back to board if it was there before
        if (battleCutscene) {
            board.appendChild(battleCutscene);
        }

        this.updateUI();
    }

    updateUI() {
        const endTurnBtn = document.getElementById('end-turn-btn');

        // Determine if it's our turn
        let isOurTurn;
        if (this.isMultiplayer) {
            isOurTurn = this.isMyTurn();
        } else {
            isOurTurn = this.currentTurn === 'player';
        }

        if (isOurTurn) {
            endTurnBtn.textContent = 'End Turn';
            endTurnBtn.disabled = false;
        } else {
            endTurnBtn.textContent = 'Enemy Turn';
            endTurnBtn.disabled = true;
        }

        // Update money display
        const myTeam = this.isMultiplayer ? this.myTeam : 'player';
        const myMoney = myTeam === 'player' ? this.playerMoney : this.enemyMoney;
        document.getElementById('player-money').textContent = myMoney;
    }

    handleTileClick(x, y) {
        // Check if it's our turn
        if (this.gameOver) return;

        if (this.isMultiplayer) {
            if (!this.isMyTurn()) return;
        } else {
            if (this.currentTurn !== 'player') return;
        }

        const unit = this.getUnitAt(x, y);
        const building = this.getBuildingAt(x, y);

        // If clicking on an attackable position
        if (this.isPositionAttackable(x, y)) {
            const target = this.getUnitAt(x, y);
            if (target && this.selectedUnit) {
                this.attack(this.selectedUnit, target);
            }
            return;
        }

        // If clicking on a movable position
        if (this.isPositionMovable(x, y)) {
            this.moveUnit(this.selectedUnit, x, y);
            return;
        }

        // If clicking on the same unit again
        if (unit === this.selectedUnit) {
            // If showing attack range, unselect
            if (this.showingAttackRange) {
                this.cancelSelection();
                return;
            }
            // If not showing attack range yet, toggle to it (only if not already attacked)
            if (!unit.hasMoved && !unit.hasAttacked) {
                this.showingAttackRange = true;
                this.movablePositions = [];
                this.calculateAttackablePositionsFromUnit(unit);
                this.render();
                return;
            } else {
                // Unit has moved or attacked, unselect
                this.cancelSelection();
                return;
            }
        }

        const myTeam = this.isMultiplayer ? this.myTeam : 'player';

        // Check if clicking on owned factory/building to produce units
        if (building && !unit) {
            if (building.owner === myTeam && building.canProduce()) {
                this.showProductionMenu(building);
                return;
            }
            // If clicking on a building (not for production), select it to show health
            if (building === this.selectedBuilding) {
                // Clicking same building again, deselect it
                this.selectedBuilding = null;
                this.render();
            } else {
                this.selectedBuilding = building;
                this.selectedUnit = null;
                this.movablePositions = [];
                this.attackablePositions = [];
                this.render();
            }
            return;
        }

        // Check if clicking on a unit
        if (unit && unit.team === myTeam) {
            // Check if unit is infantry on a capturable building
            if (unit.type === 'infantry' && building && !unit.hasMoved && !unit.hasAttacked) {
                if (building.owner !== myTeam) {
                    this.showCapturePopup(unit, building);
                    return;
                }
            }
            this.selectUnit(unit);
        } else {
            this.cancelSelection();
        }
    }

    selectUnit(unit) {
        this.selectedUnit = unit;

        // Play unit selection sound
        this.soundManager.playUnitSound(unit.type);

        // If unit has already moved, show attack range directly (if not already attacked)
        if (unit.hasMoved) {
            this.showingAttackRange = true;
            this.movablePositions = [];
            if (!unit.hasAttacked) {
                this.calculateAttackablePositionsFromUnit(unit);
            }
        } else {
            // Show movement range first
            this.showingAttackRange = false;
            this.calculateMovablePositions(unit);
        }

        this.render();
    }

    cancelSelection() {
        this.selectedUnit = null;
        this.selectedBuilding = null;
        this.movablePositions = [];
        this.attackablePositions = [];
        this.showingAttackRange = false;
        this.render();
    }

    calculateMovablePositions(unit) {
        this.movablePositions = [];
        this.attackablePositions = [];

        if (unit.hasMoved) return;

        // Calculate all positions within movement range
        for (let dy = -unit.movement; dy <= unit.movement; dy++) {
            for (let dx = -unit.movement; dx <= unit.movement; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > unit.movement || distance === 0) continue;

                const newX = unit.x + dx;
                const newY = unit.y + dy;

                if (!this.isInBounds(newX, newY)) continue;

                const unitAtPos = this.getUnitAt(newX, newY);
                if (!unitAtPos) {
                    this.movablePositions.push({ x: newX, y: newY });
                }
            }
        }

        // Also calculate attackable enemy positions from current position
        // Only show if unit hasn't attacked yet
        if (!unit.hasAttacked) {
            for (let dy = -unit.attackRange; dy <= unit.attackRange; dy++) {
                for (let dx = -unit.attackRange; dx <= unit.attackRange; dx++) {
                    const distance = Math.abs(dx) + Math.abs(dy);
                    if (distance > unit.attackRange || distance === 0) continue;

                    const targetX = unit.x + dx;
                    const targetY = unit.y + dy;

                    if (!this.isInBounds(targetX, targetY)) continue;

                    const targetUnit = this.getUnitAt(targetX, targetY);
                    // Only show enemies with targets, not all attack range
                    if (targetUnit && targetUnit.team !== unit.team) {
                        this.attackablePositions.push({ x: targetX, y: targetY });
                    }
                }
            }
        }
    }

    calculateAttackablePositions(unit) {
        // This method is no longer used - keeping for backwards compatibility
        this.attackablePositions = [];
        this.addAttackableFromPosition(unit, unit.x, unit.y);
    }

    addAttackableFromPosition(unit, fromX, fromY) {
        for (let dy = -unit.attackRange; dy <= unit.attackRange; dy++) {
            for (let dx = -unit.attackRange; dx <= unit.attackRange; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > unit.attackRange || distance === 0) continue;

                const targetX = fromX + dx;
                const targetY = fromY + dy;

                if (!this.isInBounds(targetX, targetY)) continue;

                // Show ALL tiles in range, not just enemy-occupied ones
                if (!this.attackablePositions.some(p => p.x === targetX && p.y === targetY)) {
                    this.attackablePositions.push({ x: targetX, y: targetY });
                }
            }
        }
    }

    async moveUnit(unit, toX, toY) {
        const fromX = unit.x;
        const fromY = unit.y;

        // Clear movement overlay immediately
        this.movablePositions = [];
        this.attackablePositions = [];
        this.render();

        // Get the unit's current tile element
        const fromTile = document.querySelector(`[data-x="${fromX}"][data-y="${fromY}"]`);
        const toTile = document.querySelector(`[data-x="${toX}"][data-y="${toY}"]`);

        if (fromTile && toTile) {
            const unitElement = fromTile.querySelector('.unit');
            if (unitElement) {
                // Calculate the offset
                const fromRect = fromTile.getBoundingClientRect();
                const toRect = toTile.getBoundingClientRect();
                const deltaX = toRect.left - fromRect.left;
                const deltaY = toRect.top - fromRect.top;

                // Add moving class and apply transform
                unitElement.classList.add('moving');
                unitElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                // Wait for animation to complete
                await new Promise(resolve => setTimeout(resolve, 400));

                // Reset transform
                unitElement.style.transform = '';
                unitElement.classList.remove('moving');
            }
        }

        // Update unit position
        unit.x = toX;
        unit.y = toY;
        unit.hasMoved = true;

        // Play move sound
        this.soundManager.play('move');

        // Render immediately to update DOM with new position
        this.render();

        // Emit move event in multiplayer mode
        if (this.isMultiplayer && this.socket && unit.team === this.myTeam) {
            this.socket.emit('playerMove', {
                fromX: fromX,
                fromY: fromY,
                toX: toX,
                toY: toY
            });
        }

        // Check if infantry landed on a capturable building (only for player units)
        const building = this.getBuildingAt(toX, toY);
        const myTeam = this.isMultiplayer ? this.myTeam : 'player';

        // Only show popup for player units, AI handles captures in aiTurn()
        if (unit.type === 'infantry' && building && building.owner !== myTeam && !unit.hasAttacked && unit.team === myTeam) {
            // Show capture popup immediately after moving
            this.showCapturePopup(unit, building);
            return;
        }

        // Check if there are enemies in attack range and unit hasn't attacked yet
        const hasEnemiesInRange = this.hasEnemiesInAttackRange(unit);

        if (hasEnemiesInRange && !unit.hasAttacked) {
            // Keep unit selected and show attack range (only on enemies)
            this.selectedUnit = unit;
            this.showingAttackRange = true;
            this.movablePositions = [];
            this.calculateAttackablePositionsFromUnit(unit, true);
            this.render();
        } else {
            this.cancelSelection();
        }
    }

    hasEnemiesInAttackRange(unit) {
        for (let dy = -unit.attackRange; dy <= unit.attackRange; dy++) {
            for (let dx = -unit.attackRange; dx <= unit.attackRange; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > unit.attackRange || distance === 0) continue;

                const targetX = unit.x + dx;
                const targetY = unit.y + dy;

                if (!this.isInBounds(targetX, targetY)) continue;

                const targetUnit = this.getUnitAt(targetX, targetY);
                if (targetUnit && targetUnit.team !== unit.team) {
                    return true;
                }
            }
        }
        return false;
    }

    calculateAttackablePositionsFromUnit(unit, onlyEnemies = false) {
        this.attackablePositions = [];

        for (let dy = -unit.attackRange; dy <= unit.attackRange; dy++) {
            for (let dx = -unit.attackRange; dx <= unit.attackRange; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > unit.attackRange || distance === 0) continue;

                const targetX = unit.x + dx;
                const targetY = unit.y + dy;

                if (!this.isInBounds(targetX, targetY)) continue;

                if (onlyEnemies) {
                    // Only show tiles with enemy units
                    const targetUnit = this.getUnitAt(targetX, targetY);
                    if (targetUnit && targetUnit.team !== unit.team) {
                        this.attackablePositions.push({ x: targetX, y: targetY });
                    }
                } else {
                    // Show ALL tiles in range
                    this.attackablePositions.push({ x: targetX, y: targetY });
                }
            }
        }
    }

    async attack(attacker, defender) {
        // Emit attack event in multiplayer mode (before animation)
        if (this.isMultiplayer && this.socket && attacker.team === this.myTeam) {
            this.socket.emit('playerAttack', {
                attackerX: attacker.x,
                attackerY: attacker.y,
                targetX: defender.x,
                targetY: defender.y
            });
        }

        // Play battle sound
        this.soundManager.play('battle');

        // Show pre-battle animation on map
        await this.showPreBattleAnimation(attacker, defender);

        // Show battle cutscene
        await this.showBattleCutscene(attacker, defender);

        // Calculate damage
        const attackerDamage = this.calculateDamage(attacker, defender);
        defender.takeDamage(attackerDamage);

        const defenderDied = !defender.isAlive();

        // Counter attack if defender is still alive AND can reach the attacker
        let attackerDied = false;
        if (defender.isAlive()) {
            // Check if defender is in range to counter-attack
            const distance = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
            const canCounterAttack = distance <= defender.attackRange;

            if (canCounterAttack) {
                const defenderDamage = this.calculateDamage(defender, attacker);
                attacker.takeDamage(defenderDamage);
                attackerDied = !attacker.isAlive();
            }
        }

        // Show death animations on map for defeated units
        const deathAnimations = [];
        if (defenderDied) {
            deathAnimations.push(this.showMapDeathAnimation(defender.x, defender.y, defender.type));
        }
        if (attackerDied) {
            deathAnimations.push(this.showMapDeathAnimation(attacker.x, attacker.y, attacker.type));
        }

        // Wait for death animations to complete
        if (deathAnimations.length > 0) {
            await Promise.all(deathAnimations);
        }

        // Remove dead units
        this.units = this.units.filter(u => u.isAlive());

        // Mark attacker as having attacked
        const hadMovedBefore = attacker.hasMoved;
        attacker.hasAttacked = true;

        // Check win condition
        this.checkWinCondition();

        // After attacking, deselect the unit
        // If they died or had already moved, mark them as done
        // If they're alive and hadn't moved, they can still move if reselected
        if (attackerDied || hadMovedBefore) {
            attacker.hasMoved = true;
        }
        this.cancelSelection();
    }

    async showPreBattleAnimation(attacker, defender) {
        return new Promise((resolve) => {
            // Find both unit tiles
            const attackerTile = document.querySelector(`[data-x="${attacker.x}"][data-y="${attacker.y}"]`);
            const defenderTile = document.querySelector(`[data-x="${defender.x}"][data-y="${defender.y}"]`);

            const attackerElement = attackerTile?.querySelector('.unit');
            const defenderElement = defenderTile?.querySelector('.unit');

            // Add pre-battle animation class
            if (attackerElement) attackerElement.classList.add('pre-battle');
            if (defenderElement) defenderElement.classList.add('pre-battle');

            // Wait 1 second, then remove animation
            setTimeout(() => {
                if (attackerElement) attackerElement.classList.remove('pre-battle');
                if (defenderElement) defenderElement.classList.remove('pre-battle');
                resolve();
            }, 1000);
        });
    }

    async showMapDeathAnimation(x, y, type) {
        return new Promise((resolve) => {
            // Re-render to show current state
            this.render();

            // Play death sound
            this.soundManager.play('dies');

            // Find the tile and unit element
            const tile = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            if (tile) {
                const unitElement = tile.querySelector('.unit');
                const iconElement = tile.querySelector('.unit-icon');

                if (unitElement && iconElement) {
                    // Change to fire emoji
                    if (iconElement.tagName === 'IMG') {
                        // Replace image with fire emoji text
                        const fireText = document.createTextNode('🔥');
                        iconElement.replaceWith(fireText);
                    } else {
                        iconElement.textContent = '🔥';
                    }

                    // Add death animation class
                    unitElement.classList.add('unit-map-death');

                    // Wait for animation to complete
                    setTimeout(() => {
                        resolve();
                    }, 800);
                } else {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    calculateDamage(attacker, defender) {
        // Base damage from attack power
        let damage = attacker.attackPower;

        // Factor in attacker's health (damaged units deal less damage)
        damage *= (attacker.health / attacker.maxHealth);

        // Add some randomness
        damage *= (0.8 + Math.random() * 0.4);

        return Math.floor(damage);
    }

    getUnitIcon(type) {
        switch(type) {
            case 'infantry': return '👤';
            case 'tank': return '🚜';
            case 'chopper': return '🚁';
            default: return '❓';
        }
    }

    getBuildingIcon(type) {
        switch(type) {
            case 'city': return '🏘️';
            case 'factory': return '🏭';
            case 'hq': return '🏛️';
            default: return '🏢';
        }
    }

    getUnitImagePath(type, team) {
        const teamPrefix = team === 'player' ? 'mouse' : 'bird';
        const unitName = type === 'infantry' ? 'soldier' : type;
        return `art/${teamPrefix}_${unitName}.png`;
    }

    getUnitCategory(type) {
        switch(type) {
            case 'infantry': return 'ground';
            case 'tank': return 'ground';
            case 'chopper': return 'air';
            default: return 'ground';
        }
    }

    async showBattleCutscene(attacker, defender) {
        return new Promise((resolve) => {
            const cutscene = document.getElementById('battle-cutscene');
            const playerSide = cutscene.querySelector('.player-side');
            const enemySide = cutscene.querySelector('.enemy-side');
            const playerContainer = document.getElementById('player-soldiers');
            const enemyContainer = document.getElementById('enemy-soldiers');

            // Get midpoint between attacker and defender for animation origin
            const attackerTile = document.querySelector(`[data-x="${attacker.x}"][data-y="${attacker.y}"]`);
            const defenderTile = document.querySelector(`[data-x="${defender.x}"][data-y="${defender.y}"]`);
            if (attackerTile && defenderTile) {
                const attackerRect = attackerTile.getBoundingClientRect();
                const defenderRect = defenderTile.getBoundingClientRect();
                const boardRect = document.getElementById('game-board').getBoundingClientRect();

                // Calculate midpoint between attacker and defender
                const midX = (attackerRect.left + attackerRect.width / 2 + defenderRect.left + defenderRect.width / 2) / 2;
                const midY = (attackerRect.top + attackerRect.height / 2 + defenderRect.top + defenderRect.height / 2) / 2;

                // Calculate position relative to board
                const originX = ((midX - boardRect.left) / boardRect.width) * 100;
                const originY = ((midY - boardRect.top) / boardRect.height) * 100;

                cutscene.style.transformOrigin = `${originX}% ${originY}%`;
            }

            // Clear previous soldiers
            playerContainer.innerHTML = '';
            enemyContainer.innerHTML = '';

            // Determine which unit is player and which is enemy
            const playerUnit = attacker.team === 'player' ? attacker : defender;
            const enemyUnit = attacker.team === 'player' ? defender : attacker;

            // Add unit category classes (ground/air) for side backgrounds
            playerSide.className = `player-side ${this.getUnitCategory(playerUnit.type)}`;
            enemySide.className = `enemy-side ${this.getUnitCategory(enemyUnit.type)}`;

            // Add team classes for soldier container rectangles
            playerContainer.className = `battle-unit-container team-player`;
            enemyContainer.className = `battle-unit-container team-enemy`;

            // Calculate damage
            const attackerDamage = this.calculateDamage(attacker, defender);
            const defenderHealthBefore = defender.health;
            const defenderHealthAfter = Math.max(0, defenderHealthBefore - attackerDamage);
            const defenderSoldiersBefore = defender.soldiers;
            const defenderSoldiersAfter = Math.ceil((defenderHealthAfter / defender.maxHealth) * defender.maxSoldiers);
            const defenderSoldiersLost = defenderSoldiersBefore - defenderSoldiersAfter;

            // Calculate counter-attack damage if defender survives AND is in range
            const defenderWillSurvive = defenderHealthAfter > 0;
            const distance = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
            const defenderCanCounterAttack = defenderWillSurvive && distance <= defender.attackRange;
            let counterDamage = 0;
            let attackerSoldiersLost = 0;
            if (defenderCanCounterAttack) {
                counterDamage = this.calculateDamage(defender, attacker);
                const attackerHealthBefore = attacker.health;
                const attackerHealthAfter = Math.max(0, attackerHealthBefore - counterDamage);
                const attackerSoldiersBefore = attacker.soldiers;
                const attackerSoldiersAfter = Math.ceil((attackerHealthAfter / attacker.maxHealth) * attacker.maxSoldiers);
                attackerSoldiersLost = attackerSoldiersBefore - attackerSoldiersAfter;
            }

            // Figure out which side takes which damage
            const playerSoldiersLost = attacker.team === 'player' ? attackerSoldiersLost : defenderSoldiersLost;
            const enemySoldiersLost = attacker.team === 'player' ? defenderSoldiersLost : attackerSoldiersLost;
            const playerNumTargets = attacker.team === 'player' ? 0 : Math.ceil(attackerDamage / 5);
            const enemyNumTargets = attacker.team === 'player' ? Math.ceil(attackerDamage / 5) : 0;
            const playerCounterTargets = defenderWillSurvive && counterDamage > 0 ?
                (attacker.team === 'player' ? Math.ceil(counterDamage / 5) : 0) : 0;
            const enemyCounterTargets = defenderWillSurvive && counterDamage > 0 ?
                (attacker.team === 'enemy' ? Math.ceil(counterDamage / 5) : 0) : 0;

            // Create player soldiers
            const playerImagePath = this.getUnitImagePath(playerUnit.type, playerUnit.team);
            const playerSoldiers = [];
            for (let i = 0; i < playerUnit.soldiers; i++) {
                const soldier = document.createElement('div');
                soldier.className = 'battle-soldier';
                const soldierImg = document.createElement('img');
                soldierImg.src = playerImagePath;
                soldierImg.alt = `${playerUnit.team} ${playerUnit.type}`;
                soldierImg.decoding = 'async';
                soldier.appendChild(soldierImg);
                playerContainer.appendChild(soldier);
                playerSoldiers.push(soldier);
            }

            // Create enemy soldiers
            const enemyImagePath = this.getUnitImagePath(enemyUnit.type, enemyUnit.team);
            const enemySoldiers = [];
            for (let i = 0; i < enemyUnit.soldiers; i++) {
                const soldier = document.createElement('div');
                soldier.className = 'battle-soldier';
                const soldierImg = document.createElement('img');
                soldierImg.src = enemyImagePath;
                soldierImg.alt = `${enemyUnit.team} ${enemyUnit.type}`;
                soldierImg.decoding = 'async';
                soldier.appendChild(soldierImg);
                enemyContainer.appendChild(soldier);
                enemySoldiers.push(soldier);
            }

            cutscene.classList.remove('hidden');

            // SIMULTANEOUS: Show targets and fire on both sides at the same time
            setTimeout(() => {
                // Show initial attack targets
                const initialTargets = attacker.team === 'player' ? enemyNumTargets : playerNumTargets;
                const targetContainer = attacker.team === 'player' ? enemyContainer : playerContainer;

                for (let i = 0; i < initialTargets; i++) {
                    const target = document.createElement('div');
                    target.className = 'target-emoji';
                    target.textContent = '🎯';

                    const angle = (i / initialTargets) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                    const distance = 30 + Math.random() * 40;
                    const scatterX = Math.cos(angle) * distance;
                    const scatterY = Math.sin(angle) * distance;

                    target.style.setProperty('--scatter-x', `${scatterX}px`);
                    target.style.setProperty('--scatter-y', `${scatterY}px`);

                    targetContainer.appendChild(target);

                    setTimeout(() => {
                        target.classList.add('scatter');
                    }, i * 100);
                }

                // Show counter-attack targets simultaneously if applicable
                if (defenderWillSurvive && counterDamage > 0) {
                    const counterTargets = attacker.team === 'player' ? playerCounterTargets : enemyCounterTargets;
                    const counterContainer = attacker.team === 'player' ? playerContainer : enemyContainer;

                    for (let i = 0; i < counterTargets; i++) {
                        const target = document.createElement('div');
                        target.className = 'target-emoji';
                        target.textContent = '🎯';

                        const angle = (i / counterTargets) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                        const distance = 30 + Math.random() * 40;
                        const scatterX = Math.cos(angle) * distance;
                        const scatterY = Math.sin(angle) * distance;

                        target.style.setProperty('--scatter-x', `${scatterX}px`);
                        target.style.setProperty('--scatter-y', `${scatterY}px`);

                        counterContainer.appendChild(target);

                        setTimeout(() => {
                            target.classList.add('scatter');
                        }, i * 100);
                    }
                }

                // After targets appear, make soldiers disappear with fire on BOTH sides simultaneously
                const maxTargets = Math.max(initialTargets, defenderWillSurvive ? (attacker.team === 'player' ? playerCounterTargets : enemyCounterTargets) : 0);
                setTimeout(() => {
                    // Player side fire
                    for (let i = 0; i < playerSoldiersLost && i < playerSoldiers.length; i++) {
                        const soldierToRemove = playerSoldiers[playerSoldiers.length - 1 - i];
                        setTimeout(() => {
                            soldierToRemove.innerHTML = '🔥';
                            soldierToRemove.classList.add('soldier-fire');
                        }, i * 100);
                    }

                    // Enemy side fire simultaneously
                    for (let i = 0; i < enemySoldiersLost && i < enemySoldiers.length; i++) {
                        const soldierToRemove = enemySoldiers[enemySoldiers.length - 1 - i];
                        setTimeout(() => {
                            soldierToRemove.innerHTML = '🔥';
                            soldierToRemove.classList.add('soldier-fire');
                        }, i * 100);
                    }

                    // Hide cutscene after all animations complete
                    const maxSoldiersLost = Math.max(playerSoldiersLost, enemySoldiersLost);
                    setTimeout(() => {
                        // Add closing animation
                        cutscene.classList.add('closing');
                        setTimeout(() => {
                            cutscene.classList.remove('closing');
                            cutscene.classList.add('hidden');
                            resolve();
                        }, 300);
                    }, Math.max(800, maxSoldiersLost * 100 + 500));
                }, maxTargets * 100 + 400);
            }, 900);
        });
    }

    endTurn() {
        // In multiplayer, check if it's our turn
        if (this.isMultiplayer && !this.isMyTurn()) {
            return;
        }

        if (this.isMultiplayer) {
            // In multiplayer, end our turn
            const myTeam = this.myTeam;
            this.units.filter(u => u.team === myTeam).forEach(u => u.reset());

            // Add income for my team
            const income = this.calculateIncome(myTeam);
            if (myTeam === 'player') {
                this.playerMoney += income;
            } else {
                this.enemyMoney += income;
            }

            this.cancelSelection();
            this.socket.emit('endTurn');
            this.render();
        } else {
            // Single player mode
            if (this.currentTurn === 'player') {
                // Reset player units
                this.units.filter(u => u.team === 'player').forEach(u => u.reset());

                // Add income for player
                this.playerMoney += this.calculateIncome('player');

                this.currentTurn = 'enemy';
                this.cancelSelection();
                this.render();

                // AI turn
                setTimeout(() => this.aiTurn(), 1000);
            }
        }
    }

    async aiTurn() {
        // Try to produce units from owned factories
        const enemyFactories = this.buildings.filter(b => b.owner === 'enemy' && b.canProduce());
        for (const factory of enemyFactories) {
            if (this.enemyMoney >= 300 && !this.getUnitAt(factory.x, factory.y)) {
                // Produce infantry if we have money
                const newUnit = new Unit('infantry', 'enemy', factory.x, factory.y);
                newUnit.hasMoved = true;
                newUnit.hasAttacked = true;
                this.units.push(newUnit);
                this.enemyMoney -= 300;
                await new Promise(resolve => setTimeout(resolve, 300));
                this.render();
            }
        }

        const enemyUnits = this.units.filter(u => u.team === 'enemy' && !u.hasMoved);

        for (const unit of enemyUnits) {
            if (this.gameOver) break;

            // Find closest player unit
            const playerUnits = this.units.filter(u => u.team === 'player');
            if (playerUnits.length === 0) break;

            let closestPlayer = null;
            let minDistance = Infinity;

            for (const player of playerUnits) {
                const dist = Math.abs(player.x - unit.x) + Math.abs(player.y - unit.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestPlayer = player;
                }
            }

            // Check if can attack - PRIORITIZE ATTACKING
            const canAttack = minDistance <= unit.attackRange;

            if (canAttack) {
                await this.attack(unit, closestPlayer);
                await new Promise(resolve => setTimeout(resolve, 500));
            } else if (unit.type === 'infantry') {
                // Only check for capture if we can't attack
                const building = this.getBuildingAt(unit.x, unit.y);
                if (building && building.owner !== 'enemy') {
                    // Capture the building
                    const captureAmount = Math.ceil(unit.health / 10);

                    // Select building to show capture bar immediately
                    this.selectedBuilding = building;
                    // Render before animation to ensure DOM is updated with capture bar
                    this.render();

                    // Show capture animation
                    await this.showCaptureAnimation(unit, building, captureAmount);

                    // Update building state
                    building.capturePoints -= captureAmount;
                    if (building.capturePoints <= 0) {
                        building.capturePoints = building.maxCapturePoints;
                        building.owner = 'enemy';
                    }
                    unit.hasMoved = true;
                    unit.hasAttacked = true;
                    this.selectedBuilding = null;
                    this.render();
                    continue;
                }
            }

            if (!canAttack) {
                // For infantry, prioritize moving to neutral buildings
                let targetX, targetY;
                if (unit.type === 'infantry') {
                    const neutralBuildings = this.buildings.filter(b => b.owner === 'neutral');
                    if (neutralBuildings.length > 0) {
                        // Find closest neutral building
                        let closestBuilding = null;
                        let minBuildingDistance = Infinity;
                        for (const building of neutralBuildings) {
                            const dist = Math.abs(building.x - unit.x) + Math.abs(building.y - unit.y);
                            if (dist < minBuildingDistance) {
                                minBuildingDistance = dist;
                                closestBuilding = building;
                            }
                        }
                        if (closestBuilding && minBuildingDistance < minDistance) {
                            targetX = closestBuilding.x;
                            targetY = closestBuilding.y;
                        } else {
                            targetX = closestPlayer.x;
                            targetY = closestPlayer.y;
                        }
                    } else {
                        targetX = closestPlayer.x;
                        targetY = closestPlayer.y;
                    }
                } else {
                    targetX = closestPlayer.x;
                    targetY = closestPlayer.y;
                }

                // Move towards target
                const direction = {
                    x: Math.sign(targetX - unit.x),
                    y: Math.sign(targetY - unit.y)
                };

                // Try to move in the best direction
                let moved = false;
                const moves = [
                    { x: direction.x, y: direction.y },
                    { x: direction.x, y: 0 },
                    { x: 0, y: direction.y },
                    { x: -direction.x, y: direction.y },
                    { x: direction.x, y: -direction.y }
                ];

                for (const move of moves) {
                    const newX = unit.x + move.x;
                    const newY = unit.y + move.y;

                    if (this.isInBounds(newX, newY) && !this.getUnitAt(newX, newY)) {
                        await this.moveUnit(unit, newX, newY);
                        moved = true;
                        await new Promise(resolve => setTimeout(resolve, 300));
                        break;
                    }
                }

                // After moving, check if infantry landed on capturable building
                if (moved && unit.type === 'infantry') {
                    const landedBuilding = this.getBuildingAt(unit.x, unit.y);
                    if (landedBuilding && landedBuilding.owner !== 'enemy') {
                        // Capture the building
                        const captureAmount = Math.ceil(unit.health / 10);

                        // Select building to show capture bar immediately
                        this.selectedBuilding = landedBuilding;
                        // Render before animation to ensure DOM is updated with capture bar
                        this.render();

                        // Show capture animation
                        await this.showCaptureAnimation(unit, landedBuilding, captureAmount);

                        // Update building state
                        landedBuilding.capturePoints -= captureAmount;
                        if (landedBuilding.capturePoints <= 0) {
                            landedBuilding.capturePoints = landedBuilding.maxCapturePoints;
                            landedBuilding.owner = 'enemy';
                        }
                        this.selectedBuilding = null;
                        this.render();
                    }
                }

                // After moving, check if can attack now
                if (moved) {
                    const newDistance = Math.abs(closestPlayer.x - unit.x) + Math.abs(closestPlayer.y - unit.y);
                    if (newDistance <= unit.attackRange) {
                        await this.attack(unit, closestPlayer);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }
        }

        // Add income for enemy
        this.enemyMoney += this.calculateIncome('enemy');

        // End AI turn
        this.units.filter(u => u.team === 'enemy').forEach(u => u.reset());
        this.currentTurn = 'player';

        // Play turn start sound for player's turn
        this.soundManager.play('turnStart');

        this.render();
    }

    checkWinCondition() {
        const playerUnits = this.units.filter(u => u.team === 'player');
        const enemyUnits = this.units.filter(u => u.team === 'enemy');

        // Check if HQ has been captured
        const playerHQ = this.buildings.find(b => b.type === 'hq' && b.owner === 'player');
        const enemyHQ = this.buildings.find(b => b.type === 'hq' && b.owner === 'enemy');

        // Player loses if all units are destroyed OR HQ is captured
        if (playerUnits.length === 0 || !playerHQ) {
            this.showGameOver(false, !playerHQ);
        } else if (enemyUnits.length === 0 || !enemyHQ) {
            this.showGameOver(true, !enemyHQ);
        }
    }

    showGameOver(playerWon, hqCaptured = false) {
        this.gameOver = true;
        const gameOverDiv = document.getElementById('game-over');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        if (playerWon) {
            // Play victory sound
            this.soundManager.play('victory');

            title.textContent = 'Victory!';
            if (hqCaptured) {
                message.textContent = 'You have captured the enemy headquarters!';
            } else {
                message.textContent = 'You have defeated all enemy units!';
            }
        } else {
            title.textContent = 'Defeat!';
            if (hqCaptured) {
                message.textContent = 'Your headquarters has been captured!';
            } else {
                message.textContent = 'All your units have been destroyed!';
            }
        }

        // Emit game over event in multiplayer mode
        if (this.isMultiplayer && this.socket) {
            this.socket.emit('gameOver', { playerWon: playerWon });
        }

        gameOverDiv.classList.remove('hidden');
    }

    restart() {
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('capture-popup').classList.add('hidden');
        document.getElementById('production-popup').classList.add('hidden');

        // Reset multiplayer state
        this.isMultiplayer = false;
        this.myTeam = null;
        this.gameId = null;
        this.opponentId = null;

        this.initGame();
        this.render();
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight;
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.x === x && u.y === y);
    }

    getBuildingAt(x, y) {
        return this.buildings.find(b => b.x === x && b.y === y);
    }

    isPositionMovable(x, y) {
        return this.movablePositions.some(p => p.x === x && p.y === y);
    }

    isPositionAttackable(x, y) {
        return this.attackablePositions.some(p => p.x === x && p.y === y);
    }

    // Building methods
    showCapturePopup(unit, building) {
        this.selectedUnit = unit;
        this.selectedBuilding = building;
        this.capturePopupVisible = true;

        // Render to show capture bar immediately
        this.render();

        const popup = document.getElementById('capture-popup');
        const popupContent = popup.querySelector('.popup-content');

        // Get the building tile position
        const tile = document.querySelector(`[data-x="${building.x}"][data-y="${building.y}"]`);
        if (tile) {
            const rect = tile.getBoundingClientRect();
            const boardRect = document.getElementById('game-board').getBoundingClientRect();

            // Calculate position relative to viewport
            const tileCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            // Position above if in bottom half, below if in top half
            const isInBottomHalf = building.y >= this.boardHeight / 2;

            if (isInBottomHalf) {
                // Position above the building
                popupContent.style.top = `${rect.top - 10}px`;
                popupContent.style.transform = 'translate(-50%, -100%)';
            } else {
                // Position below the building
                popupContent.style.top = `${rect.bottom + 10}px`;
                popupContent.style.transform = 'translate(-50%, 0)';
            }

            popupContent.style.left = `${tileCenter.x}px`;
        }

        popup.classList.remove('hidden');
    }

    cancelCapture() {
        document.getElementById('capture-popup').classList.add('hidden');
        this.capturePopupVisible = false;
        this.selectedBuilding = null;

        // Keep the unit selected and show available actions
        if (this.selectedUnit) {
            const unit = this.selectedUnit;

            // Unit has already moved, check if it can still attack
            const hasEnemiesInRange = this.hasEnemiesInAttackRange(unit);

            if (hasEnemiesInRange && !unit.hasAttacked) {
                // Show attack range
                this.showingAttackRange = true;
                this.movablePositions = [];
                this.calculateAttackablePositionsFromUnit(unit, true);
                this.render();
            } else {
                // No actions left, deselect the unit
                this.cancelSelection();
            }
        }
    }

    async confirmCapture() {
        if (!this.selectedUnit || !this.selectedBuilding) return;

        const unit = this.selectedUnit;
        const building = this.selectedBuilding;
        const myTeam = this.isMultiplayer ? this.myTeam : 'player';

        // Close popup first
        document.getElementById('capture-popup').classList.add('hidden');
        this.capturePopupVisible = false;

        // Calculate capture amount based on unit health
        const captureAmount = Math.ceil(unit.health / 10);

        // Render to ensure DOM is up to date before animation
        this.render();

        // Show capture animation
        await this.showCaptureAnimation(unit, building, captureAmount);

        // Reduce building capture points
        building.capturePoints -= captureAmount;

        if (building.capturePoints <= 0) {
            // Building is captured!
            building.capturePoints = building.maxCapturePoints;
            building.owner = myTeam;
        }

        // Mark unit as used
        unit.hasMoved = true;
        unit.hasAttacked = true;

        // Emit capture event in multiplayer
        if (this.isMultiplayer && this.socket) {
            this.socket.emit('captureBuilding', {
                unitX: unit.x,
                unitY: unit.y,
                buildingX: building.x,
                buildingY: building.y,
                captureAmount: captureAmount
            });
        }

        this.selectedBuilding = null;
        this.cancelSelection();
        this.render();
    }

    async showCaptureAnimation(unit, building, captureAmount) {
        return new Promise((resolve) => {
            // Find the unit tile
            const tile = document.querySelector(`[data-x="${unit.x}"][data-y="${unit.y}"]`);
            if (!tile) {
                resolve();
                return;
            }

            const unitElement = tile.querySelector('.unit');
            if (unitElement) {
                // Add jump animation class
                unitElement.classList.add('capturing');
            }

            // Animate the capture bar decreasing
            const buildingElement = tile.querySelector('.building');
            const captureBar = tile.querySelector('.capture-progress');

            if (captureBar) {
                const startPercent = (building.capturePoints / building.maxCapturePoints) * 100;
                const endPercent = ((building.capturePoints - captureAmount) / building.maxCapturePoints) * 100;

                // Delay bar animation to sync with jump down (starts at 50% of jump animation = 0.4s)
                captureBar.style.transition = 'width 0.4s ease-in-out';
                setTimeout(() => {
                    captureBar.style.width = `${Math.max(0, endPercent)}%`;
                }, 400);
            }

            // Wait for animation to complete
            setTimeout(() => {
                if (unitElement) {
                    unitElement.classList.remove('capturing');
                }
                resolve();
            }, 1000);
        });
    }

    showProductionMenu(building) {
        this.selectedBuilding = building;
        this.productionMenuVisible = true;

        const popup = document.getElementById('production-popup');
        const myTeam = this.isMultiplayer ? this.myTeam : 'player';
        const myMoney = myTeam === 'player' ? this.playerMoney : this.enemyMoney;

        document.getElementById('production-money').textContent = myMoney;

        // Enable/disable buttons based on money and update unit images
        const unitCosts = { infantry: 300, tank: 500, chopper: 700 };
        document.querySelectorAll('.production-option').forEach(btn => {
            const unitType = btn.dataset.unit;
            const cost = unitCosts[unitType];
            btn.disabled = (myMoney < cost);

            // Update unit icon to match the player's team
            const icon = btn.querySelector('.production-unit-icon');
            if (icon) {
                icon.src = this.getUnitImagePath(unitType, myTeam);
            }
        });

        popup.classList.remove('hidden');
    }

    closeProductionMenu() {
        document.getElementById('production-popup').classList.add('hidden');
        this.productionMenuVisible = false;
        this.selectedBuilding = null;
    }

    produceUnit(unitType) {
        if (!this.selectedBuilding) return;

        const building = this.selectedBuilding;
        const myTeam = this.isMultiplayer ? this.myTeam : 'player';
        const unitCosts = { infantry: 300, tank: 500, chopper: 700 };
        const cost = unitCosts[unitType];

        // Check if we have enough money
        const myMoney = myTeam === 'player' ? this.playerMoney : this.enemyMoney;
        if (myMoney < cost) {
            return;
        }

        // Check if tile is occupied
        if (this.getUnitAt(building.x, building.y)) {
            alert('Cannot produce unit - tile is occupied!');
            return;
        }

        // Deduct money
        if (myTeam === 'player') {
            this.playerMoney -= cost;
        } else {
            this.enemyMoney -= cost;
        }

        // Create new unit with actions already used
        const newUnit = new Unit(unitType, myTeam, building.x, building.y);
        newUnit.hasMoved = true;
        newUnit.hasAttacked = true;
        this.units.push(newUnit);

        // Play unit purchase sound
        this.soundManager.playUnitSound(unitType);

        // Emit production event in multiplayer
        if (this.isMultiplayer && this.socket) {
            this.socket.emit('produceUnit', {
                buildingX: building.x,
                buildingY: building.y,
                unitType: unitType
            });
        }

        this.closeProductionMenu();
        this.render();
    }

    calculateIncome(team) {
        let income = this.incomePerTurn;
        // Add income from owned buildings
        this.buildings.forEach(building => {
            if (building.owner === team) {
                income += building.getIncome();
            }
        });
        return income;
    }

    // Multiplayer methods
    initializeSocket() {
        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            console.log('Socket.IO not available - multiplayer disabled');
            return;
        }

        try {
            // Connect to multiplayer server (uses MULTIPLAYER_SERVER_URL or same origin)
            const serverUrl = MULTIPLAYER_SERVER_URL || window.location.origin;
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });

            // Handle connection errors
            this.socket.on('connect_error', (error) => {
                console.log('Multiplayer server connection failed:', error.message);
                console.log('Multiplayer mode requires a running server. See README for setup instructions.');
            });

            this.socket.on('connect', () => {
                console.log('Connected to multiplayer server');
            });

            // Handle disconnection
            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from multiplayer server. Reason:', reason);
                if (reason === 'io server disconnect') {
                    // Server disconnected, try to reconnect
                    console.log('Server disconnected, attempting to reconnect...');
                    this.socket.connect();
                } else if (reason === 'io client disconnect') {
                    // Client disconnected manually
                    console.log('Client disconnected manually');
                } else {
                    // Other reasons (ping timeout, transport close, etc.)
                    console.log('Connection lost, will auto-reconnect...');
                }
            });

            // Handle reconnection
            this.socket.on('reconnect', (attemptNumber) => {
                console.log('Reconnected to multiplayer server after', attemptNumber, 'attempts');
            });

            this.socket.on('reconnect_error', (error) => {
                console.log('Reconnection failed:', error.message);
            });

            this.socket.on('reconnect_failed', () => {
                console.log('Failed to reconnect to multiplayer server');
            });
        } catch (error) {
            console.log('Failed to initialize multiplayer:', error);
            this.socket = null;
            return;
        }

        // Handle waiting for opponent
        this.socket.on('waitingForOpponent', () => {
            console.log('Waiting for opponent...');
            this.showWaitingScreen();
        });

        // Handle game matched
        this.socket.on('gameMatched', (data) => {
            console.log('Game matched!', data);
            this.hideWaitingScreen();
            // Hide room display if it's visible
            document.getElementById('room-display').classList.add('hidden');
            this.startMultiplayerGame(data);
        });

        // Handle opponent move
        this.socket.on('opponentMove', (data) => {
            console.log('Opponent moved', data);
            this.handleOpponentMove(data);
        });

        // Handle opponent attack
        this.socket.on('opponentAttack', (data) => {
            console.log('Opponent attacked', data);
            this.handleOpponentAttack(data);
        });

        // Handle turn change
        this.socket.on('turnChanged', (newTurn) => {
            console.log('Turn changed to:', newTurn);
            this.currentTurn = newTurn;

            // Play turn start sound when it's our turn
            if (this.isMyTurn()) {
                this.soundManager.play('turnStart');
            }

            this.updateUI();
        });

        // Handle opponent game over
        this.socket.on('opponentGameOver', (data) => {
            console.log('Opponent game over:', data);
            // The opponent's game is over, so we won
            this.showGameOver(!data.playerWon);
        });

        // Handle opponent disconnection
        this.socket.on('opponentDisconnected', () => {
            alert('Opponent disconnected! Returning to single player mode.');
            this.restart();
        });

        // Handle room created
        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data.roomCode);
            const roomDisplay = document.getElementById('room-display');
            const roomCodeText = document.getElementById('room-code-text');
            roomCodeText.textContent = data.roomCode;
            roomDisplay.classList.remove('hidden');
        });

        // Handle join room error
        this.socket.on('joinRoomError', (data) => {
            console.log('Join room error:', data.message);
            const joinRoomInput = document.getElementById('join-room-input');
            const joinError = document.getElementById('join-error');
            joinError.textContent = data.message;
            joinError.classList.remove('hidden');
            joinRoomInput.classList.remove('hidden');
        });
    }

    waitForConnection(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not initialized'));
                return;
            }

            if (this.socket.connected) {
                resolve();
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, timeout);

            this.socket.once('connect', () => {
                clearTimeout(timeoutId);
                resolve();
            });

            this.socket.once('connect_error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    async startMultiplayer() {
        if (!this.socket) {
            alert('Multiplayer server is not available.\n\nTo enable multiplayer:\n1. Deploy the multiplayer server (see README)\n2. Update MULTIPLAYER_SERVER_URL in game.js with your server URL\n\nFor now, continue playing in single-player mode!');
            return;
        }

        try {
            console.log('Connecting to multiplayer server...');
            await this.waitForConnection();
            console.log('Starting multiplayer...');
            this.socket.emit('joinMatchmaking');
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('Multiplayer server is not available.\n\nTo enable multiplayer:\n1. Deploy the multiplayer server (see README)\n2. Update MULTIPLAYER_SERVER_URL in game.js with your server URL\n\nFor now, continue playing in single-player mode!');
        }
    }

    cancelMatchmaking() {
        if (this.socket) {
            this.socket.emit('cancelMatchmaking');
        }
        this.hideWaitingScreen();
    }

    async createRoom() {
        if (!this.socket) {
            alert('Multiplayer server is not available.\n\nTo enable multiplayer:\n1. Deploy the multiplayer server (see README)\n2. Update MULTIPLAYER_SERVER_URL in game.js with your server URL\n\nFor now, continue playing in single-player mode!');
            return;
        }

        try {
            console.log('Connecting to multiplayer server...');
            await this.waitForConnection();
            console.log('Creating room...');
            this.socket.emit('createRoom');
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('Multiplayer server is not available.\n\nTo enable multiplayer:\n1. Deploy the multiplayer server (see README)\n2. Update MULTIPLAYER_SERVER_URL in game.js with your server URL\n\nFor now, continue playing in single-player mode!');
        }
    }

    async joinRoom(roomCode) {
        if (!this.socket) {
            alert('Multiplayer server is not available.\n\nTo enable multiplayer:\n1. Deploy the multiplayer server (see README)\n2. Update MULTIPLAYER_SERVER_URL in game.js with your server URL\n\nFor now, continue playing in single-player mode!');
            return;
        }

        try {
            console.log('Connecting to multiplayer server...');
            await this.waitForConnection();
            console.log('Joining room:', roomCode);
            this.socket.emit('joinRoom', { roomCode });
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('Multiplayer server is not available.\n\nTo enable multiplayer:\n1. Deploy the multiplayer server (see README)\n2. Update MULTIPLAYER_SERVER_URL in game.js with your server URL\n\nFor now, continue playing in single-player mode!');
        }
    }

    startMultiplayerGame(data) {
        this.isMultiplayer = true;
        this.myTeam = data.yourTeam;
        this.gameId = data.gameId;
        this.opponentId = data.opponentId;

        console.log(`Starting multiplayer game as ${this.myTeam} team`);

        // Initialize game
        this.initGame();
        this.render();

        // Set current turn - mouse team (player) always starts
        this.currentTurn = 'player';

        // If we're the enemy team, it's not our turn
        if (this.myTeam === 'enemy') {
            this.updateUI();
        }
    }

    showWaitingScreen() {
        document.getElementById('waiting-screen').classList.remove('hidden');
    }

    hideWaitingScreen() {
        document.getElementById('waiting-screen').classList.add('hidden');
    }

    handleOpponentMove(data) {
        const unit = this.getUnitAt(data.fromX, data.fromY);
        if (unit) {
            this.moveUnit(unit, data.toX, data.toY);
        }
    }

    async handleOpponentAttack(data) {
        const attacker = this.getUnitAt(data.attackerX, data.attackerY);
        const target = this.getUnitAt(data.targetX, data.targetY);
        if (attacker && target) {
            await this.attack(attacker, target);
        }
    }

    isMyTurn() {
        if (!this.isMultiplayer) {
            return this.currentTurn === 'player';
        }
        return this.currentTurn === this.myTeam;
    }
}

// Initialize marching units for start screen
function initMarchingUnits() {
    const marchingContainer = document.getElementById('marching-units');
    const unitImages = [
        'art/mouse_soldier.png',
        'art/mouse_tank.png',
        'art/mouse_chopper.png',
        'art/bird_soldier.png',
        'art/bird_tank.png',
        'art/bird_chopper.png'
    ];

    // Create 10 units pre-warmed at different positions
    for (let i = 0; i < 10; i++) {
        const unit = document.createElement('div');
        unit.className = 'marching-unit';

        // Random vertical position
        const topPercent = 20 + Math.random() * 60;
        unit.style.top = `${topPercent}%`;

        // Pre-warm: spread units across the screen
        // Each unit starts at a different point in the march animation
        const delay = -(i * 1.5); // Negative delay to pre-populate
        unit.style.animationDelay = `${delay}s, ${Math.random() * 0.5}s`;

        const img = document.createElement('img');
        img.src = unitImages[Math.floor(Math.random() * unitImages.length)];
        img.alt = 'Marching unit';

        unit.appendChild(img);
        marchingContainer.appendChild(unit);
    }
}

// Start the game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    // Initialize marching units on start screen
    initMarchingUnits();

    // Get UI elements
    const startScreen = document.getElementById('start-screen');
    const multiplayerMenu = document.getElementById('multiplayer-menu');
    const roomDisplay = document.getElementById('room-display');
    const joinRoomInput = document.getElementById('join-room-input');
    const backgroundMusic = document.getElementById('background-music');

    // Play music and hide start screen helper
    function startGame() {
        backgroundMusic.play().catch(err => {
            console.log('Audio playback failed:', err);
        });
        startScreen.classList.add('hidden');
        document.getElementById('game-view').classList.remove('hidden');
    }

    // Initialize marching units for a container
    function initMarchingForContainer(container) {
        const unitImages = [
            'art/mouse_soldier.png',
            'art/mouse_tank.png',
            'art/mouse_chopper.png',
            'art/bird_soldier.png',
            'art/bird_tank.png',
            'art/bird_chopper.png'
        ];

        for (let i = 0; i < 10; i++) {
            const unit = document.createElement('div');
            unit.className = 'marching-unit';
            const topPercent = 20 + Math.random() * 60;
            unit.style.top = `${topPercent}%`;
            const delay = -(i * 1.5);
            unit.style.animationDelay = `${delay}s, ${Math.random() * 0.5}s`;
            const img = document.createElement('img');
            img.src = unitImages[Math.floor(Math.random() * unitImages.length)];
            img.alt = 'Marching unit';
            unit.appendChild(img);
            container.appendChild(unit);
        }
    }

    // Single Player button
    document.getElementById('single-player-btn').addEventListener('click', () => {
        startGame();
        game = new Game();
    });

    // Multiplayer button - show multiplayer menu
    document.getElementById('multiplayer-btn').addEventListener('click', () => {
        startGame();
        multiplayerMenu.classList.remove('hidden');
        // Initialize marching units for multiplayer menu if not already done
        const menuUnitsContainer = multiplayerMenu.querySelector('.menu-marching-units');
        if (menuUnitsContainer && menuUnitsContainer.children.length === 0) {
            initMarchingForContainer(menuUnitsContainer);
        }
    });

    // Back to start from multiplayer menu
    document.getElementById('back-to-start-btn').addEventListener('click', () => {
        multiplayerMenu.classList.add('hidden');
        startScreen.classList.remove('hidden');
    });

    // Random Match button
    document.getElementById('random-match-btn').addEventListener('click', () => {
        multiplayerMenu.classList.add('hidden');
        game = new Game();
        game.startMultiplayer();
    });

    // Create Room button
    document.getElementById('create-room-btn').addEventListener('click', () => {
        multiplayerMenu.classList.add('hidden');
        game = new Game();
        game.createRoom();
        // Initialize marching units for room display
        const roomUnitsContainer = roomDisplay.querySelector('.menu-marching-units');
        if (roomUnitsContainer && roomUnitsContainer.children.length === 0) {
            initMarchingForContainer(roomUnitsContainer);
        }
    });

    // Join Room button - show input
    document.getElementById('join-room-btn').addEventListener('click', () => {
        multiplayerMenu.classList.add('hidden');
        joinRoomInput.classList.remove('hidden');
        document.getElementById('room-code-input').value = '';
        document.getElementById('join-error').classList.add('hidden');
        // Initialize marching units for join room screen
        const joinUnitsContainer = joinRoomInput.querySelector('.menu-marching-units');
        if (joinUnitsContainer && joinUnitsContainer.children.length === 0) {
            initMarchingForContainer(joinUnitsContainer);
        }
    });

    // Cancel join room
    document.getElementById('cancel-join-btn').addEventListener('click', () => {
        joinRoomInput.classList.add('hidden');
        multiplayerMenu.classList.remove('hidden');
    });

    // Confirm join room
    document.getElementById('confirm-join-btn').addEventListener('click', () => {
        const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (roomCode.length < 4) {
            document.getElementById('join-error').textContent = 'Please enter a valid room code';
            document.getElementById('join-error').classList.remove('hidden');
            return;
        }

        joinRoomInput.classList.add('hidden');
        game = new Game();
        game.joinRoom(roomCode);
    });

    // Allow Enter key to join room
    document.getElementById('room-code-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirm-join-btn').click();
        }
    });

    // Cancel room
    document.getElementById('cancel-room-btn').addEventListener('click', () => {
        if (game && game.socket) {
            game.socket.emit('cancelRoom');
        }
        roomDisplay.classList.add('hidden');
        multiplayerMenu.classList.remove('hidden');
    });
});

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
                this.attackPower = 45;
                break;
            case 'chopper':
                this.maxHealth = 100;
                this.health = 100;
                this.maxSoldiers = 3;
                this.movement = 6;
                this.attackRange = 4;
                this.attackPower = 35;
                break;
        }
    }

    get soldiers() {
        return Math.ceil((this.health / this.maxHealth) * this.maxSoldiers);
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

// Game State
class Game {
    constructor() {
        this.boardWidth = 10;
        this.boardHeight = 10;
        this.units = [];
        this.selectedUnit = null;
        this.currentTurn = 'player';
        this.gameOver = false;
        this.movablePositions = [];
        this.attackablePositions = [];
        this.isMovingUnit = false;

        this.initGame();
        this.setupEventListeners();
        this.render();
    }

    initGame() {
        this.units = [];
        this.gameOver = false;
        this.currentTurn = 'player';

        // Create player units
        this.units.push(new Unit('infantry', 'player', 1, 8));
        this.units.push(new Unit('infantry', 'player', 2, 9));
        this.units.push(new Unit('tank', 'player', 0, 8));
        this.units.push(new Unit('chopper', 'player', 1, 9));

        // Create enemy units
        this.units.push(new Unit('infantry', 'enemy', 8, 1));
        this.units.push(new Unit('infantry', 'enemy', 7, 0));
        this.units.push(new Unit('tank', 'enemy', 9, 1));
        this.units.push(new Unit('chopper', 'enemy', 8, 0));

        this.selectedUnit = null;
        this.movablePositions = [];
        this.attackablePositions = [];
    }

    setupEventListeners() {
        document.getElementById('end-turn-btn').addEventListener('click', () => {
            this.endTurn();
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.cancelSelection();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });
    }

    render() {
        const board = document.getElementById('game-board');
        board.innerHTML = '';

        // Create tiles
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.x = x;
                tile.dataset.y = y;

                // Check if this position is movable
                if (this.isPositionMovable(x, y)) {
                    tile.classList.add('movable');
                }

                // Check if this position is attackable
                if (this.isPositionAttackable(x, y)) {
                    tile.classList.add('attackable');
                }

                // Check if there's a unit here
                const unit = this.getUnitAt(x, y);
                if (unit) {
                    const unitDiv = document.createElement('div');
                    unitDiv.className = `unit unit-${unit.type} ${unit.team}`;
                    if (unit.hasMoved && unit.hasAttacked) {
                        unitDiv.classList.add('moved');
                    }

                    // Add the unit icon emoji
                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'unit-icon';
                    iconDiv.textContent = this.getUnitIcon(unit.type);
                    unitDiv.appendChild(iconDiv);

                    // Add the soldier count
                    const countDiv = document.createElement('div');
                    countDiv.className = 'unit-count';
                    countDiv.textContent = unit.soldiers;
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

        this.updateUI();
    }

    updateUI() {
        document.getElementById('current-turn').textContent =
            this.currentTurn === 'player' ? 'Player Turn' : 'Enemy Turn';

        const cancelBtn = document.getElementById('cancel-btn');
        cancelBtn.disabled = !this.selectedUnit;

        const endTurnBtn = document.getElementById('end-turn-btn');
        endTurnBtn.disabled = this.currentTurn !== 'player';

        // Update selected unit info
        const unitDetails = document.getElementById('unit-details');
        if (this.selectedUnit) {
            unitDetails.innerHTML = `
                <p><strong>Type:</strong> ${this.selectedUnit.type}</p>
                <p><strong>Team:</strong> ${this.selectedUnit.team}</p>
                <p><strong>Health:</strong> ${this.selectedUnit.health}/100</p>
                <p><strong>Soldiers:</strong> ${this.selectedUnit.soldiers}/${this.selectedUnit.maxSoldiers}</p>
                <p><strong>Position:</strong> (${this.selectedUnit.x}, ${this.selectedUnit.y})</p>
            `;
        } else {
            unitDetails.innerHTML = '<p>Click a unit to see details</p>';
        }
    }

    handleTileClick(x, y) {
        if (this.gameOver || this.currentTurn !== 'player') return;

        const unit = this.getUnitAt(x, y);

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

        // If clicking on a unit
        if (unit && unit.team === 'player' && !unit.hasMoved) {
            this.selectUnit(unit);
        } else {
            this.cancelSelection();
        }
    }

    selectUnit(unit) {
        this.selectedUnit = unit;
        this.calculateMovablePositions(unit);
        this.render();
    }

    cancelSelection() {
        this.selectedUnit = null;
        this.movablePositions = [];
        this.attackablePositions = [];
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

        // Calculate attackable positions after moving
        this.calculateAttackablePositions(unit);
    }

    calculateAttackablePositions(unit) {
        this.attackablePositions = [];

        // Check from current position
        this.addAttackableFromPosition(unit, unit.x, unit.y);

        // Check from all movable positions
        for (const pos of this.movablePositions) {
            this.addAttackableFromPosition(unit, pos.x, pos.y);
        }
    }

    addAttackableFromPosition(unit, fromX, fromY) {
        for (let dy = -unit.attackRange; dy <= unit.attackRange; dy++) {
            for (let dx = -unit.attackRange; dx <= unit.attackRange; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > unit.attackRange || distance === 0) continue;

                const targetX = fromX + dx;
                const targetY = fromY + dy;

                if (!this.isInBounds(targetX, targetY)) continue;

                const targetUnit = this.getUnitAt(targetX, targetY);
                if (targetUnit && targetUnit.team !== unit.team) {
                    // Check if not already in list
                    if (!this.attackablePositions.some(p => p.x === targetX && p.y === targetY)) {
                        this.attackablePositions.push({ x: targetX, y: targetY });
                    }
                }
            }
        }
    }

    async moveUnit(unit, toX, toY) {
        // Get the unit's current tile element
        const fromTile = document.querySelector(`[data-x="${unit.x}"][data-y="${unit.y}"]`);
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

        this.movablePositions = [];
        // Recalculate attackable positions from new location
        this.calculateAttackablePositionsFromUnit(unit);

        this.render();
    }

    calculateAttackablePositionsFromUnit(unit) {
        this.attackablePositions = [];

        for (let dy = -unit.attackRange; dy <= unit.attackRange; dy++) {
            for (let dx = -unit.attackRange; dx <= unit.attackRange; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > unit.attackRange || distance === 0) continue;

                const targetX = unit.x + dx;
                const targetY = unit.y + dy;

                if (!this.isInBounds(targetX, targetY)) continue;

                const targetUnit = this.getUnitAt(targetX, targetY);
                if (targetUnit && targetUnit.team !== unit.team) {
                    this.attackablePositions.push({ x: targetX, y: targetY });
                }
            }
        }
    }

    async attack(attacker, defender) {
        // Show battle cutscene
        await this.showBattleCutscene(attacker, defender);

        // Calculate damage
        const attackerDamage = this.calculateDamage(attacker, defender);
        defender.takeDamage(attackerDamage);

        // Counter attack if defender is still alive
        if (defender.isAlive()) {
            const defenderDamage = this.calculateDamage(defender, attacker);
            attacker.takeDamage(defenderDamage);
        }

        // Remove dead units
        this.units = this.units.filter(u => u.isAlive());

        // Mark attacker as having attacked
        attacker.hasAttacked = true;
        attacker.hasMoved = true;

        this.cancelSelection();
        this.checkWinCondition();
        this.render();
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

    async showBattleCutscene(attacker, defender) {
        return new Promise((resolve) => {
            const cutscene = document.getElementById('battle-cutscene');
            const attackerSide = cutscene.querySelector('.attacker-side');
            const defenderSide = cutscene.querySelector('.defender-side');
            const attackerContainer = document.getElementById('attacker-soldiers');
            const defenderContainer = document.getElementById('defender-soldiers');

            // Clear previous soldiers
            attackerContainer.innerHTML = '';
            defenderContainer.innerHTML = '';

            // Add team classes for colored backgrounds
            attackerSide.className = `attacker-side team-${attacker.team}`;
            defenderSide.className = `defender-side team-${defender.team}`;

            // Calculate damage before showing cutscene
            const damage = this.calculateDamage(attacker, defender);
            const defenderHealthBefore = defender.health;
            const defenderHealthAfter = Math.max(0, defenderHealthBefore - damage);
            const soldiersBefore = defender.soldiers;
            const soldiersAfter = Math.ceil((defenderHealthAfter / defender.maxHealth) * defender.maxSoldiers);
            const soldiersLost = soldiersBefore - soldiersAfter;

            // Create attacker soldiers
            const attackerIcon = this.getUnitIcon(attacker.type);
            for (let i = 0; i < attacker.soldiers; i++) {
                const soldier = document.createElement('div');
                soldier.className = 'battle-soldier';
                soldier.textContent = attackerIcon;
                attackerContainer.appendChild(soldier);
            }

            // Create defender soldiers
            const defenderIcon = this.getUnitIcon(defender.type);
            const defenderSoldiers = [];
            for (let i = 0; i < soldiersBefore; i++) {
                const soldier = document.createElement('div');
                soldier.className = 'battle-soldier';
                soldier.textContent = defenderIcon;
                defenderContainer.appendChild(soldier);
                defenderSoldiers.push(soldier);
            }

            cutscene.classList.remove('hidden');

            // Attack animation sequence
            setTimeout(() => {
                const attackAnim = cutscene.querySelector('.attack-animation');
                attackAnim.classList.add('active');

                setTimeout(() => {
                    attackAnim.classList.remove('active');
                    const defendAnim = cutscene.querySelector('.defend-animation');
                    defendAnim.classList.add('active');

                    // Animate soldiers disappearing
                    setTimeout(() => {
                        defendAnim.classList.remove('active');

                        // Make soldiers disappear with fire animation
                        for (let i = 0; i < soldiersLost && i < defenderSoldiers.length; i++) {
                            const soldierToRemove = defenderSoldiers[defenderSoldiers.length - 1 - i];
                            setTimeout(() => {
                                soldierToRemove.textContent = '🔥';
                                soldierToRemove.classList.add('soldier-fire');
                            }, i * 100);
                        }

                        // Hide cutscene after all animations
                        setTimeout(() => {
                            cutscene.classList.add('hidden');
                            resolve();
                        }, Math.max(800, soldiersLost * 100 + 500));
                    }, 500);
                }, 500);
            }, 500);
        });
    }

    endTurn() {
        if (this.currentTurn === 'player') {
            // Reset player units
            this.units.filter(u => u.team === 'player').forEach(u => u.reset());
            this.currentTurn = 'enemy';
            this.cancelSelection();
            this.render();

            // AI turn
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    async aiTurn() {
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

            // Check if can attack
            const canAttack = minDistance <= unit.attackRange;

            if (canAttack) {
                await this.attack(unit, closestPlayer);
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                // Move towards player
                const direction = {
                    x: Math.sign(closestPlayer.x - unit.x),
                    y: Math.sign(closestPlayer.y - unit.y)
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

        // End AI turn
        this.units.filter(u => u.team === 'enemy').forEach(u => u.reset());
        this.currentTurn = 'player';
        this.render();
    }

    checkWinCondition() {
        const playerUnits = this.units.filter(u => u.team === 'player');
        const enemyUnits = this.units.filter(u => u.team === 'enemy');

        if (playerUnits.length === 0) {
            this.showGameOver(false);
        } else if (enemyUnits.length === 0) {
            this.showGameOver(true);
        }
    }

    showGameOver(playerWon) {
        this.gameOver = true;
        const gameOverDiv = document.getElementById('game-over');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        if (playerWon) {
            title.textContent = 'Victory!';
            message.textContent = 'You have defeated all enemy units!';
        } else {
            title.textContent = 'Defeat!';
            message.textContent = 'All your units have been destroyed!';
        }

        gameOverDiv.classList.remove('hidden');
    }

    restart() {
        document.getElementById('game-over').classList.add('hidden');
        this.initGame();
        this.render();
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight;
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.x === x && u.y === y);
    }

    isPositionMovable(x, y) {
        return this.movablePositions.some(p => p.x === x && p.y === y);
    }

    isPositionAttackable(x, y) {
        return this.attackablePositions.some(p => p.x === x && p.y === y);
    }
}

// Start the game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});

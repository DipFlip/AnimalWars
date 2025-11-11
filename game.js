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

// Game State
class Game {
    constructor() {
        this.boardWidth = 8;
        this.boardHeight = 10;
        this.units = [];
        this.selectedUnit = null;
        this.currentTurn = 'player';
        this.gameOver = false;
        this.movablePositions = [];
        this.attackablePositions = [];
        this.isMovingUnit = false;
        this.showingAttackRange = false;

        this.initGame();
        this.setupEventListeners();
        this.initializeCutscene();
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
        this.gameOver = false;
        this.currentTurn = 'player';

        // Create player units
        this.units.push(new Unit('infantry', 'player', 1, 8));
        this.units.push(new Unit('infantry', 'player', 2, 9));
        this.units.push(new Unit('tank', 'player', 0, 8));
        this.units.push(new Unit('chopper', 'player', 1, 9));

        // Create enemy units
        this.units.push(new Unit('infantry', 'enemy', 6, 1));
        this.units.push(new Unit('infantry', 'enemy', 5, 0));
        this.units.push(new Unit('tank', 'enemy', 7, 1));
        this.units.push(new Unit('chopper', 'enemy', 6, 0));

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

        // If clicking on the same unit again
        if (unit === this.selectedUnit) {
            // If showing attack range, unselect
            if (this.showingAttackRange) {
                this.cancelSelection();
                return;
            }
            // If not showing attack range yet, toggle to it
            if (!unit.hasMoved) {
                this.showingAttackRange = true;
                this.movablePositions = [];
                this.calculateAttackablePositionsFromUnit(unit);
                this.render();
                return;
            } else {
                // Unit has moved, unselect
                this.cancelSelection();
                return;
            }
        }

        // If clicking on a unit
        if (unit && unit.team === 'player') {
            this.selectUnit(unit);
        } else {
            this.cancelSelection();
        }
    }

    selectUnit(unit) {
        this.selectedUnit = unit;

        // If unit has already moved, show attack range directly
        if (unit.hasMoved) {
            this.showingAttackRange = true;
            this.movablePositions = [];
            this.calculateAttackablePositionsFromUnit(unit);
        } else {
            // Show movement range first
            this.showingAttackRange = false;
            this.calculateMovablePositions(unit);
        }

        this.render();
    }

    cancelSelection() {
        this.selectedUnit = null;
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

        // Check if there are enemies in attack range
        const hasEnemiesInRange = this.hasEnemiesInAttackRange(unit);

        if (hasEnemiesInRange) {
            // Keep unit selected and show attack range
            this.selectedUnit = unit;
            this.showingAttackRange = true;
            this.movablePositions = [];
            this.calculateAttackablePositionsFromUnit(unit);
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

    calculateAttackablePositionsFromUnit(unit) {
        this.attackablePositions = [];

        for (let dy = -unit.attackRange; dy <= unit.attackRange; dy++) {
            for (let dx = -unit.attackRange; dx <= unit.attackRange; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > unit.attackRange || distance === 0) continue;

                const targetX = unit.x + dx;
                const targetY = unit.y + dy;

                if (!this.isInBounds(targetX, targetY)) continue;

                // Show ALL tiles in range, not just enemy-occupied ones
                this.attackablePositions.push({ x: targetX, y: targetY });
            }
        }
    }

    async attack(attacker, defender) {
        // Show pre-battle animation on map
        await this.showPreBattleAnimation(attacker, defender);

        // Show battle cutscene
        await this.showBattleCutscene(attacker, defender);

        // Calculate damage
        const attackerDamage = this.calculateDamage(attacker, defender);
        defender.takeDamage(attackerDamage);

        const defenderDied = !defender.isAlive();

        // Counter attack if defender is still alive
        let attackerDied = false;
        if (defender.isAlive()) {
            const defenderDamage = this.calculateDamage(defender, attacker);
            attacker.takeDamage(defenderDamage);
            attackerDied = !attacker.isAlive();
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

        // If attacker is still alive and hadn't moved before, let them move now
        if (!attackerDied && !hadMovedBefore) {
            this.selectedUnit = attacker;
            this.showingAttackRange = false;
            this.calculateMovablePositions(attacker);
            this.render();
        } else {
            // Unit had already moved or died, end their turn
            attacker.hasMoved = true;
            this.cancelSelection();
        }
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

            // Find the tile and unit element
            const tile = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            if (tile) {
                const unitElement = tile.querySelector('.unit');
                const iconElement = tile.querySelector('.unit-icon');

                if (unitElement && iconElement) {
                    // Change to fire emoji
                    iconElement.textContent = '🔥';

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
            const attackerSide = cutscene.querySelector('.attacker-side');
            const defenderSide = cutscene.querySelector('.defender-side');
            const attackerContainer = document.getElementById('attacker-soldiers');
            const defenderContainer = document.getElementById('defender-soldiers');

            // Clear previous soldiers
            attackerContainer.innerHTML = '';
            defenderContainer.innerHTML = '';

            // Add unit category classes (ground/air) for side backgrounds
            attackerSide.className = `attacker-side ${this.getUnitCategory(attacker.type)}`;
            defenderSide.className = `defender-side ${this.getUnitCategory(defender.type)}`;

            // Add team classes for soldier container rectangles
            attackerContainer.className = `battle-unit-container team-${attacker.team}`;
            defenderContainer.className = `battle-unit-container team-${defender.team}`;

            // Calculate damage for initial attack
            const damage = this.calculateDamage(attacker, defender);
            const defenderHealthBefore = defender.health;
            const defenderHealthAfter = Math.max(0, defenderHealthBefore - damage);
            const defenderSoldiersBefore = defender.soldiers;
            const defenderSoldiersAfter = Math.ceil((defenderHealthAfter / defender.maxHealth) * defender.maxSoldiers);
            const defenderSoldiersLost = defenderSoldiersBefore - defenderSoldiersAfter;

            // Calculate counter-attack damage if defender survives
            const defenderWillSurvive = defenderHealthAfter > 0;
            let counterDamage = 0;
            let attackerSoldiersLost = 0;
            if (defenderWillSurvive) {
                counterDamage = this.calculateDamage(defender, attacker);
                const attackerHealthBefore = attacker.health;
                const attackerHealthAfter = Math.max(0, attackerHealthBefore - counterDamage);
                const attackerSoldiersBefore = attacker.soldiers;
                const attackerSoldiersAfter = Math.ceil((attackerHealthAfter / attacker.maxHealth) * attacker.maxSoldiers);
                attackerSoldiersLost = attackerSoldiersBefore - attackerSoldiersAfter;
            }

            // Create attacker soldiers
            const attackerIcon = this.getUnitIcon(attacker.type);
            const attackerSoldiers = [];
            for (let i = 0; i < attacker.soldiers; i++) {
                const soldier = document.createElement('div');
                soldier.className = 'battle-soldier';
                soldier.textContent = attackerIcon;
                attackerContainer.appendChild(soldier);
                attackerSoldiers.push(soldier);
            }

            // Create defender soldiers
            const defenderIcon = this.getUnitIcon(defender.type);
            const defenderSoldiers = [];
            for (let i = 0; i < defenderSoldiersBefore; i++) {
                const soldier = document.createElement('div');
                soldier.className = 'battle-soldier';
                soldier.textContent = defenderIcon;
                defenderContainer.appendChild(soldier);
                defenderSoldiers.push(soldier);
            }

            cutscene.classList.remove('hidden');

            // PHASE 1: Attacker attacks defender
            const numTargets = Math.ceil(damage / 3);

            // Show target emojis scattering on defender
            setTimeout(() => {
                // Create and scatter target emojis around defender container
                for (let i = 0; i < numTargets; i++) {
                    const target = document.createElement('div');
                    target.className = 'target-emoji';
                    target.textContent = '🎯';

                    // Random scatter position
                    const angle = (i / numTargets) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                    const distance = 30 + Math.random() * 40;
                    const scatterX = Math.cos(angle) * distance;
                    const scatterY = Math.sin(angle) * distance;

                    target.style.setProperty('--scatter-x', `${scatterX}px`);
                    target.style.setProperty('--scatter-y', `${scatterY}px`);

                    defenderContainer.appendChild(target);

                    // Stagger the animation
                    setTimeout(() => {
                        target.classList.add('scatter');
                    }, i * 100);
                }

                // After targets appear, make defender soldiers disappear with fire
                setTimeout(() => {
                    for (let i = 0; i < defenderSoldiersLost && i < defenderSoldiers.length; i++) {
                        const soldierToRemove = defenderSoldiers[defenderSoldiers.length - 1 - i];
                        setTimeout(() => {
                            soldierToRemove.textContent = '🔥';
                            soldierToRemove.classList.add('soldier-fire');
                        }, i * 100);
                    }

                    const phase1Duration = Math.max(800, defenderSoldiersLost * 100 + 500);

                    // PHASE 2: Counter-attack if defender survived
                    if (defenderWillSurvive && counterDamage > 0) {
                        setTimeout(() => {
                            const numCounterTargets = Math.ceil(counterDamage / 3);

                            // Show target emojis scattering on attacker
                            for (let i = 0; i < numCounterTargets; i++) {
                                const target = document.createElement('div');
                                target.className = 'target-emoji';
                                target.textContent = '🎯';

                                // Random scatter position
                                const angle = (i / numCounterTargets) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                                const distance = 30 + Math.random() * 40;
                                const scatterX = Math.cos(angle) * distance;
                                const scatterY = Math.sin(angle) * distance;

                                target.style.setProperty('--scatter-x', `${scatterX}px`);
                                target.style.setProperty('--scatter-y', `${scatterY}px`);

                                attackerContainer.appendChild(target);

                                // Stagger the animation
                                setTimeout(() => {
                                    target.classList.add('scatter');
                                }, i * 100);
                            }

                            // After targets appear, make attacker soldiers disappear with fire
                            setTimeout(() => {
                                for (let i = 0; i < attackerSoldiersLost && i < attackerSoldiers.length; i++) {
                                    const soldierToRemove = attackerSoldiers[attackerSoldiers.length - 1 - i];
                                    setTimeout(() => {
                                        soldierToRemove.textContent = '🔥';
                                        soldierToRemove.classList.add('soldier-fire');
                                    }, i * 100);
                                }

                                // Hide cutscene after counter-attack animations
                                setTimeout(() => {
                                    cutscene.classList.add('hidden');
                                    resolve();
                                }, Math.max(800, attackerSoldiersLost * 100 + 500));
                            }, numCounterTargets * 100 + 400);
                        }, phase1Duration);
                    } else {
                        // No counter-attack, hide cutscene after phase 1
                        setTimeout(() => {
                            cutscene.classList.add('hidden');
                            resolve();
                        }, phase1Duration);
                    }
                }, numTargets * 100 + 400);
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

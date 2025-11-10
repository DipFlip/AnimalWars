# Advance Wars - Browser Game

A browser-based turn-based strategy game inspired by Advance Wars.

## Features

- Turn-based combat system
- Multiple unit types: Infantry, Tanks, and Choppers
- Grid-based movement with range indicators
- AI opponent that moves and attacks strategically
- Battle cutscene animations
- Health system with visual soldier counts
- Win/lose conditions
- Restart functionality

## How to Play

### Unit Types

- **Infantry** (👤): 10 soldiers at full health, 3 movement range, basic attack power
- **Tank** (🚜): 4 soldiers at full health, 5 movement range, high attack power
- **Chopper** (🚁): 3 soldiers at full health, 6 movement range, medium attack power

### Game Controls

1. **Select Unit**: Click on any of your (blue) units to select them
2. **Move**: After selecting, click on a highlighted yellow tile to move
3. **Attack**: After moving (or from current position), click on a red highlighted enemy unit to attack
4. **Cancel**: Click the Cancel button to deselect the current unit
5. **End Turn**: Click "End Turn" when you're done moving your units

### Combat System

- Each unit has 100 health represented by soldiers
- Damage is calculated based on attack power and current health
- Units can counter-attack if they survive the initial attack
- Battle animations show the combat sequence
- Units are destroyed when health reaches 0

### Winning

- Destroy all enemy (red) units to win
- Don't let all your units get destroyed!

## Deployment to Vercel

1. Install Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Deploy the game:
   ```bash
   vercel
   ```

3. Follow the prompts to deploy

Or simply connect your repository to Vercel dashboard for automatic deployments.

## Local Development

Simply open `index.html` in a web browser to play locally.

## Future Enhancements

- More unit types (Artillery, Anti-Air, etc.)
- Terrain effects (forests, mountains, rivers)
- Multiple maps
- Building capture mechanics
- Production/economy system
- Multiplayer support
- Unit sprites/images

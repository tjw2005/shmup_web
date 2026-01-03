# Gradius Clone Improvement Ideas

## 1. Implement "Options" (The Ghosts)
- **Concept**: Glowing orbs that follow the player's path and mimic shooting.
- **Implementation**: Record player position history (buffer) and render Options at delayed intervals (e.g., `history[now - 20]`).

## 2. Boss Battle ("Big Core")
- **Concept**: A large boss ship appears after a score/time threshold.
- **Mechanics**: Destructible core protected by shielding barriers.

## 3. Enemy Variety
- **Ground Turrets**: Stationary enemies aiming at the player.
- **Rushers**: High-speed enemies flying straight across.
- **Formation Squads**: Groups of enemies that drop power-ups when the whole squad is destroyed.

## 4. Visual Polish
- **Particles**: Exhaust trails for missiles/player, debris for explosions.
- **Parallax**: Multiple starfield layers moving at different speeds.

## 5. Terrain Biomes
- **Concept**: Switch environment styles periodically.
- **Examples**: Mechanical Base, Asteroid Field, Organic/Alien Cave.

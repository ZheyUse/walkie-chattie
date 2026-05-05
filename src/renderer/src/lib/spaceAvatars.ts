// All 20 space avatar SVG filenames. These are stored in
// src/renderer/public/resources/space-avatar/ and served from Vite's base path.
import { assetPath } from './assets'

export const SPACE_AVATARS: { filename: string; label: string }[] = [
  { filename: 'avatar-rocket.svg',       label: 'Rocket' },
  { filename: 'avatar-alien.svg',         label: 'Alien' },
  { filename: 'avatar-astronaut.svg',     label: 'Astronaut' },
  { filename: 'avatar-space-helmet.svg',  label: 'Space Helmet' },
  { filename: 'avatar-robot.svg',         label: 'Robot' },
  { filename: 'avatar-alien-spaceship.svg', label: 'Alien Spaceship' },
  { filename: 'avatar-spaceship.svg',    label: 'Spaceship' },
  { filename: 'avatar-saturn.svg',       label: 'Saturn' },
  { filename: 'avatar-planets.svg',       label: 'Planets' },
  { filename: 'avatar-moon.svg',          label: 'Moon' },
  { filename: 'avatar-rover.svg',         label: 'Rover' },
  { filename: 'avatar-telescope.svg',     label: 'Telescope' },
  { filename: 'avatar-sattelite.svg',     label: 'Satellite' },
  { filename: 'avatar-sattelite-2.svg',  label: 'Satellite 2' },
  { filename: 'avatar-comet.svg',         label: 'Comet' },
  { filename: 'avatar-nebula.svg',        label: 'Nebula' },
  { filename: 'avatar-galaxy.svg',        label: 'Galaxy' },
  { filename: 'avatar-stars.svg',         label: 'Stars' },
  { filename: 'avatar-stars-2.svg',       label: 'Stars 2' },
  { filename: 'avatar-blackhole.svg',     label: 'Black Hole' },
]

export function spaceAvatarPath(filename: string) {
  return assetPath(`resources/space-avatar/${filename}`)
}

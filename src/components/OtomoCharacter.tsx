import { useState } from 'react'
import { motion } from 'motion/react'

export type MascotMood = 'welcome' | 'happy' | 'studying' | 'resting' | 'cheering'

interface OtomoCharacterProps {
  className?: string
  imageSrc?: string
  mood?: MascotMood
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Otomo-chan cute anime mascot component.
 * Uses CSS background positioning on the single sprite sheet image.
 */
export function OtomoCharacter({
  className = '',
  imageSrc = '/icons/craiyon_195334_image.png',
  mood = 'welcome',
  size = 'md'
}: OtomoCharacterProps) {
  const [imgError, setImgError] = useState(false)

  // Map sizes to container dimensions
  const sizeClass = {
    sm: 'w-24 h-28',
    md: 'w-36 h-40',
    lg: 'w-48 h-52'
  }[size]

  // Sprite sheet position offsets (% X % Y) for each mood on the 4x2 grid
  const moodPositionMap: Record<MascotMood, string> = {
    welcome: '0% 0%',
    happy: '33.333% 0%',
    cheering: '66.666% 0%',
    studying: '0% 100%',
    resting: '33.333% 100%'
  }

  const backgroundPosition = moodPositionMap[mood] || moodPositionMap.welcome

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative inline-flex flex-col items-center select-none ${className}`}
    >
      {!imgError && imageSrc ? (
        <motion.div
          key={mood}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`${sizeClass} drop-shadow-[0_10px_20px_rgba(225,29,72,0.15)]`}
          style={{
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: '400% 200%',
            backgroundPosition: backgroundPosition,
            backgroundRepeat: 'no-repeat'
          }}
          role="img"
          aria-label={`Otomo-chan ${mood}`}
        />
      ) : (
        /* SVG Fallback if image path is not found */
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex flex-col items-center"
        >
          <div className={`${sizeClass} flex items-center justify-center rounded-xl border border-red-500/30 bg-zinc-950/90 text-red-400 font-mono text-xs text-center p-2`}>
            Otomo-chan
          </div>
        </motion.div>
      )}

      {/* Cyber/Anime Mood Tag */}
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-zinc-950/90 px-2.5 py-0.5 text-[10px] font-mono tracking-wider text-red-400 backdrop-blur-md shadow-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        {mood === 'studying'
          ? '集中中 · Studying hard!'
          : mood === 'resting'
          ? '休憩中 · Relaxing break'
          : mood === 'cheering'
          ? 'ファイト！ · Ganbatte!'
          : mood === 'happy'
          ? 'ハッピー · Happy!'
          : 'お供 · Otomo-chan'}
      </span>
    </motion.div>
  )
}
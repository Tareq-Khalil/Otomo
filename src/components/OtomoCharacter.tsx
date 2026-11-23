import { useState } from 'react'
import { motion, AnimatePresence, type TargetAndTransition } from 'motion/react'
import type { CharacterExpression } from '@/lib/types'
import { BookOpen, Sparkles, Mic, HelpCircle, Brain } from 'lucide-react'

export type MascotMood = CharacterExpression | 'welcome'

interface OtomoCharacterProps {
  className?: string
  imageSrc?: string
  mood?: MascotMood
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  showBadge?: boolean
  subtleAnimation?: boolean
  onClick?: () => void
}

/**
 * Otomo-chan character component.
 * Uses mood-specific illustrations with expressive motion and a branded fallback.
 */
export function OtomoCharacter({
  className = '',
  imageSrc,
  mood = 'idle',
  size = 'md',
  interactive = false,
  showBadge = true,
  subtleAnimation = true,
  onClick
}: OtomoCharacterProps) {
  const [imgError, setImgError] = useState(false)

  const sizeConfig = {
    sm: { container: 'w-20 h-24', badge: 'text-[9px] px-2 py-0.5', iconSize: 10 },
    md: { container: 'w-32 h-36', badge: 'text-[10px] px-2.5 py-0.5', iconSize: 11 },
    lg: { container: 'w-44 h-48', badge: 'text-xs px-3 py-1', iconSize: 13 },
    xl: { container: 'w-56 h-60', badge: 'text-xs px-3 py-1', iconSize: 14 }
  }[size]

  const moodImages: Record<string, string> = {
    welcome: '/icons/otomo/welcome.png',
    idle: '/icons/otomo/welcome.png',
    happy: '/icons/otomo/happy.png',
    cheering: '/icons/otomo/cheering.png',
    studying: '/icons/otomo/studying.png',
    thinking: '/icons/otomo/studying.png',
    confused: '/icons/otomo/studying.png',
    moody: '/icons/otomo/studying.png',
    resting: '/icons/otomo/resting.png',
    listening: '/icons/otomo/welcome.png',
    explaining: '/icons/otomo/welcome.png'
  }

  const activeImageSrc = imageSrc ?? moodImages[mood] ?? moodImages.idle

  // Context-specific badge labels
  const badgeMeta: Record<string, { label: string; jp: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    studying: { label: 'Studying', jp: '集中中', Icon: BookOpen },
    resting: { label: 'Resting', jp: '休憩中', Icon: Sparkles },
    thinking: { label: 'Thinking…', jp: '思考中', Icon: Brain },
    listening: { label: 'Listening…', jp: '傾聴中', Icon: Mic },
    happy: { label: 'Delighted', jp: '嬉しい', Icon: Sparkles },
    confused: { label: 'Puzzled', jp: '疑問', Icon: HelpCircle },
    explaining: { label: 'Explaining', jp: '解説中', Icon: Sparkles },
    cheering: { label: 'Ganbatte!', jp: 'ファイト', Icon: Sparkles },
    moody: { label: 'Unimpressed', jp: '不満', Icon: Brain },
    welcome: { label: 'Welcome', jp: 'お供', Icon: Sparkles },
    idle: { label: 'Companion', jp: 'お供ちゃん', Icon: Sparkles }
  }

  const currentBadge = badgeMeta[mood] || badgeMeta.idle
  const BadgeIcon = currentBadge.Icon

  // Animation variants depending on mood
  const getMotionAnimation = (): TargetAndTransition => {
    if (!subtleAnimation) return {}
    switch (mood) {
      case 'studying':
        // Gentle breathing and slight head tilt over a study notebook
        return {
          y: [0, -2, 0],
          rotate: [0, -1, 0],
          transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
        }
      case 'thinking':
      case 'moody':
        return {
          rotate: [0, 2, -1, 0],
          y: [0, -3, 0],
          transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
      case 'listening':
        return {
          rotate: [-1, 2, -1],
          transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
        }
      case 'happy':
        return {
          y: [0, -5, 0],
          scale: [1, 1.03, 1],
          transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
        }
      case 'confused':
        return {
          rotate: [0, 4, 0],
          transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
        }
      default:
        // Soft idle floating
        return {
          y: [0, -3, 0],
          transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }
        }
    }
  }

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-col items-center select-none ${interactive ? 'cursor-pointer' : ''} ${className}`}
      role="img"
      aria-label={`Otomo-chan: ${currentBadge.label}`}
    >
      <motion.div
        animate={getMotionAnimation()}
        className="relative flex flex-col items-center"
      >
        {!imgError && activeImageSrc ? (
          <div className="relative">
            <motion.img
              key={activeImageSrc}
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className={`${sizeConfig.container} object-contain drop-shadow-[0_8px_16px_rgba(217,15,32,0.12)]`}
              src={activeImageSrc}
              alt=""
              draggable={false}
              onError={() => setImgError(true)}
            />

            {/* Subtle state indicator overlay */}
            <AnimatePresence>
              {mood === 'studying' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-sm border border-surface"
                  title="Studying with you"
                >
                  <BookOpen size={12} />
                </motion.div>
              )}
              {mood === 'listening' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-sakura text-white shadow-sm animate-pulse border border-surface"
                >
                  <Mic size={12} />
                </motion.div>
              )}
              {mood === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-surface shadow-sm border border-line"
                >
                  <Brain size={12} className="animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* High-quality Vector Anime Fallback if image fails or before load */
          <div className={`${sizeConfig.container} relative flex flex-col items-center justify-center rounded-2xl border border-accent/20 bg-surface/90 p-2 shadow-inner backdrop-blur-sm`}>
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 border border-accent/30 text-accent">
              <span className="font-display text-xl font-bold italic">供</span>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-white">
                ★
              </span>
            </div>
            <span className="mt-1 font-mono text-[10px] tracking-widest text-ink/80 uppercase">
              Otomo-chan
            </span>
          </div>
        )}

        {/* Status Badge */}
        {showBadge && (
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/95 ${sizeConfig.badge} font-mono tracking-wider text-ink shadow-sm backdrop-blur-md transition-colors`}
          >
            <BadgeIcon size={sizeConfig.iconSize} className="text-accent shrink-0" />
            <span className="font-medium">{currentBadge.label}</span>
            <span className="jp text-[9px] opacity-70">· {currentBadge.jp}</span>
          </span>
        )}
      </motion.div>
    </div>
  )
}

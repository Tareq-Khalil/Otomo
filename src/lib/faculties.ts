/**
 * Scalable faculty/level configuration.
 * To add a new faculty or level: add an entry here — no other structural changes needed.
 */

export interface LevelConfig {
  level: number
  label: string
  supported: boolean   // false = "coming soon"
}

export interface FacultyConfig {
  id: string
  name: string
  shortName: string
  levels: LevelConfig[]
  maxGroups: number
  sectionsPerGroup: number  // FoE = 3; other faculties may differ
  supported: boolean        // false = show "coming soon" for entire faculty
}

export const FACULTIES: FacultyConfig[] = [
  {
    id: 'foe',
    name: 'Faculty of Engineering',
    shortName: 'FoE',
    supported: true,
    maxGroups: 8,
    sectionsPerGroup: 3,
    levels: [
      { level: 1, label: 'Level 1', supported: true },
      { level: 2, label: 'Level 2', supported: false },
      { level: 3, label: 'Level 3', supported: false },
      { level: 4, label: 'Level 4', supported: false },
    ],
  },
  // ─── Future faculties ───────────────────────────────────────────────────────
  // { id: 'fos', name: 'Faculty of Science', shortName: 'FoS', supported: false,
  //   maxGroups: 4, sectionsPerGroup: 2, levels: [] },
]

/** Returns true only when both the faculty and level are fully supported. */
export const isSupported = (facultyId: string, level: number): boolean => {
  const fac = FACULTIES.find(f => f.id === facultyId)
  if (!fac?.supported) return false
  return fac.levels.find(l => l.level === level)?.supported ?? false
}

/** Returns the FacultyConfig for a given id, or undefined. */
export const getFaculty = (id: string): FacultyConfig | undefined =>
  FACULTIES.find(f => f.id === id)

/** Groups for a faculty: 1..maxGroups */
export const getGroups = (facultyId: string): number[] => {
  const fac = getFaculty(facultyId)
  if (!fac) return []
  return Array.from({ length: fac.maxGroups }, (_, i) => i + 1)
}

/** Sections for a given faculty + group combination. */
export const getSections = (facultyId: string, group: number): number[] => {
  const fac = getFaculty(facultyId)
  if (!fac) return []
  return Array.from({ length: fac.sectionsPerGroup }, (_, i) => (group - 1) * fac.sectionsPerGroup + i + 1)
}


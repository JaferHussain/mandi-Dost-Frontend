import type { IconName } from '../components/ui'

// The five buying experiences on the home screen.
// Qurbani, restaurant supply and general livestock all show animal listings,
// filtered by the purpose the seller ticked (one listing can appear in several).
// Crops and supplies are new product families: their categories are listed here
// until the backend's category tree (next phase) serves them.
export type SectionId = 'qurbani' | 'meat' | 'livestock' | 'crops' | 'supplies'

export type Section = {
  id: SectionId
  title: string
  subtitle: string
  icon: IconName
  color: string
  bg: string
  /** Sub-categories shown on the section page. `fromApi` = use the animal categories from the server. */
  items: 'fromApi' | { key: string; name: string; icon: IconName }[]
}

export const SECTIONS: Section[] = [
  {
    id: 'qurbani', title: 'قربانی کے جانور', subtitle: 'گائے، بکرے، دنبے، اونٹ',
    icon: 'cow', color: '#9a3412', bg: '#ffedd5', items: 'fromApi',
  },
  {
    id: 'meat', title: 'ہوٹل اور ریسٹورنٹ', subtitle: 'گوشت کے لیے جانور، تھوک میں',
    icon: 'silverware-fork-knife', color: '#7f1d1d', bg: '#fee2e2', items: 'fromApi',
  },
  {
    id: 'livestock', title: 'عام جانور', subtitle: 'دودھ، نسل اور پالنے کے لیے',
    icon: 'barn', color: '#14532d', bg: '#dcfce7', items: 'fromApi',
  },
  {
    id: 'crops', title: 'فصلیں اور زرعی پیداوار', subtitle: 'گندم، کپاس، چاول، سبزیاں',
    icon: 'sprout', color: '#854d0e', bg: '#fef9c3',
    items: [
      { key: 'wheat', name: 'گندم', icon: 'barley' },
      { key: 'cotton', name: 'کپاس', icon: 'flower-outline' },
      { key: 'rice', name: 'چاول', icon: 'rice' },
      { key: 'maize', name: 'مکئی', icon: 'corn' },
      { key: 'sugarcane', name: 'گنا', icon: 'grass' },
      { key: 'vegetables', name: 'سبزیاں', icon: 'carrot' },
      { key: 'fruits', name: 'پھل', icon: 'fruit-cherries' },
      { key: 'other-produce', name: 'دیگر پیداوار', icon: 'basket-outline' },
    ],
  },
  {
    id: 'supplies', title: 'زرعی سامان', subtitle: 'بیج، کھاد، چارہ، اوزار، مشینری',
    icon: 'tractor-variant', color: '#1e3a8a', bg: '#dbeafe',
    items: [
      { key: 'seeds', name: 'بیج', icon: 'seed-outline' },
      { key: 'fertilizer', name: 'کھاد', icon: 'sack' },
      { key: 'pesticides', name: 'زرعی ادویات', icon: 'spray' },
      { key: 'feed', name: 'چارہ اور ونڈا', icon: 'grain' },
      { key: 'tools', name: 'اوزار', icon: 'shovel' },
      { key: 'machinery', name: 'مشینری', icon: 'tractor' },
      { key: 'dairy-equipment', name: 'ڈیری کا سامان', icon: 'bucket-outline' },
    ],
  },
]

export const getSection = (id: string) => SECTIONS.find((s) => s.id === id)

/** How each buying experience asks the API for listings. */
export const SECTION_QUERY: Record<SectionId, { section: 'livestock' | 'crops' | 'supplies'; purpose?: string }> = {
  qurbani: { section: 'livestock', purpose: 'qurbani' },
  meat: { section: 'livestock', purpose: 'meatSupply' },
  livestock: { section: 'livestock', purpose: 'dairy,breeding,general' },
  crops: { section: 'crops' },
  supplies: { section: 'supplies' },
}

/** Icons for the animal categories that come from the API (by slug). */
export const ANIMAL_ICONS: Record<string, IconName> = {
  cow: 'cow', buffalo: 'cow', goat: 'sheep', sheep: 'sheep', camel: 'horse-variant', other: 'paw',
}

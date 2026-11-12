import { Pressable, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors } from '@/theme'

/** 1–5 stars. With onChange it becomes a big tappable picker. */
export function Stars({ value, size = 18, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 6 : 1 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = value >= n ? 'star' : value >= n - 0.5 ? 'star-half-full' : 'star-outline'
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${n}`}>
            <MaterialCommunityIcons name={icon} size={size} color={colors.gold} />
          </Pressable>
        ) : (
          <MaterialCommunityIcons key={n} name={icon} size={size} color={colors.gold} />
        )
      })}
    </View>
  )
}

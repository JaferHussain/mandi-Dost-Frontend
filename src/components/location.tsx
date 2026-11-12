import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { Button, Loading, Notice, Sheet, Txt } from './ui'

/** City picker. Cities come from the API (GET /api/locations). */
export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locations, location, setLocation, reloadLocations } = useSession()

  useEffect(() => {
    if (open && locations.length === 0) reloadLocations()
  }, [open, locations.length, reloadLocations])

  return (
    <Sheet open={open} onClose={onClose} title="اپنا شہر چنیں">
      {locations.length === 0 ? (
        <View style={{ gap: 12 }}>
          <Loading />
          <Notice tone="error" text="شہروں کی فہرست نہیں ملی۔ انٹرنیٹ چیک کریں" />
          <Button label="دوبارہ کوشش کریں" icon="refresh" variant="outline" onPress={reloadLocations} />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {locations.map((l) => {
            const selected = l.id === location?.id
            return (
              <Pressable
                key={l.id}
                onPress={() => { setLocation(l); onClose() }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, selected && styles.rowOn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name={selected ? 'map-marker-check' : 'map-marker-outline'} size={26} color={selected ? colors.brand700 : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Txt bold size={17}>{l.nameUr}</Txt>
                  <Txt size={13} color={colors.muted}>{`ضلع ${l.districtUr}`}</Txt>
                </View>
              </Pressable>
            )
          })}
        </View>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  rowOn: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
})

import { router } from 'expo-router'
import type { IconName } from '../components/ui'
import type { AppNotification, NotificationType } from './api'
import { formatPrice } from './format'
import { t } from '../i18n'

// The server stores facts (what, where, how far, how much). The sentence is written here,
// so it follows the user's language and can be read aloud.

const TITLE: Record<NotificationType, string> = {
  nearbyListing: 'قریب میں نیا اشتہار',
  nearbyRequest: 'قریب میں نئی ضرورت',
  offerReceived: 'آپ کی ضرورت پر نئی پیشکش',
  offerAccepted: 'آپ کی پیشکش منظور ہو گئی',
  offerDeclined: 'آپ کی پیشکش منظور نہیں ہوئی',
  bookingRequested: 'آپ کے جانور کے حصوں کی درخواست',
  bookingConfirmed: 'آپ کے حصے پکے ہو گئے',
  bookingDeclined: 'آپ کے حصوں کی درخواست منظور نہیں ہوئی',
}

const ICON: Record<NotificationType, IconName> = {
  nearbyListing: 'storefront-outline',
  nearbyRequest: 'bullhorn-outline',
  offerReceived: 'hand-coin-outline',
  offerAccepted: 'check-circle-outline',
  offerDeclined: 'close-circle-outline',
  bookingRequested: 'account-group-outline',
  bookingConfirmed: 'check-decagram-outline',
  bookingDeclined: 'close-circle-outline',
}

export type NotificationText = { title: string; body: string; icon: IconName; speech: string }

export function describeNotification(n: AppNotification): NotificationText {
  const bits = [n.subject]
  if (n.place) bits.push(n.place)
  if (n.distanceKm != null) bits.push(n.distanceKm < 1 ? t('بہت قریب') : `${Math.round(n.distanceKm)} ${t('کلومیٹر دور')}`)
  if (n.amount != null) bits.push(formatPrice(n.amount))
  if (n.count != null) bits.push(`${n.count} ${t('حصے')}`)
  const title = t(TITLE[n.type])
  const body = bits.join(' · ')
  return { title, body, icon: ICON[n.type], speech: `${title}۔ ${bits.join('، ')}` }
}

/** Opens the listing or requirement a notification is about. */
export function openNotification(n: AppNotification) {
  if (n.requestId) router.push({ pathname: '/request/[id]', params: { id: String(n.requestId) } })
  else if (n.listingId) router.push({ pathname: '/listing/[id]', params: { id: String(n.listingId) } })
}

import { ApiError } from './api'

// Short, plain Urdu messages for each stable error code from the API.
// They are passed through t() where shown, so Punjabi/Saraiki work too.
const MESSAGES: Record<string, string> = {
  network: 'انٹرنیٹ یا سرور سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں',
  phone_taken: 'یہ نمبر پہلے سے رجسٹر ہے۔ لاگ اِن کریں',
  invalid_credentials: 'نمبر یا پاس ورڈ غلط ہے',
  account_locked: 'بہت زیادہ غلط کوششیں۔ 15 منٹ بعد دوبارہ کوشش کریں',
  account_disabled: 'یہ اکاؤنٹ بند ہے۔ مدد کے لیے رابطہ کریں',
  rate_limited: 'بہت جلدی جلدی کوشش ہو رہی ہے۔ ایک منٹ رک کر دوبارہ کریں',
  validation_failed: 'معلومات درست نہیں۔ دوبارہ دیکھیں',
  server_error: 'سرور میں مسئلہ ہے۔ تھوڑی دیر بعد کوشش کریں',
  listing_not_found: 'یہ اشتہار نہیں ملا۔ شاید ہٹا دیا گیا ہے',
  not_owner: 'یہ آپ کا اشتہار نہیں ہے',
  listing_not_editable: 'بکا ہوا اشتہار بدلا نہیں جا سکتا',
  purpose_required: 'بتائیں جانور کس کے لیے ہے: قربانی، ہوٹل، دودھ یا عام',
  purpose_not_allowed: 'یہ جانور اس کام کے لیے نہیں لگایا جا سکتا',
  details_mismatch: 'کچھ معلومات اس چیز کے لیے درست نہیں۔ دوبارہ دیکھیں',
  shares_not_allowed: 'سات حصے صرف ایک گائے، بھینس یا اونٹ کے ہو سکتے ہیں',
  unit_not_allowed: 'قیمت یا مقدار کی اکائی درست نہیں',
  image_required: 'جانور کی کم از کم ایک تصویر لگائیں',
  too_many_media: 'زیادہ سے زیادہ 8 تصویریں لگ سکتی ہیں',
  invalid_image: 'یہ تصویر نہیں لگ سکی۔ دوسری تصویر چنیں',
  category_not_found: 'یہ قسم نہیں ملی',
  location_not_found: 'یہ شہر نہیں ملا',
  chat_not_found: 'یہ بات چیت نہیں ملی',
  chat_with_self: 'اپنے آپ کو پیغام نہیں بھیج سکتے',
  invalid_audio: 'آواز کا پیغام نہیں جا سکا۔ 3 منٹ سے چھوٹا پیغام بھیجیں',
  no_shares: 'یہ جانور حصوں میں نہیں بک رہا',
  not_enough_shares: 'اتنے حصے باقی نہیں۔ کم حصے چنیں',
  booking_not_found: 'یہ بکنگ نہیں ملی',
  review_not_allowed: 'رائے صرف وہ دے سکتا ہے جس نے اس بیچنے والے سے بات یا سودا کیا ہو',
  already_reported: 'آپ یہ اشتہار پہلے ہی رپورٹ کر چکے ہیں',
  report_not_found: 'یہ رپورٹ نہیں ملی',
  user_not_found: 'یہ صارف نہیں ملا',
  business_not_found:'پہلے اپنے کاروبار کی معلومات لکھیں',
  request_not_found: 'یہ ضرورت نہیں ملی۔ شاید بند ہو گئی ہے',
  request_closed: 'یہ ضرورت بند ہو چکی ہے',
  offer_not_found: 'یہ پیشکش نہیں ملی',
  own_request: 'اپنی ضرورت پر خود پیشکش نہیں کر سکتے',
  offer_not_allowed: 'یہ پیشکش نہیں ہو سکتی۔ اپنا لگا ہوا اشتہار ہی ساتھ لگائیں',
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return MESSAGES[e.code] ?? MESSAGES.server_error
  return MESSAGES.server_error
}

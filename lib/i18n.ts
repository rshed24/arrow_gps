import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

const translations = {
  ar: {
    // Tab names
    home: 'الرئيسية',
    compass: 'البوصلة',
    locations: 'المواقع',

    // Home screen
    appName: 'Arrow GPS',
    satelliteStatus: 'حالة الأقمار الصناعية',
    active: 'نشط',
    inactive: 'غير نشط',
    accuracy: 'الدقة',
    currentCoordinates: 'الإحداثيات الحالية',
    latitude: 'خط العرض',
    longitude: 'خط الطول',
    saveMyLocation: 'حفظ موقعي',
    satelliteCount: 'عدد الأقمار الصناعية',
    gpsWorking: 'GPS يعمل',
    gpsNotWorking: 'GPS لا يعمل',
    satellites: 'الأقمار الصناعية المتوفرة',
    searchLocations: 'بحث في المواقع...',
    arrivedTitle: 'تم الوصول!',
    arrivedMessage: 'لقد وصلت إلى الموقع المطلوب',
    arrived: 'تم الوصول إلى الموقع',
    sortByDistance: 'ترتيب حسب المسافة',

    // Compass screen
    speed: 'السرعة',
    distance: 'المسافة',
    destination: 'الوجهة',
    altitude: 'الارتفاع',
    noDestination: 'لا توجد وجهة',
    selectDestination: 'اختر وجهة من المواقع',
    kmh: 'كم/س',
    km: 'كم',
    m: 'م',

    // Cardinal directions
    north: 'شمال',
    south: 'جنوب',
    east: 'شرق',
    west: 'غرب',
    northEast: 'شمال شرق',
    northWest: 'شمال غرب',
    southEast: 'جنوب شرق',
    southWest: 'جنوب غرب',

    // Locations screen
    savedLocations: 'المواقع المحفوظة',
    edit: 'تعديل',
    delete: 'حذف',
    shareCoordinate: 'مشاركة الإحداثية',
    addLocation: 'إضافة موقع',
    enterCoordinates: 'إدخال إحداثيات',
    saveCurrentLocation: 'حفظ الموقع الحالي',
    locationName: 'اسم الموقع',
    save: 'حفظ',
    cancel: 'إلغاء',
    exportGPX: 'تصدير GPX',
    importFile: 'استيراد ملف',
    importError: 'خطأ',
    noLocationsInFile: 'لم يتم العثور على مواقع في الملف',
    locationsImported: '{{count}} موقع تم استيراده',
    noLocations: 'لا توجد مواقع محفوظة',
    deleteConfirm: 'هل أنت متأكد من حذف هذا الموقع؟',
    copied: 'تم النسخ',
    coordinatesCopied: 'تم نسخ الإحداثيات',
    navigateTo: 'التوجيه إلى',
    distanceTo: 'المسافة إلى',

    // Coordinate input
    decimalDegrees: 'درجات عشرية',
    dms: 'درجات/دقائق/ثواني',
    degrees: 'درجات',
    minutes: 'دقائق',
    seconds: 'ثواني',
    latExample: 'مثال: 24.579754',
    lonExample: 'مثال: 46.756606',
    usePhoneKeyboard: 'لوحة الهاتف',
    useCustomKeyboard: 'لوحة الإحداثيات',

    // About screen
    aboutApp: 'حول التطبيق',
    developedBy: 'تم تطوير هذا التطبيق بواسطة خرائط الصحراء',
    visitWebsite: 'زيارة موقعنا',
    shareApp: 'مشاركة التطبيق',
    rateApp: 'تقييم التطبيق',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    version: 'v1.0.0',

    // Permissions
    locationPermissionTitle: 'إذن الموقع مطلوب',
    locationPermissionMessage: 'يحتاج التطبيق للوصول إلى موقعك للملاحة',
    locationServiceDisabled: 'خدمة الموقع معطلة',
    enableLocationService: 'يرجى تفعيل خدمة الموقع من إعدادات الهاتف',
    enableGPS: 'تشغيل',
    gpsDisabledMessage: 'خدمة تحديد الموقع (GPS) معطلة. يرجى تفعيلها للاستمرار.',
    autoNamePrefix: 'موقعي',
    autoNameHint: 'اتركه فارغاً للتسمية التلقائية',
    openSettings: 'فتح الإعدادات',
    ok: 'موافق',

    // Share message
    shareMessage: '{{name}}\n{{lat}}, {{lon}}',
    shareAppMessage: 'جرب تطبيق Arrow GPS للملاحة\nhttps://desertsa.com',
  },
  en: {
    // Tab names
    home: 'Home',
    compass: 'Compass',
    locations: 'Locations',

    // Home screen
    appName: 'Arrow GPS',
    satelliteStatus: 'Satellite Status',
    active: 'Active',
    inactive: 'Inactive',
    accuracy: 'Accuracy',
    currentCoordinates: 'Current Coordinates',
    latitude: 'Latitude',
    longitude: 'Longitude',
    saveMyLocation: 'Save My Location',
    satelliteCount: 'Satellite Count',
    gpsWorking: 'GPS Active',
    gpsNotWorking: 'GPS Inactive',
    satellites: 'Available Satellites',
    searchLocations: 'Search locations...',
    arrivedTitle: 'Arrived!',
    arrivedMessage: 'You have arrived at the destination',
    arrived: 'Arrived at destination',
    sortByDistance: 'Sort by distance',

    // Compass screen
    speed: 'Speed',
    distance: 'Distance',
    destination: 'Destination',
    altitude: 'Altitude',
    noDestination: 'No Destination',
    selectDestination: 'Select a destination from locations',
    kmh: 'km/h',
    km: 'km',
    m: 'm',

    // Cardinal directions
    north: 'North',
    south: 'South',
    east: 'East',
    west: 'West',
    northEast: 'North East',
    northWest: 'North West',
    southEast: 'South East',
    southWest: 'South West',

    // Locations screen
    savedLocations: 'Saved Locations',
    edit: 'Edit',
    delete: 'Delete',
    shareCoordinate: 'Share Coordinate',
    addLocation: 'Add Location',
    enterCoordinates: 'Enter Coordinates',
    saveCurrentLocation: 'Save Current Location',
    locationName: 'Location Name',
    save: 'Save',
    cancel: 'Cancel',
    exportGPX: 'Export GPX',
    importFile: 'Import File',
    importError: 'Error',
    noLocationsInFile: 'No locations found in file',
    locationsImported: '{{count}} locations imported',
    noLocations: 'No saved locations',
    deleteConfirm: 'Are you sure you want to delete this location?',
    copied: 'Copied',
    coordinatesCopied: 'Coordinates copied',
    navigateTo: 'Navigate to',
    distanceTo: 'Distance to',

    // Coordinate input
    decimalDegrees: 'Decimal Degrees',
    dms: 'Degrees/Minutes/Seconds',
    degrees: 'Degrees',
    minutes: 'Minutes',
    seconds: 'Seconds',
    latExample: 'e.g. 24.579754',
    lonExample: 'e.g. 46.756606',
    usePhoneKeyboard: 'Phone Keyboard',
    useCustomKeyboard: 'Coordinate Pad',

    // About screen
    aboutApp: 'About App',
    developedBy: 'Developed by Desert Maps',
    visitWebsite: 'Visit Our Website',
    shareApp: 'Share App',
    rateApp: 'Rate App',
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    version: 'v1.0.0',

    // Permissions
    locationPermissionTitle: 'Location Permission Required',
    locationPermissionMessage: 'This app needs access to your location for navigation',
    locationServiceDisabled: 'Location Service Disabled',
    enableLocationService: 'Please enable location service from phone settings',
    enableGPS: 'Enable',
    gpsDisabledMessage: 'Location service (GPS) is disabled. Please enable it to continue.',
    autoNamePrefix: 'My Location',
    autoNameHint: 'Leave empty for auto-name',
    openSettings: 'Open Settings',
    ok: 'OK',

    // Share message
    shareMessage: '{{name}}\n{{lat}}, {{lon}}',
    shareAppMessage: 'Try Arrow GPS navigation app\nhttps://desertsa.com',
  },
};

const i18n = new I18n(translations);

// Detect system language
const deviceLocale = Localization.getLocales()[0];
const languageCode = deviceLocale?.languageCode || 'en';
i18n.locale = languageCode === 'ar' ? 'ar' : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
export { translations };

# NO WERE TECH - Mobile Application

This is the mobile application version of the Centering Plates Rental Management System, built with Capacitor for cross-platform deployment.

## Features

- **Native Mobile Experience**: Built with Capacitor for iOS and Android
- **Offline Support**: Works without internet connection with local data caching
- **Haptic Feedback**: Native touch feedback for better user experience
- **Push Notifications**: Reminders for overdue challans and important updates
- **Gujarati Language Support**: Full support for Gujarati text and interface
- **Touch-Optimized UI**: Designed specifically for mobile touch interfaces

## Mobile-Specific Features

### Native Capabilities
- **Status Bar**: Customized status bar with app branding
- **Splash Screen**: Professional loading screen with company branding
- **Keyboard Management**: Smart keyboard handling and input optimization
- **Haptic Feedback**: Touch feedback for all interactive elements
- **Safe Area Support**: Proper handling of notched devices

### Offline Functionality
- **Local Data Storage**: Critical data cached locally for offline access
- **Sync on Reconnect**: Automatic data synchronization when connection is restored
- **Offline Indicators**: Clear visual feedback when app is offline

### Performance Optimizations
- **Lazy Loading**: Components loaded on demand for faster startup
- **Image Optimization**: Optimized images for mobile bandwidth
- **Touch Targets**: All interactive elements meet minimum touch target sizes
- **Smooth Animations**: Hardware-accelerated animations for smooth experience

## Development Setup

### Prerequisites
- Node.js 18+ 
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Java 11+ (for Android builds)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Capacitor**
   ```bash
   npm run mobile:init
   ```

3. **Add Mobile Platforms**
   ```bash
   # Add Android
   npm run mobile:add:android
   
   # Add iOS (macOS only)
   npm run mobile:add:ios
   ```

### Development Commands

```bash
# Build and sync for mobile
npm run mobile:sync

# Run on Android device/emulator
npm run mobile:run:android

# Run on iOS device/simulator (macOS only)
npm run mobile:run:ios

# Build for production
npm run mobile:build:android
npm run mobile:build:ios
```

### Testing on Devices

1. **Android Testing**
   - Connect Android device via USB with Developer Options enabled
   - Or use Android Studio emulator
   - Run: `npm run mobile:run:android`

2. **iOS Testing** (macOS only)
   - Connect iOS device via USB
   - Or use iOS Simulator
   - Run: `npm run mobile:run:ios`

## Mobile App Structure

```
src/
├── components/mobile/          # Mobile-specific components
│   ├── MobileAppWrapper.tsx   # Native app wrapper with mobile features
│   ├── MobileOfflineManager.tsx # Offline data management
│   └── MobilePushNotifications.tsx # Push notification handling
├── hooks/
│   └── useMobileFeatures.ts   # Mobile-specific React hooks
├── App.mobile.tsx             # Mobile app entry point
└── main.mobile.tsx           # Mobile app initialization

android/                       # Android-specific files
├── app/src/main/
│   ├── AndroidManifest.xml   # Android app configuration
│   ├── java/                 # Java/Kotlin source files
│   └── res/                  # Android resources
└── build.gradle              # Android build configuration

ios/                          # iOS-specific files
├── App/
│   ├── Info.plist           # iOS app configuration
│   └── App/                 # iOS source files
└── App.xcodeproj/           # Xcode project files
```

## Mobile-Specific Configurations

### Android Configuration
- **Package Name**: `com.nowheretech.centeringplates`
- **Min SDK**: 22 (Android 5.1)
- **Target SDK**: 34 (Android 14)
- **Permissions**: Internet, Storage, Camera, Vibration

### iOS Configuration
- **Bundle ID**: `com.nowheretech.centeringplates`
- **Min iOS Version**: 13.0
- **Supported Orientations**: Portrait, Landscape
- **Privacy Permissions**: Camera, Photo Library, Location

## Deployment

### Android Deployment
1. **Generate Signed APK**
   ```bash
   npm run mobile:build:android
   ```
2. **Upload to Google Play Store**
   - Use Android Studio to generate signed bundle
   - Upload to Google Play Console

### iOS Deployment
1. **Generate iOS Build**
   ```bash
   npm run mobile:build:ios
   ```
2. **Upload to App Store**
   - Use Xcode to archive and upload
   - Submit through App Store Connect

## Mobile Testing Checklist

- [ ] App launches successfully on both platforms
- [ ] All navigation works correctly
- [ ] Touch targets are appropriately sized (minimum 44px)
- [ ] Keyboard handling works properly
- [ ] Offline functionality works as expected
- [ ] Push notifications are received
- [ ] Haptic feedback works on supported devices
- [ ] App handles device rotation correctly
- [ ] Safe area insets are respected on notched devices
- [ ] App works on various screen sizes
- [ ] Performance is smooth on lower-end devices

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure all dependencies are installed
   - Check Android Studio and Xcode are properly configured
   - Verify Java and Node.js versions

2. **Device Connection Issues**
   - Enable Developer Options on Android
   - Trust computer on iOS device
   - Check USB debugging is enabled

3. **Performance Issues**
   - Check for memory leaks in components
   - Optimize images and assets
   - Use React DevTools for profiling

### Support
For technical support or questions about the mobile app, please contact the development team.
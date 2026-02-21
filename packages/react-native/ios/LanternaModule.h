#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTTurboModule.h>
#else
#import <React/RCTBridgeModule.h>
#endif

/**
 * Lanterna native module — collects real-time performance metrics on iOS.
 *
 * Supports both Turbo Module (New Architecture) and legacy bridge (Old Architecture).
 */
@interface LanternaModule : NSObject
#ifdef RCT_NEW_ARCH_ENABLED
  <RCTTurboModule>
#else
  <RCTBridgeModule>
#endif

@property (nonatomic, assign) BOOL isActive;
@property (nonatomic, copy, nullable) NSString *currentSessionId;

@end

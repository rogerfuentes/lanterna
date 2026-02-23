#import <React/RCTBridgeModule.h>

@interface LanternaModule : NSObject <RCTBridgeModule>

@property (nonatomic, assign) BOOL isActive;
@property (nonatomic, copy, nullable) NSString *currentSessionId;

@end

#import "LanternaModule.h"
#import <QuartzCore/CADisplayLink.h>
#import <React/RCTLog.h>
#import <mach/mach.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <lanternamodule/lanternamodule.h>

using namespace facebook::react;

@interface LanternaModule () <NativeLanternaSpec>
@end
#endif

@implementation LanternaModule {
    CADisplayLink *_displayLink;
    NSMutableArray<NSNumber *> *_frameTimestamps;
}

RCT_EXPORT_MODULE(LanternaModule)

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _isActive = NO;
        _currentSessionId = nil;
        _frameTimestamps = [NSMutableArray new];
    }
    return self;
}

RCT_EXPORT_METHOD(startProfiling:(NSString *)configJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSString *sessionId = [[NSUUID UUID] UUIDString];
        self.currentSessionId = sessionId;
        self.isActive = YES;
        [self startFrameTracking];

        NSDictionary *result = @{@"sessionId": sessionId};
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
        resolve([[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding]);
    } @catch (NSException *exception) {
        reject(@"START_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(stopProfiling:(NSString *)sessionId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        self.isActive = NO;
        [self stopFrameTracking];
        NSDictionary *result = @{@"sessionId": sessionId, @"stopped": @YES};
        self.currentSessionId = nil;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
        resolve([[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding]);
    } @catch (NSException *exception) {
        reject(@"STOP_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getMetrics:(NSString *)sessionId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        struct task_basic_info info;
        mach_msg_type_number_t size = sizeof(info);
        kern_return_t kr = task_info(mach_task_self(), TASK_BASIC_INFO, (task_info_t)&info, &size);

        NSNumber *memoryMb;
        if (kr == KERN_SUCCESS) {
            memoryMb = @(info.resident_size / (1024 * 1024));
        } else {
            memoryMb = @(0);
        }

        NSDictionary *metrics = @{@"memory": memoryMb};
        NSDictionary *result = @{
            @"sessionId": sessionId,
            @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000),
            @"metrics": metrics
        };
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
        resolve([[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding]);
    } @catch (NSException *exception) {
        reject(@"METRICS_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getFrameTimestamps:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSArray *timestamps;
        @synchronized (_frameTimestamps) {
            timestamps = [_frameTimestamps copy];
            [_frameTimestamps removeAllObjects];
        }
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:timestamps options:0 error:nil];
        resolve([[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding]);
    } @catch (NSException *exception) {
        reject(@"FRAME_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(isProfilingActive:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    resolve(@(self.isActive));
}

RCT_EXPORT_METHOD(getActiveSessionId:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    resolve(self.currentSessionId);
}

#pragma mark - Frame Tracking

- (void)startFrameTracking {
    @synchronized (_frameTimestamps) {
        [_frameTimestamps removeAllObjects];
    }
    _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(handleFrame:)];
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)stopFrameTracking {
    [_displayLink invalidate];
    _displayLink = nil;
}

- (void)handleFrame:(CADisplayLink *)displayLink {
    if (!self.isActive) return;
    NSTimeInterval timestampMs = displayLink.timestamp * 1000.0;
    @synchronized (_frameTimestamps) {
        [_frameTimestamps addObject:@(timestampMs)];
    }
}

#ifdef RCT_NEW_ARCH_ENABLED

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
    return std::make_shared<NativeLanternaSpecJSI>(params);
}

#endif

@end

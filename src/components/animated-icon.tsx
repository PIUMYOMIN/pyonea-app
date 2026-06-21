import { BRAND_LOGO_BACKGROUND } from '@/constants/brand';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const scale = useRef(new Animated.Value(INITIAL_SCALE_FACTOR)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.elastic(0.7),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(DURATION * 0.2),
        Animated.timing(opacity, {
          toValue: 0,
          duration: DURATION * 0.5,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.backgroundSolidColor,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

export function AnimatedIcon() {
  const backgroundScale = useRef(new Animated.Value(INITIAL_SCALE_FACTOR)).current;
  const imageScale = useRef(new Animated.Value(1.3)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const glowRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backgroundScale, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.elastic(0.7),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(DURATION * 0.4),
        Animated.parallel([
          Animated.timing(imageScale, {
            toValue: 1,
            duration: DURATION * 0.6,
            easing: Easing.elastic(0.7),
            useNativeDriver: true,
          }),
          Animated.timing(imageOpacity, {
            toValue: 1,
            duration: DURATION * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.loop(
        Animated.timing(glowRotation, {
          toValue: 1,
          duration: 60 * 1000 * 4,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [backgroundScale, glowRotation, imageOpacity, imageScale]);

  const rotate = glowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '7200deg'],
  });

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[styles.glow, { transform: [{ rotate }] }]}>
        <Image style={styles.glow} source={require('@/assets/images/logo.png')} />
      </Animated.View>

      <Animated.View
        style={[
          styles.background,
          { transform: [{ scale: backgroundScale }] }
        ]}
      />
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: imageOpacity,
            transform: [{ scale: imageScale }]
          }
        ]}
      >
        <Image style={styles.image} source={require('@/assets/images/logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  background: {
    borderRadius: 40,
    backgroundColor: '#0274DF', // Simplified gradient to solid for Animated reduction win
    width: 128,
    height: 128,
    position: 'absolute',
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BRAND_LOGO_BACKGROUND,
    zIndex: 1000,
  },
});

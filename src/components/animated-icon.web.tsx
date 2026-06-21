import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import classes from './animated-icon.module.css';
const DURATION = 300;

export function AnimatedSplashOverlay() {
  return null;
}

export function AnimatedIcon() {
  const backgroundScale = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1.2)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backgroundScale, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(DURATION * 0.6),
        Animated.parallel([
          Animated.timing(imageScale, {
            toValue: 1,
            duration: DURATION * 0.4,
            easing: Easing.elastic(1.2),
            useNativeDriver: true,
          }),
          Animated.timing(imageOpacity, {
            toValue: 1,
            duration: DURATION * 0.4,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [backgroundScale, imageOpacity, imageScale]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[
          styles.background,
          { transform: [{ scale: backgroundScale }] }
        ]}
      >
        <div className={classes.expoLogoBackground} />
      </Animated.View>

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
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
});

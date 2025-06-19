import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  interpolateColor
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Make the Path an Animated component.
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function AnimatedLines() {
  // Shared values for dash offset and color cycling
  const dashOffset = useSharedValue(0);
  const colorOffset = useSharedValue(0);

  React.useEffect(() => {
    // Animate strokeDashoffset back and forth
    dashOffset.value = withRepeat(
      withTiming(100, { duration: 3000 }), // 100 is the dash array length
      -1, // Infinite repeats
      true
    );

    // Animate colorOffset from 0 -> 1 (and loop)
    colorOffset.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      false
    );
  }, [dashOffset, colorOffset]);

  // Animated props for the Path
  const animatedProps = useAnimatedProps(() => {
    // Interpolate colorOffset to cycle through multiple colors
    const strokeColor = interpolateColor(
      colorOffset.value,
      [0, 0.33, 0.66, 1],
      ['#FF6347', '#1E90FF', '#32CD32', '#FF6347'] 
      // tomato -> dodgerblue -> limegreen -> tomato
    );

    return {
      // Animate dash offset
      strokeDashoffset: dashOffset.value,
      // Animate stroke color
      stroke: strokeColor,
    };
  });

  // Let's define 4 separate lines:
  // 1) Left (top-to-bottom)
  // 2) Right (top-to-bottom)
  // 3) Top (left-to-right)
  // 4) Bottom (left-to-right)

  // We'll position them ~20px in from each edge to be visible.
  const leftPath   = `M 20 20 L 20 ${height - 50}`;
  const rightPath  = `M ${width - 50} 20 L ${width - 20} ${height - 20}`;

  return (
    <Svg
      height="100%"
      width="100%"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <AnimatedPath
        animatedProps={animatedProps}
        d={leftPath}
        fill="none"
        strokeWidth={4}
        strokeDasharray="100"
      />
      <AnimatedPath
        animatedProps={animatedProps}
        d={rightPath}
        fill="none"
        strokeWidth={4}
        strokeDasharray="100"
      />

    </Svg>
  );
}

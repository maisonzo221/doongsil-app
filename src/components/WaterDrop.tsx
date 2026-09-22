import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  color: string;
  size?: number;
}

export default function WaterDrop({ color, size = 14 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2C12 2 4 12.2 4 17a8 8 0 0 0 16 0c0-4.8-8-15-8-15z"
        fill={color}
      />
    </Svg>
  );
}

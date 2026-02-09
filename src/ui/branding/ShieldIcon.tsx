// src/ui/branding/ShieldIcon.tsx

import React from "react";
import Svg, { Path } from "react-native-svg";
import { theme } from "../../theme";

interface Props {
  size?: number;
  color?: string;
}

export const ShieldIcon: React.FC<Props> = ({
  size = 28,
  color = theme.colors.brand,
}) => {
  return (
    <Svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 24 28"
      fill="none"
    >
      {/* Shield outline */}
      <Path
        d="M12 26C7 23 3 19 3 12V6l9-4 9 4v6c0 7-4 11-9 14z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cross */}
      <Path
        d="M12 8v4m0 0H16m-4 0H8m4 0v4"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />

      {/* Keyhole */}
      <Path
        d="M12 13.5c-.8 0-1.5.7-1.5 1.5 0 .6.4 1.1.9 1.4V18h1.2v-1.6c.5-.3.9-.8.9-1.4 0-.8-.7-1.5-1.5-1.5z"
        fill={color}
      />
    </Svg>
  );
};

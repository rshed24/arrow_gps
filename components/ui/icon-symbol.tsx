import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "location.fill": "my-location",
  "safari.fill": "explore",
  "map.fill": "place",
  "info.circle.fill": "info",
  "sun.max.fill": "wb-sunny",
  "moon.fill": "nightlight-round",
  "satellite.fill": "satellite-alt",
  "gps.fill": "gps-fixed",
  "plus.circle.fill": "add-circle",
  "arrow.up.circle.fill": "upload",
  "arrow.down.circle.fill": "download",
  "pencil": "edit",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "doc.on.doc": "content-copy",
  "globe": "language",
  "star.fill": "star",
  "xmark": "close",
  "chevron.left": "chevron-left",
  "navigation.fill": "navigation",
  "flag.fill": "flag",
} as unknown as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

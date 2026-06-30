import type { ReactElement } from "react";
import { useGoldenRecords } from "@vibe-engineer-starter/api-client";
import { Text, View } from "react-native";

export function HomeScreen(): ReactElement {
  const records = useGoldenRecords();

  return (
    <View>
      <Text>Vibe Engineer Starter — Mobile</Text>
      <Text>Golden records ready: {records.length}</Text>
    </View>
  );
}

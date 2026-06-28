// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import { useGoldenRecords } from "@vibe-engineer-starter/api-client";
import { Text, View } from "react-native";

export function GoldenRecordsScreen(): JSX.Element {
  const records = useGoldenRecords();
  return (
    <View>
      {records.map((record) => (
        <Text key={record.id}>{record.title}</Text>
      ))}
    </View>
  );
}

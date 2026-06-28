import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "../navigation/navigation.js";

export function App(): JSX.Element {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

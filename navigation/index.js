import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChatScreen } from "../screens";

const AppStack = createNativeStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="ChatScreen" component={ChatScreen} />
      </AppStack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;

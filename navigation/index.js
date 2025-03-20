import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChatScreen, LoginScreen, SignupScreen } from "../screens";
import { useContext } from "react";
import AuthProvider, { AuthContext } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";

const AuthStack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="LoginScreen" component={LoginScreen} />
      <AuthStack.Screen name="SignupScreen" component={SignupScreen} />
    </AuthStack.Navigator>
  );
};

const AppStack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="ChatScreen" component={ChatScreen} />
    </AppStack.Navigator>
  );
};

const AuthCheck = () => {
  const { isLoading, isLoggedIn } = useContext(AuthContext);
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size={60} color="#e01246" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const Navigation = () => {
  return (
    <AuthProvider>
      <AuthCheck />
    </AuthProvider>
  );
};

export default Navigation;

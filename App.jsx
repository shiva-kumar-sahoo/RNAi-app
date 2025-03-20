import "react-native-gesture-handler";
import { View, Text, SafeAreaView, Platform } from "react-native";
import React from "react";
import Navigation from "./navigation";
import { StatusBar } from "expo-status-bar";

const App = () => {
  return (
    <>
      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        }}
      >
        <Navigation />
      </View>
      {/* <StatusBar style="auto" /> */}
    </>
  );
};

export default App;

import { API_BASE_URL } from "../constant/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export const getTokenService = async () => {
  try {
    const token = await AsyncStorage.getItem("access_token");
    return token;
  } catch (error) {
    console.log(error);
  }
};

export const loginService = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/loginService`, {
      email,
      password,
    });
    if (response.data.success) {
      const { email } = response.data.data;
      await AsyncStorage.setItem("access_token", email);
      return { success: true, data: email };
    }
    return { success: true, data: { email } };
  } catch (error) {
    console.log("Login failed", error);
    if (error.response.status === 400) {
      return { success: false, message: "Invalid email or password" };
    }
    return { success: false, message: error.message };
  }
};

export const registerService = async (fullName, email, password) => {
  try {
    console.log("registerService");
    const response = await axios.post(`${API_BASE_URL}/registerService`, {
      fullName,
      email,
      password,
    });
    console.log("Register response:", response.data);
    if (response.data.success) {
      console.log("Register successful");
      return { success: true, data: response.data };
    }
    console.log("Register failed:", response.message);
    return { success: false, message: response.message };
  } catch (error) {
    console.error("Register failed", error);
    if (error.response.status === 400) {
      return { success: false, message: "Email already exists" };
    }
    return { success: false, message: error.message };
  }
};

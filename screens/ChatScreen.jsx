import React, { useState, useEffect, useRef, useContext } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import RNFS from "react-native-fs"; // File system module
import { initLlama, releaseAllLlama } from "llama.rn";
import { AuthContext } from "../context/AuthContext";

const AVAILABLE_MODELS = [
  {
    id: "qwen2.5-0.5b",
    name: "Qwen2.5-0.5B-Instruct",
    shortName: "Qwen",
    badgeColor: "#4a9eff",
    description:
      "A small but efficient language model optimized for mobile devices. Good for basic chat and simple tasks.",
    size: "500 MB",
    filename: "qwen2.5-0.5b-instruct-q4_0.gguf",
    downloadUrl:
      "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf?download=true",
    params: {
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are Qwen, a helpful AI assistant. Provide concise and accurate responses.",
  },
  {
    id: "tinyllama-1.1b-chat",
    name: "TinyLlama 1.1B Chat",
    shortName: "TinyLlama",
    badgeColor: "#7e4aff",
    description:
      "A compact and efficient model designed for chat applications. Ideal for lightweight tasks and mobile use.",
    size: "700 MB",
    filename: "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    downloadUrl:
      "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf?download=true",
    params: {
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are TinyLlama, a helpful AI assistant. Provide concise and accurate responses.",
  },
  // {
  //   id: "codellama-7b-instruct",
  //   name: "CodeLlama 7B Instruct",
  //   shortName: "CodeLlama",
  //   badgeColor: "#7e4aff",
  //   description:
  //     "A compact and efficient model designed for chat applications. Ideal for lightweight tasks and mobile use.",
  //   size: "2.83 GB",
  //   filename: "odellama-7b-instruct.Q2_K.gguf",
  //   downloadUrl:
  //     "https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q2_K.gguf?download=true",
  //   params: {
  //     use_mlock: true,
  //     n_ctx: 2048,
  //     n_gpu_layers: 1,
  //   },
  //   systemPrompt:
  //     "You are CodeLlama, a helpful AI assistant. Provide concise and accurate responses.",
  // },
];

const ChatScreen = () => {
  const { setIsLoggedIn } = useContext(AuthContext);
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [chatToRename, setChatToRename] = useState(null);
  const [newChatName, setNewChatName] = useState("");

  const [progress, setProgress] = useState(0);
  const [context, setContext] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelExists, setModelExists] = useState({});
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [activeDownloadId, setActiveDownloadId] = useState(null);

  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const { width, height } = Dimensions.get("window");

  useEffect(() => {
    const checkModelsExist = async () => {
      const modelStatus = {};

      // Check each model
      for (const model of AVAILABLE_MODELS) {
        const modelPath = `${RNFS.DocumentDirectoryPath}/${model.filename}`;
        const exists = await RNFS.exists(modelPath);
        modelStatus[model.id] = exists;
      }

      setModelExists(modelStatus);

      // Try to load the last used model from AsyncStorage
      try {
        const lastUsedModelId = await AsyncStorage.getItem("lastUsedModel");
        if (lastUsedModelId && modelStatus[lastUsedModelId]) {
          const model = AVAILABLE_MODELS.find((m) => m.id === lastUsedModelId);
          if (model) {
            await loadModel(model);
          }
        }
      } catch (error) {
        console.error("Failed to load last used model:", error);
      }
    };

    checkModelsExist();
    loadChatHistory();

    // Cleanup function
    return () => {
      if (context) {
        releaseAllLlama();
      }
    };
  }, []);

  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: showSidebar ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showSidebar]);

  const getModelPath = (model) => {
    return `${RNFS.DocumentDirectoryPath}/${model.filename}`;
  };

  const handleDownloadModel = async (model) => {
    const modelPath = getModelPath(model);
    setIsDownloading(true);
    setActiveDownloadId(model.id);
    setProgress(0);

    try {
      const download = RNFS.downloadFile({
        fromUrl: model.downloadUrl,
        toFile: modelPath,
        progress: (res) => {
          const progressPercent = (res.bytesWritten / res.contentLength) * 100;
          setProgress(progressPercent);
        },
      });

      await download.promise;

      // Update model exists state
      setModelExists((prev) => ({
        ...prev,
        [model.id]: true,
      }));

      Alert.alert("Success", `${model.name} downloaded successfully`);

      // Ask if user wants to load the model now
      Alert.alert("Load Model", `Would you like to load ${model.name} now?`, [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => loadModel(model),
        },
      ]);
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to download the model.");
    } finally {
      setIsDownloading(false);
      setActiveDownloadId(null);
    }
  };

  const loadModel = async (model) => {
    if (context) {
      // Unload current model before loading a new one
      releaseAllLlama();
      setContext(null);
    }

    const modelPath = getModelPath(model);

    try {
      const fileExists = await RNFS.exists(modelPath);
      if (!fileExists) {
        Alert.alert("Error", "Model file not found.");
        return;
      }

      // Show loading indicator
      setIsLoading(true);

      const llamaContext = await initLlama({
        model: modelPath,
        ...model.params,
      });

      setContext(llamaContext);
      setCurrentModel(model);

      // Save last used model preference
      await AsyncStorage.setItem("lastUsedModel", model.id);

      Alert.alert("Success", `${model.name} loaded successfully.`);
      setShowModelSettings(false);
    } catch (error) {
      Alert.alert("Error", "Failed to load the model: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteModel = async (model) => {
    const modelPath = getModelPath(model);

    try {
      // If the model is currently loaded, unload it first
      if (context && currentModel && currentModel.id === model.id) {
        releaseAllLlama();
        setContext(null);
        setCurrentModel(null);
      }

      await RNFS.unlink(modelPath);

      // Update model exists state
      setModelExists((prev) => ({
        ...prev,
        [model.id]: false,
      }));

      Alert.alert(
        "Model Deleted",
        `${model.name} has been removed from your device.`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to delete model: " + error.message);
    }
  };

  const loadChatHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem("chatHistory");
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        setChatHistory(history);

        // Set most recent chat as current if available
        if (history.length > 0 && !currentChatId) {
          setCurrentChatId(history[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const storedMessages = await AsyncStorage.getItem(`chat_${chatId}`);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const saveChatHistory = async (history) => {
    try {
      await AsyncStorage.setItem("chatHistory", JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  };

  const saveMessages = async (chatId, messageList) => {
    try {
      await AsyncStorage.setItem(`chat_${chatId}`, JSON.stringify(messageList));
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  };

  const createNewChat = () => {
    const newChatId = Date.now().toString();

    const newChat = {
      id: newChatId,
      title: "New Chat",
      lastMessage: "",
      timestamp: new Date().toISOString(),
      modelId: currentModel ? currentModel.id : null,
    };

    const updatedHistory = [newChat, ...chatHistory];
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);
    setCurrentChatId(newChatId);
    setMessages([]);
    setShowSidebar(false);
  };

  const openRenameModal = (chat) => {
    setChatToRename(chat);
    setNewChatName(chat.title);
    setRenameModalVisible(true);
  };

  const handleRenameChat = () => {
    if (!chatToRename || !newChatName.trim()) {
      setRenameModalVisible(false);
      return;
    }

    const updatedHistory = chatHistory.map((chat) =>
      chat.id === chatToRename.id
        ? { ...chat, title: newChatName.trim() }
        : chat
    );

    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);
    setRenameModalVisible(false);
    setChatToRename(null);
    setNewChatName("");
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentChatId) return;

    if (!context || !currentModel) {
      Alert.alert("Model Not Loaded", "Please load an AI model first to chat.");
      setShowModelSettings(true);
      return;
    }

    // Create user message
    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date().toISOString(),
      role: "user",
      content: inputText.trim(),
    };

    // Update UI immediately with user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    saveMessages(currentChatId, updatedMessages);

    // Update chat history with preview of last message and model info
    const updatedHistory = chatHistory.map((chat) =>
      chat.id === currentChatId
        ? {
            ...chat,
            lastMessage: userMessage.text,
            timestamp: userMessage.timestamp,
            modelId: currentModel.id, // Store which model this chat uses
          }
        : chat
    );
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);

    // Prepare conversation format for Llama model
    setIsGenerating(true);
    setIsLoading(true);

    // Scroll to bottom
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }

    try {
      // Format messages for the Llama model
      const llamaMessages = [
        {
          role: "system",
          content: currentModel.systemPrompt,
        },
        ...messages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        })),
        { role: "user", content: userMessage.text },
      ];

      // Call the model
      const result = await context.completion({
        messages: llamaMessages,
        n_predict: 1000,
      });

      if (result && result.text) {
        // Add the assistant's response to the conversation
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          text: result.text.trim(),
          sender: "ai",
          timestamp: new Date().toISOString(),
          role: "assistant",
          content: result.text.trim(),
          modelId: currentModel.id, // Store which model generated this response
          shortName: currentModel.shortName,
        };

        const messagesWithResponse = [...updatedMessages, aiResponse];
        setMessages(messagesWithResponse);
        saveMessages(currentChatId, messagesWithResponse);

        // Scroll to bottom after AI responds
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      } else {
        throw new Error("No response from the model.");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to generate response");
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId) => {
    const updatedHistory = chatHistory.filter((chat) => chat.id !== chatId);
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);

    // Remove chat messages
    try {
      await AsyncStorage.removeItem(`chat_${chatId}`);
    } catch (error) {
      console.error("Failed to delete chat messages:", error);
    }

    // If current chat is deleted, select another one or none
    if (currentChatId === chatId) {
      if (updatedHistory.length > 0) {
        setCurrentChatId(updatedHistory[0].id);
      } else {
        setCurrentChatId(null);
      }
    }
  };

  const sidebarWidth = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("access_token");
            console.log("Logging out...");
            setIsLoggedIn(false);
          } catch (error) {
            console.error("Error during logout:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <View
          style={{
            height: 60,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 15,
            backgroundColor: "#ffffff",
            borderBottomWidth: 1,
            borderBottomColor: "#e0e0e0",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowSidebar(!showSidebar)}
            style={{ padding: 8 }}
          >
            <Ionicons name="menu" size={24} color="#000000" />
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#333333",
                fontSize: 18,
                fontWeight: "600",
                marginRight: 8,
              }}
            >
              {currentChatId
                ? chatHistory.find((chat) => chat.id === currentChatId)
                    ?.title || "Chat"
                : "AI Assistant"}
            </Text>
            {currentModel && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  backgroundColor: currentModel.badgeColor,
                }}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  {currentModel.shortName}
                </Text>
              </View>
            )}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => setShowModelSettings(true)}
              style={{ padding: 8, marginRight: 4 }}
            >
              <Ionicons
                name={context ? "cube" : "cube-outline"}
                size={24}
                color={context ? "#5ee432" : "#000000"}
              />
            </TouchableOpacity>
            {!inputFocused && (
              <TouchableOpacity onPress={createNewChat} style={{ padding: 8 }}>
                <Ionicons name="add-circle-outline" size={24} color="#000000" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Chat Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {currentChatId ? (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  flexGrow: 1,
                  padding: 16,
                  paddingBottom: 24,
                }}
                renderItem={({ item }) => (
                  <View
                    style={{
                      maxWidth: "80%",
                      padding: 12,
                      borderRadius: 16,
                      marginBottom: 12,
                      position: "relative",
                      backgroundColor:
                        item.sender === "user" ? "#0b93f6" : "#f0f0f0",
                      alignSelf:
                        item.sender === "user" ? "flex-end" : "flex-start",
                      borderTopRightRadius: item.sender === "user" ? 2 : 16,
                      borderTopLeftRadius: item.sender === "user" ? 16 : 2,
                    }}
                  >
                    {item.sender === "ai" && item.modelId && (
                      <View
                        style={{
                          position: "absolute",
                          top: -8,
                          left: 10,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          backgroundColor: "#e0e0e0",
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#333333",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {item.shortName || "AI"}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={{
                        fontSize: 16,
                        color: item.sender === "user" ? "#ffffff" : "#333333",
                      }}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        alignSelf: "flex-end",
                        marginTop: 4,
                        color:
                          item.sender === "user"
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                )}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
              />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  paddingBottom: 16,
                  backgroundColor: "#f8f8f8",
                  borderTopWidth: 0.5,
                  borderTopColor: "rgba(0,0,0,0.1)",
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: "#ffffff",
                    fontSize: 16,
                    borderRadius: 24,
                    color: "#333333",
                    maxHeight: 120,
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.1)",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 1,
                    },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  placeholderTextColor="#999"
                  multiline
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  editable={!isGenerating}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor:
                      !inputText.trim() || isGenerating || !context
                        ? "#e0e0e0"
                        : "#007AFF",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor:
                      !inputText.trim() || isGenerating || !context
                        ? "transparent"
                        : "#007AFF",
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    elevation: 3,
                  }}
                  disabled={!inputText.trim() || isGenerating || !context}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={20}
                      color={
                        !inputText.trim() || isGenerating || !context
                          ? "#aaa"
                          : "#fff"
                      }
                    />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
              }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={64}
                color="#555"
              />
              <Text
                style={{
                  color: "#888888",
                  fontSize: 18,
                  marginTop: 16,
                  marginBottom: 24,
                }}
              >
                Start a new conversation
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#0b93f6",
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                }}
                onPress={createNewChat}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  New Chat
                </Text>
              </TouchableOpacity>

              {!context && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#555",
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    marginTop: 12,
                  }}
                  onPress={() => setShowModelSettings(true)}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                  >
                    Load AI Model
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          backgroundColor: "#ffffff",
          borderRightWidth: 1,
          borderRightColor: "#e0e0e0",
          zIndex: 10,
          width: sidebarWidth,
        }}
      >
        {showSidebar && (
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#e0e0e0",
            }}
          >
            <Text
              style={{
                color: "#333333",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              Chat History
            </Text>
            <TouchableOpacity
              onPress={createNewChat}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#0b93f6",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 16,
                  marginLeft: 8,
                  fontWeight: "500",
                }}
              >
                New Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={chatHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#e0e0e0",
                backgroundColor:
                  currentChatId === item.id ? "#e6f3ff" : "transparent",
              }}
              onPress={() => {
                setCurrentChatId(item.id);
                setShowSidebar(false);
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#ccc" />
                <View
                  style={{
                    flex: 1,
                    marginLeft: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#333333",
                        fontSize: 16,
                        marginRight: 6,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.modelId && (
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor: item.badgeColor,
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {item.shortName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      color: "#666666",
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {item.lastMessage || "New conversation"}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  style={{ padding: 6, marginLeft: 4 }}
                  onPress={() => openRenameModal(item)}
                >
                  <Ionicons name="pencil-outline" size={18} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 6, marginLeft: 4 }}
                  onPress={() => deleteChat(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#888" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <Text
                style={{
                  color: "#888888",
                  fontSize: 16,
                }}
              >
                No chats yet
              </Text>
            </View>
          }
        />

        {/* Sidebar Footer */}
        <View
          style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: "#e0e0e0",
            gap: 12,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => setShowModelSettings(true)}
          >
            <Ionicons
              name={context ? "cube" : "cube-outline"}
              size={20}
              color={context ? "#5ee432" : "#666666"}
            />
            <Text
              style={{
                color: "#666666",
                fontSize: 16,
                marginLeft: 8,
              }}
            >
              {context ? `${currentModel.name}` : "Load Model"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              padding: 8,
            }}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#d9534f" />
            <Text
              style={{
                color: "#d9534f",
                fontSize: 16,
                marginLeft: 8,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {showSidebar && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 280, // Width of the sidebar
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            zIndex: 5,
          }}
          activeOpacity={1}
          onPress={() => setShowSidebar(false)}
        />
      )}

      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRenameModalVisible(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={{
                  width: width * 0.8,
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  padding: 20,
                  alignItems: "center",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: "#333333",
                    fontSize: 18,
                    fontWeight: "600",
                    marginBottom: 16,
                  }}
                >
                  Rename Chat
                </Text>
                <TextInput
                  style={{
                    width: "100%",
                    backgroundColor: "#f5f5f5",
                    color: "#333333",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: "#e0e0e0",
                  }}
                  value={newChatName}
                  onChangeText={setNewChatName}
                  placeholder="Enter new name"
                  placeholderTextColor="#666"
                  autoFocus
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      flex: 0.48,
                      alignItems: "center",
                      backgroundColor: "#f0f0f0",
                      borderWidth: 1,
                      borderColor: "#e0e0e0",
                    }}
                    onPress={() => setRenameModalVisible(false)}
                  >
                    <Text
                      style={{
                        color: "#666666",
                        fontWeight: "600",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      flex: 0.48,
                      alignItems: "center",
                      backgroundColor: "#0b93f6",
                    }}
                    onPress={handleRenameChat}
                  >
                    <Text
                      style={{
                        color: "#ffffff",
                        fontWeight: "600",
                      }}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showModelSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModelSettings(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#f8f8f8",
            }}
          >
            <View
              style={{
                height: 60,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 15,
                backgroundColor: "#ffffff",
                borderBottomWidth: 1,
                borderBottomColor: "#e0e0e0",
              }}
            >
              <Text
                style={{
                  color: "#333333",
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                AI Models
              </Text>
              <TouchableOpacity
                onPress={() => setShowModelSettings(false)}
                style={{ padding: 8 }}
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{
                flex: 1,
                padding: 16,
              }}
            >
              {AVAILABLE_MODELS.map((model) => (
                <View
                  key={model.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: "#333333",
                          fontSize: 18,
                          fontWeight: "bold",
                        }}
                      >
                        {model.name}
                      </Text>
                      <Text
                        style={{
                          color: "#666666",
                          fontSize: 14,
                          marginTop: 2,
                        }}
                      >
                        Size: {model.size}
                      </Text>
                    </View>
                    {modelExists[model.id] &&
                      currentModel &&
                      currentModel.id === model.id && (
                        <View
                          style={{
                            backgroundColor: "#5ee432",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: "#000000",
                              fontSize: 12,
                              fontWeight: "bold",
                            }}
                          >
                            Active
                          </Text>
                        </View>
                      )}
                  </View>

                  <Text
                    style={{
                      color: "#555555",
                      fontSize: 14,
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    {model.description}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: "#333333",
                        fontSize: 16,
                        marginRight: 8,
                      }}
                    >
                      Status:
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          marginRight: 8,
                          backgroundColor: modelExists[model.id]
                            ? currentModel && currentModel.id === model.id
                              ? "#5ee432"
                              : "#ffcc00"
                            : "#ff3b30",
                        }}
                      />
                      <Text
                        style={{
                          color: "#333333",
                          fontSize: 14,
                        }}
                      >
                        {modelExists[model.id]
                          ? currentModel && currentModel.id === model.id
                            ? "Loaded and Active"
                            : "Downloaded (Not Loaded)"
                          : "Not Downloaded"}
                      </Text>
                    </View>
                  </View>

                  {activeDownloadId === model.id && isDownloading && (
                    <View
                      style={{
                        backgroundColor: "#f0f0f0",
                        height: 40,
                        borderRadius: 8,
                        marginBottom: 16,
                        overflow: "hidden",
                        position: "relative",
                        borderWidth: 1,
                        borderColor: "#e0e0e0",
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "#0b93f6",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${progress}%`,
                        }}
                      />
                      <Text
                        style={{
                          color: "#333333",
                          position: "absolute",
                          alignSelf: "center",
                          top: 10,
                          fontWeight: "bold",
                        }}
                      >
                        {progress.toFixed(1)}%
                      </Text>
                      <ActivityIndicator
                        size="small"
                        color="#0b93f6"
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 10,
                        }}
                      />
                    </View>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    {!modelExists[model.id] && (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor:
                            activeDownloadId === model.id && isDownloading
                              ? "#cccccc"
                              : "#0b93f6",
                          padding: 12,
                          borderRadius: 8,
                          alignItems: "center",
                          marginHorizontal: 4,
                        }}
                        onPress={() => handleDownloadModel(model)}
                        disabled={
                          activeDownloadId === model.id && isDownloading
                        }
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                        >
                          {activeDownloadId === model.id && isDownloading
                            ? "Downloading..."
                            : "Download"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {modelExists[model.id] &&
                      !(currentModel && currentModel.id === model.id) && (
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: "#0b93f6",
                            padding: 12,
                            borderRadius: 8,
                            alignItems: "center",
                            marginHorizontal: 4,
                          }}
                          onPress={() => loadModel(model)}
                          disabled={isLoading}
                        >
                          <Text
                            style={{
                              color: "#ffffff",
                              fontSize: 16,
                              fontWeight: "600",
                            }}
                          >
                            {isLoading ? "Loading..." : "Load Model"}
                          </Text>
                        </TouchableOpacity>
                      )}

                    {modelExists[model.id] &&
                      currentModel &&
                      currentModel.id === model.id && (
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: "#555",
                            padding: 12,
                            borderRadius: 8,
                            alignItems: "center",
                            marginHorizontal: 4,
                          }}
                          onPress={() => {
                            releaseAllLlama();
                            setContext(null);
                            setCurrentModel(null);
                            Alert.alert(
                              "Model Unloaded",
                              "The model has been unloaded from memory."
                            );
                          }}
                        >
                          <Text
                            style={{
                              color: "#ffffff",
                              fontSize: 16,
                              fontWeight: "600",
                            }}
                          >
                            Unload
                          </Text>
                        </TouchableOpacity>
                      )}

                    {modelExists[model.id] && (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: "#d9534f",
                          padding: 12,
                          borderRadius: 8,
                          alignItems: "center",
                          marginHorizontal: 4,
                        }}
                        onPress={() => {
                          Alert.alert(
                            "Delete Model",
                            `Are you sure you want to delete ${model.name}? This will free up space on your device.`,
                            [
                              {
                                text: "Cancel",
                                style: "cancel",
                              },
                              {
                                text: "Delete",
                                onPress: () => deleteModel(model),
                                style: "destructive",
                              },
                            ]
                          );
                        }}
                        disabled={
                          activeDownloadId === model.id && isDownloading
                        }
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: "#333333",
                    fontSize: 18,
                    fontWeight: "600",
                    marginBottom: 12,
                  }}
                >
                  About Models
                </Text>
                <Text
                  style={{
                    color: "#555555",
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  • All processing happens on your device{"\n"}• No internet
                  connection needed once downloaded{"\n"}• Larger models
                  generally give better responses but use more memory{"\n"}• You
                  can switch between models for different types of tasks
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChatScreen;

import React, { useState, useEffect, useRef } from "react";
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

// Available models
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
];

const ChatScreen = () => {
  // UI State
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Rename chat state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [chatToRename, setChatToRename] = useState(null);
  const [newChatName, setNewChatName] = useState("");

  // Model state
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

  // Check which models exist on app start
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

  // Load messages when current chat changes
  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  // Animation for sidebar
  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: showSidebar ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showSidebar]);

  // Get model path
  const getModelPath = (model) => {
    return `${RNFS.DocumentDirectoryPath}/${model.filename}`;
  };

  // Download a model
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

  // Load a model
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

  // Delete a model
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

  // Load chat history from AsyncStorage
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

  // Load messages for specific chat
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

  // Save chat history to AsyncStorage
  const saveChatHistory = async (history) => {
    try {
      await AsyncStorage.setItem("chatHistory", JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  };

  // Save messages for specific chat
  const saveMessages = async (chatId, messageList) => {
    try {
      await AsyncStorage.setItem(`chat_${chatId}`, JSON.stringify(messageList));
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  };

  // Create a new chat
  const createNewChat = () => {
    const newChatId = Date.now().toString();

    // Include the currently active model in the chat metadata
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

  // Open rename modal
  const openRenameModal = (chat) => {
    setChatToRename(chat);
    setNewChatName(chat.title);
    setRenameModalVisible(true);
  };

  // Handle rename chat
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

  // Send message to AI
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

  // Delete a chat
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

  // Sidebar width animation
  const sidebarWidth = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  // Get the model badge color
  const getModelBadgeColor = (modelId) => {
    switch (modelId) {
      case "qwen2.5-0.5b":
        return "#4a9eff";
      case "mistral-7b-instruct":
        return "#7e4aff";
      case "llama3-8b-instruct":
        return "#ff4a79";
      default:
        return "#999";
    }
  };

  // Get short name for model badge
  const getModelShortName = (modelId) => {
    switch (modelId) {
      case "qwen2.5-0.5b":
        return "Qwen";
      case "mistral-7b-instruct":
        return "Mistral";
      case "llama3-8b-instruct":
        return "Llama 3";
      default:
        return "AI";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowSidebar(!showSidebar)}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {currentChatId
                ? chatHistory.find((chat) => chat.id === currentChatId)
                    ?.title || "Chat"
                : "AI Assistant"}
            </Text>
            {currentModel && (
              <View
                style={[
                  styles.modelBadge,
                  { backgroundColor: currentModel.badgeColor },
                ]}
              >
                <Text style={styles.modelBadgeText}>
                  {currentModel.shortName}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerRightButtons}>
            <TouchableOpacity
              onPress={() => setShowModelSettings(true)}
              style={styles.modelButton}
            >
              <Ionicons
                name={context ? "cube" : "cube-outline"}
                size={24}
                color={context ? "#5ee432" : "#fff"}
              />
            </TouchableOpacity>
            {!inputFocused && (
              <TouchableOpacity
                onPress={createNewChat}
                style={styles.newChatButton}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Chat Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {currentChatId ? (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContainer}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.messageBubble,
                      item.sender === "user"
                        ? styles.userBubble
                        : styles.aiBubble,
                    ]}
                  >
                    {item.sender === "ai" && item.modelId && (
                      <View style={styles.messageModelIndicator}>
                        <Text style={styles.messageModelName}>
                          {item.shortName || "AI"}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.messageText,
                        item.sender === "user"
                          ? styles.userMessageText
                          : styles.aiMessageText,
                      ]}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={[
                        styles.timestamp,
                        item.sender === "user"
                          ? styles.userTimestamp
                          : styles.aiTimestamp,
                      ]}
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

              {/* Input Area */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message..."
                  placeholderTextColor="#666"
                  multiline
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  editable={!isGenerating}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isGenerating || !context) &&
                      styles.disabledSendButton,
                  ]}
                  disabled={!inputText.trim() || isGenerating || !context}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={64}
                color="#555"
              />
              <Text style={styles.emptyStateText}>
                Start a new conversation
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={createNewChat}
              >
                <Text style={styles.emptyStateButtonText}>New Chat</Text>
              </TouchableOpacity>

              {!context && (
                <TouchableOpacity
                  style={[
                    styles.emptyStateButton,
                    { marginTop: 12, backgroundColor: "#555" },
                  ]}
                  onPress={() => setShowModelSettings(true)}
                >
                  <Text style={styles.emptyStateButtonText}>Load AI Model</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>

      {/* Sidebar / Chat History */}
      <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
        {showSidebar && (
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Chat History</Text>
            <TouchableOpacity
              onPress={createNewChat}
              style={styles.newChatSidebarButton}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.newChatText}>New Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chat History List */}
        <FlatList
          data={chatHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chatItem,
                currentChatId === item.id && styles.selectedChatItem,
              ]}
              onPress={() => {
                setCurrentChatId(item.id);
                setShowSidebar(false);
              }}
            >
              <View style={styles.chatItemContent}>
                <Ionicons name="chatbubble-outline" size={20} color="#ccc" />
                <View style={styles.chatItemDetails}>
                  <View style={styles.chatItemHeader}>
                    <Text style={styles.chatItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.modelId && (
                      <View
                        style={[
                          styles.chatItemModelBadge,
                          { backgroundColor: item.badgeColor },
                        ]}
                      >
                        <Text style={styles.chatItemModelText}>
                          {item.shortName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.chatItemPreview} numberOfLines={1}>
                    {item.lastMessage || "New conversation"}
                  </Text>
                </View>
              </View>
              <View style={styles.chatItemActions}>
                <TouchableOpacity
                  style={styles.chatActionButton}
                  onPress={() => openRenameModal(item)}
                >
                  <Ionicons name="pencil-outline" size={18} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatActionButton}
                  onPress={() => deleteChat(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#888" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyHistoryContainer}>
              <Text style={styles.emptyHistoryText}>No chats yet</Text>
            </View>
          }
        />

        {/* Sidebar Footer */}
        <View style={styles.sidebarFooter}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowModelSettings(true)}
          >
            <Ionicons
              name={context ? "cube" : "cube-outline"}
              size={20}
              color={context ? "#5ee432" : "#ccc"}
            />
            <Text style={styles.settingsText}>
              {context ? `${currentModel.name}` : "Load Model"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Overlay to close sidebar on tap */}
      {showSidebar && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSidebar(false)}
        />
      )}

      {/* Rename Chat Modal */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRenameModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rename Chat</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newChatName}
                  onChangeText={setNewChatName}
                  placeholder="Enter new name"
                  placeholderTextColor="#666"
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setRenameModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleRenameChat}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Model Settings Modal */}
      <Modal
        visible={showModelSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModelSettings(false)}
      >
        <View style={styles.modelModalContainer}>
          <View style={styles.modelModalContent}>
            <View style={styles.modelModalHeader}>
              <Text style={styles.modelModalTitle}>AI Models</Text>
              <TouchableOpacity
                onPress={() => setShowModelSettings(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modelDetailsContainer}>
              {AVAILABLE_MODELS.map((model) => (
                <View key={model.id} style={styles.modelCard}>
                  <View style={styles.modelCardHeader}>
                    <View>
                      <Text style={styles.modelName}>{model.name}</Text>
                      <Text style={styles.modelSize}>Size: {model.size}</Text>
                    </View>
                    {modelExists[model.id] &&
                      currentModel &&
                      currentModel.id === model.id && (
                        <View style={styles.activeModelBadge}>
                          <Text style={styles.activeModelText}>Active</Text>
                        </View>
                      )}
                  </View>

                  <Text style={styles.modelDescription}>
                    {model.description}
                  </Text>

                  <View style={styles.statusContainer}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <View style={styles.statusIndicator}>
                      <View
                        style={[
                          styles.statusDot,
                          modelExists[model.id]
                            ? currentModel && currentModel.id === model.id
                              ? styles.statusActive
                              : styles.statusDownloaded
                            : styles.statusInactive,
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {modelExists[model.id]
                          ? currentModel && currentModel.id === model.id
                            ? "Loaded and Active"
                            : "Downloaded (Not Loaded)"
                          : "Not Downloaded"}
                      </Text>
                    </View>
                  </View>

                  {activeDownloadId === model.id && isDownloading && (
                    <View style={styles.downloadProgress}>
                      <View
                        style={[styles.progressBar, { width: `${progress}%` }]}
                      />
                      <Text style={styles.progressText}>
                        {progress.toFixed(1)}%
                      </Text>
                      <ActivityIndicator
                        size="small"
                        color="#0b93f6"
                        style={styles.loadingIndicator}
                      />
                    </View>
                  )}

                  <View style={styles.modelActionButtonsRow}>
                    {!modelExists[model.id] && (
                      <TouchableOpacity
                        style={[
                          styles.modelActionButton,
                          activeDownloadId === model.id && isDownloading
                            ? styles.disabledModelButton
                            : null,
                        ]}
                        onPress={() => handleDownloadModel(model)}
                        disabled={
                          activeDownloadId === model.id && isDownloading
                        }
                      >
                        <Text style={styles.modelActionButtonText}>
                          {activeDownloadId === model.id && isDownloading
                            ? "Downloading..."
                            : "Download"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {modelExists[model.id] &&
                      !(currentModel && currentModel.id === model.id) && (
                        <TouchableOpacity
                          style={styles.modelActionButton}
                          onPress={() => loadModel(model)}
                          disabled={isLoading}
                        >
                          <Text style={styles.modelActionButtonText}>
                            {isLoading ? "Loading..." : "Load Model"}
                          </Text>
                        </TouchableOpacity>
                      )}

                    {modelExists[model.id] &&
                      currentModel &&
                      currentModel.id === model.id && (
                        <TouchableOpacity
                          style={[
                            styles.modelActionButton,
                            { backgroundColor: "#555" },
                          ]}
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
                          <Text style={styles.modelActionButtonText}>
                            Unload
                          </Text>
                        </TouchableOpacity>
                      )}

                    {modelExists[model.id] && (
                      <TouchableOpacity
                        style={[
                          styles.modelActionButton,
                          styles.deleteModelButton,
                        ]}
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
                        <Text style={styles.modelActionButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              <View style={styles.modelInfoSection}>
                <Text style={styles.infoTitle}>About Models</Text>
                <Text style={styles.infoText}>
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

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  mainContent: {
    flex: 1,
    backgroundColor: "#222",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    backgroundColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  modelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modelBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  headerRightButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  newChatButton: {
    padding: 8,
  },
  modelButton: {
    padding: 8,
    marginRight: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    position: "relative",
  },
  userBubble: {
    backgroundColor: "#0b93f6",
    alignSelf: "flex-end",
    borderTopRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: "#333",
    alignSelf: "flex-start",
    borderTopLeftRadius: 2,
  },
  messageModelIndicator: {
    position: "absolute",
    top: -8,
    left: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#444",
    borderRadius: 8,
  },
  messageModelName: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: "#fff",
  },
  aiMessageText: {
    color: "#fff",
  },
  timestamp: {
    fontSize: 11,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  aiTimestamp: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#444",
    backgroundColor: "#2a2a2a",
  },
  input: {
    flex: 1,
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 20,
    color: "#fff",
    maxHeight: 120,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0b93f6",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledSendButton: {
    backgroundColor: "#555",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: "#222",
    borderRightWidth: 1,
    borderRightColor: "#444",
    zIndex: 10,
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  sidebarTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  newChatSidebarButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b93f6",
    padding: 12,
    borderRadius: 8,
  },
  newChatText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "500",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  selectedChatItem: {
    backgroundColor: "#333",
  },
  chatItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  chatItemDetails: {
    flex: 1,
    marginLeft: 10,
  },
  chatItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chatItemTitle: {
    color: "#fff",
    fontSize: 16,
    marginRight: 6,
    flex: 1,
  },
  chatItemModelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chatItemModelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  chatItemPreview: {
    color: "#999",
    fontSize: 13,
  },
  chatItemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatActionButton: {
    padding: 6,
    marginLeft: 4,
  },
  emptyHistoryContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyHistoryText: {
    color: "#888",
    fontSize: 16,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#444",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsText: {
    color: "#ccc",
    fontSize: 16,
    marginLeft: 8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 280, // Width of the sidebar
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    color: "#888",
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#0b93f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  modalInput: {
    width: "100%",
    backgroundColor: "#333",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#444",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#0b93f6",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  // Model modal styles
  modelModalContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  modelModalContent: {
    flex: 1,
    backgroundColor: "#222",
  },
  modelModalHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    backgroundColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  modelModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  modelDetailsContainer: {
    flex: 1,
    padding: 16,
  },
  modelCard: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modelCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  modelName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modelSize: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 2,
  },
  activeModelBadge: {
    backgroundColor: "#5ee432",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeModelText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  modelDescription: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusLabel: {
    color: "#fff",
    fontSize: 16,
    marginRight: 8,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: "#5ee432",
  },
  statusDownloaded: {
    backgroundColor: "#ffcc00",
  },
  statusInactive: {
    backgroundColor: "#ff3b30",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
  },
  downloadProgress: {
    backgroundColor: "#444",
    height: 40,
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  progressBar: {
    backgroundColor: "#0b93f6",
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
  },
  progressText: {
    color: "#fff",
    position: "absolute",
    alignSelf: "center",
    top: 10,
    fontWeight: "bold",
  },
  loadingIndicator: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  modelActionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modelActionButton: {
    flex: 1,
    backgroundColor: "#0b93f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  deleteModelButton: {
    backgroundColor: "#d9534f",
  },
  disabledModelButton: {
    backgroundColor: "#555",
  },
  modelActionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modelInfoSection: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  infoText: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 22,
  },
});

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
  StatusBar as RNStatusBar,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import RNFS from "react-native-fs";
import { initLlama, releaseAllLlama } from "llama.rn";
import { AVAILABLE_MODELS } from "../constant/models";

const STOP_WORDS = [
  "<|im_end|>",
  "<|im_start|>",
  "<|endoftext|>",
  "<|end|>",
  "<|eot_id|>",
  "<|user|>",
  "<|assistant|>",
  "<|system|>",
  "<end_of_turn>",
  "<start_of_turn>",
  "</s>",
  "<s>",
  "<eos>",
  "[INST]",
  "[/INST]",
];

const cleanResponse = (raw) => {
  let text = String(raw || "");
  let cut = text.length;
  for (const stop of STOP_WORDS) {
    const i = text.indexOf(stop);
    if (i !== -1 && i < cut) cut = i;
  }
  text = text.slice(0, cut);
  text = text.replace(/<\|[^|>]*\|?>?/g, "").replace(/<\/?s>/g, "");
  text = text.replace(/^\s*(assistant|ai)\s*:\s*/i, "");
  return text.trim();
};

const LOGO = require("../assets/logo.png");

const MAX_HISTORY_MESSAGES = 8;
const MAX_REPLY_TOKENS = 512;

const PERF_PARAMS = { n_threads: 4, n_batch: 512, n_ubatch: 512, flash_attn: true };

const ChatScreen = () => {
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
  const [streamingText, setStreamingText] = useState("");
  const streamBuf = useRef("");
  const [modelExists, setModelExists] = useState({});
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [activeDownloadId, setActiveDownloadId] = useState(null);

  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  useEffect(() => {
    const checkModelsExist = async () => {
      const modelStatus = {};

      for (const model of AVAILABLE_MODELS) {
        const modelPath = `${RNFS.DocumentDirectoryPath}/${model.filename}`;
        const exists = await RNFS.exists(modelPath);
        modelStatus[model.id] = exists;
      }

      setModelExists(modelStatus);

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
      duration: 260,
      useNativeDriver: true,
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

      setModelExists((prev) => ({
        ...prev,
        [model.id]: true,
      }));

      Alert.alert("Success", `${model.name} downloaded successfully`);

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

      setIsLoading(true);

      const llamaContext = await initLlama({
        model: modelPath,
        ...PERF_PARAMS,
        ...model.params,
      });

      setContext(llamaContext);
      setCurrentModel(model);

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
      if (context && currentModel && currentModel.id === model.id) {
        releaseAllLlama();
        setContext(null);
        setCurrentModel(null);
      }

      await RNFS.unlink(modelPath);

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

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date().toISOString(),
      role: "user",
      content: inputText.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    saveMessages(currentChatId, updatedMessages);

    const updatedHistory = chatHistory.map((chat) =>
      chat.id === currentChatId
        ? {
            ...chat,
            lastMessage: userMessage.text,
            timestamp: userMessage.timestamp,
            modelId: currentModel.id,
          }
        : chat
    );
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);

    streamBuf.current = "";
    setStreamingText("");
    setIsGenerating(true);
    setIsLoading(true);

    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }

    try {
      const llamaMessages = [
        {
          role: "system",
          content: currentModel.systemPrompt,
        },
        ...messages.slice(-MAX_HISTORY_MESSAGES).map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        })),
        { role: "user", content: userMessage.text },
      ];

      let lastPaint = 0;
      const result = await context.completion(
        {
          messages: llamaMessages,
          n_predict: MAX_REPLY_TOKENS,
          stop: STOP_WORDS,
        },
        (data) => {
          const now = Date.now();
          if (now - lastPaint > 80) {
            lastPaint = now;
            setStreamingText(data.token ? (streamBuf.current += data.token) : streamBuf.current);
          } else if (data.token) {
            streamBuf.current += data.token;
          }
        }
      );

      const reply = cleanResponse(result?.text);

      if (reply) {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          text: reply,
          sender: "ai",
          timestamp: new Date().toISOString(),
          role: "assistant",
          content: reply,
          modelId: currentModel.id,
          shortName: currentModel.shortName,
        };

        const messagesWithResponse = [...updatedMessages, aiResponse];
        setMessages(messagesWithResponse);
        saveMessages(currentChatId, messagesWithResponse);

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
      setStreamingText("");
    }
  };

  const deleteChat = async (chatId) => {
    const updatedHistory = chatHistory.filter((chat) => chat.id !== chatId);
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);

    try {
      await AsyncStorage.removeItem(`chat_${chatId}`);
    } catch (error) {
      console.error("Failed to delete chat messages:", error);
    }

    if (currentChatId === chatId) {
      if (updatedHistory.length > 0) {
        setCurrentChatId(updatedHistory[0].id);
      } else {
        setCurrentChatId(null);
      }
    }
  };

  const isActiveModel = (model) => currentModel && currentModel.id === model.id;
  const sendDisabled = !inputText.trim() || isGenerating || !context;

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const confirmDeleteChat = (chat) =>
    Alert.alert("Delete chat", `Delete "${chat.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteChat(chat.id) },
    ]);

  const renderMessage = ({ item }) => {
    const mine = item.sender === "user";
    return (
      <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowAi]}>
        {!mine && (
          <Image source={LOGO} style={styles.avatar} />
        )}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAi]}>
          {!mine && (
            <Text style={styles.bubbleAuthor}>{item.shortName || "RNAi"}</Text>
          )}
          <Text style={[styles.bubbleText, mine && { color: C.onPrimary }]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, mine && { color: C.onPrimaryMuted }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatItem = ({ item }) => {
    const active = item.id === currentChatId;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.chatItem, active && styles.chatItemActive]}
        onPress={() => {
          setCurrentChatId(item.id);
          setShowSidebar(false);
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.lastMessage || "No messages yet"}
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={8}
          style={styles.iconBtnSm}
          onPress={() => openRenameModal(item)}
          accessibilityLabel="Rename chat"
        >
          <Ionicons name="pencil-outline" size={17} color={C.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.iconBtnSm}
          onPress={() => confirmDeleteChat(item)}
          accessibilityLabel="Delete chat"
        >
          <Ionicons name="trash-outline" size={17} color={C.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderModelCard = (model) => {
    const exists = modelExists[model.id];
    const active = isActiveModel(model);
    const downloadingThis = activeDownloadId === model.id && isDownloading;
    return (
      <View key={model.id} style={[styles.modelCard, active && styles.modelCardActive]}>
        <View style={styles.modelHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelMeta}>
              {model.size} ·{" "}
              {active ? "Running" : exists ? "Downloaded" : "Not downloaded"}
            </Text>
          </View>
          {active && (
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          )}
        </View>
        <Text style={styles.modelDesc}>{model.description}</Text>

        {downloadingThis && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
          </View>
        )}

        <View style={styles.modelActions}>
          {!exists && (
            <TouchableOpacity
              style={[styles.btnPrimary, downloadingThis && styles.btnDisabled]}
              onPress={() => handleDownloadModel(model)}
              disabled={downloadingThis}
            >
              <Ionicons name="download-outline" size={18} color={C.onPrimary} />
              <Text style={styles.btnPrimaryText}>
                {downloadingThis ? "Downloading…" : "Download"}
              </Text>
            </TouchableOpacity>
          )}
          {exists && !active && (
            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={() => loadModel(model)}
              disabled={isLoading}
            >
              <Text style={styles.btnPrimaryText}>
                {isLoading ? "Loading…" : "Load model"}
              </Text>
            </TouchableOpacity>
          )}
          {active && (
            <TouchableOpacity
              style={styles.btnSecondary}
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
              <Text style={styles.btnSecondaryText}>Unload</Text>
            </TouchableOpacity>
          )}
          {exists && (
            <TouchableOpacity
              style={styles.btnGhost}
              disabled={downloadingThis}
              onPress={() =>
                Alert.alert(
                  "Delete Model",
                  `Are you sure you want to delete ${model.name}? This will free up space on your device.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteModel(model),
                    },
                  ]
                )
              }
            >
              <Text style={styles.btnGhostText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowSidebar(true)}
          accessibilityLabel="Open chats"
        >
          <Ionicons name="menu" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatHistory.find((c) => c.id === currentChatId)?.title || "RNAi"}
          </Text>
          <TouchableOpacity
            style={styles.modelChip}
            onPress={() => setShowModelSettings(true)}
          >
            <View style={[styles.statusDot, context && styles.statusDotOn]} />
            <Text style={styles.modelChipText} numberOfLines={1}>
              {context && currentModel ? currentModel.name : "No model loaded"}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={createNewChat}
          accessibilityLabel="New chat"
        >
          <Ionicons name="create-outline" size={23} color={C.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {currentChatId ? (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContent}
              renderItem={renderMessage}
              ListEmptyComponent={
                <View style={styles.chatEmpty}>
                  <Text style={styles.chatEmptyTitle}>Ask anything</Text>
                  <Text style={styles.chatEmptyText}>
                    {context
                      ? "Your model runs on this phone. Nothing leaves the device."
                      : "Load a model to start chatting."}
                  </Text>
                </View>
              }
              ListFooterComponent={
                isGenerating ? (
                  <View style={[styles.msgRow, styles.msgRowAi]}>
                    <Image source={LOGO} style={styles.avatar} />
                    {cleanResponse(streamingText) ? (
                      <View style={[styles.bubble, styles.bubbleAi]}>
                        <Text style={styles.bubbleText}>
                          {cleanResponse(streamingText)}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.bubble, styles.bubbleAi, styles.typing]}>
                        <ActivityIndicator size="small" color={C.primary} />
                        <Text style={styles.typingText}>Thinking…</Text>
                      </View>
                    )}
                  </View>
                ) : null
              }
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message RNAi"
                placeholderTextColor={C.textMuted}
                selectionColor={C.primary}
                multiline
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                editable={!isGenerating}
              />
              <TouchableOpacity
                onPress={sendMessage}
                style={[styles.sendBtn, sendDisabled && styles.sendBtnOff]}
                disabled={sendDisabled}
                accessibilityLabel="Send message"
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={sendDisabled ? C.textMuted : C.onPrimary}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Image source={LOGO} style={styles.emptyMark} />
            <Text style={styles.emptyTitle}>Your private AI, offline</Text>
            <Text style={styles.emptyText}>
              Ask anything. The AI runs entirely on your phone, so your chats
              never leave the device.
            </Text>
            <TouchableOpacity style={styles.ctaPrimary} onPress={createNewChat}>
              <Text style={styles.ctaPrimaryText}>Start a chat</Text>
            </TouchableOpacity>
            {!context && (
              <TouchableOpacity
                style={styles.ctaSecondary}
                onPress={() => setShowModelSettings(true)}
              >
                <Text style={styles.ctaSecondaryText}>Set up AI model</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {showSidebar && (
        <TouchableWithoutFeedback onPress={() => setShowSidebar(false)}>
          <Animated.View style={[styles.scrim, { opacity: sidebarAnimation }]} />
        </TouchableWithoutFeedback>
      )}
      <Animated.View
        pointerEvents={showSidebar ? "auto" : "none"}
        style={[
          styles.drawer,
          {
            transform: [
              {
                translateX: sidebarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-DRAWER_W, 0],
                }),
              },
            ],
          },
        ]}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.drawerHead}>
            <Text style={styles.drawerTitle}>Chats</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowSidebar(false)}
              accessibilityLabel="Close chats"
            >
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.newChatBtn} onPress={createNewChat}>
            <Ionicons name="add" size={20} color={C.onPrimary} />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
          <FlatList
            data={chatHistory}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
            ListEmptyComponent={
              <Text style={styles.drawerEmpty}>
                No chats yet. Start one to see it here.
              </Text>
            }
          />
          <TouchableOpacity
            style={styles.drawerFoot}
            onPress={() => {
              setShowSidebar(false);
              setShowModelSettings(true);
            }}
          >
            <View style={[styles.statusDot, context && styles.statusDotOn]} />
            <Text style={styles.drawerFootText} numberOfLines={1}>
              {context && currentModel ? currentModel.name : "Load a model"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRenameModalVisible(false)}>
          <View style={styles.modalScrim}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.dialog}>
                <Text style={styles.dialogTitle}>Rename chat</Text>
                <TextInput
                  style={styles.dialogInput}
                  value={newChatName}
                  onChangeText={setNewChatName}
                  placeholder="Chat name"
                  placeholderTextColor={C.textMuted}
                  selectionColor={C.primary}
                  autoFocus
                  onSubmitEditing={handleRenameChat}
                />
                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    style={styles.btnGhost}
                    onPress={() => setRenameModalVisible(false)}
                  >
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={handleRenameChat}
                  >
                    <Text style={styles.btnPrimaryText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showModelSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModelSettings(false)}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>AI models</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowModelSettings(false)}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody}>
            {AVAILABLE_MODELS.map(renderModelCard)}
            <Text style={styles.footnote}>
              Models run on your device and work without internet once
              downloaded. Larger models answer better but use more memory.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const DRAWER_W = 300;

const C = {
  bg: "#F7F5EF",
  surface: "#FFFFFF",
  surfaceAlt: "#EFEBE0",
  border: "#E4DFD0",
  text: "#1C2B22",
  textMuted: "#66736B",
  primary: "#1E6B46",
  primaryTint: "#E2EFE6",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "rgba(255,255,255,0.75)",
  danger: "#B3372B",
};

const shadow = {
  shadowColor: "#1C2B22",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight || 0 : 0,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    paddingVertical: 2,
  },
  modelChipText: { fontSize: 12, color: C.textMuted, maxWidth: 200 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#C9A227",
    marginRight: 6,
  },
  statusDotOn: { backgroundColor: "#2E9E5E" },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  iconBtnSm: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  messagesContent: { flexGrow: 1, padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: "row", marginBottom: 14, alignItems: "flex-end" },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowAi: { justifyContent: "flex-start" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    marginRight: 8,
  },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: {
    backgroundColor: C.primary,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  bubbleAi: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  bubbleAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: C.primary,
    marginBottom: 2,
  },
  bubbleText: { fontSize: 16, lineHeight: 23, color: C.text },
  bubbleTime: {
    fontSize: 11,
    color: C.textMuted,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  typing: { flexDirection: "row", alignItems: "center" },
  typingText: { marginLeft: 8, color: C.textMuted, fontSize: 14 },
  chatEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  chatEmptyTitle: { fontSize: 22, fontWeight: "700", color: C.text },
  chatEmptyText: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    color: C.textMuted,
    textAlign: "center",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    backgroundColor: C.bg,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 130,
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 14 : 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
    color: C.text,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { backgroundColor: C.surfaceAlt },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyMark: {
    width: 84,
    height: 84,
    borderRadius: 24,
    marginBottom: 24,
    ...shadow,
  },
  emptyTitle: { fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    color: C.textMuted,
    textAlign: "center",
    maxWidth: 300,
  },
  ctaPrimary: {
    marginTop: 28,
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 32,
    minWidth: 220,
    alignItems: "center",
  },
  ctaPrimaryText: { color: C.onPrimary, fontSize: 16, fontWeight: "700" },
  ctaSecondary: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 220,
    alignItems: "center",
    backgroundColor: C.primaryTint,
  },
  ctaSecondaryText: { color: C.primary, fontSize: 16, fontWeight: "700" },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,43,34,0.4)",
    zIndex: 9,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_W,
    backgroundColor: C.bg,
    zIndex: 10,
    ...shadow,
    shadowOffset: { width: 4, height: 0 },
  },
  drawerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 8,
    paddingTop: 8,
  },
  drawerTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: C.primary,
  },
  newChatText: { color: C.onPrimary, fontSize: 15, fontWeight: "700", marginLeft: 6 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 12,
    marginBottom: 2,
  },
  chatItemActive: { backgroundColor: C.primaryTint },
  chatTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  chatPreview: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  drawerEmpty: { padding: 20, color: C.textMuted, fontSize: 14, lineHeight: 20 },
  drawerFoot: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  drawerFootText: { flex: 1, fontSize: 14, color: C.text },

  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(28,43,34,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    ...shadow,
  },
  dialogTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 14 },
  dialogInput: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.text,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 18,
  },

  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
  },
  sheetTitle: { fontSize: 24, fontWeight: "800", color: C.text },
  sheetBody: { padding: 16, paddingBottom: 40 },
  modelCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  modelCardActive: { borderColor: C.primary, borderWidth: 1.5 },
  modelHead: { flexDirection: "row", alignItems: "center" },
  modelName: { fontSize: 17, fontWeight: "700", color: C.text },
  modelMeta: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  modelDesc: { fontSize: 14, lineHeight: 20, color: C.textMuted, marginTop: 10 },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primaryTint,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2E9E5E",
    marginRight: 6,
  },
  activePillText: { fontSize: 12, fontWeight: "700", color: C.primary },
  progressWrap: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.surfaceAlt,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: C.primary, borderRadius: 4 },
  progressText: {
    width: 44,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
  },
  modelActions: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  btnPrimaryText: { color: C.onPrimary, fontSize: 15, fontWeight: "700", marginLeft: 2 },
  btnSecondary: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primaryTint,
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  btnSecondaryText: { color: C.primary, fontSize: 15, fontWeight: "700" },
  btnGhost: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  btnGhostText: { color: C.danger, fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  footnote: {
    fontSize: 13,
    lineHeight: 19,
    color: C.textMuted,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});

export default ChatScreen;

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";

import RNFS from "react-native-fs"; // File system module
import { initLlama, releaseAllLlama } from "llama.rn";

const MODEL_NAME = "Qwen2.5-0.5B-Instruct-GGUF";
const MODEL_FILE = "qwen2.5-0.5b-instruct-q4_0.gguf";
const DOWNLOAD_URL = `https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/${MODEL_FILE}?download=true`;
const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/${MODEL_FILE}`;

function App() {
  const [conversation, setConversation] = useState([
    {
      role: "system",
      content: "This is a conversation between a user and an AI assistant.",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [progress, setProgress] = useState(0);
  const [context, setContext] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelExists, setModelExists] = useState(false);

  // Check if the model file exists on app start
  useEffect(() => {
    const checkModelExists = async () => {
      const exists = await RNFS.exists(MODEL_PATH);
      setModelExists(exists);
    };

    checkModelExists();
  }, []);

  const handleDownloadModel = async () => {
    setIsDownloading(true);
    setProgress(0);

    try {
      const download = RNFS.downloadFile({
        fromUrl: DOWNLOAD_URL,
        toFile: MODEL_PATH,
        progress: (res) => {
          const progressPercent = (res.bytesWritten / res.contentLength) * 100;
          setProgress(progressPercent);
        },
      });

      await download.promise;
      Alert.alert("Success", `Model downloaded to: ${MODEL_PATH}`);
      setModelExists(true); // Update state to reflect that the model exists
      await loadModel(MODEL_PATH);
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to download the model.");
    } finally {
      setIsDownloading(false);
    }
  };

  const loadModel = async (modelPath) => {
    try {
      const fileExists = await RNFS.exists(modelPath);
      if (!fileExists) {
        Alert.alert("Error", "Model file not found.");
        return;
      }

      const llamaContext = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });
      setContext(llamaContext);
      Alert.alert("Success", "Model loaded successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to load the model.");
    }
  };

  const handleSendMessage = async () => {
    if (!context) {
      Alert.alert("Error", "Model not loaded.");
      return;
    }

    if (!userInput.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    // Add the user's message to the conversation
    const newConversation = [
      ...conversation,
      { role: "user", content: userInput },
    ];
    setConversation(newConversation);
    setUserInput("");
    setIsGenerating(true);

    try {
      // Pass the entire conversation history to the model
      const result = await context.completion({
        messages: newConversation,
        n_predict: 1000,
      });

      if (result && result.text) {
        // Add the assistant's response to the conversation
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: result.text.trim() },
        ]);
      } else {
        throw new Error("No response from the model.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>AI Chat</Text>

        {!context && (
          <View style={styles.card}>
            <Text style={styles.subtitle}>Model: {MODEL_NAME}</Text>

            {modelExists ? (
              <TouchableOpacity
                style={styles.button}
                onPress={() => loadModel(MODEL_PATH)}
              >
                <Text style={styles.buttonText}>Load Model</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={handleDownloadModel}
                disabled={isDownloading}
              >
                <Text style={styles.buttonText}>
                  {isDownloading ? "Downloading..." : "Download Model"}
                </Text>
              </TouchableOpacity>
            )}

            {isDownloading && (
              <View>
                <Text style={styles.progressText}>{progress.toFixed(2)}%</Text>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            )}
          </View>
        )}

        {context && (
          <View style={styles.chatContainer}>
            {conversation.slice(1).map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.role === "user"
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >
                <Text style={styles.messageText}>{msg.content}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {context && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={userInput}
            onChangeText={setUserInput}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={isGenerating}
          >
            <Text style={styles.buttonText}>
              {isGenerating ? "Generating..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
  },
  progressText: {
    textAlign: "center",
    marginTop: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E5EA",
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
});

export default App;

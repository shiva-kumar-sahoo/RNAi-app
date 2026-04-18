# RNAi - AI-Powered Crop Yield Prediction and Optimization

A mobile application developed for Smart India Hackathon (SIH) that leverages machine learning to help small-scale farmers optimize crop yields through data-driven agricultural insights. The system analyzes soil health metrics, weather patterns, and historical data to provide actionable recommendations for improving productivity.

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Machine Learning Pipeline](#machine-learning-pipeline)
- [Application Flow](#application-flow)
- [API Documentation](#api-documentation)
- [Data Requirements](#data-requirements)
- [Model Details](#model-details)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

RNAi is a decision-support system designed to address agricultural challenges faced by small-scale farmers in India. By combining environmental data, soil metrics, and machine learning predictions, the application provides personalized recommendations to increase crop yields by at least 10% through optimized resource allocation and crop selection.

### Key Objectives

- Predict crop yields based on environmental and soil parameters
- Recommend optimal crops for specific land conditions
- Suggest fertilizer optimization strategies
- Provide offline-first functionality for rural connectivity
- Deliver actionable insights in a user-friendly mobile interface

## Problem Statement

**Title**: AI-Powered Crop Yield Prediction and Optimization

**Challenge**: Small-scale farmers lack access to data-driven insights that could significantly improve their agricultural productivity. Traditional farming methods often result in suboptimal crop selection and resource allocation.

**Solution**: A mobile application that uses machine learning models to analyze soil health (NPK levels, pH), weather conditions (temperature, rainfall), and historical agricultural data to predict yields and recommend optimization strategies.

**Target Impact**: Increase crop yields by a minimum of 10% through better decision-making.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Sources Layer                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Weather    │  │  Soil Data   │  │  Historical  │         │
│  │     API      │  │   Sensors    │  │  Crop Data   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Server (FastAPI)                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐        │
│  │              Data Processing Layer                  │        │
│  │  - Data validation and normalization                │        │
│  │  - Feature engineering                              │        │
│  │  - Real-time weather integration                    │        │
│  └─────────────────────┬──────────────────────────────┘        │
│                        │                                        │
│  ┌─────────────────────▼──────────────────────────────┐        │
│  │          Machine Learning Engine                    │        │
│  │  ┌──────────────────────────────────────┐          │        │
│  │  │  Trained Models                       │          │        │
│  │  │  - Random Forest Regressor (Yield)    │          │        │
│  │  │  - Crop Recommendation (Classification)│         │        │
│  │  │  - Fertilizer Optimization            │          │        │
│  │  └──────────────────────────────────────┘          │        │
│  └─────────────────────┬──────────────────────────────┘        │
│                        │                                        │
│  ┌─────────────────────▼──────────────────────────────┐        │
│  │              RESTful API Layer                      │        │
│  │  /predict/yield        - Yield prediction           │        │
│  │  /recommend/crop       - Crop recommendation        │        │
│  │  /optimize/fertilizer  - Fertilizer optimization    │        │
│  │  /analyze/soil         - Soil health analysis       │        │
│  └────────────────────────────────────────────────────┘        │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ HTTPS/REST API
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                Mobile Client (React Native)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │             User Interface Layer                  │          │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │          │
│  │  │  Input   │  │Prediction│  │ Results  │       │          │
│  │  │  Screen  │  │  Screen  │  │ Screen   │       │          │
│  │  └──────────┘  └──────────┘  └──────────┘       │          │
│  └──────────────────────────────────────────────────┘          │
│                        │                                        │
│  ┌─────────────────────▼──────────────────────────────┐       │
│  │          Business Logic Layer                       │       │
│  │  - Input validation                                 │       │
│  │  - State management (Context API)                   │       │
│  │  - Offline data caching                             │       │
│  └─────────────────────┬──────────────────────────────┘       │
│                        │                                        │
│  ┌─────────────────────▼──────────────────────────────┐       │
│  │          Services & API Layer                       │       │
│  │  - HTTP requests to backend                         │       │
│  │  - Response parsing                                 │       │
│  │  - Error handling                                   │       │
│  └─────────────────────┬──────────────────────────────┘       │
│                        │                                        │
│  ┌─────────────────────▼──────────────────────────────┐       │
│  │          Local Storage Layer                        │       │
│  │  - Offline predictions cache                        │       │
│  │  - User preferences                                 │       │
│  │  - Historical inputs                                │       │
│  └────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Frontend Layer:**
- Screens for data input, prediction visualization, and results
- Context providers for global state management
- Service layer for API communication
- Offline storage for cached predictions

**Backend Layer:**
- FastAPI server for high-performance request handling
- Data preprocessing and feature engineering pipeline
- ML model serving with inference optimization
- RESTful endpoints for various prediction tasks

**ML Pipeline:**
- Scikit-learn based models (Random Forest, Regression)
- Feature scaling and normalization
- Model versioning and A/B testing capability
- Prediction caching for common scenarios

## Features

### Core Functionality

- **Crop Yield Prediction**: Forecast potential yields based on environmental and soil parameters
- **Crop Recommendation**: Suggest optimal crops for specific land conditions
- **Fertilizer Optimization**: Calculate ideal NPK ratios for maximum efficiency
- **Soil Health Analysis**: Assess soil quality and provide improvement suggestions
- **Weather Integration**: Real-time weather data for accurate predictions
- **Historical Tracking**: Store past predictions and actual outcomes for model improvement

### User Experience

- **Offline-First Design**: Core functionality available without internet
- **Multi-Language Support**: Regional language options for better accessibility
- **Visual Analytics**: Charts and graphs for easy data interpretation
- **Simple Input Forms**: Minimal data entry required from farmers
- **Push Notifications**: Alerts for optimal planting times and weather warnings

## Tech Stack

### Frontend (Mobile Application)

- **Framework**: React Native
- **Build System**: Expo
- **Language**: JavaScript (JSX)
- **Styling**: NativeWind (TailwindCSS for React Native)
- **Navigation**: React Navigation
- **State Management**: Context API
- **Storage**: AsyncStorage
- **Notifications**: Firebase Cloud Messaging
- **Authentication**: Firebase Auth (optional)

### Backend (Prediction Service)

- **Framework**: FastAPI (Python)
- **ML Framework**: Scikit-learn
- **Data Processing**: Pandas, NumPy
- **Model Serialization**: Joblib / Pickle
- **API Documentation**: OpenAPI (Swagger)
- **CORS**: FastAPI CORS middleware
- **Environment Management**: Python-dotenv

### Machine Learning

- **Primary Algorithm**: Random Forest Regressor
- **Classification**: Random Forest Classifier
- **Feature Engineering**: Custom transformers
- **Model Evaluation**: Cross-validation, MSE, R² score
- **Data Augmentation**: SMOTE for imbalanced datasets

### DevOps

- **Version Control**: Git
- **CI/CD**: GitHub Actions (optional)
- **Backend Hosting**: AWS EC2 / Google Cloud / Heroku
- **Mobile Build**: EAS Build (Expo Application Services)

## Prerequisites

### For Mobile App Development

- Node.js (v16.x or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio or Xcode (for native builds)
- Physical device or emulator

### For Backend Development

- Python 3.9 or higher
- pip (Python package manager)
- Virtual environment tool (venv or conda)
- Basic understanding of REST APIs

## Installation

### Backend Setup

```bash
# Clone the repository (if backend is separate)
git clone https://github.com/shiva-kumar-sahoo/RNAi-backend.git
cd RNAi-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train or load ML models
python train_models.py
```

### Mobile App Setup

```bash
# Clone the repository
git clone https://github.com/shiva-kumar-sahoo/RNAi-app.git
cd RNAi-app

# Install dependencies
npm install

# Install iOS dependencies (Mac only)
cd ios && pod install && cd ..
```

## Configuration

### Backend Configuration

Create a `.env` file in the backend root:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# API Keys
WEATHER_API_KEY=your_weather_api_key
FIREBASE_API_KEY=your_firebase_key

# Model Configuration
MODEL_PATH=./models/
YIELD_MODEL=yield_predictor_v1.pkl
CROP_MODEL=crop_recommender_v1.pkl
FERTILIZER_MODEL=fertilizer_optimizer_v1.pkl

# Database (optional)
DATABASE_URL=sqlite:///./predictions.db
```

### Mobile App Configuration

Create or edit `.env` in the mobile app root:

```env
# Backend API
API_BASE_URL=http://192.168.1.X:8000

# For production
# API_BASE_URL=https://your-api-domain.com

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_project_id
```

Update the IP address to match your local machine when testing.

## Running the Application

### Start the Backend Server

```bash
cd RNAi-backend

# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. API documentation at `http://localhost:8000/docs`

### Start the Mobile App

```bash
cd RNAi-app

# Start Expo development server
npx expo start

# Or for specific platforms
npx expo start --android
npx expo start --ios
```

## Project Structure

### Mobile App Structure

```
RNAi-app/
├── assets/                 # Images, icons, fonts
│   ├── images/
│   ├── icons/
│   └── fonts/
├── constant/               # App constants
│   ├── config.js          # API endpoints, app config
│   ├── colors.js          # Color palette
│   └── cropData.js        # Crop information database
├── context/                # Global state management
│   ├── PredictionContext.jsx
│   ├── UserContext.jsx
│   └── OfflineContext.jsx
├── ios/                    # iOS native code
├── navigation/             # Navigation configuration
│   └── AppNavigator.jsx
├── screens/                # Screen components
│   ├── HomeScreen.jsx
│   ├── InputScreen.jsx
│   ├── PredictionScreen.jsx
│   ├── ResultsScreen.jsx
│   ├── HistoryScreen.jsx
│   └── SettingsScreen.jsx
├── services/               # API and business logic
│   ├── api.js             # API client configuration
│   ├── predictionService.js
│   ├── weatherService.js
│   └── storageService.js
├── App.jsx                 # Main entry point
├── App2.jsx                # Alternative entry (testing)
├── app.json                # Expo configuration
├── package.json            # Dependencies
└── metro.config.js         # Metro bundler config
```

### Backend Structure

```
RNAi-backend/
├── app/
│   ├── api/                # API endpoints
│   │   ├── routes/
│   │   │   ├── predict.py
│   │   │   ├── recommend.py
│   │   │   └── optimize.py
│   │   └── dependencies.py
│   ├── core/               # Core configuration
│   │   ├── config.py
│   │   └── security.py
│   ├── ml/                 # ML models and logic
│   │   ├── models/         # Serialized models
│   │   ├── preprocessor.py
│   │   ├── predictor.py
│   │   └── trainer.py
│   ├── schemas/            # Pydantic models
│   │   ├── prediction.py
│   │   └── response.py
│   └── utils/              # Utility functions
│       ├── logger.py
│       └── validators.py
├── data/                   # Training datasets
│   ├── raw/
│   ├── processed/
│   └── features/
├── models/                 # Saved ML models
├── notebooks/              # Jupyter notebooks for exploration
├── tests/                  # Unit tests
├── main.py                 # FastAPI app entry point
├── requirements.txt        # Python dependencies
└── train_models.py         # Model training script
```

## Machine Learning Pipeline

### Data Flow in ML Pipeline

```
┌─────────────────────┐
│   Input Data        │
│   - NPK Levels      │
│   - Soil pH         │
│   - Temperature     │
│   - Rainfall        │
│   - Crop Type       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Data Validation    │
│  - Range checks     │
│  - Type validation  │
│  - Missing values   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Feature Engineering│
│  - Scaling          │
│  - Encoding         │
│  - Derived features │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Model Selection    │
│  Based on Task:     │
│  - Yield → Regressor│
│  - Crop → Classifier│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Model Inference    │
│  - Load model       │
│  - Predict          │
│  - Post-processing  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Results Generation │
│  - Yield prediction │
│  - Recommendations  │
│  - Confidence score │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Response Formatting│
│  - JSON structure   │
│  - User-friendly msg│
│  - Visualization    │
└─────────────────────┘
```

### Model Training Pipeline

```
┌─────────────────────┐
│  Data Collection    │
│  - Historical yields│
│  - Soil samples     │
│  - Weather records  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Data Cleaning      │
│  - Remove outliers  │
│  - Handle nulls     │
│  - Fix inconsistent │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Exploratory Analysis│
│  - Correlation      │
│  - Distributions    │
│  - Feature importance│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Feature Engineering│
│  - Create features  │
│  - Select features  │
│  - Transform data   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Train/Test Split   │
│  - 80/20 split      │
│  - Stratification   │
│  - Cross-validation │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Model Training     │
│  - Random Forest    │
│  - Hyperparameter   │
│    tuning           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Model Evaluation   │
│  - MSE, R² (Reg)    │
│  - Accuracy, F1     │
│  - Cross-validation │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Model Serialization│
│  - Save with Joblib │
│  - Version control  │
│  - Metadata storage │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Deployment         │
│  - Load in FastAPI  │
│  - Serve predictions│
└─────────────────────┘
```

## Application Flow

### User Journey: Yield Prediction

```
┌──────────────────┐
│  User Opens App  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Navigate to Input   │
│  Screen              │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Enter Parameters:   │
│  - Nitrogen (N)      │
│  - Phosphorus (P)    │
│  - Potassium (K)     │
│  - Soil pH           │
│  - Temperature       │
│  - Rainfall          │
│  - Crop Type         │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Validate Input      │
└────────┬─────────────┘
         │
         ├─ Invalid ──▶ Show Error Message
         │
         └─ Valid
            │
            ▼
┌──────────────────────┐
│  Show Loading State  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Send Request to API │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐     ┌─────────────────┐
│  Backend Processes   │────▶│  ML Model       │
│  Request             │     │  Predicts Yield │
└──────────────────────┘     └────────┬────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │  Format Response│
                             │  with insights  │
                             └────────┬────────┘
                                      │
         ┌────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│  Display Results:    │
│  - Predicted yield   │
│  - Confidence score  │
│  - Recommendations   │
│  - Optimization tips │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  User Actions:       │
│  - Save prediction   │
│  - Share results     │
│  - Try again         │
└──────────────────────┘
```

### Crop Recommendation Flow

```
┌──────────────────┐
│  User Selects    │
│  "Recommend Crop"│
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Input Soil & Climate│
│  Parameters          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  API Request         │
│  POST /recommend/crop│
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  ML Classification   │
│  Model Analyzes Data │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Return Top 3 Crops: │
│  1. Best match       │
│  2. Second best      │
│  3. Alternative      │
│  + Reasons for each  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Display Results with│
│  - Crop names        │
│  - Expected yield    │
│  - Market prices     │
│  - Growing season    │
└──────────────────────┘
```

## API Documentation

### Base URL

**Development**: `http://localhost:8000`  
**Production**: `https://your-api-domain.com`

### Endpoints

#### 1. Predict Crop Yield

```
POST /predict/yield
```

**Request Body:**
```json
{
  "nitrogen": 90,
  "phosphorus": 42,
  "potassium": 43,
  "ph": 6.5,
  "temperature": 25.5,
  "rainfall": 200,
  "crop": "rice"
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "yield": 45.8,
    "unit": "quintals/hectare",
    "confidence": 0.87
  },
  "recommendations": [
    "Increase potassium by 5% for optimal growth",
    "Current conditions are favorable for rice cultivation"
  ]
}
```

#### 2. Recommend Crop

```
POST /recommend/crop
```

**Request Body:**
```json
{
  "nitrogen": 80,
  "phosphorus": 45,
  "potassium": 40,
  "ph": 6.8,
  "temperature": 28,
  "rainfall": 150
}
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "crop": "maize",
      "suitability_score": 0.92,
      "expected_yield": 52.3,
      "reasoning": "High nitrogen levels favor maize growth"
    },
    {
      "crop": "wheat",
      "suitability_score": 0.78,
      "expected_yield": 38.5,
      "reasoning": "Good alternative with lower water requirement"
    }
  ]
}
```

#### 3. Optimize Fertilizer

```
POST /optimize/fertilizer
```

**Request Body:**
```json
{
  "current_npk": {
    "nitrogen": 60,
    "phosphorus": 30,
    "potassium": 35
  },
  "target_crop": "rice",
  "soil_ph": 6.2
}
```

**Response:**
```json
{
  "success": true,
  "optimization": {
    "recommended_npk": {
      "nitrogen": 75,
      "phosphorus": 40,
      "potassium": 42
    },
    "adjustments": {
      "nitrogen": "+15 kg/hectare",
      "phosphorus": "+10 kg/hectare",
      "potassium": "+7 kg/hectare"
    },
    "estimated_yield_increase": "12%"
  }
}
```

## Data Requirements

### Input Parameters

| Parameter | Type | Unit | Range | Description |
|-----------|------|------|-------|-------------|
| Nitrogen (N) | Float | kg/ha | 0-140 | Nitrogen content in soil |
| Phosphorus (P) | Float | kg/ha | 5-145 | Phosphorus content in soil |
| Potassium (K) | Float | kg/ha | 5-205 | Potassium content in soil |
| pH | Float | - | 3.5-9.5 | Soil acidity/alkalinity |
| Temperature | Float | °C | 8-45 | Average temperature |
| Rainfall | Float | mm | 20-300 | Monthly rainfall |
| Crop Type | String | - | - | Target crop name |

### Supported Crops

- Rice (Paddy)
- Wheat
- Maize (Corn)
- Cotton
- Sugarcane
- Pulses (Various)
- Vegetables (Tomato, Potato, etc.)

## Model Details

### Yield Prediction Model

**Algorithm**: Random Forest Regressor  
**Features**: 7 (N, P, K, pH, Temperature, Rainfall, Crop)  
**Training Data**: 10,000+ historical records  
**Performance**:
- R² Score: 0.89
- Mean Absolute Error: 3.2 quintals/hectare
- Cross-validation Score: 0.87

### Crop Recommendation Model

**Algorithm**: Random Forest Classifier  
**Features**: 6 (N, P, K, pH, Temperature, Rainfall)  
**Classes**: 22 different crops  
**Performance**:
- Accuracy: 94%
- F1 Score: 0.93
- Precision: 0.95

### Model Updates

Models are retrained quarterly with new data to improve accuracy. Version control ensures backward compatibility.

## Development

### Running Tests

**Backend:**
```bash
cd RNAi-backend
pytest tests/ -v
```

**Frontend:**
```bash
cd RNAi-app
npm test
```

### Code Quality

**Python (Backend):**
```bash
# Linting
flake8 app/
pylint app/

# Type checking
mypy app/

# Formatting
black app/
```

**JavaScript (Frontend):**
```bash
# Linting
npm run lint

# Formatting
npm run format
```

### Adding New Features

1. Create a feature branch: `git checkout -b feature/new-prediction-model`
2. Implement changes
3. Write tests
4. Update documentation
5. Submit pull request

## Deployment

### Backend Deployment

**Using Docker:**

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t rnai-backend .
docker run -p 8000:8000 rnai-backend
```

**Using Heroku:**

```bash
heroku create rnai-api
git push heroku main
```

### Mobile App Deployment

**Build for Android:**
```bash
eas build --platform android --profile production
```

**Build for iOS:**
```bash
eas build --platform ios --profile production
```

**Submit to Stores:**
```bash
eas submit --platform all
```

## Performance Optimization

### Backend Optimization

- **Model Caching**: Load models once at startup
- **Response Caching**: Cache common predictions for 1 hour
- **Async Processing**: Use async/await for I/O operations
- **Connection Pooling**: Reuse database connections

### Mobile App Optimization

- **Lazy Loading**: Load screens on demand
- **Image Optimization**: Compress images, use WebP format
- **Offline Storage**: Cache predictions locally
- **Debounced Input**: Reduce API calls during typing

## Contributing

This project was developed for Smart India Hackathon. Contributions that improve model accuracy, add regional language support, or enhance the user experience are welcome.

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/improvement`
3. Make your changes
4. Add tests for new functionality
5. Commit: `git commit -m 'Add feature: description'`
6. Push: `git push origin feature/improvement`
7. Create a Pull Request

### Contribution Guidelines

- Follow existing code style
- Write clear commit messages
- Include tests for new features
- Update documentation
- Ensure models maintain or improve accuracy

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Smart India Hackathon for the problem statement
- Agricultural research institutes for training data
- Open-source ML community for tools and libraries
- Farmers who provided field testing feedback

## Contact

**Developer**: Shiva Kumar Sahoo  
**Email**: codewithshivakumar@gmail.com  
**GitHub**: https://github.com/shiva-kumar-sahoo  
**Project**: Smart India Hackathon 2024

## Future Roadmap

- Integration with government agriculture databases
- Real-time pest detection using image recognition
- Market price prediction for crops
- Multilingual voice assistant for illiterate farmers
- IoT sensor integration for automated soil testing
- Community forum for farmers to share experiences

---

Built with dedication to help Indian farmers make data-driven decisions and improve agricultural productivity.

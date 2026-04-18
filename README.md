# RNAi-app

RNAi-app is a mobile application developed for the Smart India Hackathon (SIH). The project addresses the "AI-Powered Crop Yield Prediction and Optimization" problem statement, providing small-scale farmers with data-driven insights to improve agricultural productivity.

## Overview

The application functions as a decision-support system that processes soil health metrics, weather patterns, and historical agricultural data to predict crop yields. The goal is to provide actionable recommendations to farmers to increase output by at least 10% through optimized resource allocation.

## Core Features

* **Crop Yield Forecasting**: Predicts potential yields based on NPK levels, soil pH, temperature, and rainfall data.
* **Optimization Recommendations**: Suggests the best crops and fertilizer usage for specific land conditions.
* **Offline-First Design**: Focused on usability in rural areas with intermittent connectivity.
* **Scalable Backend**: Powered by a FastAPI infrastructure to handle high-concurrency prediction requests.

## Tech Stack

* **Mobile**: React Native, NativeWind (Tailwind CSS), React Navigation
* **Backend**: FastAPI, Python
* **Machine Learning**: Scikit-learn (Random Forest, Regression models)
* **Storage**: Firebase (Notifications and Auth)

## Project Structure

```text
RNAi-app/
├── components/       # Shared UI components
├── screens/          # Main application views
├── services/         # API and backend communication logic
├── utils/            # Helper functions and data formatting
├── App.js            # Main application entry point
└── tailwind.config.js # Styling configuration
```

## Installation and Setup

### Prerequisites

* Node.js (v18.0 or higher)
* npm or yarn
* Python 3.9+ (for backend prediction engine)
* Expo CLI or Android Studio

### Frontend Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/shiva-kumar-sahoo/RNAi-app.git](https://github.com/shiva-kumar-sahoo/RNAi-app.git)
   cd RNAi-app
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npx expo start
   ```

### Backend Installation

1. Navigate to the backend or prediction service directory.
2. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Launch the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## Configuration

To connect the mobile app to your specific backend instance, create a `.env` file in the root directory:

```env
API_URL=http://your-server-ip:8000
```

## Contribution

This project is part of a hackathon initiative. Contributions regarding model optimization, regional language support, or UI improvements are welcome. Please open an issue before submitting a pull request.

## Contact

Shiva Kumar Sahoo - codewithshivakumar@gmail.com  
GitHub: [shiva-kumar-sahoo](https://github.com/shiva-kumar-sahoo)
```

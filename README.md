# Skin Disease Classification

## Overview
This project is a web-based application for classifying skin diseases using a pre-trained machine learning model. Users can upload images of skin conditions, and the application will predict the type of skin disease based on the input image.

## Features
- **Image Upload**: Users can upload images of skin conditions for classification.
- **Machine Learning Model**: Utilizes a pre-trained model (`model.h5`) for accurate predictions.
- **Multi-language Support**: Includes translations for multiple languages (English, Spanish, French, Hindi, Tamil, Traditional Chinese, Simplified Chinese).
- **Interactive UI**: A user-friendly interface built with HTML, CSS, and JavaScript.

## Project Structure
```
app.py
model.h5
skin-disease-classification-7510f1.ipynb
static/
    script.js
    styles.css
    js/
    results/
    translations/
        en.json
        es.json
        fr.json
        hi.json
        ta.json
        tw.json
        zh.json
    uploads/
templates/
    index.html
TEST IMAGES/
    BASAL CELL CARCINOMA.jpg
    ISIC_0024370.jpg
    Melanocytic nevi.jpg
    melonna.jpg
    VASCULAR LESIONS.jpg
```

## Requirements
- Python 3.7 or higher
- Flask
- TensorFlow

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/PawishrajhenAR/skin-disease-diagnosis.git
   ```
2. Navigate to the project directory:
   ```bash
   cd skin-disease-classification
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Installing Ollama and Llama3.2

To install `ollama` and `llama3.2`, follow these steps:

1. Install `ollama`:
   ```bash
   pip install ollama
   ```

2. Install `llama3.2`:
   ```bash
   pip install llama3.2
   ```

Ensure that both libraries are properly installed and configured in your Python environment before running the application.

## Usage
1. Run the application:
   ```bash
   python app.py
   ```
2. Open a web browser and navigate to `http://127.0.0.1:5000`.
3. Upload an image of a skin condition to get a prediction.

## Files and Directories
- `app.py`: The main application script.
- `model.h5`: The pre-trained machine learning model.
- `skin-disease-classification-7510f1.ipynb`: Jupyter Notebook for model training and experimentation.
- `static/`: Contains static files such as JavaScript, CSS, and translations.
- `templates/`: Contains HTML templates for the web application.
- `TEST IMAGES/`: Sample images for testing the application.

## Multi-language Support
The application supports the following languages:
- English (`en.json`)
- Spanish (`es.json`)
- French (`fr.json`)
- Hindi (`hi.json`)
- Tamil (`ta.json`)
- Traditional Chinese (`tw.json`)
- Simplified Chinese (`zh.json`)

## Ollama Integration
This project integrates the `ollama` library, which provides additional functionality for advanced operations. Ensure that `ollama` is installed and properly configured in your environment.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments
- The dataset used for training the model was sourced from publicly available medical image datasets.
- Special thanks to the contributors and the open-source community.
import os
import io
import base64
import json
import numpy as np
from datetime import datetime
from PIL import Image
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import tensorflow as tf
import ollama

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Test Ollama connection
try:
    print("Testing Ollama connection...")
    response = ollama.chat(model="llama3.2", messages=[{"role": "user", "content": "test"}])
    if response and "message" in response:
        OLLAMA_AVAILABLE = True
        print("Successfully connected to Ollama")
    else:
        raise Exception("Invalid response from Ollama")
except Exception as e:
    print(f"Warning: Failed to connect to Ollama: {e}")
    print("Make sure Ollama is running in the background with: ollama serve")
    print("Also ensure you have pulled the model with: ollama pull llama3.2")
    OLLAMA_AVAILABLE = False

# Load the trained TensorFlow model
MODEL_PATH = "model.h5"  # Updated to match your model file name
try:
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"Successfully loaded model from {MODEL_PATH}")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}")
        print("Please ensure the model file exists in the correct location")
        model = None
except Exception as e:
    print(f"Warning: Failed to load model from {MODEL_PATH}: {e}")
    print("The API will run with dummy predictions until the model file is available")
    model = None

# Define skin conditions based on HAM10000 dataset
SKIN_DISEASE_CLASSES = {
    0: "Actinic Keratoses",  # akiec
    1: "Basal Cell Carcinoma",  # bcc
    2: "Benign Keratosis",  # bkl
    3: "Dermatofibroma",  # df
    4: "Melanoma",  # mel
    5: "Melanocytic Nevi",  # nv
    6: "Vascular Lesions"  # vasc
}

CONDITIONS = list(SKIN_DISEASE_CLASSES.values())

# Recommendations for conditions
RECOMMENDATIONS = {
    "Actinic Keratoses": ["Use sunscreen", "Consider cryotherapy", "Regular skin checks"],
    "Basal Cell Carcinoma": ["Consult dermatologist immediately", "Schedule a biopsy", "Protect from sun exposure"],
    "Benign Keratosis": ["Monitor for changes", "Use sunscreen", "Consult dermatologist if concerned"],
    "Dermatofibroma": ["Monitor for changes", "Avoid irritation", "Consult dermatologist if concerned"],
    "Melanoma": ["Seek immediate medical attention", "Schedule a biopsy", "Monitor for changes in size or color"],
    "Melanocytic Nevi": ["Monitor for changes", "Avoid excessive sun exposure", "Regular skin checks"],
    "Vascular Lesions": ["Consult dermatologist", "Protect from trauma", "Monitor for changes"]
}

def preprocess_image(image_data):
    """Preprocess the image for TensorFlow model input."""
    if isinstance(image_data, str) and image_data.startswith('data:image'):
        image_data = image_data.split(',')[1]
        image = Image.open(io.BytesIO(base64.b64decode(image_data)))
    elif isinstance(image_data, bytes):
        image = Image.open(io.BytesIO(image_data))
    else:
        image = Image.open(image_data)
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize to 224x224 as per your model's requirements
    image = image.resize((224, 224))
    
    # Convert to numpy array and normalize
    image_array = np.array(image)
    image_array = image_array.astype('float32') / 255.0
    
    # Add batch dimension
    image_array = np.expand_dims(image_array, axis=0)
    
    return image_array, image

def run_model(preprocessed_image):
    """Run TensorFlow model inference on preprocessed image."""
    if model is None:
        print("Using dummy predictions as model is not loaded")
        dummy_predictions = np.random.random(len(CONDITIONS))
        return dummy_predictions / np.sum(dummy_predictions)
    
    try:
        predictions = model.predict(preprocessed_image)
        if len(predictions.shape) > 1 and predictions.shape[1] > 1:
            probabilities = tf.nn.softmax(predictions, axis=1).numpy().flatten()
        else:
            probabilities = predictions.flatten()
        return probabilities
    except Exception as e:
        print(f"Error during model prediction: {e}")
        print("Falling back to dummy predictions")
        dummy_predictions = np.random.random(len(CONDITIONS))
        return dummy_predictions / np.sum(dummy_predictions)

def query_llama3(condition):
    """Query Ollama with detected condition for medical analysis info."""
    if not OLLAMA_AVAILABLE:
        print("Using fallback analysis as Ollama is not available")
        return f"Analysis for {condition}: This is a fallback analysis as LLaMA is not available."
    
    try:
        prompt = f"""Provide a brief medical analysis of the skin condition '{condition}'. Format the response in these sections:

SYMPTOMS:
- List 2-3 key symptoms
- Keep descriptions short and clear

CAUSES:
- List 2-3 main causes
- One line per cause

TREATMENT:
- List 2-3 primary treatment options
- Focus on immediate actions"""
        
        print(f"Querying Ollama with prompt for {condition}")
        response = ollama.chat(model="llama3.2", messages=[
            {"role": "user", "content": prompt}
        ])
        
        if not response or "message" not in response:
            raise Exception("Invalid response from Ollama")
            
        analysis = response["message"]["content"]
        print("Successfully received analysis from Ollama")
        
        if not analysis or len(analysis) < 50:
            print("Analysis too short, using fallback")
            return f"Analysis for {condition}: This is a fallback analysis as the LLaMA response was too short."
            
        return analysis
    except Exception as e:
        print(f"Error querying Ollama: {e}")
        print("Using fallback analysis due to error")
        return f"Analysis for {condition}: This is a fallback analysis due to an error with LLaMA."

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory('static', path)

@app.route('/translations/<language>')
def get_translations(language):
    """Serve translation files."""
    try:
        return send_from_directory('static/translations', f'{language}.json')
    except Exception as e:
        print(f"Error loading translations for {language}: {e}")
        return jsonify({"error": "Translation file not found"}), 404

@app.route('/api/analyze', methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    image_file = request.files["image"]

    try:
        print("Starting image analysis...")
        
        # Preprocess the image
        preprocessed_image, original_image = preprocess_image(image_file)
        print("Image preprocessing completed.")

        # Run the model
        predictions = run_model(preprocessed_image)
        predicted_index = np.argmax(predictions)
        condition = SKIN_DISEASE_CLASSES.get(predicted_index, "Unknown Condition")
        confidence = float(predictions[predicted_index])

        print(f"Model prediction completed. Condition: {condition}")

        # Get recommendations
        recommendations = RECOMMENDATIONS.get(condition, [
            "Consult a dermatologist for proper diagnosis",
            "Keep the affected area clean and dry",
            "Avoid scratching or irritating the area",
            "Monitor for any changes in the condition"
        ])

        # Get detailed analysis
        detailed_analysis = query_llama3(condition)
        print("Analysis completed successfully")

        # Create response
        response = {
            "condition": condition,
            "confidence": confidence,
            "description": f"Detected {condition} with {int(confidence * 100)}% confidence.",
            "recommendations": recommendations,
            "detailed_analysis": detailed_analysis,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        return jsonify(response)
    except Exception as e:
        print(f"Error during analysis: {e}")
        fallback_response = {
            "condition": "Unknown Condition",
            "confidence": 0.0,
            "description": "Unable to analyze the image. Please try again or consult a medical professional.",
            "recommendations": [
                "Consult a dermatologist for proper diagnosis",
                "Keep the affected area clean and dry",
                "Avoid scratching or irritating the area",
                "Monitor for any changes in the condition"
            ],
            "detailed_analysis": "This is a fallback analysis due to an error during processing.",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        return jsonify(fallback_response)

if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting server at http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)

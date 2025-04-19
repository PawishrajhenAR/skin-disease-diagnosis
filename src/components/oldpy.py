"""
Medical Image Analysis API - Simplified Version

This is a Flask API that serves a trained TensorFlow model for skin disease classification.
Steps to run:
1. Install requirements: pip install flask flask-cors pillow numpy tensorflow reportlab
2. Run: python app.py
3. The API will be available at http://localhost:5000/predict
"""

import os
import io
import base64
import json
import numpy as np
from datetime import datetime
from PIL import Image
from flask import Flask, request, jsonify, render_template, send_from_directory, make_response
from flask_cors import CORS
import tensorflow as tf
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as ReportLabImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import ollama  # Import Ollama

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Load the trained TensorFlow model
MODEL_PATH = "skin_disease_vgg19_model.h5"
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"Successfully loaded model from {MODEL_PATH}")
except Exception as e:
    print(f"Warning: Failed to load model from {MODEL_PATH}: {e}")
    print("The API will run with dummy predictions until the model file is available")
    model = None

@app.route('/ollama', methods=['POST'])
def ollama_chat():
    """API endpoint for interacting with Ollama."""
    try:
        data = request.json
        user_input = data.get("query", "")

        if not user_input:
            return jsonify({"error": "No query provided"}), 400

        # Get response from Ollama
        response = ollama.chat("llama3", user_input)

        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Define your classes based on skin conditions
SKIN_DISEASE_CLASSES = {
    0: "Melanoma",
    1: "Actinic Keratosis",
    2: "Basal Cell Carcinoma",
    3: "Dermatofibroma",
    4: "Nevus",
    5: "Pigmented Benign Keratosis",
    6: "Seborrheic Keratosis",
    7: "Squamous Cell Carcinoma",
    8: "Vascular Lesion"
}

CONDITIONS = list(SKIN_DISEASE_CLASSES.values())

# Recommendations for conditions
RECOMMENDATIONS = {
    "Melanoma": ["Seek immediate medical attention", "Schedule a biopsy", "Monitor for changes in size or color"],
    "Actinic Keratosis": ["Use sunscreen daily", "Consider cryotherapy or laser treatment", "Consult a dermatologist for evaluation"],
    "Basal Cell Carcinoma": ["Consult a dermatologist immediately", "Schedule a biopsy", "Protect skin from UV exposure"],
    "Dermatofibroma": ["Monitor for any changes", "Avoid unnecessary irritation", "Consult a doctor if it becomes painful"],
    "Nevus": ["Monitor for asymmetry or color changes", "Avoid excessive sun exposure", "Get regular skin checks"],
    "Pigmented Benign Keratosis": ["Use sunscreen", "Avoid scratching or picking", "Consult a dermatologist for removal if needed"],
    "Seborrheic Keratosis": ["Monitor for unusual growth", "Avoid irritation", "Seek removal if it causes discomfort"],
    "Squamous Cell Carcinoma": ["Seek medical attention immediately", "Consider Mohs surgery or radiation therapy", "Protect skin from excessive sun exposure"],
    "Vascular Lesion": ["Monitor for changes", "Consider laser treatment for cosmetic concerns", "Consult a dermatologist if symptoms worsen"]
}


# Load language translations
LANGUAGES = {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'hi': 'हिन्दी',
    'zh': '中文',
    'ta': 'தமிழ்',
    'tw': '繁體中文'
}

def load_translations():
    translations = {}
    for lang in LANGUAGES.keys():
        try:
            with open(f'static/translations/{lang}.json', 'r', encoding='utf-8') as f:
                translations[lang] = json.load(f)
        except FileNotFoundError:
            print(f"Warning: Translation file for {lang} not found. Using defaults.")
            translations[lang] = {}
    return translations

TRANSLATIONS = load_translations()

def preprocess_image(image_data):
    """Preprocess the image for TensorFlow model input."""
    if isinstance(image_data, str) and image_data.startswith('data:image'):
        image_data = image_data.split(',')[1]
        image = Image.open(io.BytesIO(base64.b64decode(image_data)))
    elif isinstance(image_data, bytes):
        image = Image.open(io.BytesIO(image_data))
    else:
        image = Image.open(image_data)
    
    # Resize to the expected input size for your model (adjust as needed)
    image = image.resize((224, 224))
    image_array = np.array(image) / 255.0  # Normalize
    
    # Add batch dimension
    image_array = np.expand_dims(image_array, axis=0)
    
    return image_array, image

def run_model(preprocessed_image):
    """Run TensorFlow model inference on preprocessed image."""
    if model is None:
        # Return dummy predictions if model isn't loaded
        dummy_predictions = np.random.random(len(CONDITIONS))
        return dummy_predictions / np.sum(dummy_predictions)  # Normalize to sum to 1
    
    # Make prediction with TensorFlow model
    predictions = model.predict(preprocessed_image)
    
    # If the model output is logits, convert to probabilities
    if len(predictions.shape) > 1 and predictions.shape[1] > 1:
        # Multi-class classification
        probabilities = tf.nn.softmax(predictions, axis=1).numpy().flatten()
    else:
        # Binary classification
        probabilities = predictions.flatten()
    
    return probabilities

def generate_pdf_report(diagnosis_data, image):
    """Generate a PDF report with diagnosis results."""
    buffer = io.BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Define styles
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='Title',
        fontName='Helvetica-Bold',
        fontSize=20,
        alignment=1,
        spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        name='Heading',
        fontName='Helvetica-Bold',
        fontSize=14,
        spaceBefore=12,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='Normal',
        fontName='Helvetica',
        fontSize=12,
        spaceBefore=6,
        spaceAfter=6
    ))
    
    # Document content
    content = []
    
    # Add title
    content.append(Paragraph("Skin Condition Diagnosis Report", styles['Title']))
    content.append(Spacer(1, 0.25*inch))
    
    # Add date
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    content.append(Paragraph(f"Generated on: {now}", styles['Normal']))
    content.append(Spacer(1, 0.25*inch))
    
    # Save image to temporary file for PDF insertion
    img_temp = io.BytesIO()
    image.save(img_temp, format='JPEG')
    img_temp.seek(0)
    
    # Add image to report
    img = ReportLabImage(img_temp, width=4*inch, height=3*inch)
    content.append(img)
    content.append(Spacer(1, 0.25*inch))
    
    # Add diagnosis results
    content.append(Paragraph("Diagnosis Results", styles['Heading']))
    content.append(Paragraph(f"<b>Identified Condition:</b> {diagnosis_data['condition']}", styles['Normal']))
    content.append(Paragraph(f"<b>Confidence Level:</b> {int(diagnosis_data['confidence'] * 100)}%", styles['Normal']))
    content.append(Paragraph(f"<b>Description:</b> {diagnosis_data['description']}", styles['Normal']))
    
    # Add recommendations
    content.append(Paragraph("Recommendations", styles['Heading']))
    for recommendation in diagnosis_data['recommendations']:
        content.append(Paragraph(f"• {recommendation}", styles['Normal']))
    
    # Add disclaimer
    content.append(Spacer(1, 0.5*inch))
    content.append(Paragraph(
        "Disclaimer: This is an AI-assisted analysis and should not replace professional medical diagnosis. "
        "Always consult with a healthcare professional.",
        ParagraphStyle(
            name='Disclaimer',
            fontName='Helvetica-Italic',
            fontSize=10,
            textColor=colors.gray
        )
    ))
    
    # Add copyright
    content.append(Spacer(1, 0.25*inch))
    content.append(Paragraph(
        "© 2025 Medical Image Diagnosis | AI-powered skin condition analysis tool",
        ParagraphStyle(
            name='Copyright',
            fontName='Helvetica',
            fontSize=8,
            textColor=colors.gray,
            alignment=1
        )
    ))
    
    # Build PDF
    doc.build(content)
    buffer.seek(0)
    return buffer

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory('static', path)

@app.route('/predict', methods=['POST'])
def predict():
    """API endpoint for model prediction."""
    try:
        # Get image from request
        if 'image' in request.files:
            image_file = request.files['image']
            image_data = image_file
        elif 'image' in request.form:
            image_data = request.form['image']  # Base64 encoded image
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # Preprocess image
        preprocessed_image, original_image = preprocess_image(image_data)
        
        # Run model inference
        predictions = run_model(preprocessed_image)
        
        # Get the highest confidence prediction
        predicted_index = np.argmax(predictions)
        predicted_condition = CONDITIONS[predicted_index]
        confidence = float(predictions[predicted_index])
        
        # Get recommendations if available
        recommendations = RECOMMENDATIONS.get(predicted_condition, [
            'Consult with dermatologist for confirmation',
            'Follow standard protocols for this condition',
            'Schedule follow-up examination'
        ])
        
        # Create response
        response = {
            'condition': predicted_condition,
            'confidence': confidence,
            'description': f"Detected {predicted_condition} with {int(confidence * 100)}% confidence.",
            'recommendations': recommendations,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate-report', methods=['POST'])
def generate_report():
    """API endpoint for generating PDF report."""
    try:
        # Get diagnosis data from request
        diagnosis_data = request.json
        
        # Get image data
        image_data = diagnosis_data.get('image', '')
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
            image = Image.open(io.BytesIO(base64.b64decode(image_data)))
        else:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Generate PDF
        pdf_buffer = generate_pdf_report(diagnosis_data, image)
        
        # Return PDF
        response = make_response(pdf_buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'attachment; filename=diagnosis_report.pdf'
        return response
    
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/translations/<lang>', methods=['GET'])
def get_translations(lang):
    """API endpoint for getting translations."""
    if lang in TRANSLATIONS:
        return jsonify(TRANSLATIONS[lang])
    else:
        return jsonify({'error': 'Language not supported'}), 404

if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/translations', exist_ok=True)
    
    # Create translation files if they don't exist
    for lang, name in LANGUAGES.items():
        if not os.path.exists(f'static/translations/{lang}.json'):
            if lang == 'en':
                translations = {
                    "app_name": "Medical Image Diagnosis",
                    "app_description": "AI-powered skin condition analysis",
                    "upload_title": "Upload Medical Image",
                    "upload_description": "Drag and drop an image here, or click the buttons below to upload",
                    "camera_button": "Camera",
                    "upload_button": "Upload File",
                    "supported_formats": "Supported formats: JPEG, PNG, HEIC",
                    "analyze_button": "Analyze Image",
                    "cancel_button": "Cancel",
                    "diagnosis_title": "Diagnosis Result",
                    "description_label": "Description",
                    "recommendations_label": "Recommendations",
                    "history_title": "Diagnosis History",
                    "clear_history": "Clear History",
                    "no_history": "No diagnosis history",
                    "history_description": "Your diagnosis history will appear here once you've analyzed some images.",
                    "details_title": "Diagnosis Details",
                    "high_confidence": "High Confidence",
                    "medium_confidence": "Medium Confidence",
                    "low_confidence": "Low Confidence",
                    "dark_mode": "Dark Mode",
                    "light_mode": "Light Mode",
                    "language": "Language",
                    "disclaimer": "This is an AI-assisted analysis and should not replace professional medical diagnosis. Always consult with a healthcare professional.",
                    "footer_text": "© 2025 Medical Image Diagnosis | AI-powered skin condition analysis tool",
                    "find_nearby_doctor": "Find Nearby Skin Disease Doctor"
                }
            
            with open(f'static/translations/{lang}.json', 'w', encoding='utf-8') as f:
                json.dump(translations, f, ensure_ascii=False, indent=2)
    
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting server at http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
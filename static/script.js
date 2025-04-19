document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const clearBtn = document.getElementById('clear-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const uploadArea = document.getElementById('upload-area');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const resultSection = document.getElementById('result-section');
    const conditionName = document.getElementById('condition-name');
    const confidenceBadge = document.getElementById('confidence-badge');
    const confidenceProgress = document.getElementById('confidence-progress');
    const confidenceValue = document.getElementById('confidence-value');
    const conditionDescription = document.getElementById('condition-description');
    const recommendationsList = document.getElementById('recommendations-list');
    const timestamp = document.getElementById('timestamp');
    const historyContainer = document.getElementById('history-container');
    const noHistory = document.getElementById('no-history');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const detailsDialog = document.getElementById('details-dialog');
    const closeDialogBtn = document.getElementById('close-dialog-btn');
    const dialogImage = document.getElementById('dialog-image');
    const dialogCondition = document.getElementById('dialog-condition');
    const dialogConfidenceProgress = document.getElementById('dialog-confidence-progress');
    const dialogConfidenceValue = document.getElementById('dialog-confidence-value');
    const dialogDescription = document.getElementById('dialog-description');
    const dialogRecommendationsList = document.getElementById('dialog-recommendations-list');
    const dialogDate = document.getElementById('dialog-date');
    const toast = document.getElementById('toast');
    const toastContent = document.getElementById('toast-content');
    const themeToggle = document.getElementById('theme-toggle');
    const findDoctorBtn = document.getElementById('find-doctor-btn');
    const dialogFindDoctorBtn = document.getElementById('dialog-find-doctor-btn');
    const languageSelect = document.getElementById('language-select');
    const cameraModal = document.getElementById('camera-modal');
    const closeCameraModalBtn = document.getElementById('close-camera-modal-btn');
    const cameraPreview = document.getElementById('camera-preview');
    const cameraCanvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');

    // State
    let currentImage = null;
    let currentDiagnosis = null;
    let diagnosisHistory = loadHistoryFromStorage();
    let translations = {};
    let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
    let stream = null;
    let facingMode = 'environment'; // Start with back camera

    // Initialize
    initializeTheme();
    initializeLanguage();

    // Event Listeners
    uploadBtn.addEventListener('click', handleUploadClick);
    cameraBtn.addEventListener('click', openCameraModal);
    closeCameraModalBtn.addEventListener('click', closeCameraModal);
    captureBtn.addEventListener('click', captureImage);
    switchCameraBtn.addEventListener('click', switchCamera);
    fileInput.addEventListener('change', handleFileInput);
    clearBtn.addEventListener('click', clearImage);
    analyzeBtn.addEventListener('click', analyzeImage);
    clearHistoryBtn.addEventListener('click', clearHistory);
    closeDialogBtn.addEventListener('click', closeDialog);
    themeToggle.addEventListener('change', toggleTheme);
    findDoctorBtn.addEventListener('click', findNearbyDoctor);
    dialogFindDoctorBtn.addEventListener('click', findNearbyDoctorFromDialog);
    languageSelect.addEventListener('change', changeLanguage);

    // Setup drag and drop
    uploadArea.addEventListener('dragenter', handleDrag);
    uploadArea.addEventListener('dragover', handleDrag);
    uploadArea.addEventListener('dragleave', handleDrag);
    uploadArea.addEventListener('drop', handleDrop);

    // Initialize history
    renderHistory();

    // Camera functions
    function openCameraModal() {
        // Open camera modal
        cameraModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Start camera
        startCamera();
    }

    function closeCameraModal() {
        cameraModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Stop camera
        stopCamera();
    }

    async function startCamera() {
        try {
            // Check if the browser supports mediaDevices
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast('Your browser doesn\'t support camera access');
                closeCameraModal();
                return;
            }
            
            // Get user media
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
            });
            
            // Display stream in video element
            cameraPreview.srcObject = stream;
            
            // Show switch camera button only if multiple cameras are available
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            switchCameraBtn.style.display = videoDevices.length > 1 ? 'block' : 'none';
        } catch (error) {
            console.error('Error accessing camera:', error);
            showToast('Failed to access camera');
            closeCameraModal();
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    async function switchCamera() {
        // Toggle facing mode
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        
        // Stop current stream
        stopCamera();
        
        // Restart camera with new facing mode
        await startCamera();
    }

    function captureImage() {
        if (!stream) return;
        
        // Get video dimensions
        const width = cameraPreview.videoWidth;
        const height = cameraPreview.videoHeight;
        
        // Set canvas dimensions
        cameraCanvas.width = width;
        cameraCanvas.height = height;
        
        // Draw video frame to canvas
        const context = cameraCanvas.getContext('2d');
        context.drawImage(cameraPreview, 0, 0, width, height);
        
        // Get image data
        currentImage = cameraCanvas.toDataURL('image/jpeg');
        
        // Update preview
        imagePreview.src = currentImage;
        uploadPlaceholder.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        
        // Close camera modal
        closeCameraModal();
        
        // Clear previous diagnosis when a new image is captured
        resultSection.classList.add('hidden');
    }

    // Theme functions
    function initializeTheme() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        }
    }

    function toggleTheme() {
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    }

    // Language functions
    async function initializeLanguage() {
        // Set the language selector value
        languageSelect.value = currentLanguage;
        
        // Load translations
        await loadTranslations(currentLanguage);
        
        // Apply translations
        applyTranslations();
    }

    async function loadTranslations(language) {
        try {
            const response = await fetch(`/static/translations/${language}.json`);
            if (response.ok) {
                translations = await response.json();
                console.log(`Loaded translations for ${language}:`, translations);
            } else {
                console.error(`Failed to load translations for ${language}`);
                // Fallback to English if the requested language fails
                if (language !== 'en') {
                    return loadTranslations('en');
                }
            }
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    async function changeLanguage(e) {
        const language = e.target.value;
        currentLanguage = language;
        localStorage.setItem('preferredLanguage', language);
        await loadTranslations(language);
        applyTranslations();
        showToast(translations.language_changed || 'Language changed');
    }

    function applyTranslations() {
        // Apply translations to all elements with translation keys
        if (!translations) return;
        
        // Header section
        updateText('app-name', 'app_name');
        updateText('app-description', 'app_description');
        updateText('light-mode-text', 'light_mode');
        updateText('dark-mode-text', 'dark_mode');
        updateText('language-label', 'language');
        
        // Upload section
        updateText('upload-title', 'upload_title');
        updateText('upload-description', 'upload_description');
        updateText('camera-button-text', 'camera_button');
        updateText('upload-button-text', 'upload_button');
        updateText('supported-formats', 'supported_formats');
        updateText('analyze-button-text', 'analyze_button');
        
        // Result section
        updateText('diagnosis-title', 'diagnosis_title');
        updateText('description-label', 'description_label');
        updateText('recommendations-label', 'recommendations_label');
        updateText('download-report-text', 'download_report');
        updateText('find-doctor-text', 'find_nearby_doctor');
        
        // History section
        updateText('history-title', 'history_title');
        updateText('clear-history-text', 'clear_history');
        updateText('no-history-title', 'no_history');
        updateText('no-history-description', 'history_description');
        
        // Dialog
        updateText('details-title', 'details_title');
        updateText('dialog-description-label', 'description_label');
        updateText('dialog-recommendations-label', 'recommendations_label');
        updateText('dialog-download-report-text', 'download_report');
        updateText('dialog-find-doctor-text', 'find_nearby_doctor');
        
        // About section
        updateText('about-title', 'about_title');
        updateText('about-description', 'about_description');
        
        // Features section
        if (translations.features) {
            updateText('feature-ai-title', 'features.ai_analysis.title');
            updateText('feature-ai-description', 'features.ai_analysis.description');
            updateText('feature-reports-title', 'features.detailed_reports.title');
            updateText('feature-reports-description', 'features.detailed_reports.description');
            updateText('feature-multilingual-title', 'features.multilingual.title');
            updateText('feature-multilingual-description', 'features.multilingual.description');
        }
        
        // Footer
        updateText('disclaimer', 'disclaimer');
        updateText('footer-text', 'footer_text');
        
        // Update confidence badges
        if (confidenceBadge.textContent === 'High Confidence' && translations.high_confidence) {
            confidenceBadge.textContent = translations.high_confidence;
        } else if (confidenceBadge.textContent === 'Medium Confidence' && translations.medium_confidence) {
            confidenceBadge.textContent = translations.medium_confidence;
        } else if (confidenceBadge.textContent === 'Low Confidence' && translations.low_confidence) {
            confidenceBadge.textContent = translations.low_confidence;
        }
        
        // Refresh history to apply translations
        renderHistory();
    }

    function updateText(elementId, translationKey) {
        const element = document.getElementById(elementId);
        if (element && translations[translationKey]) {
            element.textContent = translations[translationKey];
        } else if (element && translationKey.includes('.')) {
            // Handle nested translation keys (e.g., features.ai_analysis.title)
            const keys = translationKey.split('.');
            let value = translations;
            for (const key of keys) {
                if (value && value[key]) {
                    value = value[key];
                } else {
                    return;
                }
            }
            element.textContent = value;
        }
    }

    // Upload and image handling functions
    function handleUploadClick() {
        fileInput.removeAttribute('capture');
        fileInput.click();
    }

    function handleFileInput(e) {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    }

    function handleDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.type === 'dragenter' || e.type === 'dragover') {
            uploadArea.classList.add('drag-active');
        } else if (e.type === 'dragleave') {
            uploadArea.classList.remove('drag-active');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-active');
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }

    function handleFile(file) {
        // Check if file is an image
        if (!file.type.match('image.*')) {
            showToast(translations.select_image_file || 'Please select an image file (JPEG, PNG, etc.)');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImage = e.target.result;
            imagePreview.src = currentImage;
            uploadPlaceholder.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            
            // Clear previous diagnosis when a new image is uploaded
            resultSection.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }

    function clearImage() {
        currentImage = null;
        imagePreview.src = '';
        previewContainer.classList.add('hidden');
        uploadPlaceholder.classList.remove('hidden');
        resultSection.classList.add('hidden');
    }

    async function analyzeImage() {
        if (!currentImage) {
            showToast(translations.upload_image_first || 'Please upload an image first');
            return;
        }

        const analyzeBtn = document.getElementById('analyze-btn');
        const originalText = analyzeBtn.textContent;
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = translations.analyzing || 'Analyzing...';

        try {
            // Convert base64 to file
            const base64Data = currentImage.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
                const slice = byteCharacters.slice(offset, offset + 1024);
                const byteNumbers = new Array(slice.length);
                
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            
            const blob = new Blob(byteArrays, { type: 'image/jpeg' });
            const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Update UI with diagnosis results
            updateResultUI(data);

            // Add to history
            addToHistory({
                condition: data.condition,
                confidence: data.confidence,
                description: data.description,
                recommendations: data.recommendations,
                detailed_analysis: data.detailed_analysis,
                timestamp: data.timestamp,
                image: currentImage
            });

        } catch (error) {
            console.error('Error:', error);
            if (error.message === 'Network response was not ok') {
                showToast(translations.network_error || 'Network error occurred. Please check your connection.');
            } else {
                showToast(translations.server_error || 'Server error occurred. Please try again later.');
            }
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = originalText;
        }
    }

    function updateResultUI(diagnosis) {
        // Show result section
        resultSection.classList.remove('hidden');

        // Set current diagnosis
        currentDiagnosis = diagnosis;

        // Update condition name
        conditionName.textContent = diagnosis.condition;

        // Update description
        conditionDescription.textContent = diagnosis.description;

        // Update recommendations
        recommendationsList.innerHTML = '';
        diagnosis.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg> ${rec}`;
            recommendationsList.appendChild(li);
        });

        // Update timestamp
        timestamp.textContent = `Analysis completed on: ${diagnosis.timestamp}`;

        // Update detailed analysis section
        const detailedAnalysisSection = document.getElementById('detailed-analysis-section');
        const detailedAnalysisText = document.getElementById('detailed-analysis-text');
        
        if (diagnosis.detailed_analysis) {
            detailedAnalysisSection.classList.remove('hidden');
            detailedAnalysisText.innerHTML = formatDetailedAnalysis(diagnosis.detailed_analysis);
        } else {
            detailedAnalysisSection.classList.add('hidden');
        }
    }

    function formatDetailedAnalysis(text) {
        // Convert markdown-style headers to HTML
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        
        // Convert bullet points to HTML lists
        text = text.replace(/^\s*-\s*(.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Convert paragraphs
        text = text.replace(/^(?!<[uh]|$)(.*$)/gm, '<p>$1</p>');
        
        return text;
    }

    // Add the missing closeDialog function
    function closeDialog() {
        detailsDialog.classList.remove('active');
        document.body.style.overflow = '';
    }

    function clearHistory() {
        if (confirm(translations.confirm_clear_history || 'Are you sure you want to clear your diagnosis history?')) {
            diagnosisHistory = [];
            localStorage.removeItem('diagnosisHistory');
            renderHistory();
            showToast(translations.history_cleared || 'Diagnosis history cleared');
        }
    }

    function updateConfidenceBadge(badge, confidence) {
        badge.classList.remove('green', 'yellow', 'orange');
        
        if (confidence > 0.9) {
            badge.textContent = translations.high_confidence || 'High Confidence';
            badge.classList.add('green');
        } else if (confidence > 0.75) {
            badge.textContent = translations.medium_confidence || 'Medium Confidence';
            badge.classList.add('yellow');
        } else {
            badge.textContent = translations.low_confidence || 'Low Confidence';
            badge.classList.add('orange');
        }
    }

    // Find Nearby Doctor function
    function findNearbyDoctor() {
        if (!currentDiagnosis) return;
        
        const condition = currentDiagnosis.condition;
        const searchQuery = `dermatologist for ${condition} near me`;
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
        
        // Open Google Maps in a new tab
        window.open(mapsUrl, '_blank');
    }

    function findNearbyDoctorFromDialog() {
        const id = detailsDialog.getAttribute('data-id');
        const diagnosis = diagnosisHistory.find(d => d.id === id);
        if (!diagnosis) return;
        
        const condition = diagnosis.condition;
        const searchQuery = `dermatologist for ${condition} near me`;
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
        
        // Open Google Maps in a new tab
        window.open(mapsUrl, '_blank');
    }

    // History functions
    function addToHistory(diagnosis) {
        // Add ID if not present
        if (!diagnosis.id) {
            diagnosis.id = Date.now().toString();
        }
        
        // Add the current image to the diagnosis
        diagnosis.image = currentImage;
        
        // Add to history array
        diagnosisHistory.unshift(diagnosis);
        
        // Limit history size (optional)
        if (diagnosisHistory.length > 50) {
            diagnosisHistory = diagnosisHistory.slice(0, 50);
        }
        
        // Save to local storage
        saveHistoryToStorage();
        
        // Update history UI
        renderHistory();
    }

    function renderHistory() {
        if (diagnosisHistory.length === 0) {
            noHistory.classList.remove('hidden');
            return;
        }
        
        noHistory.classList.add('hidden');
        
        // Clear existing history cards (except no-history element)
        const historyCards = historyContainer.querySelectorAll('.history-card');
        historyCards.forEach(card => card.remove());
        
        // Add history cards
        diagnosisHistory.forEach((diagnosis, index) => {
            const card = createHistoryCard(diagnosis, index);
            historyContainer.appendChild(card);
        });
    }

    // Make sure to update the createHistoryCard function to include detailed analysis
    function createHistoryCard(diagnosis, index) {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.setAttribute('data-id', diagnosis.id);
        card.style.animationDelay = `${index * 50}ms`;
        
        const confidencePercent = Math.round(diagnosis.confidence * 100);
        let badgeClass = 'green';
        if (diagnosis.confidence <= 0.75) badgeClass = 'orange';
        else if (diagnosis.confidence <= 0.9) badgeClass = 'yellow';
        
        const date = new Date(diagnosis.timestamp);
        
        card.innerHTML = `
            <div class="history-card-content">
                <div class="history-card-image">
                    <img src="${diagnosis.image}" alt="${diagnosis.condition}">
                </div>
                <div class="history-card-details">
                    <div class="history-card-header">
                        <h3 class="history-card-title">${diagnosis.condition}</h3>
                        <span class="badge ${badgeClass}">${confidencePercent}%</span>
                    </div>
                    <p class="history-card-description">${diagnosis.description}</p>
                    <div class="history-card-date">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${formatDate(date, true)}
                    </div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            showDetailsDialog(diagnosis);
        });
        
        return card;
    }

    // Update the showDetailsDialog function to include detailed analysis
    function showDetailsDialog(diagnosis) {
        // Set dialog ID attribute
        detailsDialog.setAttribute('data-id', diagnosis.id);
        
        // Set dialog content
        dialogImage.src = diagnosis.image;
        dialogCondition.textContent = diagnosis.condition;
        
        const confidencePercent = Math.round(diagnosis.confidence * 100);
        dialogConfidenceValue.textContent = `${confidencePercent}%`;
        dialogConfidenceProgress.style.width = `${confidencePercent}%`;
        
        dialogDescription.textContent = diagnosis.description;
        
        dialogRecommendationsList.innerHTML = '';
        diagnosis.recommendations.forEach(recommendation => {
            const li = document.createElement('li');
            const icon = diagnosis.confidence > 0.8 
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-success)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-warning)"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
            li.innerHTML = `${icon} <span>${recommendation}</span>`;
            dialogRecommendationsList.appendChild(li);
        });
        
        // Add detailed analysis if available
        if (diagnosis.detailed_analysis) {
            // Create or get the detailed analysis section
            let dialogDetailedAnalysis = document.getElementById('dialog-detailed-analysis');
            if (!dialogDetailedAnalysis) {
                const detailedSection = document.createElement('div');
                detailedSection.className = 'dialog-section';
                detailedSection.innerHTML = `
                    <h3 class="dialog-section-title">Detailed LLaMA 3.2 Analysis</h3>
                    <div id="dialog-detailed-analysis" class="dialog-detailed-analysis"></div>
                `;
                const dialogContent = dialogRecommendationsList.closest('.dialog-content');
                dialogContent.appendChild(detailedSection);
                dialogDetailedAnalysis = document.getElementById('dialog-detailed-analysis');
            }
            
            // Update content
            dialogDetailedAnalysis.innerHTML = formatDetailedAnalysis(diagnosis.detailed_analysis);
        }
        
        const date = new Date(diagnosis.timestamp);
        dialogDate.textContent = `${translations.analyzed_on || 'Analyzed on'} ${formatDate(date)}`;
        
        // Show dialog
        detailsDialog.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Utility functions
    function formatDate(date, short = false) {
        if (short) {
            return new Date(date).toLocaleString(currentLanguage, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        return new Date(date).toLocaleString(currentLanguage, {
            dateStyle: 'full',
            timeStyle: 'short'
        });
    }

    function saveHistoryToStorage() {
        localStorage.setItem('diagnosisHistory', JSON.stringify(diagnosisHistory));
    }

    function loadHistoryFromStorage() {
        const saved = localStorage.getItem('diagnosisHistory');
        return saved ? JSON.parse(saved) : [];
    }

    function showToast(message) {
        toastContent.textContent = message;
        toast.classList.add('active');
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    // Close dialog when clicking outside
    detailsDialog.addEventListener('click', function(e) {
        if (e.target === this) {
            closeDialog();
        }
    });

    // Close camera modal when clicking outside
    cameraModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeCameraModal();
        }
    });

    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (detailsDialog.classList.contains('active')) {
                closeDialog();
            }
            if (cameraModal.classList.contains('active')) {
                closeCameraModal();
            }
        }
    });

    function updateTranslations(translations) {
        // Update existing translations
        document.getElementById('app-name').textContent = translations.app_name;
        document.getElementById('app-description').textContent = translations.app_description;
        document.getElementById('upload-title').textContent = translations.upload_title;
        document.getElementById('upload-description').textContent = translations.upload_description;
        document.getElementById('camera-button-text').textContent = translations.camera_button;
        document.getElementById('upload-button-text').textContent = translations.upload_button;
        document.getElementById('supported-formats').textContent = translations.supported_formats;
        document.getElementById('analyze-button-text').textContent = translations.analyze_button;
        document.getElementById('diagnosis-title').textContent = translations.diagnosis_title;
        document.getElementById('description-label').textContent = translations.description_label;
        document.getElementById('recommendations-label').textContent = translations.recommendations_label;
        document.getElementById('history-title').textContent = translations.history_title;
        document.getElementById('clear-history-text').textContent = translations.clear_history;
        document.getElementById('no-history-title').textContent = translations.no_history;
        document.getElementById('no-history-description').textContent = translations.history_description;
        document.getElementById('details-title').textContent = translations.details_title;
        document.getElementById('light-mode-text').textContent = translations.light_mode;
        document.getElementById('dark-mode-text').textContent = translations.dark_mode;
        document.getElementById('language-label').textContent = translations.language;
        document.getElementById('disclaimer').textContent = translations.disclaimer;
        document.getElementById('footer-text').textContent = translations.footer_text;

        // Update feature translations
        document.getElementById('feature-ai-title').textContent = translations.features.ai_analysis.title;
        document.getElementById('feature-ai-description').textContent = translations.features.ai_analysis.description;
        document.getElementById('feature-reports-title').textContent = translations.features.detailed_reports.title;
        document.getElementById('feature-reports-description').textContent = translations.features.detailed_reports.description;
        document.getElementById('feature-multilingual-title').textContent = translations.features.multilingual.title;
        document.getElementById('feature-multilingual-description').textContent = translations.features.multilingual.description;
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const analyzeButton = document.getElementById("analyze-btn");
    const fileInput = document.getElementById("file-input");
    const conditionName = document.getElementById("condition-name");
    const conditionDescription = document.getElementById("condition-description");
    const recommendationsList = document.getElementById("recommendations-list");
    const resultSection = document.getElementById("result-section");

    analyzeButton.addEventListener("click", async () => {
        if (!fileInput.files[0]) {
            alert("Please upload an image before analyzing.");
            return;
        }

        const formData = new FormData();
        formData.append("image", fileInput.files[0]);

        try {
            // Show loading state
            conditionName.textContent = "Loading...";
            conditionDescription.textContent = "Loading description...";
            recommendationsList.innerHTML = "";

            // Send the image to the backend API
            const response = await fetch("/api/analyze", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to analyze the image. Please try again.");
            }

            const data = await response.json();

            // Update the UI with the analysis results
            conditionName.textContent = data.condition || "Unknown Condition";
            conditionDescription.textContent = data.description || "No description available.";
            recommendationsList.innerHTML = "";

            if (data.recommendations && data.recommendations.length > 0) {
                data.recommendations.forEach((rec) => {
                    const listItem = document.createElement("li");
                    listItem.textContent = rec;
                    recommendationsList.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement("li");
                listItem.textContent = "No recommendations available.";
                recommendationsList.appendChild(listItem);
            }

            // Show the result section
            resultSection.classList.remove("hidden");
        } catch (error) {
            console.error("Error analyzing the image:", error);
            alert("An error occurred while analyzing the image. Please try again.");
        }
    });
});


import React from 'react';
import { useDiagnosis } from '@/contexts/DiagnosisContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileImage, Home, History, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const { diagnosisHistory } = useDiagnosis();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Function to handle the About button click using vanilla JS
  const handleAboutClick = () => {
    const aboutModal = document.getElementById('about-modal');
    if (aboutModal) {
      aboutModal.style.display = 'flex';
    }
  };
  
  return (
    <>
      <header className="w-full border-b border-border/40 bg-white/70 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center" onClick={() => navigate('/')} role="button">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-medical-blue rounded-full flex items-center justify-center">
                  <FileImage className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">VisionAid</h1>
                  <p className="text-xs text-gray-500">Portable Diagnostic Tool</p>
                </div>
              </div>
            </div>
            
            <nav className="flex items-center space-x-4">
              <Button
                variant={location.pathname === '/' ? "default" : "outline"}
                size="sm"
                className="button-transition"
                onClick={() => navigate('/')}
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              
              <Button
                variant={location.pathname === '/history' ? "default" : "outline"}
                size="sm"
                className="button-transition flex items-center"
                onClick={() => navigate('/history')}
              >
                <History className="h-4 w-4 mr-2" />
                History
                {diagnosisHistory.length > 0 && (
                  <Badge className="ml-2 bg-medical-blue text-white" variant="secondary">
                    {diagnosisHistory.length}
                  </Badge>
                )}
              </Button>
              
              {/* Plain HTML/CSS button for About */}
              <button 
                id="about-btn"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={handleAboutClick}
              >
                <Info className="h-4 w-4 mr-2" />
                About
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Plain HTML/CSS modal for About */}
      <div id="about-modal" className="fixed inset-0 bg-black/50 z-50 hidden items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="border-b border-gray-200 p-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">About VisionAid</h2>
            <button 
              id="close-about-modal"
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => {
                const aboutModal = document.getElementById('about-modal');
                if (aboutModal) {
                  aboutModal.style.display = 'none';
                }
              }}
            >
              &times;
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-8">
              {/* Developer Info */}
              <div className="border rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Developer</h3>
                <p className="font-medium">Pawishrajhen A R</p>
                <p className="text-gray-600">Studying at SRM INSTITUTE OF SCIENCE AND TECHNOLOGY</p>
              </div>
              
              {/* Project Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Project Information</h3>
                <p className="text-gray-600 mb-4">
                  VisionAid is a portable software diagnostic tool that utilizes computer vision and 
                  Generative AI to analyze medical images. The application aims to aid healthcare 
                  professionals in early disease detection, particularly in rural areas with limited 
                  access to specialized medical equipment and expertise.
                </p>
                
                <h4 className="font-medium text-gray-800 mb-2">How It Works</h4>
                <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-4">
                  <li>Upload or capture medical images using the built-in camera feature</li>
                  <li>The system uses a trained TensorFlow model to analyze the image</li>
                  <li>AI identifies potential skin conditions from the uploaded image</li>
                  <li>Results include condition name, confidence level, description, and recommended actions</li>
                  <li>All diagnoses are saved in your history for future reference</li>
                </ul>
                
                <h4 className="font-medium text-gray-800 mb-2">Key Features</h4>
                <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-4">
                  <li>Upload or capture medical images for instant analysis</li>
                  <li>AI-powered diagnosis of various medical conditions</li>
                  <li>Storage and management of previous diagnoses</li>
                  <li>Portable design for use in remote or rural healthcare settings</li>
                  <li>Multi-language support for international usage</li>
                  <li>Dark/light mode for different viewing preferences</li>
                  <li>Find nearby specialists for follow-up consultations</li>
                </ul>
                
                <h4 className="font-medium text-gray-800 mb-2">Technology Stack</h4>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>React with TypeScript for frontend development</li>
                  <li>TensorFlow for machine learning and image analysis</li>
                  <li>Computer Vision algorithms for image processing</li>
                  <li>Responsive design for use across various devices</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;

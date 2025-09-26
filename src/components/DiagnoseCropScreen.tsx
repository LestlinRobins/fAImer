import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowLeft,
  MapPin,
  RotateCcw,
  Shield,
  DollarSign,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface DiagnosisResult {
  disease: string;
  confidence: number;
  severity: string;
  affectedCrop: string;
  symptoms: string;
  treatment: string;
  prevention: string;
  economicImpact: string;
  seasonalData?: {
    month: string;
    occurrence: number;
  }[];
  causes?: string[];
}

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
}

interface DiagnoseCropScreenProps {
  onBack?: () => void;
}

const DiagnoseCropScreen: React.FC<DiagnoseCropScreenProps> = ({ onBack }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] =
    useState<DiagnosisResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">(
    "environment"
  );
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          // Get location name (simplified - using coordinates as fallback)
          try {
            locationData.city = "Location Detected";
            locationData.region = `${locationData.latitude.toFixed(2)}, ${locationData.longitude.toFixed(2)}`;
          } catch (error) {
            console.log("Location detection failed");
            locationData.city = "Unknown Location";
            locationData.region = "Unknown Region";
          }

          setLocation(locationData);
        },
        (error) => {
          setLocationError(
            "Location access denied. Results may be less accurate."
          );
          console.error("Location error:", error);
        }
      );
    } else {
      setLocationError("Geolocation not supported by this browser.");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setDiagnosisResult(null); // Clear previous results
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setShowCamera(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL("image/jpeg");
        setSelectedImage(dataUrl);
        stopCamera();
        setDiagnosisResult(null);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  const toggleCamera = () => {
    setCameraFacing(cameraFacing === "user" ? "environment" : "user");
    if (showCamera) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  };

  const convertImageToBase64 = (imageDataUrl: string): string => {
    return imageDataUrl.split(",")[1];
  };

  const handleDiagnosis = async () => {
    if (!selectedImage || !apiKey) {
      setDiagnosisResult({
        disease: "Error",
        confidence: 0,
        severity: "Unknown",
        affectedCrop: "N/A",
        symptoms: "Please select an image and ensure API key is configured.",
        treatment: "N/A",
        prevention: "N/A",
        economicImpact: "N/A",
        seasonalData: [],
        causes: ["Configuration error"],
      });
      return;
    }

    setIsDiagnosing(true);
    setDiagnosisResult(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const base64Image = convertImageToBase64(selectedImage);
      const locationInfo = location
        ? `Location: ${location.city}, ${location.region} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`
        : "Location: Not available";

      const prompt = `
        You are an expert plant pathologist and agricultural disease specialist. Analyze this image of plant leaves to identify any diseases or health issues.
        ${locationInfo}
        
        Please provide a detailed analysis in the following JSON format. Use PLAIN TEXT only - no markdown, no asterisks, no formatting symbols:
        {
          "disease": "Name of the disease or 'Healthy Plant' if no disease detected (plain text)",
          "confidence": confidence_percentage_as_number,
          "severity": "Low/Medium/High/None",
          "affectedCrop": "Type of plant/crop identified (plain text)",
          "symptoms": "Detailed description of visible symptoms in plain readable text",
          "treatment": "Specific treatment recommendations in plain text, separated by periods if multiple steps",
          "prevention": "Prevention strategies in plain text, separated by periods if multiple strategies",
          "economicImpact": "Economic impact description in plain readable text",
          "seasonalData": [
            {"month": "Jan", "occurrence": percentage_number},
            {"month": "Feb", "occurrence": percentage_number},
            {"month": "Mar", "occurrence": percentage_number},
            {"month": "Apr", "occurrence": percentage_number},
            {"month": "May", "occurrence": percentage_number},
            {"month": "Jun", "occurrence": percentage_number},
            {"month": "Jul", "occurrence": percentage_number},
            {"month": "Aug", "occurrence": percentage_number},
            {"month": "Sep", "occurrence": percentage_number},
            {"month": "Oct", "occurrence": percentage_number},
            {"month": "Nov", "occurrence": percentage_number},
            {"month": "Dec", "occurrence": percentage_number}
          ],
          "causes": ["Environmental factor 1 in plain text", "Environmental factor 2 in plain text", "Environmental factor 3 in plain text"]
        }
        
        Important guidelines:
        - Use only plain text, no markdown formatting
        - No asterisks, no bold, no bullets, no special characters
        - Separate multiple points with periods or commas
        - Keep text readable and professional
        - Base seasonal data on location if available
        - If no disease detected, set disease to "Healthy Plant" and confidence to high percentage
        - Provide realistic seasonal occurrence percentages (0-100)
        - Focus on leaf diseases, fungal infections, bacterial diseases, viral diseases, and nutritional deficiencies
        - Include common crop diseases like blight, mildew, rust, leaf spot, etc.
      `;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const diseaseData = JSON.parse(jsonMatch[0]);

        // Clean all text fields to remove any markdown formatting
        if (diseaseData.symptoms) {
          diseaseData.symptoms = cleanMarkdownText(diseaseData.symptoms);
        }
        if (diseaseData.treatment) {
          diseaseData.treatment = cleanMarkdownText(diseaseData.treatment);
        }
        if (diseaseData.prevention) {
          diseaseData.prevention = cleanMarkdownText(diseaseData.prevention);
        }
        if (diseaseData.economicImpact) {
          diseaseData.economicImpact = cleanMarkdownText(
            diseaseData.economicImpact
          );
        }
        if (diseaseData.causes && Array.isArray(diseaseData.causes)) {
          diseaseData.causes = diseaseData.causes.map((cause: string) =>
            cleanMarkdownText(cause)
          );
        }

        setDiagnosisResult(diseaseData);

        toast({
          title: "Diagnosis Complete",
          description: `Disease analysis completed with ${diseaseData.confidence}% confidence`,
        });
      } else {
        throw new Error("Invalid response format from AI");
      }
    } catch (error) {
      console.error("Diagnosis error:", error);
      setDiagnosisResult({
        disease: "Analysis Error",
        confidence: 0,
        severity: "Unknown",
        affectedCrop: "Unknown",
        symptoms:
          "Failed to analyze the image. Please try again with a clearer photo of the plant leaves.",
        treatment:
          "Please retake the photo ensuring good lighting and focus on the affected leaves.",
        prevention: "N/A",
        economicImpact: "N/A",
        seasonalData: [],
        causes: ["Analysis failed due to image quality or API error"],
      });

      toast({
        title: "Analysis Failed",
        description: "Unable to analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Function to clean markdown formatting and make text more readable
  const cleanMarkdownText = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Remove markdown headers
        .replace(/#{1,6}\s*/g, "")
        // Remove bold/italic markers
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`(.*?)`/g, "$1")
        // Remove markdown links but keep the text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Remove markdown list markers
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")
        // Remove blockquotes
        .replace(/^\s*>\s*/gm, "")
        // Clean up line breaks and spacing
        .replace(/\n\s*\n/g, "\n")
        .replace(/\n/g, " ")
        // Clean up extra spaces and periods
        .replace(/\s+/g, " ")
        .replace(/\.+/g, ".")
        .trim()
    );
  };

  // Function to format list items from markdown or plain text
  const formatListItems = (text: string): string[] => {
    if (!text) return [];

    // Clean the text first
    const cleaned = cleanMarkdownText(text);

    // Split by common delimiters and filter out empty items
    const items = cleaned
      .split(/(?:[•\-\*]\s*|(?:\d+\.)\s*|\.\s*(?=[A-Z])|;\s*|\n)/)
      .map((item) => item.trim())
      .filter((item) => item.length > 3); // Filter out very short items

    // If no meaningful list items found, return the cleaned text as a single item
    return items.length > 0 ? items : [cleaned];
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "none":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getOccurrenceBarWidth = (occurrence: number) => {
    const width = Math.min(Math.max(occurrence, 0), 100);
    return { width: `${width}%` };
  };

  const commonDiseases = [
    {
      name: "Early Blight",
      crop: "Tomato, Potato",
      severity: "Medium",
      icon: "🍂",
    },
    {
      name: "Powdery Mildew",
      crop: "Cucumber, Squash",
      severity: "Medium",
      icon: "🍄",
    },
    {
      name: "Downy Mildew",
      crop: "Grape, Lettuce",
      severity: "High",
      icon: "🌧️",
    },
    { name: "Septoria Leaf Spot", crop: "Tomato", severity: "Low", icon: "⚫" },
    {
      name: "Fusarium Wilt",
      crop: "Tomato, Watermelon",
      severity: "High",
      icon: "🌱",
    },
  ];

  return (
    <div className="pb-20 bg-gray-50 dark:bg-background min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white p-4 shadow-lg">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mr-3 text-white hover:bg-white/20 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Diagnose Crop</h1>
            <p className="text-red-100 dark:text-red-200 text-sm">
              AI-powered crop disease detection
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Diagnosis Section */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center dark:text-white">
              <TestTube className="h-5 w-5 mr-2" />
              Disease Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Info */}
            {location && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                <MapPin className="h-4 w-4 mr-2" />
                Location: {location.city}, {location.region}
              </div>
            )}
            {locationError && (
              <div className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                {locationError}
              </div>
            )}

            {/* Camera Interface */}
            {showCamera ? (
              <div className="space-y-3">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                  <Button variant="outline" onClick={toggleCamera}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </div>
                <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Camera: {cameraFacing === "user" ? "Front" : "Back"}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-2 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                  onClick={startCamera}
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Take Photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-2 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Upload Image</span>
                </Button>
              </div>
            )}

            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
            <input
              id="file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              aria-label="Upload image file"
            />

            {selectedImage && (
              <div className="mt-4">
                <img
                  src={selectedImage}
                  alt="Selected crop"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  onClick={handleDiagnosis}
                  disabled={isDiagnosing}
                  className="w-full mt-3 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  {isDiagnosing ? "Analyzing..." : "Diagnose Crop Disease"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis Result */}
        {diagnosisResult && (
          <>
            {/* Main Detection Result */}
            <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center dark:text-white">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                  Disease Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium dark:text-white">Disease:</span>
                  <Badge
                    className={`${diagnosisResult.confidence > 0 ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"}`}
                  >
                    {diagnosisResult.disease}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium dark:text-white">
                    Confidence:
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-bold">
                    {diagnosisResult.confidence}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium dark:text-white">Severity:</span>
                  <Badge className={getSeverityColor(diagnosisResult.severity)}>
                    {diagnosisResult.severity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium dark:text-white">
                    Affected Crop:
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {diagnosisResult.affectedCrop}
                  </span>
                </div>
                {location && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium dark:text-white">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Location:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {location.city}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t dark:border-gray-600 space-y-3">
                  <div>
                    <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                      Symptoms:
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {cleanMarkdownText(diagnosisResult.symptoms)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Treatment Box */}
            <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Treatment Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formatListItems(diagnosisResult.treatment).map(
                    (item, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {item}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Prevention Box */}
            <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center text-blue-600 dark:text-blue-400">
                  <Shield className="h-5 w-5 mr-2" />
                  Prevention Strategies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formatListItems(diagnosisResult.prevention).map(
                    (item, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {item}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Economic Impact Box */}
            <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center text-red-600 dark:text-red-400">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Economic Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {cleanMarkdownText(diagnosisResult.economicImpact)}
                </p>
              </CardContent>
            </Card>

            {/* Causes Box */}
            {diagnosisResult.causes && diagnosisResult.causes.length > 0 && (
              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-base flex items-center text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Root Causes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {diagnosisResult.causes.map((cause, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {cause}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seasonal Occurrence Chart */}
            {diagnosisResult.seasonalData &&
              diagnosisResult.seasonalData.length > 0 && (
                <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center dark:text-white">
                      <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                      Seasonal Disease Pattern
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {diagnosisResult.seasonalData.map((data, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3"
                        >
                          <span className="text-sm font-medium w-8 dark:text-white">
                            {data.month}
                          </span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-green-400 to-red-500 h-full rounded-full transition-all duration-700"
                              style={getOccurrenceBarWidth(data.occurrence)}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-10">
                            {data.occurrence}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      Based on seasonal patterns and location data
                    </div>
                  </CardContent>
                </Card>
              )}
          </>
        )}

        {/* Common Diseases */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-base dark:text-white">
              Common Diseases in Your Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commonDiseases.map((disease, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{disease.icon}</span>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {disease.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Affects: {disease.crop}
                      </p>
                    </div>
                  </div>
                  <Badge className={getSeverityColor(disease.severity)}>
                    {disease.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start">
              <Lightbulb className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                  Pro Tips for Better Diagnosis:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Take clear, close-up photos of affected leaves</li>
                  <li>• Ensure good lighting to capture leaf details</li>
                  <li>• Focus on areas showing disease symptoms</li>
                  <li>• Include healthy parts for comparison</li>
                  <li>• Take photos of both upper and lower leaf surfaces</li>
                  <li>• Avoid blurry or dark images for best results</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiagnoseCropScreen;
